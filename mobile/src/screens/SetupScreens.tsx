/**
 * AnimalDot Mobile App - Setup Screens (Device Pairing & Pet Profile)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Colors, LoadingOverlay } from '../components/UI';
import { useDeviceStore, usePetStore, useSettingsStore } from '../services/store';
import { bleService } from '../services/BLEService';
import { RootStackParamList, AnimalDotDevice, PetProfile } from '../types';
import { lbsToKg, kgToLbs } from '../utils/units';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============================================
// Device Pairing Screen
// ============================================

export const DevicePairingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { devices, addDevice, clearDevices, setConnectedDevice, setConnectionState } = useDeviceStore();
  const { getActivePet } = usePetStore();
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  const requestBluetoothPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
      const results = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );
      if (!allGranted) {
        Alert.alert(
          'Bluetooth required',
          'AnimalDot needs Bluetooth permission to find and pair with your bed. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error('Bluetooth permission error:', e);
      Alert.alert('Permission error', 'Could not request Bluetooth permission.');
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await requestBluetoothPermissions();
      if (cancelled) return;
      setPermissionChecked(true);
      if (ok) startScan();
    })();
    return () => {
      cancelled = true;
      bleService.stopScan();
    };
  }, [requestBluetoothPermissions]);

  const startScan = async () => {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) return;

    clearDevices();
    setScanning(true);
    setConnectionState('scanning');

    try {
      await bleService.scanForDevices((device) => {
        addDevice(device);
      }, 15000);
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Error', 'Failed to scan for devices. Please check Bluetooth is enabled.');
    } finally {
      setScanning(false);
      setConnectionState('disconnected');
    }
  };

  const handleConnect = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    setConnecting(true);
    setConnectionState('connecting');

    try {
      await bleService.connect(deviceId);
      setConnectedDevice(deviceId);
      useSettingsStore.getState().updateSettings({ lastConnectedDeviceId: deviceId });
      navigation.navigate('PetProfile', { isEditing: false });
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', 'Could not connect to the device. Please try again.');
      setConnectionState('error');
    } finally {
      setConnecting(false);
      setSelectedDevice(null);
    }
  };

  const handleSkipPairingDev = () => {
    if (getActivePet()) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigation.navigate('PetProfile', { isEditing: false });
    }
  };

  const renderDevice = ({ item }: { item: AnimalDotDevice }) => (
    <TouchableOpacity
      style={[
        styles.deviceItem,
        selectedDevice === item.id && styles.deviceItemSelected,
      ]}
      onPress={() => handleConnect(item.id)}
      disabled={connecting}
    >
      <View style={styles.deviceIcon}>
        <Text style={styles.deviceIconText}>🛏️</Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceSignal}>
          Signal: {item.rssi > -60 ? 'Strong' : item.rssi > -80 ? 'Good' : 'Weak'}
        </Text>
      </View>
      {selectedDevice === item.id && connecting && (
        <Text style={styles.connectingText}>Connecting...</Text>
      )}
    </TouchableOpacity>
  );

  const connectingDeviceName =
    selectedDevice && connecting
      ? devices.find((d) => d.id === selectedDevice)?.name || 'AnimalDot Bed'
      : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Pairing indicator bar when connecting */}
      {connecting && (
        <View style={styles.pairingBar}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.pairingBarText}>
            Pairing to {connectingDeviceName || 'device'}…
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {__DEV__ && (
          <TouchableOpacity
            style={styles.skipPairingButton}
            onPress={handleSkipPairingDev}
            disabled={connecting}
          >
            <Text style={styles.skipPairingButtonText}>Skip pairing (dev)</Text>
          </TouchableOpacity>
        )}

        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Connect to AnimalDot Bed</Text>
          </TouchableOpacity>
        )}

        {!permissionChecked ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Requesting Bluetooth access…</Text>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 16 }} />
          </View>
        ) : (
          <>
            <View style={styles.deviceList}>
              {devices.length === 0 && !scanning ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {bleService.isAvailable()
                      ? 'No devices found'
                      : 'Bluetooth scanning not available'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {bleService.isAvailable()
                      ? 'Make sure your AnimalDot bed is powered on and tap Scan'
                      : 'Use a development build (not Expo Go) to scan for devices.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={devices}
                  renderItem={renderDevice}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                />
              )}
            </View>

            <View style={styles.footer}>
              <Button
                title={scanning ? 'Scanning…' : 'Scan for devices'}
                onPress={startScan}
                disabled={scanning || connecting || !bleService.isAvailable()}
                loading={scanning}
              />
              <Text style={styles.footerNote}>
                {bleService.isAvailable()
                  ? 'Make sure the smart bed is powered on and Bluetooth is on'
                  : 'Run a dev build to use the built-in Bluetooth scanner'}
              </Text>
            </View>
          </>
        )}
      </View>
      <LoadingOverlay
        visible={connecting}
        message={connectingDeviceName ? `Connecting to ${connectingDeviceName}…` : 'Connecting…'}
      />
    </SafeAreaView>
  );
};

// ============================================
// Pet Profile Screen
// ============================================

interface PetProfileScreenProps {
  route?: { params?: { isEditing?: boolean } };
}

export const PetProfileScreen: React.FC<PetProfileScreenProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp>();
  const { addPet, getActivePet, updatePet } = usePetStore();
  const { settings } = useSettingsStore();
  const weightUnit = settings.weightUnit;
  const isEditing = route?.params?.isEditing ?? false;
  const existingPet = isEditing ? getActivePet() : null;

  const baselineLbs = existingPet?.baselineWeight ?? 0;
  const baselineDisplay = weightUnit === 'kg' ? lbsToKg(baselineLbs) : baselineLbs;

  const [name, setName] = useState(existingPet?.name || '');
  const [breed, setBreed] = useState(existingPet?.breed || '');
  const [age, setAge] = useState(existingPet?.age?.toString() || '');
  const [baselineWeight, setBaselineWeight] = useState(
    baselineLbs > 0 ? baselineDisplay.toFixed(1) : ''
  );
  const [medicalNotes, setMedicalNotes] = useState(existingPet?.medicalNotes || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Pet name is required';
    if (!breed.trim()) newErrors.breed = 'Breed is required';
    if (!age || isNaN(Number(age)) || Number(age) < 0) {
      newErrors.age = 'Valid age is required';
    }
    if (baselineWeight && (isNaN(Number(baselineWeight)) || Number(baselineWeight) < 0)) {
      newErrors.baselineWeight = 'Invalid weight';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    setLoading(true);

    const baselineNum = baselineWeight ? Number(baselineWeight) : 0;
    const baselineLbsToStore = weightUnit === 'kg' ? kgToLbs(baselineNum) : baselineNum;
    const petData: PetProfile = {
      id: existingPet?.id || Date.now().toString(),
      name: name.trim(),
      breed: breed.trim(),
      age: Number(age),
      baselineWeight: baselineLbsToStore,
      medicalNotes: medicalNotes.trim(),
      createdAt: existingPet?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    setTimeout(() => {
      if (isEditing && existingPet) {
        updatePet(existingPet.id, petData);
      } else {
        addPet(petData);
      }
      setLoading(false);
      
      if (isEditing) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        }
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              ← {isEditing ? 'Edit Pet Profile' : 'Pet Profile'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.form}>
          <Input
            label="Pet Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Baxter"
            error={errors.name}
          />
          <Input
            label="Breed"
            value={breed}
            onChangeText={setBreed}
            placeholder="e.g., Golden Retriever"
            error={errors.breed}
          />
          <Input
            label="Age (years)"
            value={age}
            onChangeText={setAge}
            placeholder="e.g., 5"
            error={errors.age}
          />
          <Input
            label={`Weight Baseline (${weightUnit})`}
            value={baselineWeight}
            onChangeText={setBaselineWeight}
            placeholder={weightUnit === 'kg' ? 'e.g., 28' : 'e.g., 62'}
            error={errors.baselineWeight}
          />
          <Input
            label="Medical Notes"
            value={medicalNotes}
            onChangeText={setMedicalNotes}
            placeholder="Any relevant medical information..."
            multiline
            numberOfLines={4}
          />

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
      <LoadingOverlay visible={loading} message="Saving..." />
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  pairingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  pairingBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  skipPairingButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipPairingButtonText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 24,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Device list
  deviceList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deviceItemSelected: {
    borderColor: Colors.primary,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceIconText: {
    fontSize: 24,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  deviceSignal: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  connectingText: {
    fontSize: 14,
    color: Colors.primary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingTop: 16,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },

  // Form
  form: {
    flex: 1,
  },
  saveButton: {
    marginTop: 24,
  },
});
