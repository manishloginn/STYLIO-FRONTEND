import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Button, Card, PageHeader, inputClass } from '../../components/common/ui';
import { formatPaise } from '../../lib/money';
import { api, ApiError } from '../../services/api';

interface Middleman {
  id: string;
  name: string;
  phone: string;
  status: string;
  defaultRateBps: number;
}

interface MiddlemanDetail extends Middleman {
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
  const [error, setError] = useState('');
  const [partner, setPartner] = useState({ name: '', phone: '', rate: '3' });
  const [mapping, setMapping] = useState({ salonId: '', rate: '3' });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['middlemen'] });
    await queryClient.invalidateQueries({ queryKey: ['middleman', selected] });
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await api('/admin/middlemen', {
        method: 'POST',
        body: JSON.stringify({
          name: partner.name,
          phone: partner.phone,
          defaultRateBps: Math.round(Number(partner.rate) * 100),
        }),
      });
      setPartner({ name: '', phone: '', rate: '3' });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the middleman');
    }
  }

  async function onMap(event: FormEvent) {
    event.preventDefault();
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
      <PageHeader title="Middlemen" subtitle="A partner is paid from the salon commission. Direct salons keep the existing rate with no middleman." />
      <Card>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
          <input className={inputClass} placeholder="Name" value={partner.name} onChange={(event) => setPartner({ ...partner, name: event.target.value })} />
          <input className={inputClass} placeholder="Mobile" value={partner.phone} onChange={(event) => setPartner({ ...partner, phone: event.target.value })} />
          <input className={inputClass} placeholder="Default percent" value={partner.rate} onChange={(event) => setPartner({ ...partner, rate: event.target.value })} />
          <Button type="submit">Add middleman</Button>
        </form>
        {error ? <p className="mt-3 text-sm text-ink">{error}</p> : null}
      </Card>
      <div className="mt-4 grid gap-3">
        {(middlemen.data || []).map((row) => (
          <Card key={row.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-sm text-muted">{row.phone} · {row.status} · default {percent(row.defaultRateBps)}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setSelected(row.id)}>Open</Button>
                <Button onClick={async () => {
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
            <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onMap}>
              <input className={inputClass} placeholder="Salon id" value={mapping.salonId} onChange={(event) => setMapping({ ...mapping, salonId: event.target.value })} />
              <input className={inputClass} placeholder="Agreed percent" value={mapping.rate} onChange={(event) => setMapping({ ...mapping, rate: event.target.value })} />
              <Button type="submit">Save mapping</Button>
            </form>
            <div className="mt-4 grid gap-2">
              {detail.data.salons.map((salon) => (
                <p key={salon.id} className="text-sm">{salon.salonId} · {percent(salon.agreedRateBps)} · {salon.status}</p>
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
