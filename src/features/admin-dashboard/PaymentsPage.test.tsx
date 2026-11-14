import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminList } from './pages';

function todayInput() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function renderPayments() {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(String(url));
      const data = Array.from({ length: 10 }, (_, index) => ({
        id: `pay-${index}`,
        amount: 100000,
        status: 'PAID',
        createdAt: new Date().toISOString(),
        commissionPaise: 5000,
        payoutPaise: 95000,
        customer: { name: 'manish verma', phone: '7053468609' },
        salon: { name: 'Geetanjali' },
      }));
      return new Response(JSON.stringify({
        success: true,
        data,
        meta: { page: 1, limit: 10, total: 12, paidPaise: 1200000, commissionPaise: 60000, payoutPaise: 1140000 },
      }), { status: 200 });
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AdminList title="Payments" path="/admin/payments" />
    </QueryClientProvider>,
  );
  return calls;
}

it('opens on today and asks for 10 payments', async () => {
  const calls = renderPayments();
  const today = todayInput();
  expect(await screen.findByLabelText('From')).toHaveValue(today);
  expect(screen.getByLabelText('To')).toHaveValue(today);
  expect(screen.getByLabelText('Rows per page')).toHaveValue('10');
  await waitFor(() => {
    const url = calls.find((call) => call.includes('/admin/payments'));
    expect(url).toContain('limit=10');
    expect(url).toContain('page=1');
    expect(url).toContain('from=');
    expect(url).toContain('to=');
  });
});

it('loads the page size the user picks', async () => {
  const calls = renderPayments();
  await screen.findByLabelText('Rows per page');
  await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '20');
  await waitFor(() => {
    expect(calls.some((call) => call.includes('limit=20') && call.includes('page=1'))).toBe(true);
  });
});
