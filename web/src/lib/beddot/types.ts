export type DataSource = 'ble' | 'mqtt' | 'bridge';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface VitalReading {
  value: number;
  timestamp: number;
}

export interface DeviceStatus {
  errorCode: number;
  dhtConnected: boolean;
  loadCellsConnected: boolean;
  geophoneConnected: boolean;
  adxl355Connected: boolean;
  lastUpdate: number;
}

export interface TimeSeriesPoint {
  time: string;
  value: number;
}

export interface MqttConfig {
  brokerUrl: string;
  org: string;
  macHex: string;
}
