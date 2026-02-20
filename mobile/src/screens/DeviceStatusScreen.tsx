// DeviceStatusScreen.tsx
// Hardware component status, calibration controls, and device management

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useSensorStore, useDeviceStore, useSettingsStore } from '../services/store';
import { BLEService } from '../services/BLEService';
import { Card, Button, StatusBadge, SectionHeader, Colors } from '../components/UI';
import { tempUnitLabel, weightUnitLabel } from '../utils/units';

interface HardwareComponent {
  name: string;
  key: string;
  icon: string;
  description: string;
}

const HARDWARE_COMPONENTS: HardwareComponent[] = [
  { name: 'Geophone', key: 'geophone', icon: '📡', description: 'Vibration sensor for HR/RR' },
  { name: 'Load Cells', key: 'loadCells', icon: '⚖️', description: 'Weight measurement (5x FX29)' },
  { name: 'Temperature Sensor', key: 'temperature', icon: '🌡️', description: 'DHT22 temp/humidity' },
  { name: 'Bluetooth', key: 'bluetooth', icon: '📶', description: 'BLE communication module' },
];

interface CalibrationModalProps {
  visible: boolean;
  type: 'weight' | 'temperature' | null;
  onClose: () => void;
  onCalibrate: (value: number) => void;
  weightUnit: 'lbs' | 'kg';
  temperatureUnit: 'F' | 'C';
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({
  visible,
  type,
  onClose,
  onCalibrate,
  weightUnit,
  temperatureUnit,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleCalibrate = async () => {
    const value = parseFloat(inputValue);
    if (isNaN(value)) {
      Alert.alert('Invalid Input', 'Please enter a valid number.');
      return;
    }

    setIsCalibrating(true);
    try {
      await onCalibrate(value);
      Alert.alert('Success', `${type === 'weight' ? 'Weight' : 'Temperature'} calibration completed.`);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Calibration failed. Please try again.');
    } finally {
      setIsCalibrating(false);
    }
  };

  const getTitle = () => {
    if (type === 'weight') return 'Calibrate Weight';
    if (type === 'temperature') return 'Calibrate Temperature';
    return '';
  };

  const getInstructions = () => {
    const w = weightUnitLabel(weightUnit);
    const t = tempUnitLabel(temperatureUnit);
    if (type === 'weight') {
      return `Place a known weight on the bed and enter the actual weight in ${w}. This will adjust the calibration factor.`;
    }
    if (type === 'temperature') {
      return `Enter the temperature offset in ${t} to correct sensor readings. Use a reference thermometer for accuracy.`;
    }
    return '';
  };

  const getPlaceholder = () => {
    if (type === 'weight') return `Known weight (${weightUnitLabel(weightUnit)})`;
    if (type === 'temperature') return `Temperature offset (${tempUnitLabel(temperatureUnit)})`;
    return '';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{getTitle()}</Text>
          <Text style={styles.modalInstructions}>{getInstructions()}</Text>
          
          <TextInput
            style={styles.calibrationInput}
            placeholder={getPlaceholder()}
            keyboardType="decimal-pad"
            value={inputValue}
            onChangeText={setInputValue}
            editable={!isCalibrating}
          />
          
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.modalButton}
              disabled={isCalibrating}
            />
            <Button
              title={isCalibrating ? 'Calibrating...' : 'Calibrate'}
              variant="primary"
              onPress={handleCalibrate}
              style={styles.modalButton}
              loading={isCalibrating}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const DeviceStatusScreen: React.FC = () => {
  const { deviceStatus, vitals, lastUpdate } = useSensorStore();
  const { settings } = useSettingsStore();
  const signalQuality = vitals?.signalQuality ?? 0;
  const lastUpdated = lastUpdate;
  const { devices, connectedDeviceId, connectionState } = useDeviceStore();
  const connectedDevice = connectedDeviceId ? devices.find((d) => d.id === connectedDeviceId) ?? { id: connectedDeviceId, name: 'AnimalDot Bed', rssi: 0, isConnected: true, isPaired: true, lastSeen: new Date() } : null;
  const isConnected = !!connectedDeviceId;
  const isScanning = connectionState === 'scanning';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calibrationModal, setCalibrationModal] = useState<{
    visible: boolean;
    type: 'weight' | 'temperature' | null;
  }>({ visible: false, type: null });
  const [componentStatus, setComponentStatus] = useState<Record<string, boolean>>({
    geophone: false,
    loadCells: false,
    temperature: false,
    bluetooth: false,
  });
  const [isTaring, setIsTaring] = useState(false);

  useEffect(() => {
    // Update component status based on device status
    if (deviceStatus) {
      setComponentStatus({
        geophone: deviceStatus.geophoneConnected,
        loadCells: deviceStatus.loadCellsConnected,
        temperature: deviceStatus.temperatureSensorConnected,
        bluetooth: isConnected,
      });
    } else {
      setComponentStatus({
        geophone: false,
        loadCells: false,
        temperature: false,
        bluetooth: isConnected,
      });
    }
  }, [deviceStatus, isConnected]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Request status update from device
      if (isConnected) {
        // The BLE service will automatically update status
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isConnected]);

  const handleRescan = async () => {
    if (isScanning) return;
    
    try {
      await BLEService.getInstance().startScan();
      Alert.alert('Scanning', 'Searching for AnimalDot devices...');
    } catch (error) {
      Alert.alert('Error', 'Failed to start scanning. Please check Bluetooth permissions.');
    }
  };

  const handleTareWeight = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to an AnimalDot device first.');
      return;
    }

    Alert.alert(
      'Tare Weight',
      'Make sure the bed is empty before taring. This will set the current reading as zero.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Tare',
          onPress: async () => {
            setIsTaring(true);
            try {
              await BLEService.getInstance().sendCalibrationCommand('tare', 0);
              Alert.alert('Success', 'Weight has been tared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to tare weight. Please try again.');
            } finally {
              setIsTaring(false);
            }
          },
        },
      ]
    );
  };

  const handleCalibrateWeight = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to an AnimalDot device first.');
      return;
    }
    setCalibrationModal({ visible: true, type: 'weight' });
  };

  const handleCalibrateTemperature = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to an AnimalDot device first.');
      return;
    }
    setCalibrationModal({ visible: true, type: 'temperature' });
  };

  const handleCalibration = async (value: number) => {
    const type = calibrationModal.type;
    if (!type) return;

    if (type === 'weight') {
      await BLEService.getInstance().sendCalibrationCommand('weight', value);
    } else if (type === 'temperature') {
      await BLEService.getInstance().sendCalibrationCommand('temperature', value);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Device',
      'Are you sure you want to disconnect from this AnimalDot device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await BLEService.getInstance().disconnect();
              useDeviceStore.getState().setConnectedDevice(null);
              useDeviceStore.getState().setConnectionState('disconnected');
            } catch (error) {
              console.error('Disconnect error:', error);
            }
          },
        },
      ]
    );
  };

  const getSignalQualityLabel = () => {
    if (!signalQuality) return 'Unknown';
    if (signalQuality >= 0.8) return 'Excellent';
    if (signalQuality >= 0.6) return 'Good';
    if (signalQuality >= 0.4) return 'Fair';
    return 'Poor';
  };

  const getSignalQualityColor = () => {
    if (!signalQuality) return Colors.textSecondary;
    if (signalQuality >= 0.8) return Colors.success;
    if (signalQuality >= 0.6) return Colors.primary;
    if (signalQuality >= 0.4) return Colors.warning;
    return Colors.error;
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = Date.now();
    const diff = now - lastUpdated;
    
    if (diff < 5000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)} seconds ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    return 'Over an hour ago';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Connection Status Card */}
      <Card style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View>
            <Text style={styles.deviceName}>
              {connectedDevice?.name || 'No Device Connected'}
            </Text>
            <Text style={styles.deviceId}>
              {connectedDevice?.id ? `ID: ${connectedDevice.id.substring(0, 17)}...` : 'N/A'}
            </Text>
          </View>
          <StatusBadge status={isConnected ? 'connected' : 'disconnected'} />
        </View>
        
        <View style={styles.connectionInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{formatLastUpdated()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Signal Quality:</Text>
            <Text style={[styles.infoValue, { color: getSignalQualityColor() }]}>
              {getSignalQualityLabel()}
            </Text>
          </View>
        </View>

        {isConnected && (
          <Button
            title="Disconnect"
            variant="outline"
            onPress={handleDisconnect}
            style={styles.disconnectButton}
          />
        )}
      </Card>

      {/* Hardware Components */}
      <SectionHeader title="Hardware Components" />
      <Card style={styles.componentsCard}>
        {HARDWARE_COMPONENTS.map((component, index) => (
          <View
            key={component.key}
            style={[
              styles.componentRow,
              index < HARDWARE_COMPONENTS.length - 1 && styles.componentRowBorder,
            ]}
          >
            <View style={styles.componentIcon}>
              <Text style={styles.iconText}>{component.icon}</Text>
            </View>
            <View style={styles.componentInfo}>
              <Text style={styles.componentName}>{component.name}</Text>
              <Text style={styles.componentDescription}>{component.description}</Text>
            </View>
            <View style={styles.componentStatus}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: componentStatus[component.key]
                      ? Colors.success
                      : Colors.error,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: componentStatus[component.key]
                      ? Colors.success
                      : Colors.error,
                  },
                ]}
              >
                {componentStatus[component.key] ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Signal Strength */}
      <SectionHeader title="Signal Strength" />
      <Card style={styles.signalCard}>
        <View style={styles.signalMeter}>
          <View style={styles.signalBars}>
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, index) => (
              <View
                key={index}
                style={[
                  styles.signalBar,
                  { height: 10 + index * 8 },
                  (signalQuality || 0) >= threshold && {
                    backgroundColor: getSignalQualityColor(),
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.signalLabel}>{getSignalQualityLabel()}</Text>
        </View>
        <Text style={styles.signalDescription}>
          Signal quality affects the accuracy of heart rate and respiratory rate measurements.
          Ensure proper contact between the pet and the bed for best results.
        </Text>
      </Card>

      {/* Calibration Tools */}
      <SectionHeader title="Calibration" />
      <Card style={styles.calibrationCard}>
        <Text style={styles.calibrationDescription}>
          Calibrate sensors for accurate measurements. Ensure the bed is properly set up before calibrating.
        </Text>
        
        <View style={styles.calibrationButtons}>
          <Button
            title={isTaring ? 'Taring...' : 'Tare Weight'}
            variant="primary"
            onPress={handleTareWeight}
            style={styles.calibrationButton}
            loading={isTaring}
            disabled={!isConnected}
          />
          <Button
            title="Calibrate Weight"
            variant="secondary"
            onPress={handleCalibrateWeight}
            style={styles.calibrationButton}
            disabled={!isConnected}
          />
          <Button
            title="Calibrate Temperature"
            variant="outline"
            onPress={handleCalibrateTemperature}
            style={styles.calibrationButton}
            disabled={!isConnected}
          />
        </View>
      </Card>

      {/* Device Discovery */}
      <SectionHeader title="Device Discovery" />
      <Card style={styles.discoveryCard}>
        <Text style={styles.discoveryDescription}>
          Scan for nearby AnimalDot devices to connect or switch to a different bed.
        </Text>
        <Button
          title={isScanning ? 'Scanning...' : 'Re-scan for Devices'}
          variant="outline"
          onPress={handleRescan}
          loading={isScanning}
          style={styles.rescanButton}
        />
      </Card>

      {/* Firmware Info */}
      <SectionHeader title="Device Information" />
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Firmware Version:</Text>
          <Text style={styles.infoValue}>
            {deviceStatus?.firmwareVersion || '1.0.0'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Battery Level:</Text>
          <Text style={styles.infoValue}>
            {deviceStatus?.batteryLevel ? `${deviceStatus.batteryLevel}%` : 'N/A (Plugged In)'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data Sync:</Text>
          <Text style={styles.infoValue}>UGA SensorWeb</Text>
        </View>
      </Card>

      {/* Calibration Modal */}
      <CalibrationModal
        visible={calibrationModal.visible}
        type={calibrationModal.type}
        onClose={() => setCalibrationModal({ visible: false, type: null })}
        onCalibrate={handleCalibration}
        weightUnit={settings.weightUnit}
        temperatureUnit={settings.temperatureUnit}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  connectionCard: {
    padding: 16,
    marginBottom: 16,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  connectionInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  disconnectButton: {
    marginTop: 8,
  },
  componentsCard: {
    padding: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  componentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  componentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  componentInfo: {
    flex: 1,
  },
  componentName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  componentDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  componentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  signalCard: {
    padding: 16,
    marginBottom: 16,
  },
  signalMeter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 12,
  },
  signalBar: {
    width: 12,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  signalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  signalDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  calibrationCard: {
    padding: 16,
    marginBottom: 16,
  },
  calibrationDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  calibrationButtons: {
    gap: 12,
  },
  calibrationButton: {
    marginBottom: 8,
  },
  discoveryCard: {
    padding: 16,
    marginBottom: 16,
  },
  discoveryDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  rescanButton: {},
  infoCard: {
    padding: 16,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  modalInstructions: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  calibrationInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default DeviceStatusScreen;
