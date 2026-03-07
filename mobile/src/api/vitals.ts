/**
 * REST API calls for vitals data.
 */
import { apiFetch } from './client';

export interface VitalsLatest {
  heartRate: number | null;
  respiratoryRate: number | null;
  temperatureF: number | null;
  weightLbs: number | null;
  signalQuality: number | null;
  qualityLevel: string | null;
  recordedAt: string;
}

export async function fetchLatestVitals(deviceId: string): Promise<VitalsLatest | null> {
  const res = await apiFetch(`/vitals/latest?deviceId=${encodeURIComponent(deviceId)}`);
  if (!res.ok) return null;
  return res.json();
}
