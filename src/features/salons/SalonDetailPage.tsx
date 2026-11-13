import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PlanFacts } from '../../components/cards/PlanFacts';
import { SalonPhoto, salonPhotos } from '../../components/cards/SalonPhoto';
import { Badge, Card, PageHeader, Skeleton } from '../../components/common/ui';
import { formatPaise } from '../../lib/money';
import { api } from '../../services/api';
import { Salon } from '../../types';

export function SalonDetailPage() {
  const { id = '' } = useParams();
  const salon = useQuery({
    queryKey: ['salon', id],
    queryFn: () => api<Salon>(`/salons/${id}`),
  });
  const reviews = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api<Array<{ id: string; author: string; rating: number; comment: string }>>(`/salons/${id}/reviews`),
  });

  if (salon.isLoading) return <main className="mx-auto max-w-6xl px-4 py-8"><Skeleton className="h-64" /></main>;
  if (salon.isError || !salon.data) return <main className="px-4 py-8 text-rose-600">This salon is not available.</main>;
  const data = salon.data;
  const photos = salonPhotos(data);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-line bg-canvas">
        <SalonPhoto name={data.name} src={photos[0]} className="h-56" />
        <div className="p-6">
          <PageHeader title={data.name} subtitle={`${data.city} · ${data.salonType}`} />
          <p className="max-w-3xl text-sm text-muted">{data.description}</p>
          <p className="mt-3 text-sm text-muted">{data.rating ? `${data.rating.average} from ${data.rating.count} reviews` : 'No reviews yet'}</p>
        </div>
      </div>
      {photos.length > 1 ? (
        <section>
          <h2 className="font-display text-2xl">Gallery</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.slice(1).map((url) => (
              <img key={url} src={url} alt="" className="h-32 w-full rounded-2xl object-cover" />
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <h2 className="font-display text-2xl">Branches</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.branches?.map((branch) => (
            <Card key={branch.id}>
              <p className="font-semibold">{branch.name}</p>
              <p className="text-sm text-muted">{branch.address}, {branch.city}</p>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Services</h2>
          <Link to={`/salons/${id}/services`} className="text-sm font-semibold text-primary">Full catalogue</Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.services?.map((service) => (
            <Card key={service.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{service.name}</p>
                  <p className="text-sm text-muted">{service.category}</p>
                </div>
                <Badge tone="blue">{formatPaise(service.retailPrice)}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Membership plans</h2>
          <Link to={`/compare?ids=${data.plans?.slice(0, 2).map((plan) => plan.id).join(',') || ''}`} className="text-sm font-semibold text-primary">
            Compare
          </Link>
        </div>
        <div className="mt-3 grid gap-4">
          {data.plans?.length ? data.plans.map((plan) => (
            <Card key={plan.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">{plan.name}</p>
                  <p className="text-sm text-muted">{plan.description}</p>
                </div>
                <Link to={`/plans/${plan.id}`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">View plan</Link>
              </div>
              <div className="mt-4">
                <PlanFacts plan={plan} />
              </div>
            </Card>
          )) : <Card>This salon has not published a membership yet.</Card>}
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl">Reviews</h2>
        <div className="mt-3 space-y-3">
          {reviews.data && reviews.data.length > 0 ? reviews.data.map((review) => (
            <Card key={review.id}>
              <p className="font-semibold">{review.author} · {review.rating}/5</p>
              <p className="text-sm text-muted">{review.comment}</p>
            </Card>
          )) : <p className="text-sm text-muted">No reviews yet.</p>}
        </div>
      </section>
    </main>
  );
}

export function ServicesPage() {
  const { id = '' } = useParams();
  const salon = useQuery({ queryKey: ['salon', id], queryFn: () => api<Salon>(`/salons/${id}`) });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Services" subtitle={salon.data?.name} />
      <div className="grid gap-3">
        {salon.data?.services?.map((service) => (
          <Card key={service.id}>
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-muted">{service.category} · {service.description}</p>
              </div>
              <p className="font-semibold">{formatPaise(service.retailPrice)}</p>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
