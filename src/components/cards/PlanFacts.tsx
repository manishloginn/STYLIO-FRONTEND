import { formatPaise } from '../../lib/money';
import { MembershipPlan } from '../../types';
import { Badge } from '../common/ui';

export function PlanFacts({ plan }: { plan: MembershipPlan }) {
  return (
    <div className="space-y-3 text-sm text-muted">
      <div className="flex flex-wrap gap-2">
        <Badge>{plan.planType}</Badge>
        <Badge tone="blue">{plan.planSource === 'EXISTING' ? 'Existing subscription' : 'Created on Stylio'}</Badge>
        <Badge tone="pink">{plan.validityDays} days</Badge>
      </div>
      <p>
        You pay <span className="font-semibold text-ink">{formatPaise(plan.sellingPrice)}</span>
      </p>
      {plan.serviceValueLimit ? (
        <p>
          Eligible service entitlement <span className="font-semibold text-ink">{formatPaise(plan.serviceValueLimit)}</span>. This is not cash and cannot be withdrawn.
        </p>
      ) : null}
      {plan.planType === 'DISCOUNT' ? (
        <p>
          The salon funds a {plan.discountPercentage}% member price
          {plan.discountCap ? ` up to ${formatPaise(plan.discountCap)}` : ''}. Stylio does not fund this price difference.
        </p>
      ) : null}
      <ul className="space-y-1">
        {plan.items?.map((item) => (
          <li key={item.serviceId}>
            {item.excluded ? 'Excluded' : 'Included'}: {item.service?.name || 'Service'}
            {item.quantityLimit ? ` · ${item.quantityLimit} visits` : ''}
            {item.valueDeduction ? ` · ${formatPaise(item.valueDeduction)} entitlement per visit` : ''}
          </li>
        ))}
      </ul>
      <p className="text-ink">{plan.terms}</p>
      {plan.restrictions ? <p>Restrictions: {plan.restrictions}</p> : null}
      <p>{plan.stackingAllowed ? 'Can be stacked with other salon offers.' : 'Cannot be stacked with other salon offers.'}</p>
    </div>
  );
}
