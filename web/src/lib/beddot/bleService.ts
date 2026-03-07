import type { VitalReading, DeviceStatus } from './types';

const ANIMALDOT_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const HEART_RATE_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef1';
const RESP_RATE_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef2';
const TEMPERATURE_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef3';
const HUMIDITY_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef4';
const WEIGHT_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef5';
const DEVICE_STATUS_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef6';
const RAW_GEOPHONE_CHAR_UUID = '12345678-1234-5678-1234-56789abcdef8';

export interface BLECallbacks {
  onHeartRate: (reading: VitalReading) => void;
  onRespRate: (reading: VitalReading) => void;
  onTemperature: (reading: VitalReading) => void;
  onHumidity: (reading: VitalReading) => void;
  onWeight: (reading: VitalReading) => void;
  onStatus: (status: DeviceStatus) => void;
  onRawGeophone: (sample: number) => void;
  onDisconnect: () => void;
}

export function isBleSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export async function requestDevice(): Promise<BluetoothDevice> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [ANIMALDOT_SERVICE_UUID] }],
  });
  return device;
}

export async function connectAndSubscribe(
  device: BluetoothDevice,
  callbacks: BLECallbacks,
): Promise<() => void> {
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(ANIMALDOT_SERVICE_UUID);

  const charMap: Array<{ uuid: string; handler: (dv: DataView) => void }> = [
    {
      uuid: HEART_RATE_CHAR_UUID,
      handler: (dv) =>
        callbacks.onHeartRate({ value: dv.getUint8(0), timestamp: Date.now() }),
    },
    {
      uuid: RESP_RATE_CHAR_UUID,
      handler: (dv) =>
        callbacks.onRespRate({ value: dv.getUint8(0), timestamp: Date.now() }),
    },
    {
      uuid: TEMPERATURE_CHAR_UUID,
      handler: (dv) =>
        callbacks.onTemperature({ value: parseFloat(dv.getFloat32(0, true).toFixed(1)), timestamp: Date.now() }),
    },
    {
      uuid: HUMIDITY_CHAR_UUID,
      handler: (dv) =>
        callbacks.onHumidity({ value: parseFloat(dv.getFloat32(0, true).toFixed(1)), timestamp: Date.now() }),
    },
    {
      uuid: WEIGHT_CHAR_UUID,
      handler: (dv) =>
        callbacks.onWeight({ value: parseFloat(dv.getFloat32(0, true).toFixed(1)), timestamp: Date.now() }),
    },
    {
      uuid: DEVICE_STATUS_CHAR_UUID,
      handler: (dv) => {
        const errorCode = dv.getUint8(0);
        const flags = dv.getUint8(1);
        const lastUpdate = dv.getUint32(4, true);
        callbacks.onStatus({
          errorCode,
          dhtConnected: (flags & 0x01) !== 0,
          loadCellsConnected: (flags & 0x02) !== 0,
          geophoneConnected: (flags & 0x04) !== 0,
          adxl355Connected: (flags & 0x08) !== 0,
          lastUpdate,
        });
      },
    },
    {
      uuid: RAW_GEOPHONE_CHAR_UUID,
      handler: (dv) => callbacks.onRawGeophone(dv.getInt16(0, true)),
    },
  ];

  for (const { uuid, handler } of charMap) {
    try {
      const char = await service.getCharacteristic(uuid);
      char.addEventListener('characteristicvaluechanged', (event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) handler(target.value);
      });
      await char.startNotifications();
    } catch (e) {
      console.warn(`[BLE] Could not subscribe to ${uuid}:`, e);
    }
  }

  device.addEventListener('gattserverdisconnected', () => callbacks.onDisconnect());

  return () => {
    if (device.gatt?.connected) {
      device.gatt.disconnect();
    }
  };
}
