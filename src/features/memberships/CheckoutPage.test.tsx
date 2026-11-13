import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { CheckoutPage } from './PlanPages';

it('shows the API error when checkout cannot start', async () => {
  localStorage.setItem('stylio.access', 'test-token');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/users/me')) {
        return new Response(JSON.stringify({ success: true, data: { id: 'user-1', name: 'Asha', phone: '7777777777', role: 'CUSTOMER' } }), { status: 200 });
      }
      if (String(url).includes('/payments/orders')) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Payment could not start' } }), { status: 400 });
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'plan-1',
            name: 'Beard pack',
            description: '',
            planType: 'SERVICE',
            planSource: 'STYLIO_CREATED',
            sellingPrice: 150000,
            validityDays: 180,
            stackingAllowed: false,
            terms: 'Valid at the salon.',
            restrictions: 'One visit at a time.',
            status: 'PUBLISHED',
            salonId: 'salon',
            items: [],
            branchIds: [],
          },
        }),
        { status: 200 },
      );
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/checkout/plan-1']}>
          <Routes>
            <Route path="/checkout/:planId" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Pay ₹1,500.00' }));
  expect(await screen.findByText('Payment could not start')).toBeInTheDocument();
});
