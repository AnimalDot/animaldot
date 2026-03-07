/**
 * AnimalDot Mobile App - BLE Service
 *
 * Handles Bluetooth Low Energy communication with the AnimalDot bed.
 * In Expo Go we never load react-native-ble-plx (native module is not available).
 */

import { Buffer } from 'buffer';
import {
  BLE_UUIDS,
  AnimalDotDevice,
  VitalSigns,
  DeviceStatus,
  CalibrationCommand,
} from '../types';

// Types that would come from react-native-ble-plx (avoid importing that module at all in Expo Go)
type Device = any;
type State = string;

let bleManager: any = undefined;

function isExpoGo(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require for Expo Go detection
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

function getBleManager(): any {
  if (bleManager !== undefined) return bleManager;
  // Never load react-native-ble-plx in Expo Go – native module is not linked
  if (isExpoGo()) {
    bleManager = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load to avoid crash in Expo Go
    const { BleManager } = require('react-native-ble-plx');
    bleManager = new BleManager();
  } catch (e) {
    console.warn('BLE unavailable:', (e as Error).message);
    bleManager = null;
  }
  return bleManager;
}

// Event callbacks
type ConnectionCallback = (device: Device | null) => void;
type DataCallback = (data: any) => void;
type ErrorCallback = (error: Error) => void;

class AnimalDotBLEService {
  private manager: any;
  private connectedDevice: Device | null = null;
  private subscriptions: { [key: string]: any } = {};
  private isStub: boolean;

  private onConnectionChange: ConnectionCallback | null = null;
  private onVitalsUpdate: DataCallback | null = null;
  private onEnvironmentUpdate: DataCallback | null = null;
  private onWeightUpdate: DataCallback | null = null;
  private onStatusUpdate: DataCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor(manager: any) {
    this.manager = manager;
    this.isStub = manager === null;
  }

  getInstance(): AnimalDotBLEService {
    return this;
  }

  /** True when the native BLE stack is available (false in Expo Go). */
  isAvailable(): boolean {
    return !this.isStub;
  }

  async checkBluetoothState(): Promise<State> {
    if (this.isStub) return 'Unknown' as State;
    return await this.manager.state();
  }

  async requestPermissions(): Promise<boolean> {
    return true;
  }

  /**
   * Scan for BLE devices. Uses the platform BLE scanner and reports all nearby
   * devices so the user can select one (e.g. AnimalDot bed). No service/name filter.
   */
  async scanForDevices(
    onDeviceFound: (device: AnimalDotDevice) => void,
    _timeoutMs: number = 10000
  ): Promise<void> {
    if (this.isStub) return;
    return new Promise((resolve, reject) => {
      const foundDevices = new Set<string>();
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve();
      }, _timeoutMs);

      // Pass null to scan all BLE devices (built-in scanner behavior)
      this.manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error: any, device: any) => {
          if (error) {
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            reject(error);
            return;
          }
          if (device && !foundDevices.has(device.id)) {
            foundDevices.add(device.id);
            const name = device.localName || device.name || device.id || 'Unknown device';
            onDeviceFound({
              id: device.id,
              name: name.trim() || 'Unknown device',
              rssi: device.rssi ?? -100,
              isConnected: false,
              isPaired: false,
              lastSeen: new Date(),
            });
          }
        }
      );
    });
  }

  stopScan(): void {
    if (!this.isStub) this.manager.stopDeviceScan();
  }

  /** Alias for scanForDevices with no-op callback; used by DeviceStatusScreen. */
  async startScan(): Promise<void> {
    if (this.isStub) return;
    return new Promise((resolve) => {
      this.manager.startDeviceScan(null, { allowDuplicates: false }, () => {});
      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve();
      }, 5000);
    });
  }

  async connect(deviceId: string): Promise<Device> {
    if (this.isStub) throw new Error('BLE not available in Expo Go. Use a development build.');
    try {
      this.manager.stopDeviceScan();
      const device = await this.manager.connectToDevice(deviceId, {
        requestMTU: 512,
        timeout: 10000,
      });
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      device.onDisconnected((_error: any, _dev: any) => {
        this.connectedDevice = null;
        this.cleanupSubscriptions();
        this.onConnectionChange?.(null);
      });
      await this.subscribeToNotifications();
      this.onConnectionChange?.(device);
      return device;
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
      this.cleanupSubscriptions();
    }
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  private async subscribeToNotifications(): Promise<void> {
    if (!this.connectedDevice || this.isStub) return;
    const deviceId = this.connectedDevice.id;
    const serviceUUID = BLE_UUIDS.ANIMALDOT_SERVICE;

    this.subscriptions.heartRate = this.manager.monitorCharacteristicForDevice(
      deviceId, serviceUUID, BLE_UUIDS.HEART_RATE_CHAR,
      (error: any, characteristic: any) => {
        if (!error && characteristic?.value) {
          const hr = this.parseUint8(characteristic.value);
          this.updateVitals({ heartRate: hr });
        }
      }
    );
    this.subscriptions.respRate = this.manager.monitorCharacteristicForDevice(
      deviceId, serviceUUID, BLE_UUIDS.RESP_RATE_CHAR,
      (error: any, characteristic: any) => {
        if (!error && characteristic?.value) {
          const rr = this.parseUint8(characteristic.value);
          this.updateVitals({ respiratoryRate: rr });
        }
      }
    );
    this.subscriptions.temperature = this.manager.monitorCharacteristicForDevice(
      deviceId, serviceUUID, BLE_UUIDS.TEMPERATURE_CHAR,
      (_e: any, c: any) => c?.value && this.onEnvironmentUpdate?.({ temperature: this.parseFloat32(c.value), timestamp: new Date() })
    );
    this.subscriptions.humidity = this.manager.monitorCharacteristicForDevice(
      deviceId, serviceUUID, BLE_UUIDS.HUMIDITY_CHAR,
      (_e: any, c: any) => c?.value && this.onEnvironmentUpdate?.({ humidity: this.parseFloat32(c.value), timestamp: new Date() })
    );
    this.subscriptions.weight = this.manager.monitorCharacteristicForDevice(
      deviceId, serviceUUID, BLE_UUIDS.WEIGHT_CHAR,
      (_e: any, c: any) => c?.value && this.onWeightUpdate?.({ weight: this.parseFloat32(c.value), timestamp: new Date() })
    );
    this.subscriptions.status = this.manager.monitorCharacteristicForDevice(
      deviceId, serviceUUID, BLE_UUIDS.DEVICE_STATUS_CHAR,
      (_e: any, c: any) => c?.value && this.onStatusUpdate?.(this.parseDeviceStatus(c.value))
    );
  }

  private cleanupSubscriptions(): void {
    Object.values(this.subscriptions).forEach((sub: any) => sub?.remove?.());
    this.subscriptions = {};
  }

  async sendCalibrationCommand(
    commandOrKey: CalibrationCommand | string,
    value: number = 0
  ): Promise<void> {
    if (this.isStub || !this.connectedDevice) return;
    const cmd =
      commandOrKey === 'tare' || commandOrKey === CalibrationCommand.TARE_WEIGHT
        ? CalibrationCommand.TARE_WEIGHT
        : commandOrKey === 'weight' || commandOrKey === CalibrationCommand.SET_WEIGHT_FACTOR
          ? CalibrationCommand.SET_WEIGHT_FACTOR
          : commandOrKey === 'temperature' || commandOrKey === CalibrationCommand.SET_TEMP_OFFSET
            ? CalibrationCommand.SET_TEMP_OFFSET
            : (commandOrKey as unknown as CalibrationCommand);
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(cmd, 0);
    buffer.writeFloatLE(value, 1);
    await this.manager.writeCharacteristicWithResponseForDevice(
      this.connectedDevice.id,
      BLE_UUIDS.ANIMALDOT_SERVICE,
      BLE_UUIDS.CALIBRATION_CHAR,
      buffer.toString('base64')
    );
  }

  async tareWeight(): Promise<void> {
    await this.sendCalibrationCommand(CalibrationCommand.TARE_WEIGHT);
  }

  async setTemperatureOffset(offset: number): Promise<void> {
    await this.sendCalibrationCommand(CalibrationCommand.SET_TEMP_OFFSET, offset);
  }

  async setWeightCalibrationFactor(factor: number): Promise<void> {
    await this.sendCalibrationCommand(CalibrationCommand.SET_WEIGHT_FACTOR, factor);
  }

  private parseUint8(base64: string): number {
    return Buffer.from(base64, 'base64').readUInt8(0);
  }

  private parseFloat32(base64: string): number {
    return Buffer.from(base64, 'base64').readFloatLE(0);
  }

  private parseDeviceStatus(base64: string): DeviceStatus {
    const buffer = Buffer.from(base64, 'base64');
    const flags = buffer.readUInt8(1);
    return {
      errorCode: buffer.readUInt8(0),
      geophoneConnected: (flags & 0x04) !== 0,
      loadCellsConnected: (flags & 0x02) !== 0,
      temperatureSensorConnected: (flags & 0x01) !== 0,
      lastUpdate: new Date(),
    };
  }

  private currentVitals: Partial<VitalSigns> = {};
  private updateVitals(partial: Partial<VitalSigns>): void {
    this.currentVitals = { ...this.currentVitals, ...partial };
    if (this.currentVitals.heartRate !== undefined) {
      this.onVitalsUpdate?.({
        heartRate: this.currentVitals.heartRate || 0,
        respiratoryRate: this.currentVitals.respiratoryRate || 0,
        signalQuality: this.currentVitals.signalQuality || 0.5,
        qualityLevel: 'good',
        isValid: true,
        timestamp: new Date(),
      });
    }
  }

  setOnConnectionChange(cb: ConnectionCallback): void { this.onConnectionChange = cb; }
  setOnVitalsUpdate(cb: DataCallback): void { this.onVitalsUpdate = cb; }
  setOnEnvironmentUpdate(cb: DataCallback): void { this.onEnvironmentUpdate = cb; }
  setOnWeightUpdate(cb: DataCallback): void { this.onWeightUpdate = cb; }
  setOnStatusUpdate(cb: DataCallback): void { this.onStatusUpdate = cb; }
  setOnError(cb: ErrorCallback): void { this.onError = cb; }
}

// Singleton: created on first getInstance(), so BLE is only loaded when used
let serviceInstance: AnimalDotBLEService | null = null;

function getInstance(): AnimalDotBLEService {
  if (!serviceInstance) {
    const manager = getBleManager();
    serviceInstance = new AnimalDotBLEService(manager);
  }
  return serviceInstance;
}

export const BLEService = { getInstance };
/** Alias so screens that import { bleService } get the singleton instance. */
export const bleService = BLEService.getInstance();
export function getBleManagerExport(): any { return getBleManager(); }
export default BLEService;
