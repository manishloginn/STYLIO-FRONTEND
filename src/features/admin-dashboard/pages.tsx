import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button, Card, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise } from '../../lib/money';
import { api } from '../../services/api';

export const adminNav = [
  ['', 'Overview'],
  ['salons', 'Salon applications'],
  ['branches', 'Branches'],
  ['plans', 'Plans'],
  ['customers', 'Customers'],
  ['memberships', 'Memberships'],
  ['payments', 'Payments'],
  ['refunds', 'Refunds'],
  ['commission', 'Commission'],
  ['middlemen', 'Middlemen'],
  ['payouts', 'Payouts'],
  ['reserves', 'Reserves'],
  ['redemptions', 'Redemptions'],
  ['tickets', 'Support'],
];

export function AdminLayout() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 overflow-x-auto md:block md:space-y-1">
        {adminNav.map(([to, label]) => (
          <NavLink key={label} end={to === ''} to={to ? `/admin/${to}` : '/admin'} className={({ isActive }) => `block whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-semibold transition duration-200 ${isActive ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 pb-16"><Outlet /></div>
    </div>
  );
}

export function AdminOverview() {
  const stats = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Record<string, number>>('/admin/overview') });
  const cards = [
    ['Pending salons', stats.data?.pendingSalons],
    ['Active memberships', stats.data?.activeMemberships],
    ['Stylio sales', formatPaise(stats.data?.stylioSalesPaise)],
    ['Redemptions', stats.data?.redemptions],
    ['Commission', formatPaise(stats.data?.commissionPaise)],
  ];
  return (
    <section>
      <PageHeader title="Platform" subtitle="Salon approvals, plans, payments, and commission. Visit OTPs are entered by the salon owner, not here." />
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(([label, value]) => <Card key={String(label)}><p className="text-sm text-muted">{label}</p><p className="font-display text-2xl">{value ?? '—'}</p></Card>)}
      </div>
    </section>
  );
}

function Rows({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <Card>Nothing in this list.</Card>;
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl border border-line md:block">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.id || index)} className="border-t border-line">
                <td className="p-3">{Object.entries(row).slice(0, 4).map(([key, value]) => <span key={key} className="mr-3">{key}: {String(value ?? '')}</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => <Card key={String(row.id || index)}>{Object.entries(row).slice(0, 4).map(([key, value]) => <p key={key} className="text-sm">{key}: {String(value ?? '')}</p>)}</Card>)}
      </div>
    </>
  );
}

export function AdminSalons() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const salons = useQuery({ queryKey: ['admin-salons', status], queryFn: () => api<Array<Record<string, unknown>>>(`/admin/salons?status=${status}`) });
  return (
    <section>
      <PageHeader title="Salon applications" action={<select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select>} />
      <div className="grid gap-3">
        {(salons.data || []).map((salon) => (
          <Card key={String(salon.id)}>
            <p className="font-semibold">{String(salon.name)} · {String(salon.city)}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={async () => { await api(`/admin/salons/${salon.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'APPROVED' }) }); await queryClient.invalidateQueries({ queryKey: ['admin-salons'] }); }}>Approve</Button>
              <Button variant="danger" onClick={async () => { await api(`/admin/salons/${salon.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'REJECTED', note: 'Not a fit' }) }); await queryClient.invalidateQueries({ queryKey: ['admin-salons'] }); }}>Reject</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function AdminBranches() {
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['admin-branches'], queryFn: () => api<Array<Record<string, unknown>>>('/admin/branches') });
  return (
    <section>
      <PageHeader title="Branch verification" />
      {(branches.data || []).map((branch) => (
        <Card key={String(branch.id)} className="mb-3">
          <p className="font-semibold">{String(branch.name)}</p>
          <Button className="mt-3" onClick={async () => { await api(`/admin/branches/${branch.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'VERIFIED' }) }); await queryClient.invalidateQueries({ queryKey: ['admin-branches'] }); }}>Verify</Button>
        </Card>
      ))}
    </section>
  );
}

export function AdminPlans() {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['admin-plans'], queryFn: () => api<Array<Record<string, unknown>>>('/admin/plans?status=PENDING_APPROVAL') });
  return (
    <section>
      <PageHeader title="Plan review" />
      {(plans.data || []).map((plan) => (
        <Card key={String(plan.id)} className="mb-3">
          <p className="font-semibold">{String(plan.name)} · {String(plan.planSource)}</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={async () => { await api(`/admin/plans/${plan.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'PUBLISHED' }) }); await queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); }}>Publish</Button>
            <Button variant="secondary" onClick={async () => { await api(`/admin/plans/${plan.id}/decision`, { method: 'POST', body: JSON.stringify({ status: 'REJECTED' }) }); await queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); }}>Reject</Button>
          </div>
        </Card>
      ))}
    </section>
  );
}

export function AdminList({ title, path }: { title: string; path: string }) {
  const rows = useQuery({ queryKey: ['admin', path], queryFn: () => api<Array<Record<string, unknown>>>(path) });
  const list = Array.isArray(rows.data) ? rows.data : [];
  return (
    <section>
      <PageHeader title={title} />
      <Rows rows={list.map((row) => flatten(row))} />
    </section>
  );
}

export function AdminRefunds() {
  const queryClient = useQueryClient();
  const refunds = useQuery({ queryKey: ['admin-refunds'], queryFn: () => api<Array<Record<string, unknown>>>('/admin/refunds') });
  const [form, setForm] = useState({ paymentId: '', amount: '', reason: '' });
  return (
    <section>
      <PageHeader title="Refunds" subtitle="The commission reversal uses the rate stored on the original sale." />
      <Card>
        <form className="grid gap-3" onSubmit={async (event: FormEvent) => {
          event.preventDefault();
          await api('/admin/refunds', { method: 'POST', body: JSON.stringify({ paymentId: form.paymentId, amount: Number(form.amount), reason: form.reason }) });
          await queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
        }}>
          <input className={inputClass} placeholder="Payment id" value={form.paymentId} onChange={(event) => setForm({ ...form, paymentId: event.target.value })} />
          <input className={inputClass} placeholder="Amount in paise" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          <input className={inputClass} placeholder="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          <Button type="submit">Record refund</Button>
        </form>
      </Card>
      <div className="mt-4"><Rows rows={(refunds.data || []).map((row) => flatten(row))} /></div>
    </section>
  );
}

export function AdminCommission() {
  const queryClient = useQueryClient();
  const rules = useQuery({ queryKey: ['rules'], queryFn: () => api<Array<Record<string, unknown>>>('/admin/commission-rules') });
  const [rate, setRate] = useState('8');
  const [salonId, setSalonId] = useState('');
  return (
    <section>
      <PageHeader title="Commission rules" subtitle="800 basis points is 8%. Historical sales keep their own snapshot." />
      <Card>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={async (event) => {
          event.preventDefault();
          await api('/admin/commission-rules', { method: 'POST', body: JSON.stringify({ rateBps: Math.round(Number(rate) * 100), salonId: salonId || undefined, effectiveFrom: new Date().toISOString() }) });
          await queryClient.invalidateQueries({ queryKey: ['rules'] });
        }}>
          <input className={inputClass} placeholder="Percent" value={rate} onChange={(event) => setRate(event.target.value)} />
          <input className={inputClass} placeholder="Salon id, blank for platform" value={salonId} onChange={(event) => setSalonId(event.target.value)} />
          <Button type="submit">Save rule</Button>
        </form>
      </Card>
      <div className="mt-4"><Rows rows={(rules.data || []).map((row) => flatten(row))} /></div>
    </section>
  );
}

export function AdminPayouts() {
  const [form, setForm] = useState({ salonId: '', periodStart: '', periodEnd: '', reservePaise: '0' });
  const [message, setMessage] = useState('');
  return (
    <section>
      <PageHeader title="Payouts" subtitle="This records a settlement. It does not send money." />
      <Card>
        <form className="grid gap-3" onSubmit={async (event) => {
          event.preventDefault();
          const payout = await api<{ netPaise: number }>('/admin/payouts', {
            method: 'POST',
            body: JSON.stringify({
              salonId: form.salonId,
              periodStart: new Date(form.periodStart).toISOString(),
              periodEnd: new Date(form.periodEnd).toISOString(),
              reservePaise: Number(form.reservePaise),
            }),
          });
          setMessage(`Recorded net ${formatPaise(payout.netPaise)}`);
        }}>
          <input className={inputClass} placeholder="Salon id" value={form.salonId} onChange={(event) => setForm({ ...form, salonId: event.target.value })} />
          <input className={inputClass} type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} />
          <input className={inputClass} type="date" value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} />
          <input className={inputClass} placeholder="Reserve paise" value={form.reservePaise} onChange={(event) => setForm({ ...form, reservePaise: event.target.value })} />
          <Button type="submit">Record settlement</Button>
          {message ? <p className="text-sm">{message}</p> : null}
        </form>
      </Card>
    </section>
  );
}

export function AdminTickets() {
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ['admin-tickets'], queryFn: () => api<Array<{ id: string; subject: string; status: string; message: string }>>('/admin/tickets') });
  return (
    <section>
      <PageHeader title="Support tickets" />
      {(tickets.data || []).map((ticket) => (
        <Card key={ticket.id} className="mb-3">
          <p className="font-semibold">{ticket.subject}</p>
          <p className="text-sm text-muted">{ticket.message}</p>
          <Button className="mt-3" onClick={async () => { await api(`/admin/tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED', message: 'Resolved by admin' }) }); await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }); }}>Resolve</Button>
        </Card>
      ))}
    </section>
  );
}

function flatten(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'object') continue;
    out[key] = value;
  }
  return out;
}
