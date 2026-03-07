/**
 * Typed API endpoint helpers for pets, devices, vitals, preferences.
 */
import { api } from './client.js';

export interface Pet {
  id: string;
  name: string;
  breed: string;
  speciesClass: string | null;
  age: number;
  baselineWeight: number;
  medicalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  petId: string | null;
  status: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalsLatest {
  heartRate: number;
  respiratoryRate: number;
  temperatureF: number;
  weightLbs: number;
  systolicMmhg?: number | null;
  diastolicMmhg?: number | null;
  signalQuality: string | null;
  qualityLevel: string | null;
  recordedAt: string;
}

export interface VitalsAggregatePoint {
  time: string;
  heartRate: number;
  respiratoryRate: number;
  temperatureF: number;
  weightLbs: number;
}

export interface VitalsAggregates {
  period: 'day' | 'week';
  data: VitalsAggregatePoint[];
}

export interface UserPreferences {
  temperatureUnit: string;
  weightUnit: string;
  theme: string;
  notificationsEnabled: boolean;
}

export async function fetchPets(): Promise<Pet[]> {
  const res = await api.get('/pets');
  if (!res.ok) throw new Error('Failed to fetch pets');
  return res.json();
}

export async function fetchPet(id: string): Promise<Pet> {
  const res = await api.get(`/pets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch pet');
  return res.json();
}

export async function createPet(body: Partial<Pet>): Promise<Pet> {
  const res = await api.post('/pets', body);
  if (!res.ok) throw new Error('Failed to create pet');
  return res.json();
}

export async function updatePet(id: string, body: Partial<Pet>): Promise<Pet> {
  const res = await api.patch(`/pets/${id}`, body);
  if (!res.ok) throw new Error('Failed to update pet');
  return res.json();
}

export async function deletePet(id: string): Promise<void> {
  const res = await api.delete(`/pets/${id}`);
  if (!res.ok) throw new Error('Failed to delete pet');
}

export async function fetchDevices(): Promise<Device[]> {
  const res = await api.get('/devices');
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function fetchVitalsLatest(deviceId: string): Promise<VitalsLatest | null> {
  const res = await api.get(`/vitals/latest?deviceId=${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Failed to fetch latest vitals');
  return res.json();
}

export async function fetchVitalsAggregates(
  deviceId: string,
  period: 'day' | 'week'
): Promise<VitalsAggregates> {
  const res = await api.get(
    `/vitals/aggregates?deviceId=${encodeURIComponent(deviceId)}&period=${period}`
  );
  if (!res.ok) throw new Error('Failed to fetch vitals aggregates');
  return res.json();
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  const res = await api.get('/users/me/preferences');
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json();
}

export async function updateUserPreferences(body: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await api.patch('/users/me/preferences', body);
  if (!res.ok) throw new Error('Failed to update preferences');
  return res.json();
}
