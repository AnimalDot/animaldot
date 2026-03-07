/**
 * AnimalDot Mobile App - Global State Store
 * 
 * Uses Zustand for lightweight, performant state management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  PetProfile,
  AnimalDotDevice,
  VitalSigns,
  EnvironmentData,
  WeightData,
  DeviceStatus,
  AppSettings,
  DataPoint,
  BLEConnectionState,
} from '../types';

// ============================================
// User & Auth Store
// ============================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        const user = get().user;
        if (user) {
          const { pets, activePetId } = usePetStore.getState();
          const { settings } = useSettingsStore.getState();
          savePetsForUser(user.id, pets, activePetId);
          saveSettingsForUser(user.id, settings);
        }
        usePetStore.getState().clearUserData();
        useSettingsStore.getState().clearUserData();
        useDeviceStore.getState().clearAll();
        useSensorStore.getState().clearAllForUser();
        set({ user: null, isAuthenticated: false });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      checkAuth: async () => {
        await new Promise((r) => setTimeout(r, 0));
      },
    }),
    {
      name: 'animaldot-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================
// Pet Profile Store
// ============================================

const PETS_STORAGE_PREFIX = 'animaldot-pets-';
const SETTINGS_STORAGE_PREFIX = 'animaldot-settings-';
const REGISTERED_ACCOUNTS_KEY = 'animaldot-registered-accounts';

interface StoredAccount {
  email: string;
  userId: string;
  name: string;
  createdAt: string;
}

export async function getAccountByEmail(email: string): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as StoredAccount[];
    const normalized = email.trim().toLowerCase();
    const found = list.find((a) => a.email.toLowerCase() === normalized);
    if (!found) return null;
    return {
      id: found.userId,
      name: found.name,
      email: found.email,
      createdAt: new Date(found.createdAt),
    };
  } catch {
    return null;
  }
}

export async function registerAccount(user: User): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    const list: StoredAccount[] = raw ? JSON.parse(raw) : [];
    const normalized = user.email.trim().toLowerCase();
    if (list.some((a) => a.email.toLowerCase() === normalized)) return;
    list.push({
      email: user.email.trim(),
      userId: user.id,
      name: user.name,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date().toISOString(),
    });
    await AsyncStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to register account', e);
  }
}

interface PetState {
  pets: PetProfile[];
  activePetId: string | null;
  addPet: (pet: PetProfile) => void;
  updatePet: (id: string, updates: Partial<PetProfile>) => void;
  removePet: (id: string) => void;
  setActivePet: (id: string) => void;
  getActivePet: () => PetProfile | null;
  replaceStateForUser: (pets: PetProfile[], activePetId: string | null) => void;
  clearUserData: () => void;
}

function revivePet(p: Partial<PetProfile> & { createdAt?: unknown; updatedAt?: unknown }): PetProfile {
  return {
    ...p,
    id: p.id!,
    name: p.name ?? '',
    breed: p.breed ?? '',
    age: p.age ?? 0,
    baselineWeight: p.baselineWeight ?? 0,
    medicalNotes: p.medicalNotes ?? '',
    createdAt: p.createdAt instanceof Date ? p.createdAt : new Date((p.createdAt as string) || Date.now()),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date((p.updatedAt as string) || Date.now()),
  } as PetProfile;
}

export const usePetStore = create<PetState>()((set, get) => ({
  pets: [],
  activePetId: null,
  addPet: (pet) =>
    set((state) => ({
      pets: [...state.pets, pet],
      activePetId: state.activePetId || pet.id,
    })),
  updatePet: (id, updates) =>
    set((state) => ({
      pets: state.pets.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    })),
  removePet: (id) =>
    set((state) => {
      const nextPets = state.pets.filter((p) => p.id !== id);
      const nextActiveId =
        state.activePetId === id ? nextPets[0]?.id ?? null : state.activePetId;
      return { pets: nextPets, activePetId: nextActiveId };
    }),
  setActivePet: (id) => set({ activePetId: id }),
  getActivePet: () => {
    const state = get();
    return state.pets.find((p) => p.id === state.activePetId) || null;
  },
  replaceStateForUser: (pets, activePetId) =>
    set({
      pets: pets.map((p) => revivePet(p)),
      activePetId,
    }),
  clearUserData: () => set({ pets: [], activePetId: null }),
}));

export async function loadPetsForUser(userId: string): Promise<{ pets: PetProfile[]; activePetId: string | null }> {
  try {
    const raw = await AsyncStorage.getItem(PETS_STORAGE_PREFIX + userId);
    if (!raw) return { pets: [], activePetId: null };
    const data = JSON.parse(raw) as { pets?: unknown[]; activePetId?: string | null };
    const pets = (data.pets || []).map((p: unknown) => revivePet(p as Parameters<typeof revivePet>[0]));
    return { pets, activePetId: data.activePetId ?? null };
  } catch {
    return { pets: [], activePetId: null };
  }
}

export async function savePetsForUser(userId: string, pets: PetProfile[], activePetId: string | null): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PETS_STORAGE_PREFIX + userId,
      JSON.stringify({ pets, activePetId })
    );
  } catch (e) {
    console.warn('Failed to save pets for user', e);
  }
}

// ============================================
// Device & Connection Store
// ============================================

export interface MqttConfig {
  brokerUrl: string;
  org: string;
  macHex: string;
}

interface DeviceState {
  devices: AnimalDotDevice[];
  connectedDeviceId: string | null;
  connectionState: BLEConnectionState;
  dataSource: 'ble' | 'mqtt' | 'none';
  mqttConfig: MqttConfig;
  addDevice: (device: AnimalDotDevice) => void;
  updateDevice: (id: string, updates: Partial<AnimalDotDevice>) => void;
  setConnectedDevice: (id: string | null) => void;
  setConnectionState: (state: BLEConnectionState) => void;
  setDataSource: (source: 'ble' | 'mqtt' | 'none') => void;
  setMqttConfig: (config: Partial<MqttConfig>) => void;
  clearDevices: () => void;
  clearAll: () => void;
}

const initialMqttConfig: MqttConfig = {
  brokerUrl: 'ws://sensorweb.us:9001',
  org: 'sensorweb',
  macHex: '',
};

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  connectedDeviceId: null,
  connectionState: 'disconnected',
  dataSource: 'none',
  mqttConfig: { ...initialMqttConfig },
  addDevice: (device) =>
    set((state) => {
      const exists = state.devices.some((d) => d.id === device.id);
      if (exists) {
        return {
          devices: state.devices.map((d) =>
            d.id === device.id ? { ...d, ...device } : d
          ),
        };
      }
      return { devices: [...state.devices, device] };
    }),
  updateDevice: (id, updates) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  setConnectedDevice: (id) =>
    set({
      connectedDeviceId: id,
      connectionState: id ? 'connected' : 'disconnected',
    }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setDataSource: (dataSource) => set({ dataSource }),
  setMqttConfig: (partial) =>
    set((s) => ({ mqttConfig: { ...s.mqttConfig, ...partial } })),
  clearDevices: () => set({ devices: [] }),
  clearAll: () =>
    set({
      devices: [],
      connectedDeviceId: null,
      connectionState: 'disconnected',
      dataSource: 'none',
      mqttConfig: { ...initialMqttConfig },
    }),
}));

// ============================================
// Sensor Data Store
// ============================================

interface SensorState {
  vitals: VitalSigns | null;
  environment: EnvironmentData | null;
  weight: WeightData | null;
  deviceStatus: DeviceStatus | null;
  lastUpdate: Date | null;
  
  // Historical data (last 24 hours, sampled every minute)
  heartRateHistory: DataPoint[];
  respRateHistory: DataPoint[];
  temperatureHistory: DataPoint[];
  
  updateVitals: (vitals: VitalSigns) => void;
  updateEnvironment: (env: EnvironmentData) => void;
  updateWeight: (weight: WeightData) => void;
  updateDeviceStatus: (status: DeviceStatus) => void;
  addToHistory: (type: 'heartRate' | 'respRate' | 'temperature', point: DataPoint) => void;
  clearHistory: () => void;
  clearAllForUser: () => void;
}

const MAX_HISTORY_POINTS = 1440; // 24 hours at 1 per minute

export const useSensorStore = create<SensorState>((set) => ({
  vitals: null,
  environment: null,
  weight: null,
  deviceStatus: null,
  lastUpdate: null,
  heartRateHistory: [],
  respRateHistory: [],
  temperatureHistory: [],
  
  updateVitals: (vitals) =>
    set((_state) => ({
      vitals,
      lastUpdate: new Date(),
    })),
  updateEnvironment: (env) =>
    set((state) => {
      const prev = state.environment;
      const tempF = (env as Partial<EnvironmentData>).temperature ?? prev?.temperature ?? 0;
      const humidity = (env as Partial<EnvironmentData>).humidity ?? prev?.humidity ?? 0;
      const merged: EnvironmentData = {
        temperature: typeof tempF === 'number' ? tempF : prev?.temperature ?? 0,
        temperatureC: typeof tempF === 'number' ? (tempF - 32) * (5 / 9) : (prev?.temperatureC ?? 0),
        humidity: typeof humidity === 'number' ? humidity : prev?.humidity ?? 0,
        isValid: (env as Partial<EnvironmentData>).isValid ?? prev?.isValid ?? true,
        timestamp: (env as Partial<EnvironmentData>).timestamp ?? prev?.timestamp ?? new Date(),
      };
      return { environment: merged, lastUpdate: new Date() };
    }),
  updateWeight: (w) =>
    set((state) => {
      const prev = state.weight;
      const lbs = (w as Partial<WeightData>).weight ?? prev?.weight ?? 0;
      const merged: WeightData = {
        weight: typeof lbs === 'number' ? lbs : prev?.weight ?? 0,
        weightKg: typeof lbs === 'number' ? lbs * 0.453592 : (prev?.weightKg ?? 0),
        isStable: (w as Partial<WeightData>).isStable ?? prev?.isStable ?? false,
        isValid: (w as Partial<WeightData>).isValid ?? prev?.isValid ?? true,
        timestamp: (w as Partial<WeightData>).timestamp ?? prev?.timestamp ?? new Date(),
      };
      return { weight: merged, lastUpdate: new Date() };
    }),
  updateDeviceStatus: (deviceStatus) =>
    set({
      deviceStatus,
      lastUpdate: new Date(),
    }),
addToHistory: (type, point) =>
    set((state) => {
      const historyKey = `${type}History` as keyof SensorState;
      const current = (state[historyKey] as DataPoint[]) || [];
      const updated = [...current, point].slice(-MAX_HISTORY_POINTS);
      return { [historyKey]: updated } as Partial<SensorState>;
    }),
  clearHistory: () =>
    set({
      heartRateHistory: [],
      respRateHistory: [],
      temperatureHistory: [],
    }),
  clearAllForUser: () =>
    set({
      vitals: null,
      environment: null,
      weight: null,
      deviceStatus: null,
      lastUpdate: null,
      heartRateHistory: [],
      respRateHistory: [],
      temperatureHistory: [],
    }),
}));

// ============================================
// Settings Store
// ============================================

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  replaceStateForUser: (settings: AppSettings) => void;
  clearUserData: () => void;
}

export const DEFAULT_SETTINGS: AppSettings = {
  temperatureUnit: 'F',
  weightUnit: 'lbs',
  colorScheme: 'system',
  notificationsEnabled: true,
  dataExportEnabled: true,
  bluetoothAutoConnect: true,
  lastConnectedDeviceId: null,
};

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
  replaceStateForUser: (settings) => set({ settings: { ...DEFAULT_SETTINGS, ...settings } }),
  clearUserData: () => set({ settings: DEFAULT_SETTINGS }),
}));

export async function loadSettingsForUser(userId: string): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_PREFIX + userId);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettingsForUser(userId: string, settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_PREFIX + userId, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings for user', e);
  }
}
