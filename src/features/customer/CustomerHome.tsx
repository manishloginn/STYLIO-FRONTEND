import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SalonPhoto, salonPhotos } from '../../components/cards/SalonPhoto';
import { Card, EmptyState } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import { formatPaise } from '../../lib/money';
import { api } from '../../services/api';
import { Membership, Salon } from '../../types';

export function CustomerHome() {
  const { user } = useAuth();
  const memberships = useQuery({
    queryKey: ['my-memberships'],
    queryFn: () => api<Membership[]>('/memberships/me?limit=20'),
  });
  const salons = useQuery({
    queryKey: ['featured-salons'],
    queryFn: () => api<Salon[]>('/salons?limit=6&sort=newest'),
  });
  const active = (memberships.data || []).filter((row) => row.status === 'ACTIVE');

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Your account</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Hello, {user?.name.split(' ')[0]}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Your active memberships are here. At the salon, open a pass and generate a fresh OTP. The salon owner enters that code under Redemptions. The Stylio admin does not.
      </p>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">Running memberships</h2>
          <Link to="/memberships" className="text-sm font-semibold text-primary">All passes</Link>
        </div>
        {memberships.isLoading ? <Card>Loading your memberships…</Card> : null}
        {!memberships.isLoading && active.length === 0 ? (
          <EmptyState title="No active membership yet" body="Explore a salon and buy a plan. The pass appears here after payment is confirmed." action={<Link to="/salons" className="font-semibold text-primary">Explore salons</Link>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((membership) => (
              <Card key={membership.id}>
                <p className="text-sm text-muted">{membership.salon?.name} · {membership.salon?.city}</p>
                <p className="mt-1 font-display text-2xl">{membership.planSnapshot.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {membership.status} · paid {formatPaise(membership.purchasePrice)} · until {new Date(membership.expiresAt).toLocaleDateString()}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {membership.entitlements.map((entitlement) => (
                    <li key={entitlement.id}>
                      {entitlement.service?.name || 'Service entitlement'}
                      {entitlement.entitlementType === 'QUANTITY'
                        ? ` · ${entitlement.remainingQuantity} of ${entitlement.totalQuantity} left`
                        : ` · ${formatPaise(entitlement.remainingValue)} left`}
                    </li>
                  ))}
                </ul>
                <Link to={`/memberships/${membership.id}`} className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  Open pass and get OTP
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Explore something new</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salons.data?.map((salon) => (
            <Link key={salon.id} to={`/salons/${salon.id}`}>
              <Card>
                <SalonPhoto name={salon.name} src={salonPhotos(salon)[0]} className="mb-3 h-36 rounded-2xl" />
                <p className="font-semibold">{salon.name}</p>
                <p className="text-sm text-muted">{salon.city}</p>
                <p className="mt-2 text-sm">{salon.minPrice != null ? `Plans from ${formatPaise(salon.minPrice)}` : 'View plans'}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
