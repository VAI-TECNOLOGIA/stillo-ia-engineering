import { useAuthStore } from '@/stores/auth.store';
import { isDemo, demoHandle } from './demo';

// Em produção o front fica em outro domínio que a API → aponta via VITE_API_URL.
// Em dev/demo permanece relativo ('/api/v1') e não afeta o modo demo.
const API_ORIGIN = (import.meta.env as Record<string, string | undefined>).VITE_API_URL ?? '';
export const BASE = `${API_ORIGIN}/api/v1`;

class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setAccessToken, clear } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clear();
      return false;
    }
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    useAuthStore.setState({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    clear();
    return false;
  }
}

/** Wrapper de fetch com Bearer token e retry único após refresh em 401. */
export async function api<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  if (isDemo()) {
    const parsed = typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
    return demoHandle<T>(path, (options.method ?? 'GET').toUpperCase(), parsed);
  }
  const { accessToken } = useAuthStore.getState();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const metodo = (options.method ?? 'GET').toUpperCase();
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const ms = Math.round(performance.now() - t0);

  if (res.status === 401 && !_retried) {
    const ok = await refreshAccessToken();
    if (ok) return api<T>(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const { diagLog } = await import('./diag');
    diagLog(`api ${metodo} ${path} → ${res.status} (${ms}ms)`, body);
    throw new ApiError(res.status, (body as { message?: string }).message ?? `Erro ${res.status}`, body);
  }
  if (ms > 3000) {
    const { diagLog } = await import('./diag');
    diagLog(`api ${metodo} ${path} → ${res.status} (${ms}ms)`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { ApiError };
