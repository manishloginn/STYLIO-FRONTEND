import { Compass, KeyRound, LayoutDashboard, Menu, Percent, Store, Ticket, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { adminNav } from '../../features/admin-dashboard/pages';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../lib/home';
import { Role } from '../../types';
import { salonLinks } from './SalonNav';
import { Logo } from './Logo';

const roleLabel: Record<Role, string> = {
  PLATFORM_ADMIN: 'Admin',
  SALON_OWNER: 'Salon owner',
  SALON_STAFF: 'Salon staff',
  CUSTOMER: 'Customer',
};

export function SiteChrome() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const home = homeFor(user?.role);
  const salonId = location.pathname.match(/^\/salon\/([^/]+)/)?.[1];
  const links = user?.role === 'PLATFORM_ADMIN'
    ? [{ to: '/admin', label: 'Admin' }, { to: '/admin/payments', label: 'Payments' }, { to: '/salons', label: 'Explore' }]
    : user?.role === 'SALON_OWNER' || user?.role === 'SALON_STAFF'
      ? [{ to: '/salon', label: 'Salon desk' }, { to: '/salons', label: 'Explore' }]
      : [{ to: '/salons', label: 'Explore' }, { to: '/memberships', label: 'Passes' }, { to: '/support', label: 'Support' }];

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={user ? home : '/'} className="rounded-2xl transition duration-200 hover:opacity-90 active:scale-[0.98]" aria-label="Stylio">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `transition duration-200 ${isActive ? 'text-primary' : 'hover:text-ink'}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Link to={home} className="text-sm font-semibold text-ink">
                  {user.name.split(' ')[0]}
                </Link>
                <button className="text-sm font-semibold text-muted" onClick={() => void logout()}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-ink">
                  Log in
                </Link>
                <Link to="/register" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-primary-dark">
                  Get started
                </Link>
              </>
            )}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-2xl text-ink transition duration-200 hover:bg-canvas active:scale-95 md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 animate-fade-in bg-ink/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] animate-slide-in-right flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div>
                <Logo />
                {user ? (
                  <p className="text-sm text-muted">{user.name} · {roleLabel[user.role]}</p>
                ) : (
                  <p className="text-sm text-muted">Browse salons and memberships</p>
                )}
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-2xl text-ink" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
              <DrawerGroup title="Menu" links={links} />
              {user?.role === 'PLATFORM_ADMIN' ? (
                <DrawerGroup
                  title="Admin"
                  links={adminNav.map(([to, label]) => ({ to: to ? `/admin/${to}` : '/admin', label }))}
                />
              ) : null}
              {salonId && (user?.role === 'SALON_OWNER' || user?.role === 'SALON_STAFF') ? (
                <DrawerGroup
                  title="Salon desk"
                  links={salonLinks.map((link) => ({
                    to: link.to ? `/salon/${salonId}/${link.to}` : `/salon/${salonId}`,
                    label: link.label,
                  }))}
                />
              ) : null}
              <DrawerGroup
                title="Account"
                links={user
                  ? [{ to: '/profile', label: 'Profile' }, { to: '/register', label: 'Partner with Stylio' }]
                  : [{ to: '/login', label: 'Log in' }, { to: '/register', label: 'Create an account' }]}
              />
            </div>
            {user ? (
              <div className="border-t border-line p-4">
                <button
                  className="w-full rounded-full border border-line px-4 py-3 text-sm font-semibold text-ink"
                  onClick={() => void logout()}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
      <div key={location.pathname} className="animate-fade-up">
        <Outlet />
      </div>
      <footer className="mt-16 border-t border-line bg-canvas pb-20 md:pb-0">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl">Stylio</p>
            <p className="mt-2 text-sm text-muted">Salon memberships, bought online and used at the salon.</p>
          </div>
          <div className="text-sm text-muted">
            <p className="font-semibold text-ink">Customers</p>
            <Link className="mt-2 block transition duration-200 hover:text-ink" to="/salons">Explore salons</Link>
            <Link className="mt-1 block transition duration-200 hover:text-ink" to="/memberships">My memberships</Link>
          </div>
          <div className="text-sm text-muted">
            <p className="font-semibold text-ink">Salons</p>
            <Link className="mt-2 block transition duration-200 hover:text-ink" to="/register">Partner with Stylio</Link>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-white md:hidden">
        {salonId && (user?.role === 'SALON_OWNER' || user?.role === 'SALON_STAFF') ? (
          <>
            <NavLink to={`/salon/${salonId}`} end className="grid place-items-center py-2 text-xs font-semibold text-muted transition duration-200 active:scale-95">
              <Store size={18} /> Desk
            </NavLink>
            <NavLink to={`/salon/${salonId}/redemptions`} className="grid place-items-center py-2 text-xs font-semibold text-muted transition duration-200 active:scale-95">
              <KeyRound size={18} /> OTP
            </NavLink>
            <NavLink to="/profile" className="grid place-items-center py-2 text-xs font-semibold text-muted transition duration-200 active:scale-95">
              <UserRound size={18} /> Account
            </NavLink>
          </>
        ) : user?.role === 'PLATFORM_ADMIN' ? (
          <>
            <NavLink to="/admin" end className={({ isActive }) => `grid place-items-center py-2 text-xs font-semibold transition duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-muted'}`}>
              <LayoutDashboard size={18} /> Desk
            </NavLink>
            <NavLink to="/admin/salons" className={({ isActive }) => `grid place-items-center py-2 text-xs font-semibold transition duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-muted'}`}>
              <Store size={18} /> Salons
            </NavLink>
            <NavLink to="/admin/commission" className={({ isActive }) => `grid place-items-center py-2 text-xs font-semibold transition duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-muted'}`}>
              <Percent size={18} /> Rates
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to={links[0].to} className="grid place-items-center py-2 text-xs font-semibold text-muted transition duration-200 active:scale-95">
              <Compass size={18} /> {links[0].label}
            </NavLink>
            <NavLink to={links[1]?.to || '/salons'} className="grid place-items-center py-2 text-xs font-semibold text-muted transition duration-200 active:scale-95">
              <Ticket size={18} /> {links[1]?.label || 'Explore'}
            </NavLink>
            <NavLink to={user ? '/profile' : '/login'} className="grid place-items-center py-2 text-xs font-semibold text-muted transition duration-200 active:scale-95">
              <UserRound size={18} /> Account
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}

function DrawerGroup({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-2 space-y-1">
        {links.map((link) => (
          <NavLink
            key={`${title}-${link.to}-${link.label}`}
            to={link.to}
            end={link.to === '/admin' || link.to.split('/').length <= 2 || /^\/salon\/[^/]+$/.test(link.to)}
            className={({ isActive }) => `block rounded-2xl px-3 py-3 text-sm font-semibold transition duration-200 ${isActive ? 'bg-primary text-white' : 'text-ink hover:bg-canvas'}`}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
