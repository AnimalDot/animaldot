import { api, setTokens, clearTokens, getAccessToken, getRefreshToken } from './client.js';

export interface User {
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
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await api.post('/auth/register', { email, password, name });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Registration failed');
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth/login', { email, password });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Login failed');
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await api.post('/auth/logout', { refreshToken: refresh });
    } catch {}
  }
  clearTokens();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export async function fetchMe(): Promise<User | null> {
  const res = await api.get('/users/me');
  if (!res.ok) return null;
  return res.json();
}
