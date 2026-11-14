const base = import.meta.env.VITE_API_URL || '/api/v1';

let pendingChanges = 0;
const busyListeners = new Set<() => void>();

function notifyBusy() {
  busyListeners.forEach((listener) => listener());
}

export function isApiBusy() {
  return pendingChanges > 0;
}

export function subscribeApiBusy(listener: () => void) {
  busyListeners.add(listener);
  return () => busyListeners.delete(listener);
}

function tracksChange(method?: string) {
  const verb = (method || 'GET').toUpperCase();
  return verb !== 'GET' && verb !== 'HEAD';
}

function runChange<T>(method: string | undefined, run: () => Promise<T>) {
  if (!tracksChange(method)) return run();
  pendingChanges += 1;
  notifyBusy();
  return run().finally(() => {
    pendingChanges = Math.max(0, pendingChanges - 1);
    notifyBusy();
  });
}

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

async function request(path: string, init: RequestInit = {}, retry = true): Promise<{ data: unknown; meta?: PageMeta }> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const access = token();
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const ok = await refresh();
    if (ok) return request(path, init, false);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new ApiError(body?.error?.message || 'Something went wrong');
  }
  return body;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  paidPaise?: number;
  commissionPaise?: number;
  payoutPaise?: number;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  return runChange(init.method, async () => {
    const body = await request(path, init, retry);
    return body.data as T;
  });
}

export async function apiPage<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta: PageMeta }> {
  return runChange(init.method, async () => {
    const body = await request(path, init);
    const data = body.data as T;
    return {
      data,
      meta: body.meta ?? { page: 1, limit: Array.isArray(data) ? data.length : 0, total: Array.isArray(data) ? data.length : 0 },
    };
  });
}

export function saveSession(session: { accessToken: string; refreshToken: string }) {
  localStorage.setItem('stylio.access', session.accessToken);
  localStorage.setItem('stylio.refresh', session.refreshToken);
}

export function clearSession() {
  localStorage.removeItem('stylio.access');
  localStorage.removeItem('stylio.refresh');
}
