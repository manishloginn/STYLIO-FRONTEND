import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { Button, Card, Field, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise } from '../../lib/money';
import { api, ApiError } from '../../services/api';
import { StatusPill, percentToBps, salonName, useAdminSalons } from './admin-ui';

interface Middleman {
  id: string;
  name: string;
  phone: string;
  status: string;
  defaultRateBps: number;
  salons?: Array<{ salonId: string; name: string; city: string; agreedRateBps: number }>;
}

interface MiddlemanDetail extends Omit<Middleman, 'salons'> {
  salons: Array<{ id: string; salonId: string; agreedRateBps: number; status: string }>;
  transactions: Array<{
    id: string;
    entryType: string;
    status: string;
    grossPaise: number;
    salonCommissionPaise: number;
    middlemanCommissionPaise: number;
    stylioCommissionPaise: number;
    salonRateBps: number;
    middlemanRateBps: number;
  }>;
  payouts: Array<{ id: string; amountPaise: number; status: string }>;
}

function percent(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

export function AdminMiddlemen() {
  const queryClient = useQueryClient();
  const middlemen = useQuery({ queryKey: ['middlemen'], queryFn: () => api<Middleman[]>('/admin/middlemen') });
  const [selected, setSelected] = useState('');
  const detail = useQuery({
    queryKey: ['middleman', selected],
    queryFn: () => api<MiddlemanDetail>(`/admin/middlemen/${selected}`),
    enabled: Boolean(selected),
  });
  const salons = useAdminSalons();
  const [error, setError] = useState('');
  const [partner, setPartner] = useState({ name: '', phone: '', rate: '3', salonId: '' });
  const [mapping, setMapping] = useState({ salonId: '', rate: '3' });
  const taken = useMemo(() => {
    const owners = new Map<string, string>();
    for (const person of middlemen.data || []) {
      for (const salon of person.salons || []) owners.set(salon.salonId, person.name);
    }
    return owners;
  }, [middlemen.data]);

  function takenMessage(salonId: string) {
    const owner = taken.get(salonId);
    if (!owner) return '';
    const salon = salons.data?.find((row) => row.id === salonId);
    return `${salon?.name || 'This salon'} already has ${owner}. One salon can have only one middleman.`;
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['middlemen'] });
    await queryClient.invalidateQueries({ queryKey: ['middleman', selected] });
    await queryClient.invalidateQueries({ queryKey: ['rules'] });
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError('');
    const defaultRateBps = percentToBps(partner.rate);
    if (defaultRateBps == null) {
      setError('Use a percent like 2 or 3.5.');
      return;
    }
    const blocked = takenMessage(partner.salonId);
    if (blocked) {
      setError(blocked);
      return;
    }
    try {
      const created = await api<Middleman>('/admin/middlemen', {
        method: 'POST',
        body: JSON.stringify({
          name: partner.name,
          phone: partner.phone,
          defaultRateBps,
          ...(partner.salonId ? { salonId: partner.salonId } : {}),
        }),
      });
      setPartner({ name: '', phone: '', rate: '3', salonId: '' });
      setSelected(created.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the middleman');
    }
  }

  async function onMap(event: FormEvent) {
    event.preventDefault();
    const blocked = takenMessage(mapping.salonId);
    if (blocked) {
      setError(blocked);
      return;
    }
    setError('');
    try {
      await api(`/admin/middlemen/${selected}/mappings`, {
        method: 'POST',
        body: JSON.stringify({ salonId: mapping.salonId, agreedRateBps: Math.round(Number(mapping.rate) * 100) }),
      });
      setMapping({ salonId: '', rate: mapping.rate });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not map the salon');
    }
  }

  return (
    <section>
      <PageHeader title="Middlemen" subtitle="Add a middleman and connect the salon they earn from. Their percent is added to that salon’s base rate." />
      <Card className="hover:translate-y-0">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={onCreate}>
          <Field label="Name"><input className={inputClass} value={partner.name} onChange={(event) => setPartner({ ...partner, name: event.target.value })} required /></Field>
          <Field label="Mobile"><input className={inputClass} inputMode="tel" value={partner.phone} onChange={(event) => setPartner({ ...partner, phone: event.target.value })} required /></Field>
          <Field label="Connect to salon">
            <select className={inputClass} value={partner.salonId} onChange={(event) => { setPartner({ ...partner, salonId: event.target.value }); setError(takenMessage(event.target.value)); }}>
              <option value="">Choose a salon</option>
              {(salons.data || []).map((salon) => {
                const owner = taken.get(salon.id);
                return <option key={salon.id} value={salon.id}>{salon.name} · {salon.city}{owner ? ` · ${owner}` : ''}</option>;
              })}
            </select>
          </Field>
          <Field label={partner.salonId ? 'Their percent' : 'Default percent'}><input className={inputClass} inputMode="decimal" value={partner.rate} onChange={(event) => setPartner({ ...partner, rate: event.target.value })} /></Field>
          <div className="flex items-end"><Button type="submit" className="w-full" disabled={Boolean(takenMessage(partner.salonId))}>Add middleman</Button></div>
        </form>
        <p className="mt-3 text-sm text-muted">Leave the salon blank to add the person first. Choosing a salon keeps its base rate and adds this percent on top. Base plus middleman cannot pass 100%.</p>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </Card>
      <div className="mt-4 grid gap-3">
        {(middlemen.data || []).map((row) => (
          <Card key={row.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-sm text-muted">{row.phone} · default {percent(row.defaultRateBps)}</p>
                {row.salons?.length ? row.salons.map((salon) => (
                  <p key={salon.salonId} className="text-sm text-ink">{salon.name}{salon.city ? ` · ${salon.city}` : ''} · {percent(salon.agreedRateBps)}</p>
                )) : <p className="text-sm text-muted">No salon connected</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill value={row.status} />
                <Button variant={selected === row.id ? 'primary' : 'secondary'} className="w-full sm:w-auto" onClick={() => setSelected(row.id)}>Open</Button>
                <Button className="w-full sm:w-auto" onClick={async () => {
                  await api(`/admin/middlemen/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) });
                  await refresh();
                }}>{row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {detail.data ? (
        <div className="mt-6 grid gap-4">
          <Card>
            <p className="font-semibold">Map a salon to {detail.data.name}</p>
            <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={onMap}>
              <Field label="Salon">
                <select className={inputClass} value={mapping.salonId} onChange={(event) => { setMapping({ ...mapping, salonId: event.target.value }); setError(takenMessage(event.target.value)); }}>
                  <option value="">Choose a salon</option>
                  {(salons.data || []).map((salon) => {
                    const owner = taken.get(salon.id);
                    return <option key={salon.id} value={salon.id}>{salon.name} · {salon.city}{owner ? ` · ${owner}` : ''}</option>;
                  })}
                </select>
              </Field>
              <Field label="Agreed percent">
                <input className={inputClass} inputMode="decimal" value={mapping.rate} onChange={(event) => setMapping({ ...mapping, rate: event.target.value })} />
              </Field>
              <div className="flex items-end"><Button type="submit" className="w-full" disabled={Boolean(takenMessage(mapping.salonId))}>Save mapping</Button></div>
            </form>
            <div className="mt-4 grid gap-2">
              {detail.data.salons.map((salon) => (
                <p key={salon.id} className="text-sm">{salonName(salons.data, salon.salonId)} · {percent(salon.agreedRateBps)} · {salon.status}</p>
              ))}
              {!detail.data.salons.length ? <p className="text-sm text-muted">No salons mapped yet.</p> : null}
            </div>
          </Card>
          <Card>
            <p className="font-semibold">Commission breakdown</p>
            <div className="mt-3 grid gap-3">
              {detail.data.transactions.map((row) => (
                <div key={row.id} className="rounded-2xl border border-line p-3 text-sm">
                  <p>{row.entryType} · {row.status} · salon {percent(row.salonRateBps)} · middleman {percent(row.middlemanRateBps)}</p>
                  <p className="text-muted">Gross {formatPaise(row.grossPaise)} · salon cut {formatPaise(row.salonCommissionPaise)} · middleman {formatPaise(row.middlemanCommissionPaise)} · Stylio {formatPaise(row.stylioCommissionPaise)}</p>
                  {row.status === 'PENDING' && row.entryType === 'EARN' ? (
                    <Button className="mt-2" onClick={async () => {
                      await api('/admin/middlemen/transactions/approve', { method: 'POST', body: JSON.stringify({ ids: [row.id] }) });
                      await refresh();
                    }}>Approve</Button>
                  ) : null}
                </div>
              ))}
              {!detail.data.transactions.length ? <p className="text-sm text-muted">No commission transactions yet.</p> : null}
            </div>
          </Card>
          <Card>
            <p className="font-semibold">Payouts</p>
            <p className="text-sm text-muted">Recording a payout marks approved commission as paid. It does not transfer money.</p>
            <Button className="mt-3" onClick={async () => {
              setError('');
              try {
                const end = new Date();
                const start = new Date(end.getTime() - 31 * 86_400_000);
                await api('/admin/middlemen/payouts', {
                  method: 'POST',
                  body: JSON.stringify({ middlemanId: detail.data?.id, periodStart: start.toISOString(), periodEnd: end.toISOString() }),
                });
                await refresh();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Could not record the payout');
              }
            }}>Record payout for approved commission</Button>
            <div className="mt-3 grid gap-2">
              {detail.data.payouts.map((payout) => <p key={payout.id} className="text-sm">{formatPaise(payout.amountPaise)} · {payout.status}</p>)}
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
