import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Card, EmptyState, Skeleton } from '../../components/common/ui';
import { api } from '../../services/api';

export const adminGroups: Array<{ title: string; links: Array<[string, string]> }> = [
  { title: 'Desk', links: [['', 'Overview']] },
  { title: 'Salons', links: [['salons', 'Salons'], ['branches', 'Branches']] },
  { title: 'Catalogue', links: [['plans', 'Plans']] },
  { title: 'People', links: [['customers', 'Customers'], ['memberships', 'Memberships']] },
  { title: 'Money', links: [['payments', 'Payments'], ['refunds', 'Refunds'], ['commission', 'Commission'], ['middlemen', 'Middlemen'], ['payouts', 'Payouts'], ['reserves', 'Reserves']] },
  { title: 'Activity', links: [['redemptions', 'Redemptions'], ['tickets', 'Support']] },
];

export const adminNav: Array<[string, string]> = adminGroups.flatMap((group) => group.links);

export interface SalonRow {
  id: string;
  name: string;
  city: string;
  phone: string;
  salonType?: string;
  status: string;
  reviewNote?: string;
}

export function useAdminSalons() {
  return useQuery({
    queryKey: ['admin-salons', 'all'],
    queryFn: () => api<SalonRow[]>('/admin/salons?limit=50'),
  });
}

export function salonName(salons: SalonRow[] | undefined, id?: string | null) {
  if (!id) return 'Platform default';
  return salons?.find((salon) => salon.id === id)?.name || 'Salon';
}

export function when(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function bpsLabel(bps?: number | null) {
  if (bps == null || Number.isNaN(bps)) return '—';
  return `${(bps / 100).toFixed(2)}%`;
}

export function percentToBps(input: string) {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const bps = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (bps > 10_000) return null;
  return bps;
}

export function bpsToInput(bps?: number | null) {
  if (bps == null) return '';
  const whole = Math.floor(bps / 100);
  const frac = bps % 100;
  return frac ? `${whole}.${String(frac).padStart(2, '0')}`.replace(/0$/, '') : String(whole);
}

const statusTone: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  APPROVED: 'bg-success/15 text-emerald-700',
  PUBLISHED: 'bg-success/15 text-emerald-700',
  VERIFIED: 'bg-success/15 text-emerald-700',
  ACTIVE: 'bg-success/15 text-emerald-700',
  PAID: 'bg-success/15 text-emerald-700',
  COMPLETED: 'bg-success/15 text-emerald-700',
  RESOLVED: 'bg-success/15 text-emerald-700',
  RECORDED: 'bg-primary/10 text-primary',
  REJECTED: 'bg-rose-100 text-rose-700',
  FAILED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  SUSPENDED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-canvas text-muted',
  EXHAUSTED: 'bg-canvas text-muted',
  INACTIVE: 'bg-canvas text-muted',
  DRAFT: 'bg-canvas text-muted',
  PAUSED: 'bg-canvas text-muted',
};

export function StatusPill({ value }: { value?: string | null }) {
  const label = value || 'UNKNOWN';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[label] || 'bg-canvas text-ink'}`}>{label.replaceAll('_', ' ')}</span>;
}

export function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 text-right font-medium text-ink">{value || '—'}</span>
    </div>
  );
}

export function FilterChips({ value, options, onChange }: { value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:max-w-xl sm:justify-end">
      {options.map(([id, label]) => (
        <button
          key={id || 'all'}
          type="button"
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 ${value === id ? 'bg-primary text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function QueryState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyBody,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyTitle: string;
  emptyBody: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (error) {
    return <Card className="hover:translate-y-0"><p className="text-sm text-rose-600">{error instanceof Error ? error.message : 'Could not load this list'}</p></Card>;
  }
  if (empty) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return children;
}

export function AdminNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const current = adminNav.find(([to]) => (to ? location.pathname === `/admin/${to}` : location.pathname === '/admin'));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="sticky top-16 z-20 md:hidden">
        <button
          type="button"
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-left shadow-card"
          onClick={() => setOpen((value) => !value)}
        >
          <span>
            <span className="block text-xs font-medium text-muted">Admin</span>
            <span className="block text-sm font-semibold text-ink">{current?.[1] ?? 'Overview'}</span>
          </span>
          <span className="text-sm font-semibold text-primary">{open ? 'Hide' : 'Sections'}</span>
        </button>
        {open ? (
          <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-3xl border border-line bg-white p-3 shadow-card">
            <AdminLinks compact />
          </div>
        ) : null}
      </div>
      <nav aria-label="Admin" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto md:block">
        <AdminLinks />
      </nav>
    </>
  );
}

function AdminLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      {adminGroups.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.title}</p>
          <div className={compact ? 'mt-2 grid grid-cols-2 gap-2' : 'mt-1 space-y-1'}>
            {group.links.map(([to, label]) => (
              <NavLink
                key={label}
                end={to === ''}
                to={to ? `/admin/${to}` : '/admin'}
                className={({ isActive }) =>
                  `block rounded-2xl px-3 py-2.5 text-left text-sm font-semibold leading-snug transition duration-200 ${
                    isActive ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-ink'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
