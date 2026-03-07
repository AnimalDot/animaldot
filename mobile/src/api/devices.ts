/**
 * Devices API: register device with backend after BLE pairing.
 */
import { api } from './client';

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  petId: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export async function registerDevice(
  deviceId: string,
  name?: string,
  petId?: string | null
): Promise<Device> {
  const res = await api.post('/devices/register', {
    deviceId: deviceId.trim(),
    name: name?.trim() ?? 'AnimalDot Bed',
    petId: petId ?? null,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? 'Failed to register device');
  }
  return res.json();
}
