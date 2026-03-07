import { create } from 'zustand';
import type {
  ConnectionState,
  DataSource,
  VitalReading,
  DeviceStatus,
  TimeSeriesPoint,
  MqttConfig,
} from './types';

const MAX_HISTORY = 50;
const MAX_RAW_SAMPLES = 200;

function appendToHistory(
  arr: TimeSeriesPoint[],
  value: number,
): TimeSeriesPoint[] {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const next = [...arr, { time, value }];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

interface BedDotState {
  connectionState: ConnectionState;
  dataSource: DataSource;
  mqttConfig: MqttConfig;

  heartRate: VitalReading | null;
  respRate: VitalReading | null;
  temperature: VitalReading | null;
  humidity: VitalReading | null;
  weight: VitalReading | null;
  systolicBp: VitalReading | null;
  diastolicBp: VitalReading | null;

  deviceStatus: DeviceStatus | null;
  rawGeophone: number[];

  hrHistory: TimeSeriesPoint[];
  rrHistory: TimeSeriesPoint[];
  tempHistory: TimeSeriesPoint[];
  humHistory: TimeSeriesPoint[];
  weightHistory: TimeSeriesPoint[];
  systolicHistory: TimeSeriesPoint[];
  diastolicHistory: TimeSeriesPoint[];

  readingsCount: number;
  lastUpdate: number | null;
  /** When using bridge: timestamp of last received message (for "connected" while receiving within 30s). */
  lastBridgeMessageAt: number | null;

  setConnectionState: (state: ConnectionState) => void;
  setLastBridgeMessageAt: (t: number | null) => void;
  setDataSource: (source: DataSource) => void;
  setMqttConfig: (config: Partial<MqttConfig>) => void;
  updateVital: (
    type: 'heartRate' | 'respRate' | 'temperature' | 'humidity' | 'weight' | 'systolicBp' | 'diastolicBp',
    reading: VitalReading,
  ) => void;
  setDeviceStatus: (status: DeviceStatus) => void;
  addRawGeophone: (sample: number) => void;
  reset: () => void;
}

const initialMqttConfig: MqttConfig = {
  brokerUrl: 'ws://sensorweb.us:9001',
  org: 'sensorweb',
  macHex: '',
};

export const useBedDotStore = create<BedDotState>((set) => ({
  connectionState: 'disconnected',
  dataSource: 'ble',
  mqttConfig: { ...initialMqttConfig },

  heartRate: null,
  respRate: null,
  temperature: null,
  humidity: null,
  weight: null,
  systolicBp: null,
  diastolicBp: null,

  deviceStatus: null,
  rawGeophone: [],

  hrHistory: [],
  rrHistory: [],
  tempHistory: [],
  humHistory: [],
  weightHistory: [],
  systolicHistory: [],
  diastolicHistory: [],

  readingsCount: 0,
  lastUpdate: null,
  lastBridgeMessageAt: null,

  setConnectionState: (connectionState) => set({ connectionState }),
  setLastBridgeMessageAt: (lastBridgeMessageAt) => set({ lastBridgeMessageAt }),
  setDataSource: (dataSource) => set({ dataSource }),
  setMqttConfig: (partial) =>
    set((s) => ({ mqttConfig: { ...s.mqttConfig, ...partial } })),

  updateVital: (type, reading) =>
    set((s) => {
      const historyMap = {
        heartRate: 'hrHistory',
        respRate: 'rrHistory',
        temperature: 'tempHistory',
        humidity: 'humHistory',
        weight: 'weightHistory',
        systolicBp: 'systolicHistory',
        diastolicBp: 'diastolicHistory',
      } as const;
      const historyKey = historyMap[type];
      return {
        [type]: reading,
        [historyKey]: appendToHistory(s[historyKey], reading.value),
        readingsCount: s.readingsCount + 1,
        lastUpdate: Date.now(),
      };
    }),

  setDeviceStatus: (deviceStatus) => set({ deviceStatus }),

  addRawGeophone: (sample) =>
    set((s) => {
      const next = [...s.rawGeophone, sample];
      return {
        rawGeophone: next.length > MAX_RAW_SAMPLES ? next.slice(next.length - MAX_RAW_SAMPLES) : next,
      };
    }),

  reset: () =>
    set({
      connectionState: 'disconnected',
      heartRate: null,
      respRate: null,
      temperature: null,
      humidity: null,
      weight: null,
      systolicBp: null,
      diastolicBp: null,
      deviceStatus: null,
      rawGeophone: [],
      hrHistory: [],
      rrHistory: [],
      tempHistory: [],
      humHistory: [],
      weightHistory: [],
      systolicHistory: [],
      diastolicHistory: [],
      readingsCount: 0,
      lastUpdate: null,
      lastBridgeMessageAt: null,
    }),
}));
