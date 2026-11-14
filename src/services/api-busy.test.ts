import { api, isApiBusy } from './api';

function delayedOk() {
  let release: () => void = () => {};
  const response = new Promise<Response>((resolve) => {
    release = () => resolve(new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 }));
  });
  vi.stubGlobal('fetch', vi.fn(() => response));
  return release;
}

it('stays busy while a save is in flight and clears when it finishes', async () => {
  const release = delayedOk();
  const pending = api('/salons', { method: 'POST', body: '{}' });
  expect(isApiBusy()).toBe(true);
  release();
  await pending;
  expect(isApiBusy()).toBe(false);
});

it('does not show the loader for a page read', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: true, data: [] }), { status: 200 })),
  );
  await api('/admin/salons');
  expect(isApiBusy()).toBe(false);
});

it('clears the loader when a save fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: false, error: { message: 'No' } }), { status: 400 })),
  );
  await expect(api('/salons', { method: 'PATCH', body: '{}' })).rejects.toThrow('No');
  expect(isApiBusy()).toBe(false);
});
