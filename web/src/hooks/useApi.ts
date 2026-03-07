import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPets,
  fetchPet,
  createPet,
  updatePet,
  deletePet,
  fetchDevices,
  fetchVitalsLatest,
  fetchVitalsAggregates,
  fetchUserPreferences,
  updateUserPreferences,
  type Pet,
  type UserPreferences,
  type VitalsAggregates,
} from '../lib/api/endpoints.js';
import { getAccessToken, getWebSocketUrl } from '../lib/api/client.js';

export const queryKeys = {
  pets: ['pets'] as const,
  pet: (id: string) => ['pets', id] as const,
  devices: ['devices'] as const,
  vitalsLatest: (deviceId: string) => ['vitals', 'latest', deviceId] as const,
  vitalsAggregates: (deviceId: string, period: 'day' | 'week') =>
    ['vitals', 'aggregates', deviceId, period] as const,
  userPreferences: ['users', 'me', 'preferences'] as const,
};

export function usePets() {
  return useQuery({ queryKey: queryKeys.pets, queryFn: fetchPets });
}

export function usePet(id: string | undefined, options?: { enabled: boolean }) {
  return useQuery({
    queryKey: queryKeys.pet(id ?? ''),
    queryFn: () => fetchPet(id!),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useCreatePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pet>) => createPet(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pets }),
  });
}

export function useUpdatePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pet> }) => updatePet(id, body),
    onSuccess: (_data: Pet | undefined, { id }: { id: string; body: Partial<Pet> }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pets });
      qc.invalidateQueries({ queryKey: queryKeys.pet(id) });
    },
  });
}

export function useDeletePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePet,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pets }),
  });
}

export function useDevices() {
  return useQuery({ queryKey: queryKeys.devices, queryFn: fetchDevices });
}

export function useVitalsLatest(deviceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vitalsLatest(deviceId ?? ''),
    queryFn: () => fetchVitalsLatest(deviceId!),
    enabled: !!deviceId,
  });
}

export function useVitalsAggregates(
  deviceId: string | undefined,
  period: 'day' | 'week'
) {
  return useQuery({
    queryKey: queryKeys.vitalsAggregates(deviceId ?? '', period),
    queryFn: () => fetchVitalsAggregates(deviceId!, period),
    enabled: !!deviceId,
  });
}

export function useUserPreferences() {
  return useQuery({
    queryKey: queryKeys.userPreferences,
    queryFn: fetchUserPreferences,
  });
}

export function useUpdateUserPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UserPreferences>) => updateUserPreferences(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userPreferences }),
  });
}

/** Subscribe to real-time vitals over WebSocket. Calls onMessage when server pushes vitals. */
export function useVitalsWebSocket(onMessage: (payload: unknown) => void) {
  const token = getAccessToken();
  const ref = React.useRef(onMessage);
  ref.current = onMessage;
  React.useEffect(() => {
    if (typeof window === 'undefined' || !token) return;
    const wsUrl = `${getWebSocketUrl('/vitals')}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'vitals' && msg.payload) ref.current(msg.payload);
      } catch {}
    };
    return () => ws.close();
  }, [token]);
}
