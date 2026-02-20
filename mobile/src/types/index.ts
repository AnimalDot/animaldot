/**
 * AnimalDot Mobile App - Type Definitions
 */

// ============================================
// Vital Signs & Sensor Data
// ============================================

export interface VitalSigns {
  heartRate: number;      // bpm
  respiratoryRate: number; // breaths/min
  signalQuality: number;  // 0-1
  qualityLevel: 'poor' | 'fair' | 'good';
  isValid: boolean;
  timestamp: Date;
}

export interface EnvironmentData {
  temperature: number;    // Fahrenheit
  temperatureC: number;   // Celsius  
  humidity: number;       // Percentage
  isValid: boolean;
  timestamp: Date;
}

export interface WeightData {
  weight: number;         // Pounds
  weightKg: number;       // Kilograms
  isStable: boolean;
  isValid: boolean;
  timestamp: Date;
}

export interface DeviceStatus {
  geophoneConnected: boolean;
  loadCellsConnected: boolean;
  temperatureSensorConnected: boolean;
  errorCode: number;
  lastUpdate: Date;
  firmwareVersion?: string;
  batteryLevel?: number;
}

export interface SensorReading {
  vitals: VitalSigns;
  environment: EnvironmentData;
  weight: WeightData;
  deviceStatus: DeviceStatus;
  timestamp: Date;
}

// ============================================
// Pet Profile
// ============================================

export interface PetProfile {
  id: string;
  name: string;
  breed: string;
  age: number;           // Years
  baselineWeight: number; // Pounds
  medicalNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// BLE Device
// ============================================

export interface AnimalDotDevice {
  id: string;
  name: string;
  rssi: number;
  isConnected: boolean;
  isPaired: boolean;
  lastSeen: Date;
}

export type BLEConnectionState = 
  | 'disconnected' 
  | 'scanning' 
  | 'connecting' 
  | 'connected' 
  | 'error';

// ============================================
// Historical Data
// ============================================

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface TrendData {
  heartRate: DataPoint[];
  respiratoryRate: DataPoint[];
  temperature: DataPoint[];
  weight: DataPoint[];
}

export interface DailySummary {
  date: Date;
  avgHeartRate: number;
  avgRespiratoryRate: number;
  avgTemperature: number;
  minWeight: number;
  maxWeight: number;
  timeOnBed: number; // minutes
}

// ============================================
// User & Settings
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AppSettings {
  temperatureUnit: 'F' | 'C';
  weightUnit: 'lbs' | 'kg';
  notificationsEnabled: boolean;
  dataExportEnabled: boolean;
  bluetoothAutoConnect: boolean;
  lastConnectedDeviceId: string | null;
}

// ============================================
// Navigation Types
// ============================================

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  CreateAccount: undefined;
  DevicePairing: undefined;
  PetProfile: { isEditing?: boolean };
  Main: undefined;
};

export type MainTabParamList = {
  Live: undefined;
  Trends: undefined;
  Device: undefined;
  Settings: undefined;
};

// ============================================
// BLE Service UUIDs (must match firmware)
// ============================================

export const BLE_UUIDS = {
  // Custom AnimalDot Service
  ANIMALDOT_SERVICE: '12345678-1234-5678-1234-56789abcdef0',
  HEART_RATE_CHAR: '12345678-1234-5678-1234-56789abcdef1',
  RESP_RATE_CHAR: '12345678-1234-5678-1234-56789abcdef2',
  TEMPERATURE_CHAR: '12345678-1234-5678-1234-56789abcdef3',
  HUMIDITY_CHAR: '12345678-1234-5678-1234-56789abcdef4',
  WEIGHT_CHAR: '12345678-1234-5678-1234-56789abcdef5',
  DEVICE_STATUS_CHAR: '12345678-1234-5678-1234-56789abcdef6',
  CALIBRATION_CHAR: '12345678-1234-5678-1234-56789abcdef7',
  RAW_GEOPHONE_CHAR: '12345678-1234-5678-1234-56789abcdef8',
  
  // Standard Heart Rate Service
  HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
} as const;

// ============================================
// Calibration Commands
// ============================================

export enum CalibrationCommand {
  TARE_WEIGHT = 0x01,
  SET_TEMP_OFFSET = 0x02,
  SET_WEIGHT_FACTOR = 0x03,
}

// ============================================
// Normal Ranges (for display)
// ============================================

export const NORMAL_RANGES = {
  heartRate: { min: 60, max: 120 },       // bpm for dogs
  respiratoryRate: { min: 15, max: 30 },  // breaths/min
  temperature: { min: 100, max: 102.5 },  // °F
} as const;
