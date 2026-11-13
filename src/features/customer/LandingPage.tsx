import { useQuery } from '@tanstack/react-query';
import { MapPin, Search, Scissors, ShieldCheck, Store } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SalonPhoto, salonPhotos } from '../../components/cards/SalonPhoto';
import { Card } from '../../components/common/ui';
import { formatPaise } from '../../lib/money';
import { api } from '../../services/api';
import { Salon } from '../../types';

export function LandingPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const featured = useQuery({
    queryKey: ['featured-salons'],
    queryFn: () => api<Salon[]>('/salons?limit=3&sort=newest'),
  });

  function search(event: FormEvent) {
    event.preventDefault();
    navigate(city.trim() ? `/salons?city=${encodeURIComponent(city.trim())}` : '/salons');
  }

  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Salon memberships</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-6xl">
            Your Favourite Salon. Your Membership. All in One Place.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted md:text-lg">
            Discover premium salons, explore membership plans and enjoy a simpler way to manage your salon experiences.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/salons" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-primary-dark">
              Explore Salons
            </Link>
            <Link to="/register" className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:border-primary">
              Partner With Stylio
            </Link>
          </div>
        </div>
        <Card className="bg-canvas">
          <form onSubmit={search} className="space-y-3">
            <p className="font-display text-2xl">Find a salon</p>
            <label className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3">
              <MapPin size={18} className="text-primary" />
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City, for example Pune"
                className="w-full bg-transparent outline-none"
              />
            </label>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
              <Search size={16} /> Search salons
            </button>
          </form>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-3xl">Featured salons</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {featured.isLoading
            ? [0, 1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-3xl bg-canvas" />)
            : featured.data && featured.data.length > 0
              ? featured.data.map((salon) => (
                  <Link key={salon.id} to={`/salons/${salon.id}`}>
                    <Card className="h-full">
                      <SalonPhoto name={salon.name} src={salonPhotos(salon)[0]} className="mb-4 h-36 rounded-2xl" />
                      <p className="font-semibold">{salon.name}</p>
                      <p className="text-sm text-muted">{salon.city}</p>
                      {salon.minPrice != null ? <p className="mt-2 text-sm">Plans from {formatPaise(salon.minPrice)}</p> : null}
                      {salon.rating ? (
                        <p className="mt-2 text-sm text-muted">{salon.rating.average} from {salon.rating.count} reviews</p>
                      ) : (
                        <p className="mt-2 text-sm text-muted">No reviews yet</p>
                      )}
                    </Card>
                  </Link>
                ))
              : (
                  <Card className="md:col-span-3">
                    <p className="font-semibold">Salons will appear here once they are approved.</p>
                    <p className="mt-1 text-sm text-muted">This list comes from the live catalogue, not sample testimonials.</p>
                  </Card>
                )}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <h2 className="font-display text-3xl">Membership types</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            ['Service visits', 'A set number of haircuts, beard trims, or other services.'],
            ['Service value', 'A salon-defined entitlement that can only be used on eligible services.'],
            ['Both', 'A value limit and a quantity limit, checked together.'],
            ['Member price', 'A salon-funded percentage. Stylio does not pay the difference.'],
          ].map(([title, body]) => (
            <Card key={title}>
              <p className="font-semibold">{title}</p>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {[
          { icon: Search, title: 'Discover', body: 'Search by city, service, and membership.' },
          { icon: Scissors, title: 'Choose a plan', body: 'Read the salon’s price, limits, and restrictions before you pay.' },
          { icon: ShieldCheck, title: 'Show a fresh OTP', body: 'Each visit gets a new code. The salon checks off that service.' },
        ].map((step) => (
          <Card key={step.title}>
            <step.icon size={20} className="text-primary" />
            <p className="mt-3 font-semibold">{step.title}</p>
            <p className="mt-1 text-sm text-muted">{step.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto mt-14 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <Card>
          <p className="font-display text-2xl">For customers</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>See the real plan, not a platform discount.</li>
            <li>Keep a digital pass with remaining visits.</li>
            <li>Generate a new OTP before every service.</li>
          </ul>
        </Card>
        <Card>
          <Store className="text-secondary" />
          <p className="mt-3 font-display text-2xl">For salons</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>List an existing subscription or create a Stylio plan.</li>
            <li>You set every price and entitlement.</li>
            <li>Commission applies only to sales attributed to Stylio.</li>
          </ul>
        </Card>
      </section>
    </main>
  );
}
