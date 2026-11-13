import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanForm, toPlanPayload } from './PlanForm';

it('submits an existing subscription with the existing plan source', async () => {
  const onSubmit = vi.fn(async () => undefined);
  render(
    <PlanForm
      planSource="EXISTING"
      services={[{ id: 'beard', salonId: 's', name: 'Beard trim', category: 'Beard', retailPrice: 30000, active: true }]}
      branches={[{ id: 'branch', salonId: 's', name: 'Main', address: 'Lane', city: 'Pune', status: 'VERIFIED' }]}
      onSubmit={onSubmit}
    />,
  );
  await userEvent.type(screen.getByLabelText('Plan name'), 'Legacy beard pack');
  await userEvent.type(screen.getByLabelText('Selling price (₹)'), '1500');
  await userEvent.selectOptions(screen.getAllByRole('combobox')[1], 'beard');
  await userEvent.type(screen.getByPlaceholderText('Quantity'), '4');
  await userEvent.type(screen.getByLabelText('Terms'), 'Valid for six months at this salon.');
  await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ planSource: 'EXISTING', sellingPrice: 150000 }));
});

it('converts rupees to paise in the shared payload', () => {
  const payload = toPlanPayload({
    name: 'Cut',
    description: '',
    sellingPrice: '1500.50',
    planType: 'SERVICE',
    planSource: 'STYLIO_CREATED',
    externalPlanId: '',
    validityDays: 30,
    serviceValueLimit: '',
    discountPercentage: '',
    discountCap: '',
    stackingAllowed: false,
    terms: 'Terms here',
    restrictions: '',
    branchIds: [],
    items: [{ serviceId: 'cut', quantityLimit: '1', valueDeduction: '', excluded: false }],
  });
  expect(payload.planSource).toBe('STYLIO_CREATED');
  expect(payload.sellingPrice).toBe(150050);
});
