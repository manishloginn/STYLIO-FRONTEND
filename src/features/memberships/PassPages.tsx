import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import { formatPaise } from '../../lib/money';
import { api } from '../../services/api';
import { Entitlement, Membership, Redemption } from '../../types';

export function MembershipsPage() {
  const memberships = useQuery({
    queryKey: ['my-memberships'],
    queryFn: () => api<Membership[]>('/memberships/me'),
  });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="My memberships" subtitle="Each pass keeps the plan you bought, even if the salon edits future plans." />
      {memberships.data && memberships.data.length === 0 ? (
        <EmptyState title="No memberships yet" body="Explore salons and buy a plan when you are ready." action={<Link to="/salons" className="font-semibold text-primary">Explore salons</Link>} />
      ) : (
        <div className="grid gap-4">
          {memberships.data?.map((membership) => (
            <Link key={membership.id} to={`/memberships/${membership.id}`}>
              <Card>
                <p className="font-display text-2xl">{membership.planSnapshot.name}</p>
                <p className="text-sm text-muted">{membership.salon?.name} · {membership.status}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export function PassPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const membership = useQuery({ queryKey: ['membership', id], queryFn: () => api<Membership>(`/memberships/${id}`) });
  const [otp, setOtp] = useState<{ code: string; serviceName: string; expiresAt: string } | null>(null);
  const [qr, setQr] = useState('');
  const challenge = useMutation({
    mutationFn: (serviceId: string) =>
      api<{ code: string; serviceName: string; expiresAt: string }>('/redemptions/challenges', {
        method: 'POST',
        body: JSON.stringify({ membershipId: id, serviceId }),
      }),
    onSuccess: async (result) => {
      setOtp(result);
      setQr(await QRCode.toDataURL(result.code, { margin: 1, width: 220 }));
      await queryClient.invalidateQueries({ queryKey: ['membership', id] });
    },
  });

  useEffect(() => {
    setOtp(null);
    setQr('');
  }, [id]);

  if (!membership.data) return <main className="px-4 py-8">Loading pass…</main>;
  const pass = membership.data;
  const quantities = pass.entitlements.filter((ent) => ent.entitlementType === 'QUANTITY');
  const value = pass.entitlements.find((ent) => ent.entitlementType === 'VALUE');

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <PageHeader title={pass.planSnapshot.name} subtitle={`${pass.salon?.name || 'Salon'} · ${pass.status} · until ${new Date(pass.expiresAt).toLocaleDateString()}`} />
      <Card>
        <p className="text-sm text-muted">{pass.planSnapshot.restrictions || 'No extra restrictions were listed.'}</p>
        {value ? (
          <p className="mt-3 text-sm">
            Remaining service entitlement {formatPaise((value.remainingValue ?? 0))} of {formatPaise(value.totalValue)}. This cannot be withdrawn.
          </p>
        ) : null}
      </Card>
      {quantities.map((entitlement) => (
        <ServiceChecklist
          key={entitlement.id}
          entitlement={entitlement}
          pending={challenge.isPending}
          onOtp={() => entitlement.serviceId && challenge.mutate(entitlement.serviceId)}
        />
      ))}
      {quantities.length === 0 && pass.planSnapshot.items?.filter((item) => !item.excluded).map((item) => (
        <Card key={item.serviceId}>
          <p className="font-semibold">{item.service?.name || 'Eligible service'}</p>
          <Button className="mt-3" onClick={() => challenge.mutate(item.serviceId)}>I am here for this service</Button>
        </Card>
      ))}
      {challenge.isError ? <p className="text-sm text-rose-600">{(challenge.error as Error).message}</p> : null}
      {otp ? (
        <Card className="text-center">
          <p className="text-sm text-muted">Show this once for {otp.serviceName}. It expires {new Date(otp.expiresAt).toLocaleTimeString()}. The salon owner types it in Salon → Redemptions. The Stylio admin does not enter this code.</p>
          <p className="mt-2 font-display text-4xl tracking-[0.3em]">{otp.code}</p>
          {qr ? <img src={qr} alt="Membership visit code" className="mx-auto mt-4 h-44 w-44" /> : null}
        </Card>
      ) : null}
      <Link to={`/memberships/${id}/history`} className="text-sm font-semibold text-primary">Redemption history</Link>
    </main>
  );
}

function ServiceChecklist({
  entitlement,
  onOtp,
  pending,
}: {
  entitlement: Entitlement;
  onOtp: () => void;
  pending: boolean;
}) {
  const total = entitlement.totalQuantity;
  const used = entitlement.consumedQuantity;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{entitlement.service?.name || 'Service'}</p>
        <p className="text-sm text-muted">{used} of {total} used</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label={`${entitlement.service?.name || 'Service'} checklist`}>
        {Array.from({ length: total }, (_, index) => {
          const checked = index < used;
          return (
            <span
              key={index}
              aria-checked={checked}
              className={`grid h-10 w-10 place-items-center rounded-xl border ${checked ? 'border-success bg-success/15 text-emerald-700' : 'border-line bg-white text-muted'}`}
            >
              {checked ? '✓' : ''}
            </span>
          );
        })}
      </div>
      <Button className="mt-4" disabled={pending || used >= total} onClick={onOtp}>
        New OTP for this service
      </Button>
    </Card>
  );
}

export function RedemptionHistoryPage() {
  const rows = useQuery({ queryKey: ['my-redemptions'], queryFn: () => api<Redemption[]>('/redemptions/me') });
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Redemption history" />
      <div className="space-y-3">
        {rows.data?.length ? rows.data.map((row) => (
          <Card key={row.id}>
            <p className="font-semibold">{row.serviceName}</p>
            <p className="text-sm text-muted">{row.status} · {new Date(row.redeemedAt).toLocaleString()}</p>
            {row.discountAmount > 0 ? <p className="text-sm">Salon-funded difference {formatPaise(row.discountAmount)} · payable {formatPaise(row.customerPayable)}</p> : null}
          </Card>
        )) : <EmptyState title="No visits yet" body="Checked-off services will appear here." />}
      </div>
    </main>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <PageHeader title="Profile" />
      <Card>
        <p className="text-sm text-muted">{user?.phone}</p>
        <input className="mt-3 w-full rounded-2xl border border-line px-4 py-3" value={name} onChange={(event) => setName(event.target.value)} />
        <Button
          className="mt-3"
          onClick={() => void api('/users/me', { method: 'PATCH', body: JSON.stringify({ name }) })}
        >
          Save
        </Button>
        <button className="mt-4 block text-sm font-semibold text-muted" onClick={() => void logout()}>Log out</button>
      </Card>
    </main>
  );
}

export function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => api<Array<{ id: string; subject: string; status: string }>>('/support/me') });
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <PageHeader title="Support" />
      <Card>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await api('/support', { method: 'POST', body: JSON.stringify({ subject, message }) });
            setSent(true);
          }}
        >
          <input className="w-full rounded-2xl border border-line px-4 py-3" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <textarea className="w-full rounded-2xl border border-line px-4 py-3" rows={4} placeholder="How can we help?" value={message} onChange={(event) => setMessage(event.target.value)} />
          <Button type="submit">Send request</Button>
          {sent ? <p className="text-sm text-emerald-700">Request sent.</p> : null}
        </form>
      </Card>
      <div className="mt-4 space-y-2">
        {tickets.data?.map((ticket) => (
          <Card key={ticket.id}><p className="font-semibold">{ticket.subject}</p><p className="text-sm text-muted">{ticket.status}</p></Card>
        ))}
      </div>
    </main>
  );
}
