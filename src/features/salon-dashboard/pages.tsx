import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, Navigate, Outlet, useParams } from 'react-router-dom';
import { PlanForm } from '../../components/forms/PlanForm';
import { SalonNav } from '../../components/layout/SalonNav';
import { Button, Card, EmptyState, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise, rupeesToPaise } from '../../lib/money';
import { api } from '../../services/api';
import { Branch, Membership, MembershipPlan, Payment, Redemption, Salon, SalonService } from '../../types';

function localDay() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    key: `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
    from: start.toISOString(),
    to: end.toISOString(),
    label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  };
}

export function SalonGate() {
  const salons = useQuery({ queryKey: ['my-salons'], queryFn: () => api<Salon[]>('/salons/mine') });
  const [form, setForm] = useState({ name: '', description: '', city: '', phone: '', salonType: 'UNISEX' });
  if (salons.isLoading) return <main className="p-8">Loading salon…</main>;
  if (salons.data && salons.data.length > 0) return <Navigate to={`/salon/${salons.data[0].id}`} replace />;
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <PageHeader title="Register your salon" subtitle="An administrator reviews the application before it appears in discovery." />
      <Card>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const salon = await api<Salon>('/salons', { method: 'POST', body: JSON.stringify(form) });
            window.location.assign(`/salon/${salon.id}`);
          }}
        >
          <input className={inputClass} placeholder="Salon name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <textarea className={inputClass} placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <input className={inputClass} placeholder="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <select className={inputClass} value={form.salonType} onChange={(event) => setForm({ ...form, salonType: event.target.value })}>
            <option value="UNISEX">Unisex</option>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
            <option value="SPA">Spa</option>
          </select>
          <Button type="submit">Submit application</Button>
        </form>
      </Card>
    </main>
  );
}

export function SalonLayout() {
  const { salonId = '' } = useParams();
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:gap-6 md:py-6">
      <aside className="md:sticky md:top-20 md:self-start">
        <SalonNav salonId={salonId} />
      </aside>
      <div className="min-w-0 pb-16">
        <Outlet />
      </div>
    </div>
  );
}

export function SalonOverview() {
  const { salonId = '' } = useParams();
  const day = localDay();
  const stats = useQuery({
    queryKey: ['salon-stats', salonId, day.key],
    queryFn: () => api<Record<string, number>>(`/analytics/salon/${salonId}?from=${encodeURIComponent(day.from)}&to=${encodeURIComponent(day.to)}`),
  });
  const purchases = useQuery({ queryKey: ['salon-memberships', salonId], queryFn: () => api<Membership[]>(`/memberships/salon/${salonId}?limit=5`) });
  const redemptions = useQuery({ queryKey: ['salon-redemptions', salonId], queryFn: () => api<Redemption[]>(`/redemptions/salon/${salonId}`) });
  const cards = [
    ['Stylio sales', formatPaise(stats.data?.stylioSalesPaise)],
    ['Active memberships', String(stats.data?.activeMemberships ?? 0)],
    ['Redemptions', String(stats.data?.redemptions ?? 0)],
    ['Recorded settlements', formatPaise(stats.data?.recordedSettlementsPaise)],
    ['Commission', formatPaise(stats.data?.commissionPaise)],
  ];
  return (
    <section>
      <PageHeader title="Salon desk" subtitle="Customers buy on their own account. When they arrive, they show a fresh OTP from their pass." />
      <Card className="mb-4">
        <p className="font-semibold">Enter the customer’s visit OTP here</p>
        <p className="mt-1 text-sm text-muted">The customer opens their pass and taps “New OTP for this service”. You type that 6-digit code. The platform admin does not check visits.</p>
        <Link to="redemptions" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Open OTP desk</Link>
      </Card>
      <div className="mb-3 text-sm font-semibold text-muted">Today, {day.label}</div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="font-semibold">Recent memberships</p>
          {purchases.data?.slice(0, 5).map((row) => <p key={row.id} className="mt-2 text-sm">{row.customer?.name || 'Customer'} · {row.planSnapshot.name} · {formatPaise(row.purchasePrice)}</p>)}
        </Card>
        <Card>
          <p className="font-semibold">Recent redemptions</p>
          {redemptions.data?.slice(0, 5).map((row) => <p key={row.id} className="mt-2 text-sm">{row.customer?.name || 'Customer'} · {row.serviceName} · {row.status}</p>)}
        </Card>
      </div>
    </section>
  );
}

export function SalonProfilePage() {
  const { salonId = '' } = useParams();
  const queryClient = useQueryClient();
  const salon = useQuery({ queryKey: ['manage-salon', salonId], queryFn: () => api<Salon>(`/salons/${salonId}/manage`) });
  const [description, setDescription] = useState('');
  if (!salon.data) return null;
  return (
    <section>
      <PageHeader title="Salon profile" subtitle={`Status: ${salon.data.status}`} />
      <Card>
        <p className="font-semibold">{salon.data.name}</p>
        <p className="text-sm text-muted">{salon.data.city}</p>
        <textarea className={`${inputClass} mt-3`} defaultValue={salon.data.description} onChange={(event) => setDescription(event.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await api(`/salons/${salonId}`, { method: 'PATCH', body: JSON.stringify({ description: description || salon.data?.description }) });
              await queryClient.invalidateQueries({ queryKey: ['manage-salon', salonId] });
            }}
          >
            Save profile
          </Button>
          {salon.data.status === 'PENDING' ? (
            <Button
              variant="secondary"
              onClick={async () => {
                await api(`/salons/${salonId}/decision`, { method: 'POST', body: JSON.stringify({ status: 'APPROVED' }) });
                await queryClient.invalidateQueries({ queryKey: ['manage-salon', salonId] });
              }}
            >
              Approve salon
            </Button>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

export function BranchesPage() {
  const { salonId = '' } = useParams();
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['branches', salonId], queryFn: () => api<Branch[]>(`/salons/${salonId}/branches/manage`) });
  const [form, setForm] = useState({ name: '', address: '', city: '' });
  return (
    <section>
      <PageHeader title="Branches" subtitle="Verify a branch when it is ready for customers." />
      <Card>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={async (event) => {
          event.preventDefault();
          await api(`/salons/${salonId}/branches`, { method: 'POST', body: JSON.stringify(form) });
          setForm({ name: '', address: '', city: '' });
          await queryClient.invalidateQueries({ queryKey: ['branches', salonId] });
        }}>
          <input className={inputClass} placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className={inputClass} placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          <input className={inputClass} placeholder="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <Button type="submit">Add branch</Button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {branches.data?.map((branch) => (
          <Card key={branch.id}>
            <p className="font-semibold">{branch.name}</p>
            <p className="text-sm text-muted">{branch.address} · {branch.status}</p>
            {branch.status === 'PENDING' ? (
              <Button className="mt-3" onClick={async () => { await api(`/branches/${branch.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'VERIFIED' }) }); await queryClient.invalidateQueries({ queryKey: ['branches', salonId] }); }}>Verify</Button>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ServicesPage() {
  const { salonId = '' } = useParams();
  const queryClient = useQueryClient();
  const services = useQuery({ queryKey: ['manage-services', salonId], queryFn: () => api<SalonService[]>(`/salons/${salonId}/services/manage`) });
  const [form, setForm] = useState({ name: '', category: 'Hair', price: '' });
  return (
    <section>
      <PageHeader title="Service catalogue" />
      <Card>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={async (event) => {
          event.preventDefault();
          await api(`/salons/${salonId}/services`, {
            method: 'POST',
            body: JSON.stringify({ name: form.name, category: form.category, retailPrice: rupeesToPaise(form.price) }),
          });
          setForm({ name: '', category: 'Hair', price: '' });
          await queryClient.invalidateQueries({ queryKey: ['manage-services', salonId] });
        }}>
          <input className={inputClass} placeholder="Service" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className={inputClass} placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <input className={inputClass} placeholder="Retail price ₹" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <Button type="submit">Add service</Button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {services.data?.map((service) => (
          <Card key={service.id}><div className="flex justify-between"><p className="font-semibold">{service.name}</p><p>{formatPaise(service.retailPrice)}</p></div><p className="text-sm text-muted">{service.category}</p></Card>
        ))}
      </div>
    </section>
  );
}

export function PlansPage({ source }: { source: 'STYLIO_CREATED' | 'EXISTING' }) {
  const { salonId = '' } = useParams();
  const queryClient = useQueryClient();
  const services = useQuery({ queryKey: ['manage-services', salonId], queryFn: () => api<SalonService[]>(`/salons/${salonId}/services/manage`) });
  const branches = useQuery({ queryKey: ['branches', salonId], queryFn: () => api<Branch[]>(`/salons/${salonId}/branches/manage`) });
  const plans = useQuery({
    queryKey: ['manage-plans', salonId, source],
    queryFn: () => api<MembershipPlan[]>(`/salons/${salonId}/membership-plans/manage?planSource=${source}`),
  });
  return (
    <section>
      <PageHeader
        title={source === 'EXISTING' ? 'Existing subscriptions' : 'Stylio plans'}
        subtitle="Both kinds use the same membership and entitlement engine."
      />
      <Card>
        <PlanForm
          planSource={source}
          services={services.data || []}
          branches={branches.data || []}
          onSubmit={async (payload) => {
            const created = await api<MembershipPlan>(`/salons/${salonId}/membership-plans`, { method: 'POST', body: JSON.stringify(payload) });
            await api(`/membership-plans/${created.id}/submit`, { method: 'POST' });
            await queryClient.invalidateQueries({ queryKey: ['manage-plans', salonId, source] });
          }}
        />
      </Card>
      <div className="mt-4 grid gap-3">
        {plans.data?.map((plan) => (
          <Card key={plan.id}>
            <p className="font-semibold">{plan.name}</p>
            <p className="text-sm text-muted">{plan.status} · {formatPaise(plan.sellingPrice)}</p>
            {plan.status === 'PENDING_APPROVAL' ? (
              <Button className="mt-3" onClick={async () => { await api(`/membership-plans/${plan.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'PUBLISHED' }) }); await queryClient.invalidateQueries({ queryKey: ['manage-plans', salonId, source] }); }}>Publish</Button>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ActiveMembershipsPage() {
  const { salonId = '' } = useParams();
  const rows = useQuery({ queryKey: ['salon-memberships', salonId], queryFn: () => api<Membership[]>(`/memberships/salon/${salonId}`) });
  return (
    <section>
      <PageHeader title="Active memberships" />
      <div className="grid gap-3">
        {rows.data?.map((row) => (
          <Card key={row.id}>
            <p className="font-semibold">{row.customer?.name || 'Customer'}</p>
            <p className="text-sm text-muted">{row.customer?.phone || 'Phone not on file'}</p>
            <p className="mt-2 font-semibold">{row.planSnapshot.name}</p>
            <p className="text-sm text-muted">{row.status} · {row.source} · {formatPaise(row.purchasePrice)} · until {new Date(row.expiresAt).toLocaleDateString()}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function SalonRedemptionsPage() {
  const { salonId = '' } = useParams();
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['branches', salonId], queryFn: () => api<Branch[]>(`/salons/${salonId}/branches/manage`) });
  const rows = useQuery({ queryKey: ['salon-redemptions', salonId], queryFn: () => api<Redemption[]>(`/redemptions/salon/${salonId}`) });
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [message, setMessage] = useState('');
  const verify = useMutation({
    mutationFn: () => api<Redemption>('/redemptions/verify', { method: 'POST', body: JSON.stringify({ code, branchId }) }),
    onSuccess: async (row) => {
      setMessage(`${row.serviceName || 'Service'} is checked off.`);
      setCode('');
      await queryClient.invalidateQueries({ queryKey: ['salon-redemptions', salonId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Could not verify'),
  });
  return (
    <section>
      <PageHeader title="Visit OTP desk" subtitle="The customer shows a new code from their pass. Enter it here with the branch. The Stylio admin does not use this screen." />
      <Card>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={(event: FormEvent) => { event.preventDefault(); verify.mutate(); }}>
          <input className={inputClass} placeholder="6-digit OTP" value={code} onChange={(event) => setCode(event.target.value)} />
          <select className={inputClass} value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">Branch</option>
            {branches.data?.filter((branch) => branch.status === 'VERIFIED').map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <Button type="submit">Check service</Button>
        </form>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </Card>
      <div className="mt-4 grid gap-3">
        {rows.data?.map((row) => (
          <Card key={row.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{row.customer?.name || 'Customer'}</p>
                <p className="text-sm text-muted">{row.customer?.phone || 'Phone not on file'}</p>
                <p className="mt-2 text-sm">{row.serviceName}{row.planName ? ` · ${row.planName}` : ''} · {row.status}</p>
                <p className="text-sm text-muted">{row.redeemedAt ? new Date(row.redeemedAt).toLocaleString() : ''}</p>
              </div>
              {row.status === 'COMPLETED' ? (
                <Button variant="danger" onClick={async () => {
                  await api(`/redemptions/${row.id}/reverse`, { method: 'POST' });
                  await queryClient.invalidateQueries({ queryKey: ['salon-redemptions', salonId] });
                }}>Reverse</Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function SalesPage() {
  const { salonId = '' } = useParams();
  const stats = useQuery({ queryKey: ['salon-stats', salonId], queryFn: () => api<Record<string, number>>(`/analytics/salon/${salonId}`) });
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');
  const plans = useQuery({ queryKey: ['public-plans', salonId], queryFn: () => api<MembershipPlan[]>(`/salons/${salonId}/membership-plans`) });
  return (
    <section>
      <PageHeader title="Sales" subtitle="Direct sales are recorded without Stylio commission." />
      <div className="grid gap-3 md:grid-cols-2">
        <Card><p className="text-sm text-muted">Stylio sales</p><p className="font-display text-2xl">{formatPaise(stats.data?.stylioSalesPaise)}</p></Card>
        <Card><p className="text-sm text-muted">Direct sales</p><p className="font-display text-2xl">{formatPaise(stats.data?.directSalesPaise)}</p></Card>
      </div>
      <Card className="mt-4">
        <form className="grid gap-3" onSubmit={async (event) => {
          event.preventDefault();
          await api('/memberships/direct', { method: 'POST', body: JSON.stringify({ planId, customerPhone: phone, idempotencyKey: crypto.randomUUID() }) });
          setPhone('');
        }}>
          <select className={inputClass} value={planId} onChange={(event) => setPlanId(event.target.value)}>
            <option value="">Published plan</option>
            {plans.data?.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
          <input className={inputClass} placeholder="Customer mobile" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Button type="submit">Record direct sale</Button>
        </form>
      </Card>
    </section>
  );
}

export function PayoutsPage() {
  const { salonId = '' } = useParams();
  const data = useQuery({
    queryKey: ['payouts', salonId],
    queryFn: () => api<{ summary: { commissionPaise: number; salonPayablePaise: number }; items: Payment[] }>(`/commissions/salon/${salonId}`),
  });
  const payouts = useQuery({
    queryKey: ['payout-records', salonId],
    queryFn: () => api<{ payouts: Array<{ id: string; netPaise: number; status: string }>; reserves: Array<{ id: string; deltaPaise: number; reason: string }> }>(`/payouts/salon/${salonId}`),
  });
  return (
    <section>
      <PageHeader title="Commission and payouts" subtitle="Settlements are recorded for review. Stylio does not transfer money automatically." />
      <Card>
        <p>Commission {formatPaise(data.data?.summary.commissionPaise)}</p>
        <p className="text-sm text-muted">Salon payable before other adjustments {formatPaise(data.data?.summary.salonPayablePaise)}</p>
      </Card>
      <div className="mt-4 grid gap-3">
        {payouts.data?.payouts.map((payout) => <Card key={payout.id}>Recorded net {formatPaise(payout.netPaise)} · {payout.status}</Card>)}
        {payouts.data?.reserves.map((reserve) => <Card key={reserve.id}>Reserve {formatPaise(reserve.deltaPaise)} · {reserve.reason}</Card>)}
        {!payouts.data?.payouts.length ? <EmptyState title="No settlements yet" body="An administrator records payouts after review." /> : null}
      </div>
    </section>
  );
}

export function StaffPage() {
  const { salonId = '' } = useParams();
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ['staff', salonId], queryFn: () => api<Array<{ id: string; role: string; permissions: string[]; user?: { name: string; phone: string } }>>(`/salons/${salonId}/staff`) });
  const [form, setForm] = useState({ name: '', phone: '', password: '', verify: true });
  return (
    <section>
      <PageHeader title="Staff" subtitle="Staff can only do the actions you tick." />
      <Card>
        <form className="grid gap-3" onSubmit={async (event) => {
          event.preventDefault();
          const permissions = form.verify ? ['redemptions:verify', 'memberships:read'] : ['memberships:read'];
          await api(`/salons/${salonId}/staff`, { method: 'POST', body: JSON.stringify({ ...form, permissions }) });
          await queryClient.invalidateQueries({ queryKey: ['staff', salonId] });
        }}>
          <input className={inputClass} placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className={inputClass} placeholder="Mobile" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input className={inputClass} placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <label className="text-sm"><input type="checkbox" checked={form.verify} onChange={(event) => setForm({ ...form, verify: event.target.checked })} /> Can verify redemptions</label>
          <Button type="submit">Add staff</Button>
        </form>
      </Card>
      <div className="mt-4 grid gap-3">
        {staff.data?.map((member) => <Card key={member.id}><p className="font-semibold">{member.user?.name}</p><p className="text-sm text-muted">{member.role} · {(member.permissions || []).join(', ') || 'Owner access'}</p></Card>)}
      </div>
    </section>
  );
}

export function ReportsPage() {
  const { salonId = '' } = useParams();
  const stats = useQuery({ queryKey: ['salon-stats', salonId], queryFn: () => api<Record<string, number>>(`/analytics/salon/${salonId}`) });
  return (
    <section>
      <PageHeader title="Reports" />
      <Card>
        <p>Memberships sold on Stylio: {stats.data?.stylioSalesCount ?? 0}</p>
        <p>Redemptions: {stats.data?.redemptions ?? 0}</p>
        <p>Commission: {formatPaise(stats.data?.commissionPaise)}</p>
        <p>Salon payable: {formatPaise(stats.data?.salonPayablePaise)}</p>
      </Card>
    </section>
  );
}

export function SettingsPage() {
  return (
    <section>
      <PageHeader title="Settings" />
      <Card>
        <p className="text-sm text-muted">Profile, branches, and staff permissions are managed in their own sections. Payouts stay recorded until a payment provider is contracted.</p>
        <Link to="../profile" className="mt-3 inline-block text-sm font-semibold text-primary">Edit salon profile</Link>
      </Card>
    </section>
  );
}
