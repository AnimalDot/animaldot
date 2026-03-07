/**
 * API client with auth header and refresh logic. Tokens stored in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './config';

const ACCESS_KEY = 'animaldot_access';
const REFRESH_KEY = 'animaldot_refresh';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function loadStoredTokens(): Promise<void> {
  try {
    const [access, refresh] = await Promise.all([
      AsyncStorage.getItem(ACCESS_KEY),
      AsyncStorage.getItem(REFRESH_KEY),
    ]);
    if (access) accessToken = access;
    if (refresh) refreshToken = refresh;
  } catch {
    // ignore storage read errors
  }
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  AsyncStorage.setItem(ACCESS_KEY, access).catch(() => {});
  AsyncStorage.setItem(REFRESH_KEY, refresh).catch(() => {});
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]).catch(() => {});
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
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
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401 && refreshToken) {
    const ok = await doRefresh();
    if (ok && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
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
