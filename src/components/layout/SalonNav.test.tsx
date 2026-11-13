import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalonNav } from './SalonNav';

it('shows the salon dashboard sections', () => {
  render(
    <MemoryRouter>
      <SalonNav salonId="salon-1" />
    </MemoryRouter>,
  );
  for (const label of ['Overview', 'Membership Plans', 'Existing Subscriptions', 'Redemptions', 'Commission & Payouts', 'Staff Management']) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
  }
});
