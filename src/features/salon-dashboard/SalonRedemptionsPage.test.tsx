import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SalonRedemptionsPage } from './pages';

function renderDesk() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/salon/salon-1/redemptions']}>
        <Routes>
          <Route path="/salon/:salonId/redemptions" element={<SalonRedemptionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function branches(rows: Array<{ id: string; name: string; status: string }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = String(url);
      const data = path.includes('/branches/manage') ? rows : [];
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }),
  );
}

it('selects the branch when the salon has only one', async () => {
  branches([{ id: 'branch-1', name: 'Delhihut', status: 'VERIFIED' }]);
  renderDesk();
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('branch-1'));
  expect(screen.queryByRole('option', { name: 'Branch' })).not.toBeInTheDocument();
});

it('leaves the branch blank when the salon has more than one', async () => {
  branches([
    { id: 'branch-1', name: 'Delhihut', status: 'VERIFIED' },
    { id: 'branch-2', name: 'South', status: 'VERIFIED' },
  ]);
  renderDesk();
  expect(await screen.findByRole('option', { name: 'Branch' })).toBeInTheDocument();
  expect(screen.getByRole('combobox')).toHaveValue('');
});
