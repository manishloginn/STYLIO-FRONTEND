import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export const salonLinks = [
  { to: '', label: 'Overview' },
  { to: 'profile', label: 'Salon Profile' },
  { to: 'branches', label: 'Branch Management' },
  { to: 'services', label: 'Service Catalogue' },
  { to: 'plans', label: 'Membership Plans' },
  { to: 'existing', label: 'Existing Subscriptions' },
  { to: 'memberships', label: 'Active Memberships' },
  { to: 'redemptions', label: 'Redemptions' },
  { to: 'sales', label: 'Sales & Transactions' },
  { to: 'payouts', label: 'Commission & Payouts' },
  { to: 'staff', label: 'Staff Management' },
  { to: 'reports', label: 'Reports' },
  { to: 'settings', label: 'Settings' },
];

function hrefFor(salonId: string, to: string) {
  return to ? `/salon/${salonId}/${to}` : `/salon/${salonId}`;
}

export function SalonNav({ salonId }: { salonId: string }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const current = salonLinks.find((link) => {
    const href = hrefFor(salonId, link.to);
    return link.to ? location.pathname === href || location.pathname.startsWith(`${href}/`) : location.pathname === href;
  });

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
            <span className="block text-xs font-medium text-muted">Desk</span>
            <span className="block text-sm font-semibold text-ink">{current?.label ?? 'Overview'}</span>
          </span>
          <span className="text-sm font-semibold text-primary">{open ? 'Hide' : 'Sections'}</span>
        </button>
        {open ? (
          <div className="mt-2 rounded-3xl border border-line bg-white p-2 shadow-card">
            <SalonLinks salonId={salonId} compact />
          </div>
        ) : null}
      </div>
      <nav aria-label="Salon" className="hidden md:block md:space-y-1">
        <SalonLinks salonId={salonId} />
      </nav>
    </>
  );
}

function SalonLinks({ salonId, compact = false }: { salonId: string; compact?: boolean }) {
  return (
    <div className={compact ? 'grid grid-cols-2 gap-2' : 'space-y-1'}>
      {salonLinks.map((link) => (
        <NavLink
          key={link.label}
          end={link.to === ''}
          to={hrefFor(salonId, link.to)}
          className={({ isActive }) =>
            `block rounded-2xl px-3 py-2.5 text-left text-sm font-semibold leading-snug transition duration-200 ${
              isActive ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-ink'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
