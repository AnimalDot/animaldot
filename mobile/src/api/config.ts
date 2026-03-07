/**
 * API base URL. Set EXPO_PUBLIC_API_URL in .env or app config for production.
 * For local dev with emulator use 10.0.2.2:3000 (Android) or localhost:3000 (iOS simulator).
 */
const getApiBase = (): string => {
  try {
    const url = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL;
    if (url) return url.replace(/\/$/, '');
  } catch {
    // ignore missing env
  }
  return 'http://localhost:3000/api';
};

export const API_BASE = getApiBase();
