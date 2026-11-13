const base = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function token() {
  return localStorage.getItem('stylio.access');
}

async function refresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('stylio.refresh');
  if (!refreshToken) return false;
  const response = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    localStorage.removeItem('stylio.access');
    localStorage.removeItem('stylio.refresh');
    return false;
  }
  const body = await response.json();
  localStorage.setItem('stylio.access', body.data.accessToken);
  localStorage.setItem('stylio.refresh', body.data.refreshToken);
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const access = token();
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const ok = await refresh();
    if (ok) return api<T>(path, init, false);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new ApiError(body?.error?.message || 'Something went wrong');
  }
  return body.data as T;
}

export function saveSession(session: { accessToken: string; refreshToken: string }) {
  localStorage.setItem('stylio.access', session.accessToken);
  localStorage.setItem('stylio.refresh', session.refreshToken);
}

export function clearSession() {
  localStorage.removeItem('stylio.access');
  localStorage.removeItem('stylio.refresh');
}
