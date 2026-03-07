/**
 * Auth API: login, register, refresh, logout, fetchMe.
 */
import { api, setTokens, clearTokens, getRefreshToken, loadStoredTokens } from './client';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
  preferences?: {
    temperatureUnit: string;
    weightUnit: string;
    theme: string;
    notificationsEnabled: boolean;
  };
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  const res = await api.post('/auth/register', { email, password, name });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? 'Registration failed');
  }
  const data = (await res.json()) as AuthResponse;
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth/login', { email, password });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? 'Sign in failed');
  }
  const data = (await res.json()) as AuthResponse;
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await api.post('/auth/logout', { refreshToken: refresh });
    } catch {
      // ignore network errors on logout
    }
  }
  clearTokens();
}

export async function fetchMe(): Promise<ApiUser | null> {
  const res = await api.get('/users/me');
  if (!res.ok) return null;
  return res.json();
}

/** Restore session: load tokens from storage, then validate with refresh or fetchMe. Returns user if valid. */
export async function restoreSession(): Promise<ApiUser | null> {
  await loadStoredTokens();
  const user = await fetchMe();
  return user;
}
