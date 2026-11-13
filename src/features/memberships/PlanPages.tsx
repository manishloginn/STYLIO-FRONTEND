import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PlanFacts } from '../../components/cards/PlanFacts';
import { Button, Card, PageHeader, Skeleton } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import { formatPaise } from '../../lib/money';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { api } from '../../services/api';
import { MembershipPlan, Payment } from '../../types';

export function PlanDetailPage() {
  const { id = '' } = useParams();
  const plan = useQuery({ queryKey: ['plan', id], queryFn: () => api<MembershipPlan>(`/membership-plans/${id}`) });
  if (plan.isLoading) return <main className="px-4 py-8"><Skeleton className="h-64" /></main>;
  if (!plan.data) return <main className="px-4 py-8">Plan unavailable.</main>;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={plan.data.name} subtitle="Read every limit before you pay. Prices are set by the salon." />
      <Card>
        <PlanFacts plan={plan.data} />
        <Link to={`/checkout/${plan.data.id}`} className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
          Continue to checkout
        </Link>
      </Card>
    </main>
  );
}

export function ComparePage() {
  const [params] = useSearchParams();
  const ids = params.get('ids') || '';
  const plans = useQuery({
    queryKey: ['compare', ids],
    enabled: ids.split(',').filter(Boolean).length >= 2,
    queryFn: () => api<MembershipPlan[]>(`/membership-plans/compare?ids=${ids}`),
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Compare memberships" subtitle="The same facts are shown for every plan. Nothing here is a Stylio-funded discount." />
      {plans.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.data.map((plan) => (
            <Card key={plan.id}>
              <p className="font-display text-2xl">{plan.name}</p>
              <div className="mt-3"><PlanFacts plan={plan} /></div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>Choose at least two published plans from a salon page.</Card>
      )}
    </main>
  );
}

export function CheckoutPage() {
  const { planId = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState('');
  const plan = useQuery({ queryKey: ['plan', planId], queryFn: () => api<MembershipPlan>(`/membership-plans/${planId}`) });
  const pay = useMutation({
    mutationFn: async () => {
      const order = await api<Payment>('/payments/orders', { method: 'POST', body: JSON.stringify({ planId }) });
      if (order.gateway === 'dev') {
        await api('/payments/dev/confirm', {
          method: 'POST',
          body: JSON.stringify({ paymentId: order.id, status: 'PAID' }),
        });
        return order;
      }
      if (order.gateway !== 'razorpay' || !order.keyId || !order.gatewayOrderId) {
        throw new Error('Payment could not start');
      }
      const callback = order.callbackUrl ? new URL(order.callbackUrl) : undefined;
      if (callback) callback.searchParams.set('return', window.location.origin);
      const paid = await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'Stylio',
        description: plan.data?.name || 'Salon membership',
        order_id: order.gatewayOrderId,
        callback_url: callback?.toString(),
        redirect: Boolean(callback),
        prefill: { name: user?.name, contact: user?.phone },
        theme: { color: '#6C63FF' },
      });
      await api('/payments/razorpay/confirm', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: order.id,
          razorpayOrderId: paid.razorpay_order_id,
          razorpayPaymentId: paid.razorpay_payment_id,
          razorpaySignature: paid.razorpay_signature,
        }),
      });
      return order;
    },
    onSuccess: (order) => navigate(`/payments/${order.id}/result`),
    onError: (err) => setError(err instanceof Error ? err.message : 'Payment could not start'),
  });

  if (loading || plan.isLoading) return <main className="px-4 py-8"><Skeleton className="h-40" /></main>;
  if (!plan.data) return <main className="px-4 py-8">This plan cannot be purchased.</main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <h1 className="font-display text-3xl">Log in to pay</h1>
          <p className="mt-2 text-sm text-muted">A membership is bought from a customer account. Payment is confirmed on the server before the pass is created.</p>
          <Link to={`/login?next=/checkout/${planId}`} className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">Log in and continue</Link>
        </Card>
      </main>
    );
  }
  if (user.role !== 'CUSTOMER') {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <h1 className="font-display text-3xl">This account cannot pay</h1>
          <p className="mt-2 text-sm text-muted">
            You are signed in as {user.role === 'PLATFORM_ADMIN' ? 'the platform admin' : 'a salon'}. Only a customer can buy a membership.
            The salon owner enters the customer’s visit OTP under Redemptions. The admin does not enter that code.
          </p>
          <Link to={user.role === 'PLATFORM_ADMIN' ? '/admin' : '/salon'} className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
            Go to your dashboard
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Checkout" subtitle="Your membership is created only after the payment is verified." />
      <Card>
        <PlanFacts plan={plan.data} />
        <p className="mt-4 text-sm text-muted">Pay {formatPaise(plan.data.sellingPrice)}. Razorpay opens next. The membership is created only after that payment is verified.</p>
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        <Button className="mt-6" disabled={pay.isPending} onClick={() => pay.mutate()}>
          {pay.isPending ? 'Waiting for payment' : `Pay ${formatPaise(plan.data.sellingPrice)}`}
        </Button>
      </Card>
    </main>
  );
}

export function PaymentResultPage() {
  const { paymentId = '' } = useParams();
  const payment = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => api<Payment>(`/payments/${paymentId}`),
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 1500 : false),
  });
  const status = payment.data?.status;
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <h1 className="font-display text-3xl">
          {status === 'PAID' ? 'Membership confirmed' : status === 'FAILED' ? 'Payment failed' : 'Checking payment'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {status === 'PAID'
            ? 'Open the pass when you reach the salon and generate a fresh OTP. The salon owner enters that code under Redemptions.'
            : status === 'FAILED'
              ? 'No membership was created.'
              : 'The server confirms the payment. This page does not decide success on its own.'}
        </p>
        {payment.data?.membershipId ? (
          <Link to={`/memberships/${payment.data.membershipId}`} className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
            Open digital pass
          </Link>
        ) : null}
      </Card>
    </main>
  );
}
