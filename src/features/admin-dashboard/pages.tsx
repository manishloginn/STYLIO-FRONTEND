import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button, Card, Field, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise, rupeesToPaise } from '../../lib/money';
import { api, apiPage, ApiError } from '../../services/api';
import { AdminNav, FilterChips, Meta, QueryState, SalonRow, StatusPill, adminNav, salonName, useAdminSalons, when } from './admin-ui';

export { adminNav };

export function AdminLayout() {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:gap-6 md:py-6">
      <AdminNav />
      <div className="min-w-0 pb-24 md:pb-0"><Outlet /></div>
    </div>
  );
}

export function AdminOverview() {
  const stats = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Record<string, number>>('/admin/overview') });
  const cards = [
    ['Pending salons', stats.data?.pendingSalons, '/admin/salons'],
    ['Active memberships', stats.data?.activeMemberships, '/admin/memberships'],
    ['Stylio sales', formatPaise(stats.data?.stylioSalesPaise), '/admin/payments'],
    ['Sales count', stats.data?.stylioSalesCount, '/admin/payments'],
    ['Redemptions', stats.data?.redemptions, '/admin/redemptions'],
    ['Commission', formatPaise(stats.data?.commissionPaise), '/admin/commission'],
  ] as const;
  return (
    <section>
      <PageHeader title="Platform" subtitle="Approvals, memberships, payments, and the final commission rate for every salon." />
      <QueryState loading={stats.isLoading} error={stats.error} emptyTitle="" emptyBody="">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {cards.map(([label, value, to]) => (
            <Link key={label} to={to} className="rounded-3xl border border-line bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5">
              <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
              <p className="mt-1 font-display text-xl text-ink sm:text-2xl">{value ?? '—'}</p>
            </Link>
          ))}
        </div>
      </QueryState>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link to="/admin/salons" className="rounded-3xl bg-primary px-5 py-4 text-white">
          <p className="text-sm font-semibold">Review salons</p>
          <p className="mt-1 text-sm text-white/80">Approve new partners and open their desks.</p>
        </Link>
        <Link to="/admin/commission" className="rounded-3xl bg-ink px-5 py-4 text-white">
          <p className="text-sm font-semibold">Set commission</p>
          <p className="mt-1 text-sm text-white/80">Base 3% + middleman 2% = final 5% on each sale.</p>
        </Link>
      </div>
    </section>
  );
}

export function AdminSalons() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const salons = useQuery({
    queryKey: ['admin-salons', status],
    queryFn: () => api<SalonRow[]>(`/admin/salons?limit=50${status ? `&status=${status}` : ''}`),
  });

  async function decide(id: string, next: 'APPROVED' | 'REJECTED') {
    setError('');
    try {
      await api(`/admin/salons/${id}/decision`, { method: 'POST', body: JSON.stringify({ status: next, note: note || undefined }) });
      await queryClient.invalidateQueries({ queryKey: ['admin-salons'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the salon');
    }
  }

  return (
    <section>
      <PageHeader title="Salons" subtitle="Every partner application, plus the salons already on Stylio." action={<FilterChips value={status} onChange={setStatus} options={[['', 'All'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['SUSPENDED', 'Suspended']]} />} />
      <Field label="Note saved with the next decision">
        <input className={inputClass} placeholder="Optional note for approve or reject" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4">
        <QueryState loading={salons.isLoading} error={salons.error} empty={!salons.data?.length} emptyTitle="No salons in this filter" emptyBody="Switch to All to see every salon.">
          <div className="grid gap-3">
            {(salons.data || []).map((salon) => (
              <Card key={salon.id} className="hover:translate-y-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{salon.name}</p>
                    <p className="text-sm text-muted">{salon.city} · {salon.phone}{salon.salonType ? ` · ${salon.salonType}` : ''}</p>
                  </div>
                  <StatusPill value={salon.status} />
                </div>
                {salon.reviewNote ? <p className="mt-2 text-sm text-muted">{salon.reviewNote}</p> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {salon.status === 'PENDING' || salon.status === 'REJECTED' ? <Button className="w-full sm:w-auto" onClick={() => void decide(salon.id, 'APPROVED')}>Approve</Button> : null}
                  {salon.status !== 'REJECTED' ? <Button variant="danger" className="w-full sm:w-auto" onClick={() => void decide(salon.id, 'REJECTED')}>Reject</Button> : null}
                  <Link to={`/admin/commission?salon=${salon.id}`} className="inline-flex w-full items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink sm:w-auto">Set commission</Link>
                </div>
              </Card>
            ))}
          </div>
        </QueryState>
      </div>
    </section>
  );
}

interface BranchRow {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  salonId: string;
  reviewNote?: string;
}

export function AdminBranches() {
  const queryClient = useQueryClient();
  const salons = useAdminSalons();
  const [status, setStatus] = useState('PENDING');
  const [error, setError] = useState('');
  const branches = useQuery({
    queryKey: ['admin-branches', status],
    queryFn: () => api<BranchRow[]>(`/admin/branches${status ? `?status=${status}` : ''}`),
  });

  async function decide(id: string, next: 'VERIFIED' | 'REJECTED') {
    setError('');
    try {
      await api(`/admin/branches/${id}/decision`, { method: 'POST', body: JSON.stringify({ status: next }) });
      await queryClient.invalidateQueries({ queryKey: ['admin-branches'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the branch');
    }
  }

  return (
    <section>
      <PageHeader title="Branches" subtitle="Verify a branch before customers can visit it." action={<FilterChips value={status} onChange={setStatus} options={[['', 'All'], ['PENDING', 'Pending'], ['VERIFIED', 'Verified'], ['REJECTED', 'Rejected']]} />} />
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <QueryState loading={branches.isLoading} error={branches.error} empty={!branches.data?.length} emptyTitle="No branches" emptyBody="New salon branches appear here for verification.">
        <div className="grid gap-3">
          {(branches.data || []).map((branch) => (
            <Card key={branch.id} className="hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{branch.name}</p>
                  <p className="text-sm text-muted">{salonName(salons.data, branch.salonId)} · {branch.city}</p>
                </div>
                <StatusPill value={branch.status} />
              </div>
              <p className="mt-2 text-sm text-ink">{branch.address}</p>
              {branch.status === 'PENDING' ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button className="w-full sm:w-auto" onClick={() => void decide(branch.id, 'VERIFIED')}>Verify</Button>
                  <Button variant="danger" className="w-full sm:w-auto" onClick={() => void decide(branch.id, 'REJECTED')}>Reject</Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

interface PlanRow {
  id: string;
  name: string;
  planSource?: string;
  planType?: string;
  sellingPrice?: number;
  validityDays?: number;
  status: string;
  salonId?: string;
}

export function AdminPlans() {
  const queryClient = useQueryClient();
  const salons = useAdminSalons();
  const [status, setStatus] = useState('PENDING_APPROVAL');
  const [error, setError] = useState('');
  const plans = useQuery({
    queryKey: ['admin-plans', status],
    queryFn: () => api<PlanRow[]>(`/admin/plans?limit=50${status ? `&status=${status}` : ''}`),
  });

  async function decide(id: string, next: 'PUBLISHED' | 'REJECTED') {
    setError('');
    try {
      await api(`/admin/plans/${id}/decision`, { method: 'POST', body: JSON.stringify({ status: next }) });
      await queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the plan');
    }
  }

  return (
    <section>
      <PageHeader title="Plans" subtitle="Publish a plan before customers can buy it." action={<FilterChips value={status} onChange={setStatus} options={[['', 'All'], ['PENDING_APPROVAL', 'Pending'], ['PUBLISHED', 'Published'], ['REJECTED', 'Rejected'], ['DRAFT', 'Draft'], ['PAUSED', 'Paused']]} />} />
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <QueryState loading={plans.isLoading} error={plans.error} empty={!plans.data?.length} emptyTitle="No plans" emptyBody="Salon plans waiting for review show up here.">
        <div className="grid gap-3">
          {(plans.data || []).map((plan) => (
            <Card key={plan.id} className="hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted">{salonName(salons.data, plan.salonId)} · {plan.planType} · {plan.planSource}</p>
                </div>
                <StatusPill value={plan.status} />
              </div>
              <div className="mt-2 divide-y divide-line">
                <Meta label="Price" value={formatPaise(plan.sellingPrice)} />
                <Meta label="Validity" value={plan.validityDays ? `${plan.validityDays} days` : '—'} />
              </div>
              {plan.status === 'PENDING_APPROVAL' || plan.status === 'DRAFT' ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button className="w-full sm:w-auto" onClick={() => void decide(plan.id, 'PUBLISHED')}>Publish</Button>
                  <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void decide(plan.id, 'REJECTED')}>Reject</Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

export function AdminList({ title, path }: { title: string; path: string }) {
  if (path.startsWith('/admin/users')) return <PeopleList title={title} path={path} />;
  if (path.startsWith('/admin/memberships')) return <MembershipList />;
  if (path.startsWith('/admin/payments')) return <PaymentList />;
  if (path.startsWith('/admin/redemptions')) return <RedemptionList />;
  if (path.startsWith('/admin/reserves')) return <ReserveList />;
  return <PeopleList title={title} path={path} />;
}

function PeopleList({ title, path }: { title: string; path: string }) {
  const [phone, setPhone] = useState('');
  const rows = useQuery({
    queryKey: ['admin', path, phone],
    queryFn: () => api<Array<{ id: string; name: string; phone: string; role: string; status: string }>>(`${path}${phone ? `&q=${encodeURIComponent(phone)}` : ''}&limit=50`),
  });
  return (
    <section>
      <PageHeader title={title} subtitle="Customer accounts that can buy a membership." />
      <input className={`${inputClass} mb-4 sm:max-w-xs`} placeholder="Search by mobile" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <QueryState loading={rows.isLoading} error={rows.error} empty={!rows.data?.length} emptyTitle="No customers" emptyBody="Registered customers will be listed here.">
        <div className="grid gap-3">
          {(rows.data || []).map((row) => (
            <Card key={row.id} className="hover:translate-y-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-sm text-muted">{row.phone}</p>
                </div>
                <StatusPill value={row.status} />
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

function MembershipList() {
  const [status, setStatus] = useState('');
  const rows = useQuery({
    queryKey: ['admin-memberships', status],
    queryFn: () => api<Array<Record<string, any>>>(`/admin/memberships?limit=50${status ? `&status=${status}` : ''}`),
  });
  return (
    <section>
      <PageHeader title="Memberships" subtitle="Who bought, which salon, and whether the pass is still active." action={<FilterChips value={status} onChange={setStatus} options={[['', 'All'], ['ACTIVE', 'Active'], ['EXPIRED', 'Expired'], ['CANCELLED', 'Cancelled'], ['EXHAUSTED', 'Exhausted']]} />} />
      <QueryState loading={rows.isLoading} error={rows.error} empty={!rows.data?.length} emptyTitle="No memberships" emptyBody="Purchases appear after a customer pays.">
        <div className="grid gap-3">
          {(rows.data || []).map((row) => (
            <Card key={String(row.id)} className="hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.customer?.name || 'Customer'}</p>
                  <p className="text-sm text-muted">{row.customer?.phone || '—'} · {row.salon?.name || 'Salon'}</p>
                </div>
                <StatusPill value={row.status} />
              </div>
              <div className="mt-2 divide-y divide-line">
                <Meta label="Plan" value={row.planSnapshot?.name || row.planTypeSnapshot} />
                <Meta label="Paid" value={formatPaise(row.purchasePrice)} />
                <Meta label="Source" value={row.source} />
                <Meta label="Expires" value={when(row.expiresAt)} />
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  gateway?: string;
  createdAt?: string;
  paidAt?: string | null;
  commissionPaise?: number | null;
  payoutPaise?: number | null;
  rateBps?: number | null;
  settled?: boolean;
  planName?: string | null;
  customer?: { name?: string; phone?: string } | null;
  salon?: { name?: string; city?: string } | null;
}

const PAYMENT_PAGE_SIZES = [5, 10, 20, 50];

function localDateInput(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function paymentStamp(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function PaymentList() {
  const today = localDateInput();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const rows = useQuery({
    queryKey: ['admin-payments', status, q, from, to, limit, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString());
      return apiPage<PaymentRow[]>(`/admin/payments?${params}`);
    },
  });
  const list = rows.data?.data || [];
  const meta = rows.data?.meta;
  const pageSize = meta?.limit || limit;
  const pages = Math.max(1, Math.ceil((meta?.total || 0) / pageSize));
  const start = meta && meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const end = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  function setFilter(next: { status?: string; q?: string; from?: string; to?: string }) {
    if (next.status !== undefined) setStatus(next.status);
    if (next.q !== undefined) setQ(next.q);
    if (next.from !== undefined) setFrom(next.from);
    if (next.to !== undefined) setTo(next.to);
    setPage(1);
  }

  return (
    <section>
      <PageHeader title="Payments" subtitle="Full amount, Stylio commission, and what the salon keeps. Direct salon sales stay on the salon desk." />
      <div className="mb-4 grid gap-3">
        <FilterChips value={status} onChange={(value) => setFilter({ status: value })} options={[['', 'All'], ['PAID', 'Paid'], ['PENDING', 'Pending'], ['FAILED', 'Failed']]} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <input className={inputClass} placeholder="Name, phone, or salon" value={q} onChange={(event) => setFilter({ q: event.target.value })} />
          <input className={inputClass} type="date" aria-label="From" value={from} onChange={(event) => setFilter({ from: event.target.value })} />
          <input className={inputClass} type="date" aria-label="To" value={to} onChange={(event) => setFilter({ to: event.target.value })} />
          <select
            className={inputClass}
            aria-label="Rows per page"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            {PAYMENT_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
          <Button variant="secondary" type="button" onClick={() => setFilter({ status: '', q: '', from: today, to: today })}>Clear filters</Button>
        </div>
      </div>
      {meta ? (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Card className="p-3 hover:translate-y-0"><p className="text-[11px] font-semibold uppercase text-muted">Paid</p><p className="font-display text-lg text-ink">{formatPaise(meta.paidPaise)}</p></Card>
          <Card className="p-3 hover:translate-y-0"><p className="text-[11px] font-semibold uppercase text-primary">Commission</p><p className="font-display text-lg text-primary">{formatPaise(meta.commissionPaise)}</p></Card>
          <Card className="p-3 hover:translate-y-0"><p className="text-[11px] font-semibold uppercase text-emerald-700">Payout</p><p className="font-display text-lg text-emerald-700">{formatPaise(meta.payoutPaise)}</p></Card>
        </div>
      ) : null}
      <QueryState loading={rows.isLoading} error={rows.error} empty={!rows.isLoading && !list.length} emptyTitle="No payments" emptyBody="Nothing matches these filters.">
        <div className="hidden overflow-x-auto rounded-3xl border border-line bg-white md:block">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-canvas text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Salon</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">Payout</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 text-muted">{paymentStamp(row.paidAt || row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{row.customer?.name || 'Customer'}</p>
                    <p className="text-muted">{row.customer?.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{row.salon?.name || '—'}</p>
                    <p className="text-muted">{row.planName || row.salon?.city || '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatPaise(row.amount)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-primary">{formatPaise(row.commissionPaise)}</p>
                    <p className="text-xs text-muted">{row.rateBps != null ? `${(row.rateBps / 100).toFixed(2)}%` : '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-emerald-700">{formatPaise(row.payoutPaise)}</p>
                    <p className="text-xs text-muted">{row.settled ? 'Settled' : row.payoutPaise != null ? 'Not settled' : '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill value={row.status} />
                    <p className="mt-1 text-xs text-muted">{row.gateway || '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">
          {list.map((row) => (
            <Card key={row.id} className="hover:translate-y-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.customer?.name || 'Customer'}</p>
                  <p className="text-sm text-muted">{row.customer?.phone || '—'}</p>
                </div>
                <StatusPill value={row.status} />
              </div>
              <p className="mt-2 text-sm text-ink">{row.salon?.name || 'Salon'} · {row.planName || 'Plan'}</p>
              <p className="text-xs text-muted">{paymentStamp(row.paidAt || row.createdAt)} · {row.gateway || '—'}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-canvas px-2 py-2">
                  <p className="text-[11px] font-semibold uppercase text-muted">Payment</p>
                  <p className="text-sm font-semibold">{formatPaise(row.amount)}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 px-2 py-2">
                  <p className="text-[11px] font-semibold uppercase text-primary">Commission</p>
                  <p className="text-sm font-semibold">{formatPaise(row.commissionPaise)}</p>
                </div>
                <div className="rounded-2xl bg-success/15 px-2 py-2">
                  <p className="text-[11px] font-semibold uppercase text-emerald-700">Payout</p>
                  <p className="text-sm font-semibold">{formatPaise(row.payoutPaise)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">{meta?.total ? `${start}–${end} of ${meta.total}` : '0 payments'}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button variant="secondary" type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      </QueryState>
    </section>
  );
}

function RedemptionList() {
  const salons = useAdminSalons();
  const rows = useQuery({
    queryKey: ['admin-redemptions'],
    queryFn: () => api<Array<Record<string, any>>>('/admin/redemptions'),
  });
  return (
    <section>
      <PageHeader title="Redemptions" subtitle="Visits the salon checked off. The visit OTP is entered by the salon, not here." />
      <QueryState loading={rows.isLoading} error={rows.error} empty={!rows.data?.length} emptyTitle="No redemptions" emptyBody="Completed visits will be listed with the customer and service.">
        <div className="grid gap-3">
          {(rows.data || []).map((row) => (
            <Card key={String(row.id)} className="hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.customer?.name || 'Customer'}</p>
                  <p className="text-sm text-muted">{row.customer?.phone || '—'} · {row.serviceName}</p>
                </div>
                <StatusPill value={row.status} />
              </div>
              <div className="mt-2 divide-y divide-line">
                <Meta label="Plan" value={row.planName} />
                <Meta label="Salon" value={salonName(salons.data, row.salonId)} />
                <Meta label="Retail" value={formatPaise(row.retailPriceSnapshot)} />
                <Meta label="Customer paid" value={formatPaise(row.customerPayable)} />
                <Meta label="When" value={when(row.redeemedAt)} />
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

function ReserveList() {
  const salons = useAdminSalons();
  const rows = useQuery({ queryKey: ['admin-reserves'], queryFn: () => api<Array<Record<string, any>>>('/admin/reserves') });
  return (
    <section>
      <PageHeader title="Reserves" subtitle="Money held back from a recorded settlement. This is still the salon's payable, not Stylio revenue." />
      <QueryState loading={rows.isLoading} error={rows.error} empty={!rows.data?.length} emptyTitle="No reserves" emptyBody="A reserve appears when you hold an amount on a payout.">
        <div className="grid gap-3">
          {(rows.data || []).map((row) => (
            <Card key={String(row.id)} className="hover:translate-y-0">
              <p className="font-semibold">{salonName(salons.data, row.salonId)}</p>
              <div className="mt-2 divide-y divide-line">
                <Meta label="Held" value={formatPaise(row.deltaPaise)} />
                <Meta label="Reason" value={row.reason} />
                <Meta label="When" value={when(row.createdAt)} />
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

export function AdminRefunds() {
  const queryClient = useQueryClient();
  const refunds = useQuery({ queryKey: ['admin-refunds'], queryFn: () => api<Array<Record<string, any>>>('/admin/refunds') });
  const [form, setForm] = useState({ paymentId: '', amount: '', reason: '' });
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/admin/refunds', {
        method: 'POST',
        body: JSON.stringify({ paymentId: form.paymentId.trim(), amount: rupeesToPaise(form.amount), reason: form.reason }),
      });
      setForm({ paymentId: '', amount: '', reason: '' });
      await queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the refund');
    }
  }

  return (
    <section>
      <PageHeader title="Refunds" subtitle="The commission reversal uses the final rate stored on that sale." />
      <Card className="hover:translate-y-0">
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Payment id">
            <input className={inputClass} value={form.paymentId} onChange={(event) => setForm({ ...form, paymentId: event.target.value })} />
          </Field>
          <Field label="Amount in rupees">
            <input className={inputClass} inputMode="decimal" placeholder="250 or 250.50" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </Field>
          <Field label="Reason">
            <input className={inputClass} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full sm:w-auto">Record refund</Button>
        </form>
      </Card>
      <div className="mt-4">
        <QueryState loading={refunds.isLoading} error={refunds.error} empty={!refunds.data?.length} emptyTitle="No refunds" emptyBody="Recorded refunds stay in the list. Nothing is deleted.">
          <div className="grid gap-3">
            {(refunds.data || []).map((row) => (
              <Card key={String(row.id)} className="hover:translate-y-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{formatPaise(row.amount)}</p>
                  <StatusPill value={row.status} />
                </div>
                <div className="mt-2 divide-y divide-line">
                  <Meta label="Commission reversed" value={formatPaise(row.commissionReversalPaise)} />
                  <Meta label="Rate snapshot" value={row.rateBpsSnapshot != null ? `${(row.rateBpsSnapshot / 100).toFixed(2)}%` : '—'} />
                  <Meta label="Reason" value={row.reason} />
                  <Meta label="When" value={when(row.createdAt)} />
                </div>
              </Card>
            ))}
          </div>
        </QueryState>
      </div>
    </section>
  );
}

export function AdminPayouts() {
  const queryClient = useQueryClient();
  const salons = useAdminSalons();
  const payouts = useQuery({ queryKey: ['admin-payouts'], queryFn: () => api<Array<Record<string, any>>>('/admin/payouts') });
  const [form, setForm] = useState({ salonId: '', periodStart: '', periodEnd: '', reserve: '0' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const payout = await api<{ netPaise: number }>('/admin/payouts', {
        method: 'POST',
        body: JSON.stringify({
          salonId: form.salonId,
          periodStart: new Date(`${form.periodStart}T00:00:00`).toISOString(),
          periodEnd: new Date(`${form.periodEnd}T23:59:59`).toISOString(),
          reservePaise: rupeesToPaise(form.reserve || '0'),
        }),
      });
      setMessage(`Recorded net ${formatPaise(payout.netPaise)}. No bank transfer was sent.`);
      await queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-reserves'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the settlement');
    }
  }

  return (
    <section>
      <PageHeader title="Payouts" subtitle="This records a settlement for review. It does not send money." />
      <Card className="hover:translate-y-0">
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Salon">
            <select className={inputClass} value={form.salonId} onChange={(event) => setForm({ ...form, salonId: event.target.value })}>
              <option value="">Choose a salon</option>
              {(salons.data || []).map((salon) => <option key={salon.id} value={salon.id}>{salon.name} · {salon.city}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From"><input className={inputClass} type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} /></Field>
            <Field label="To"><input className={inputClass} type="date" value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} /></Field>
          </div>
          <Field label="Reserve in rupees">
            <input className={inputClass} inputMode="decimal" value={form.reserve} onChange={(event) => setForm({ ...form, reserve: event.target.value })} />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="text-sm text-ink">{message}</p> : null}
          <Button type="submit" className="w-full sm:w-auto">Record settlement</Button>
        </form>
      </Card>
      <div className="mt-4">
        <QueryState loading={payouts.isLoading} error={payouts.error} empty={!payouts.data?.length} emptyTitle="No settlements" emptyBody="Recorded payouts stay here. They are not deleted.">
          <div className="grid gap-3">
            {(payouts.data || []).map((row) => (
              <Card key={String(row.id)} className="hover:translate-y-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{salonName(salons.data, row.salonId)}</p>
                  <StatusPill value={row.status} />
                </div>
                <div className="mt-2 divide-y divide-line">
                  <Meta label="Gross" value={formatPaise(row.grossPaise)} />
                  <Meta label="Commission" value={formatPaise(row.commissionPaise)} />
                  <Meta label="Reserve" value={formatPaise(row.reservePaise)} />
                  <Meta label="Net" value={formatPaise(row.netPaise)} />
                  <Meta label="Period" value={`${when(row.periodStart)} – ${when(row.periodEnd)}`} />
                </div>
              </Card>
            ))}
          </div>
        </QueryState>
      </div>
    </section>
  );
}

export function AdminTickets() {
  const queryClient = useQueryClient();
  const tickets = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => api<Array<{ id: string; subject: string; status: string; message: string; createdAt?: string }>>('/admin/tickets'),
  });
  const [error, setError] = useState('');
  return (
    <section>
      <PageHeader title="Support" subtitle="Reply by resolving the ticket. The customer sees the status on their support page." />
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <QueryState loading={tickets.isLoading} error={tickets.error} empty={!tickets.data?.length} emptyTitle="No tickets" emptyBody="Customer messages will land here.">
        <div className="grid gap-3">
          {(tickets.data || []).map((ticket) => (
            <Card key={ticket.id} className="hover:translate-y-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{ticket.subject}</p>
                <StatusPill value={ticket.status} />
              </div>
              <p className="mt-2 text-sm text-ink">{ticket.message}</p>
              <p className="mt-1 text-xs text-muted">{when(ticket.createdAt)}</p>
              {ticket.status !== 'RESOLVED' ? (
                <Button className="mt-3 w-full sm:w-auto" onClick={async () => {
                  setError('');
                  try {
                    await api(`/admin/tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED', message: 'Resolved by admin' }) });
                    await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Could not resolve the ticket');
                  }
                }}>Resolve</Button>
              ) : null}
            </Card>
          ))}
        </div>
      </QueryState>
    </section>
  );
}
