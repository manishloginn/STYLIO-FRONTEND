import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Field, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise } from '../../lib/money';
import { api, ApiError } from '../../services/api';
import { Meta, QueryState, SalonRow, StatusPill, bpsLabel, bpsToInput, percentToBps, useAdminSalons, when } from './admin-ui';

interface LinkedMiddleman {
  id: string;
  name: string;
  phone?: string;
}

interface Rule {
  id: string;
  salonId?: string | null;
  middlemanId?: string | null;
  baseRateBps?: number | null;
  middlemanRateBps?: number | null;
  rateBps: number;
  status: string;
  effectiveFrom?: string;
  middleman?: LinkedMiddleman | null;
}

interface Charge {
  id: string;
  baseRateBps?: number | null;
  middlemanRateBps?: number | null;
  rateBps: number;
  commissionPaise: number;
  salonPayablePaise: number;
  reversedPaise: number;
  createdAt?: string;
  salon?: { name?: string; city?: string } | null;
  middleman?: LinkedMiddleman | null;
}

interface MiddlemanOption {
  id: string;
  name: string;
  phone: string;
  status: string;
}

function activeRule(rules: Rule[], salonId?: string | null) {
  return rules.find((rule) => rule.status === 'ACTIVE' && (salonId ? rule.salonId === salonId : !rule.salonId));
}

function RatePreview({ base, middle, person }: { base: string; middle: string; person?: string }) {
  const baseBps = percentToBps(base);
  const middleBps = percentToBps(middle);
  const finalBps = baseBps != null && middleBps != null ? baseBps + middleBps : null;
  const sample = 100_000;
  const commission = finalBps == null || finalBps > 10_000 ? null : Math.floor((sample * finalBps) / 10_000);
  const middleCut = commission == null || middleBps == null ? null : Math.min(Math.floor((sample * middleBps) / 10_000), commission);
  const stylioKeeps = commission == null || middleCut == null ? null : commission - middleCut;
  return (
    <div className="rounded-2xl bg-canvas p-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Base</p>
          <p className="font-display text-lg text-primary">{baseBps == null ? '—' : bpsLabel(baseBps)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Middleman</p>
          <p className="font-display text-lg text-sky-700">{middleBps == null ? '—' : bpsLabel(middleBps)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Final</p>
          <p className="font-display text-lg text-rose-600">{finalBps == null || finalBps > 10_000 ? '—' : bpsLabel(finalBps)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink">
        {commission == null
          ? 'Enter both rates. Final is base plus middleman, and it cannot pass 100%.'
          : `On a ₹1,000 membership, Stylio commission is ${formatPaise(commission)}. The salon keeps ${formatPaise(sample - commission)}.`}
        {middleCut != null && stylioKeeps != null && middleCut > 0
          ? ` ${person || 'The chosen middleman'} receives ${formatPaise(middleCut)}. Stylio keeps ${formatPaise(stylioKeeps)}.`
          : ''}
      </p>
    </div>
  );
}

function RateForm({
  baseValue,
  middleValue,
  salonId,
  middlemanId,
  middlemen,
  onSaved,
}: {
  baseValue: string;
  middleValue: string;
  salonId?: string;
  middlemanId?: string | null;
  middlemen: MiddlemanOption[];
  onSaved: () => Promise<void>;
}) {
  const [base, setBase] = useState(baseValue);
  const [middle, setMiddle] = useState(middleValue);
  const [personId, setPersonId] = useState(middlemanId || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const middleBps = percentToBps(middle);
  const needsPerson = Boolean(salonId) && (middleBps ?? 0) > 0;
  const person = middlemen.find((row) => row.id === personId);
  const choices = middlemen.filter((row) => row.status === 'ACTIVE' || row.id === personId);
  const finalOk = (() => {
    const left = percentToBps(base);
    const right = percentToBps(middle);
    return left != null && right != null && left + right <= 10_000 && (!needsPerson || Boolean(personId));
  })();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const baseRateBps = percentToBps(base);
    const middlemanRateBps = percentToBps(middle);
    if (baseRateBps == null || middlemanRateBps == null || baseRateBps + middlemanRateBps > 10_000) {
      setError('Use rates like 3 and 2. Final cannot pass 100%.');
      return;
    }
    if (needsPerson && !personId) {
      setError('Choose which middleman receives this rate.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api('/admin/commission-rules', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          baseRateBps,
          middlemanRateBps,
          middlemanId: needsPerson ? personId : undefined,
          effectiveFrom: new Date().toISOString(),
        }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the rate');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Base rate %">
          <input className={inputClass} inputMode="decimal" value={base} onChange={(event) => setBase(event.target.value)} placeholder="3" />
        </Field>
        <Field label="Middleman rate %">
          <input className={inputClass} inputMode="decimal" value={middle} onChange={(event) => setMiddle(event.target.value)} placeholder="2" />
        </Field>
      </div>
      {needsPerson ? (
        <Field label="This salon's middleman">
          <select className={inputClass} value={personId} onChange={(event) => setPersonId(event.target.value)}>
            <option value="">Choose who receives this rate</option>
            {choices.map((row) => (
              <option key={row.id} value={row.id}>{row.name} · {row.phone}</option>
            ))}
          </select>
          {!choices.length ? <p className="mt-2 text-sm text-muted">Add a middleman first from the <Link className="font-semibold text-primary" to="/admin/middlemen">Middlemen</Link> page.</p> : null}
        </Field>
      ) : null}
      <RatePreview base={base} middle={middle} person={person?.name} />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={saving || !finalOk} className="w-full sm:w-auto">{saving ? 'Saving…' : 'Save final rate'}</Button>
    </form>
  );
}

export function AdminCommission() {
  const queryClient = useQueryClient();
  const salons = useAdminSalons();
  const rules = useQuery({ queryKey: ['rules'], queryFn: () => api<Rule[]>('/admin/commission-rules') });
  const charges = useQuery({ queryKey: ['admin-commissions'], queryFn: () => api<Charge[]>('/admin/commissions') });
  const middlemen = useQuery({ queryKey: ['middlemen'], queryFn: () => api<MiddlemanOption[]>('/admin/middlemen') });
  const [params] = useSearchParams();
  const focus = params.get('salon') || '';
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(focus);
  const list = rules.data || [];
  const platform = activeRule(list);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (salons.data || []).filter((salon) => {
      if (focus && salon.id === focus) return true;
      if (!needle) return true;
      return `${salon.name} ${salon.city} ${salon.phone}`.toLowerCase().includes(needle);
    });
  }, [salons.data, query, focus]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['rules'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
    await queryClient.invalidateQueries({ queryKey: ['middlemen'] });
    await queryClient.invalidateQueries({ queryKey: ['middleman'] });
  }

  return (
    <section>
      <PageHeader
        title="Commission"
        subtitle="Final rate is charged when a customer buys a membership on Stylio. Final = base + middleman. A ₹1,000 sale at 3% + 2% sends ₹50 to Stylio. Older sales keep the rate they were bought with."
      />
      <Card className="hover:translate-y-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-ink">Platform default</p>
            <p className="text-sm text-muted">A new salon receives this rate when you approve it. Set a salon rate only when that salon should differ.</p>
          </div>
          {platform ? <StatusPill value="ACTIVE" /> : <StatusPill value="PENDING" />}
        </div>
        <CurrentRates rule={platform} fallback="No default yet. Stylio sales will not create commission until this is saved." />
        <div className="mt-4">
          <RateForm
            key={`platform-${platform?.id || 'new'}`}
            salonId={undefined}
            baseValue={bpsToInput(platform?.baseRateBps ?? platform?.rateBps)}
            middleValue={bpsToInput(platform?.middlemanRateBps ?? 0)}
            middlemen={middlemen.data || []}
            onSaved={refresh}
          />
        </div>
      </Card>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">Every salon</h2>
            <p className="text-sm text-muted">Set this salon’s rate, and choose the middleman who receives its middleman share.</p>
          </div>
          <input className={`${inputClass} sm:max-w-xs`} placeholder="Search name, city, or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <QueryState loading={salons.isLoading || rules.isLoading} error={salons.error || rules.error} empty={!visible.length} emptyTitle="No salons" emptyBody="Approved and pending salons show up here.">
          <div className="grid gap-3">
            {visible.map((salon) => (
              <SalonRateCard
                key={salon.id}
                salon={salon}
                rule={activeRule(list, salon.id)}
                platform={platform}
                open={openId === salon.id}
                onToggle={() => setOpenId((current) => (current === salon.id ? '' : salon.id))}
                middlemen={middlemen.data || []}
                onSaved={refresh}
              />
            ))}
          </div>
        </QueryState>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-2xl text-ink">Charged on sales</h2>
        <QueryState loading={charges.isLoading} error={charges.error} empty={!charges.data?.length} emptyTitle="No commission yet" emptyBody="A Stylio membership purchase will snapshot the final rate here.">
          <div className="grid gap-3">
            {(charges.data || []).map((row) => (
              <Card key={row.id} className="hover:translate-y-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{row.salon?.name || 'Salon'}</p>
                  <p className="font-display text-xl text-primary">{formatPaise(row.commissionPaise - row.reversedPaise)}</p>
                </div>
                <div className="mt-2 divide-y divide-line">
                  <Meta label="Base" value={bpsLabel(row.baseRateBps)} />
                  <Meta label="Middleman" value={row.middleman ? `${row.middleman.name} · ${bpsLabel(row.middlemanRateBps)}` : bpsLabel(row.middlemanRateBps)} />
                  <Meta label="Final" value={bpsLabel(row.rateBps)} />
                  <Meta label="Salon keeps" value={formatPaise(row.salonPayablePaise)} />
                  <Meta label="Date" value={when(row.createdAt)} />
                </div>
              </Card>
            ))}
          </div>
        </QueryState>
      </div>
    </section>
  );
}

function CurrentRates({ rule, fallback }: { rule?: Rule; fallback: string }) {
  if (!rule) return <p className="text-sm text-muted">{fallback}</p>;
  const base = rule.baseRateBps ?? rule.rateBps;
  const middle = rule.middlemanRateBps ?? 0;
  return (
    <p className="text-sm text-ink">
      Now <span className="font-semibold text-primary">{bpsLabel(base)}</span>
      {' + '}
      <span className="font-semibold text-sky-700">{bpsLabel(middle)}</span>
      {' = '}
      <span className="font-semibold text-rose-600">{bpsLabel(rule.rateBps)}</span>
      <span className="text-muted"> from {when(rule.effectiveFrom)}</span>
    </p>
  );
}

function SalonRateCard({
  salon,
  rule,
  platform,
  middlemen,
  open,
  onToggle,
  onSaved,
}: {
  salon: SalonRow;
  rule?: Rule;
  platform?: Rule;
  middlemen: MiddlemanOption[];
  open: boolean;
  onToggle: () => void;
  onSaved: () => Promise<void>;
}) {
  const shown = rule || platform;
  const base = shown ? (shown.baseRateBps ?? shown.rateBps) : undefined;
  const middle = shown ? (shown.middlemanRateBps ?? 0) : undefined;
  return (
    <Card className={`hover:translate-y-0 ${open ? 'ring-2 ring-primary/30' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{salon.name}</p>
          <p className="text-sm text-muted">{salon.city} · {salon.phone}</p>
        </div>
        <StatusPill value={salon.status} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-primary/10 px-2 py-2">
          <p className="text-[11px] font-semibold uppercase text-primary">Base</p>
          <p className="font-semibold text-ink">{bpsLabel(base)}</p>
        </div>
        <div className="rounded-2xl bg-secondary/15 px-2 py-2">
          <p className="text-[11px] font-semibold uppercase text-sky-700">Middleman</p>
          <p className="font-semibold text-ink">{bpsLabel(middle)}</p>
        </div>
        <div className="rounded-2xl bg-accent/40 px-2 py-2">
          <p className="text-[11px] font-semibold uppercase text-rose-700">Final</p>
          <p className="font-semibold text-ink">{bpsLabel(shown?.rateBps)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">{rule ? 'Saved on this salon' : platform ? 'Will use the platform default until you set its own rate' : 'No platform default yet, so this salon is not charged'}</p>
      {rule?.middleman ? <p className="mt-1 text-sm text-ink">{rule.middleman.name} receives the middleman rate for this salon.</p> : null}
      {rule && (rule.middlemanRateBps ?? 0) > 0 && !rule.middleman ? <p className="mt-1 text-sm text-rose-600">Choose which middleman receives this rate.</p> : null}
      <Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={onToggle}>{open ? 'Close' : 'Set rates'}</Button>
      {open ? (
        <div className="mt-4 border-t border-line pt-4">
          <RateForm
            key={`${salon.id}-${rule?.id || platform?.id || 'new'}`}
            salonId={salon.id}
            middlemanId={rule?.middleman?.id || rule?.middlemanId}
            middlemen={middlemen}
            baseValue={bpsToInput(base)}
            middleValue={bpsToInput(middle)}
            onSaved={async () => {
              await onSaved();
              onToggle();
            }}
          />
        </div>
      ) : null}
    </Card>
  );
}
