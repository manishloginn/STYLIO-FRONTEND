import { act, render, screen } from '@testing-library/react';
import { api } from '../../services/api';
import { GlobalLoader } from './GlobalLoader';

it('covers the screen while a save is running and leaves when it ends', async () => {
  let release: (value: Response) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>((resolve) => {
      release = resolve;
    })),
  );
  render(<GlobalLoader />);
  expect(screen.queryByRole('status', { name: 'Saving' })).not.toBeInTheDocument();
  let pending: Promise<unknown> = Promise.resolve();
  await act(async () => {
    pending = api('/salons', { method: 'POST', body: '{}' });
  });
  expect(screen.getByRole('status', { name: 'Saving' })).toBeInTheDocument();
  await act(async () => {
    release(new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 }));
    await pending;
  });
  expect(screen.queryByRole('status', { name: 'Saving' })).not.toBeInTheDocument();
});
