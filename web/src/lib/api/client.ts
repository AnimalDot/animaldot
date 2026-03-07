/**
 * API client with auth header injection and refresh logic.
 */

// In dev without VITE_API_URL we use relative /api so Vite proxy works and mobile (same origin) can reach the backend.
const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onTokens: ((access: string, refresh: string) => void) | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  onTokens?.(access, refresh);
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setTokenListener(fn: (access: string, refresh: string) => void): void {
  onTokens = fn;
}

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401 && refreshToken) {
    const ok = await doRefresh();
    if (ok && accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }
  return res;
}

export const api = {
  get: (path: string) => apiFetch(path, { method: 'GET' }),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
};

export function getWebSocketUrl(path: string): string {
  const base = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_URL;
  const wsBase = base
    ? base.replace(/^http/, 'ws')
    : (import.meta.env.DEV && typeof location !== 'undefined'
        ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
        : 'ws://localhost:3000');
  return `${wsBase}${path.startsWith('/') ? path : `/${path}`}`;
}
