import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SalonPhoto, salonPhotos } from '../../components/cards/SalonPhoto';
import { Button, Card, EmptyState, Field, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise, paiseToRupeesInput, rupeesToPaise } from '../../lib/money';
import { api } from '../../services/api';
import { Salon } from '../../types';

const salonTypes = [
  { value: '', label: 'Any' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
  { value: 'SPA', label: 'Spa' },
];

function queryPaiseToInput(value: string) {
  if (!/^\d+$/.test(value)) return value;
  return paiseToRupeesInput(Number(value)).replace(/\.00$/, '');
}

function emptyDraft() {
  return {
    q: '',
    city: '',
    category: '',
    salonType: '',
    minPrice: '',
    maxPrice: '',
    hasMembership: '',
    sort: 'newest',
  };
}

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState({
    q: params.get('q') || '',
    city: params.get('city') || '',
    category: params.get('category') || '',
    salonType: params.get('salonType') || '',
    minPrice: queryPaiseToInput(params.get('minPrice') || ''),
    maxPrice: queryPaiseToInput(params.get('maxPrice') || ''),
    hasMembership: params.get('hasMembership') || '',
    sort: params.get('sort') || 'newest',
  });
  const query = params.toString();
  const salons = useQuery({
    queryKey: ['salons', query],
    queryFn: () => api<Salon[]>(`/salons?${query}`),
  });
  const filtersOn = Object.entries(draft).some(([key, value]) => (key === 'sort' ? value !== 'newest' : Boolean(value)));

  function patch(next: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Explore salons" subtitle="Filter by city, service category, price, and membership." />
      <form
        className="mb-6 overflow-hidden rounded-3xl border border-line bg-white shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          const next = new URLSearchParams();
          Object.entries(draft).forEach(([key, value]) => {
            if (!value) return;
            if (key === 'minPrice' || key === 'maxPrice') next.set(key, String(rupeesToPaise(value)));
            else next.set(key, value);
          });
          setParams(next);
        }}
      >
        <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
            <SlidersHorizontal size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Filters</p>
            <p className="text-xs text-muted">Pick what you want, then apply.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <label className="col-span-2 block space-y-1.5 text-sm md:col-span-4">
            <span className="font-medium text-ink">Search</span>
            <span className="relative block">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className={`${inputClass} pl-11`}
                placeholder="Salon name"
                value={draft.q}
                onChange={(event) => patch({ q: event.target.value })}
              />
            </span>
          </label>
          <Field label="City">
            <input className={inputClass} placeholder="Delhi, Pune" value={draft.city} onChange={(event) => patch({ city: event.target.value })} />
          </Field>
          <Field label="Category">
            <input className={inputClass} placeholder="Hair, nails" value={draft.category} onChange={(event) => patch({ category: event.target.value })} />
          </Field>
          <Field label="Min price ₹">
            <input className={inputClass} inputMode="decimal" placeholder="0" value={draft.minPrice} onChange={(event) => patch({ minPrice: event.target.value })} />
          </Field>
          <Field label="Max price ₹">
            <input className={inputClass} inputMode="decimal" placeholder="5,000" value={draft.maxPrice} onChange={(event) => patch({ maxPrice: event.target.value })} />
          </Field>
          <div className="col-span-2 md:col-span-4">
            <p className="text-sm font-medium text-ink">Salon type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {salonTypes.map((type) => {
                const active = draft.salonType === type.value;
                return (
                  <button
                    key={type.label}
                    type="button"
                    aria-pressed={active}
                    className={`rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200 active:scale-95 ${active ? 'bg-primary text-white' : 'bg-canvas text-ink hover:bg-primary/10'}`}
                    onClick={() => patch({ salonType: type.value })}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="col-span-2 md:col-span-4">
            <p className="text-sm font-medium text-ink">Membership</p>
            <button
              type="button"
              aria-pressed={draft.hasMembership === 'true'}
              className={`mt-2 rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200 active:scale-95 ${draft.hasMembership === 'true' ? 'bg-secondary/20 text-sky-800' : 'bg-canvas text-ink hover:bg-secondary/15'}`}
              onClick={() => patch({ hasMembership: draft.hasMembership === 'true' ? '' : 'true' })}
            >
              Has a membership
            </button>
          </div>
          <div className="col-span-2 md:col-span-4">
            <p className="text-sm font-medium text-ink">Sort</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['newest', 'Newest'],
                ['name', 'Name'],
                ['price', 'Price'],
              ].map(([value, label]) => {
                const active = draft.sort === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    className={`rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200 active:scale-95 ${active ? 'bg-ink text-white' : 'bg-canvas text-ink hover:bg-ink/5'}`}
                    onClick={() => patch({ sort: value })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <Button type="submit" className="flex-1 sm:flex-none">Apply filters</Button>
          {filtersOn ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(emptyDraft());
                setParams(new URLSearchParams());
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </form>
      {salons.isLoading ? <div className="h-40 animate-pulse rounded-3xl bg-canvas" /> : null}
      {salons.isError ? <p className="text-sm text-rose-600">{(salons.error as Error).message}</p> : null}
      {salons.data && salons.data.length === 0 ? (
        <EmptyState title="No salons match" body="Try another city or clear the filters. Only approved salons are listed." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {salons.data?.map((salon) => (
            <Link key={salon.id} to={`/salons/${salon.id}`}>
              <Card className="h-full">
                <SalonPhoto name={salon.name} src={salonPhotos(salon)[0]} className="mb-3 h-36 rounded-2xl" />
                <p className="font-semibold">{salon.name}</p>
                <p className="text-sm text-muted">{salon.city} · {salon.salonType}</p>
                <p className="mt-2 text-sm">{salon.minPrice != null ? `From ${formatPaise(salon.minPrice)}` : 'Plans listed after approval'}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
