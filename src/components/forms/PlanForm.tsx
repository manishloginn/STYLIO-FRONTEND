import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { rupeesToPaise } from '../../lib/money';
import { Branch, SalonService } from '../../types';
import { Button, Field, inputClass } from '../common/ui';

const schema = z.object({
  name: z.string().min(2, 'Enter a plan name'),
  description: z.string().optional(),
  sellingPrice: z.string().min(1, 'Enter the selling price'),
  planType: z.enum(['VALUE', 'SERVICE', 'BOTH', 'DISCOUNT']),
  planSource: z.enum(['EXISTING', 'STYLIO_CREATED']),
  externalPlanId: z.string().optional(),
  validityDays: z.coerce.number().int().min(1),
  serviceValueLimit: z.string().optional(),
  discountPercentage: z.string().optional(),
  discountCap: z.string().optional(),
  stackingAllowed: z.boolean(),
  terms: z.string().min(2, 'Add the terms customers will see'),
  restrictions: z.string().optional(),
  branchIds: z.array(z.string()),
  items: z
    .array(
      z.object({
        serviceId: z.string().min(1, 'Choose a service'),
        quantityLimit: z.string().optional(),
        valueDeduction: z.string().optional(),
        excluded: z.boolean().optional(),
      }),
    )
    .min(1, 'Add at least one service'),
});

export type PlanFormValues = z.infer<typeof schema>;

export function toPlanPayload(values: PlanFormValues) {
  const optionalPaise = (value?: string) => (value && value.trim() ? rupeesToPaise(value) : undefined);
  return {
    name: values.name,
    description: values.description ?? '',
    planType: values.planType,
    planSource: values.planSource,
    externalPlanId: values.externalPlanId || undefined,
    sellingPrice: rupeesToPaise(values.sellingPrice),
    validityDays: Number(values.validityDays),
    serviceValueLimit: optionalPaise(values.serviceValueLimit),
    discountPercentage: values.discountPercentage ? Number(values.discountPercentage) : undefined,
    discountCap: optionalPaise(values.discountCap),
    stackingAllowed: values.stackingAllowed,
    terms: values.terms,
    restrictions: values.restrictions ?? '',
    branchIds: values.branchIds,
    items: values.items.map((item) => ({
      serviceId: item.serviceId,
      quantityLimit: item.quantityLimit ? Number(item.quantityLimit) : undefined,
      valueDeduction: optionalPaise(item.valueDeduction),
      excluded: item.excluded ?? false,
    })),
  };
}

export function PlanForm({
  planSource,
  services,
  branches,
  onSubmit,
}: {
  planSource: 'EXISTING' | 'STYLIO_CREATED';
  services: SalonService[];
  branches: Branch[];
  onSubmit: (payload: ReturnType<typeof toPlanPayload>) => Promise<void>;
}) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      sellingPrice: '',
      planType: 'SERVICE',
      planSource,
      externalPlanId: '',
      validityDays: 180,
      serviceValueLimit: '',
      discountPercentage: '',
      discountCap: '',
      stackingAllowed: false,
      terms: '',
      restrictions: '',
      branchIds: [],
      items: [{ serviceId: '', quantityLimit: '', valueDeduction: '', excluded: false }],
    },
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const planType = form.watch('planType');

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(toPlanPayload({ ...values, planSource }));
      })}
    >
      <input type="hidden" {...form.register('planSource')} value={planSource} />
      <Field label="Plan name" error={form.formState.errors.name?.message}>
        <input className={inputClass} {...form.register('name')} />
      </Field>
      <Field label="Description">
        <textarea className={inputClass} rows={3} {...form.register('description')} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Selling price (₹)" error={form.formState.errors.sellingPrice?.message}>
          <input className={inputClass} inputMode="decimal" {...form.register('sellingPrice')} />
        </Field>
        <Field label="Validity in days">
          <input className={inputClass} type="number" {...form.register('validityDays')} />
        </Field>
      </div>
      <Field label="Membership type">
        <select className={inputClass} {...form.register('planType')}>
          <option value="SERVICE">Service quantities</option>
          <option value="VALUE">Service-value entitlement</option>
          <option value="BOTH">Value and quantities</option>
          <option value="DISCOUNT">Salon-funded member price</option>
        </select>
      </Field>
      {planSource === 'EXISTING' ? (
        <Field label="Existing plan reference">
          <input className={inputClass} {...form.register('externalPlanId')} placeholder="Optional external id" />
        </Field>
      ) : null}
      {planType === 'VALUE' || planType === 'BOTH' ? (
        <Field label="Total service entitlement (₹)">
          <input className={inputClass} {...form.register('serviceValueLimit')} />
        </Field>
      ) : null}
      {planType === 'DISCOUNT' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Discount percentage">
            <input className={inputClass} {...form.register('discountPercentage')} />
          </Field>
          <Field label="Discount cap (₹)">
            <input className={inputClass} {...form.register('discountCap')} />
          </Field>
        </div>
      ) : null}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Eligible services</p>
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => items.append({ serviceId: '', quantityLimit: '', valueDeduction: '', excluded: false })}>
            Add service
          </button>
        </div>
        {items.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-2xl border border-line p-3 md:grid-cols-4">
            <select className={inputClass} {...form.register(`items.${index}.serviceId`)}>
              <option value="">Service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            {planType === 'SERVICE' || planType === 'BOTH' ? (
              <input className={inputClass} placeholder="Quantity" {...form.register(`items.${index}.quantityLimit`)} />
            ) : null}
            {planType === 'VALUE' || planType === 'BOTH' ? (
              <input className={inputClass} placeholder="Deduction ₹" {...form.register(`items.${index}.valueDeduction`)} />
            ) : null}
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" {...form.register(`items.${index}.excluded`)} /> Excluded
            </label>
          </div>
        ))}
        {form.formState.errors.items?.message ? <p className="text-xs text-rose-600">{form.formState.errors.items.message}</p> : null}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Eligible branches</legend>
        <div className="grid gap-2">
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={branch.id} {...form.register('branchIds')} />
              {branch.name} · {branch.city}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Terms" error={form.formState.errors.terms?.message}>
        <textarea className={inputClass} rows={3} {...form.register('terms')} />
      </Field>
      <Field label="Restrictions">
        <textarea className={inputClass} rows={2} {...form.register('restrictions')} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register('stackingAllowed')} /> Stacking with other salon offers is allowed
      </label>
      <Button type="submit">Save plan</Button>
    </form>
  );
}
