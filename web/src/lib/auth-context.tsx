import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  setTokens,
  clearTokens,
  setTokenListener,
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  type User,
} from './api/index.js';

const STORAGE_ACCESS = 'animaldot_access';
const STORAGE_REFRESH = 'animaldot_refresh';

function loadStoredTokens(): void {
  try {
    const access = sessionStorage.getItem(STORAGE_ACCESS);
    const refresh = sessionStorage.getItem(STORAGE_REFRESH);
    if (access && refresh) setTokens(access, refresh);
  } catch {}
}

function saveTokens(access: string, refresh: string): void {
  try {
    sessionStorage.setItem(STORAGE_ACCESS, access);
    sessionStorage.setItem(STORAGE_REFRESH, refresh);
  } catch {}
}

function clearStoredTokens(): void {
  try {
    sessionStorage.removeItem(STORAGE_ACCESS);
    sessionStorage.removeItem(STORAGE_REFRESH);
  } catch {}
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredTokens();
    setTokenListener(saveTokens);
    fetchMe()
      .then((u) => setUser(u ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await apiRegister(email, password, name);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    clearStoredTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await fetchMe();
    setUser(u ?? null);
  }, []);

  const value: AuthContextValue = { user, loading, login, register, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
