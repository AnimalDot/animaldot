// SettingsScreen.tsx
// App settings including account, pet profile, units, data export, and more

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuthStore, usePetStore, useSettingsStore, useSensorStore } from '../services/store';
import { BLEService } from '../services/BLEService';
import { Card, Button, SectionHeader, Input, Colors } from '../components/UI';
import { format } from 'date-fns';
import { lbsToKg, kgToLbs } from '../utils/units';

interface SettingRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.settingIcon}>
      <Text style={styles.iconText}>{icon}</Text>
    </View>
    <View style={styles.settingInfo}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (onPress && showChevron && (
      <Text style={styles.chevron}>›</Text>
    ))}
  </TouchableOpacity>
);

interface EditModalProps {
  visible: boolean;
  title: string;
  currentValue: string;
  placeholder: string;
  onClose: () => void;
  onSave: (value: string) => void;
  multiline?: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  title,
  currentValue,
  placeholder,
  onClose,
  onSave,
  multiline = false,
}) => {
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Input
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            multiline={multiline}
            style={multiline ? styles.multilineInput : undefined}
          />
          <View style={styles.modalButtons}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={styles.modalButton} />
            <Button title="Save" variant="primary" onPress={handleSave} style={styles.modalButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { getActivePet, updatePet } = usePetStore();
  const activePet = getActivePet();
  const settingsState = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const heartRateHistory = useSensorStore((s) => s.heartRateHistory);
  const respRateHistory = useSensorStore((s) => s.respRateHistory);
  const temperatureHistory = useSensorStore((s) => s.temperatureHistory);
  const isImperial = settingsState.weightUnit === 'lbs';
  const isCelsius = settingsState.temperatureUnit === 'C';
  const baselineWeightDisplay = activePet?.baselineWeight != null
    ? (isImperial ? activePet.baselineWeight : lbsToKg(activePet.baselineWeight))
    : null;

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    title: string;
    field: string;
    currentValue: string;
    placeholder: string;
    multiline?: boolean;
  }>({
    visible: false,
    title: '',
    field: '',
    currentValue: '',
    placeholder: '',
    multiline: false,
  });

  const handleEditPetField = (field: string, title: string, currentValue: string, placeholder: string, multiline = false) => {
    setEditModal({
      visible: true,
      title,
      field,
      currentValue: currentValue || '',
      placeholder,
      multiline,
    });
  };

  const handleSaveEdit = (value: string) => {
    if (activePet && editModal.field) {
      const updates: Record<string, unknown> = {};
      if (editModal.field === 'age') {
        updates.age = parseFloat(value) || 0;
      } else if (editModal.field === 'baselineWeight') {
        const num = parseFloat(value) || 0;
        updates.baselineWeight = isImperial ? num : kgToLbs(num);
      } else {
        updates[editModal.field] = value;
      }
      updatePet(activePet.id, updates as Partial<typeof activePet>);
    }
  };

  const handleToggleUnits = () => {
    updateSettings({ weightUnit: settingsState.weightUnit === 'lbs' ? 'kg' : 'lbs' });
  };

  const handleToggleTemperatureUnit = () => {
    updateSettings({ temperatureUnit: settingsState.temperatureUnit === 'F' ? 'C' : 'F' });
  };

  const handleToggleNotifications = () => {
    updateSettings({ notificationsEnabled: !settingsState.notificationsEnabled });
  };

  const handleToggleAutoConnect = () => {
    updateSettings({ bluetoothAutoConnect: !settingsState.bluetoothAutoConnect });
  };

  const hasExportData = heartRateHistory.length > 0 || respRateHistory.length > 0 || temperatureHistory.length > 0;

  const handleExportData = async () => {
    if (!hasExportData) {
      Alert.alert('No Data', 'There is no data to export yet. Use the bed to collect some data first.');
      return;
    }

    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: () => exportAsCSV() },
        { text: 'JSON', onPress: () => exportAsJSON() },
      ]
    );
  };

  const exportAsCSV = async () => {
    try {
      const tempLabel = isCelsius ? 'Temperature (°C)' : 'Temperature (°F)';
      const headers = `Timestamp,Heart Rate (bpm),Respiratory Rate (rpm),${tempLabel}\n`;
      const len = Math.max(heartRateHistory.length, respRateHistory.length, temperatureHistory.length);
      const rows: string[] = [];
      for (let i = 0; i < len; i++) {
        const ts = heartRateHistory[i]?.timestamp ?? respRateHistory[i]?.timestamp ?? temperatureHistory[i]?.timestamp;
        const hr = heartRateHistory[i]?.value ?? '';
        const rr = respRateHistory[i]?.value ?? '';
        let temp = temperatureHistory[i]?.value ?? '';
        if (temp !== '' && isCelsius && typeof temp === 'number') {
          temp = ((temp - 32) * 5 / 9).toFixed(1);
        } else if (temp !== '' && typeof temp === 'number') {
          temp = temp.toFixed(1);
        }
        rows.push(`${format(new Date(ts), 'yyyy-MM-dd HH:mm:ss')},${hr},${rr},${temp}`);
      }
      const csv = headers + rows.join('\n');
      await Share.share({
        message: csv,
        title: `AnimalDot_Data_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      });
    } catch {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    }
  };

  const exportAsJSON = async () => {
    try {
      const len = Math.max(heartRateHistory.length, respRateHistory.length, temperatureHistory.length);
      const data: { timestamp: string; heartRate?: number; respRate?: number; temperature?: number }[] = [];
      for (let i = 0; i < len; i++) {
        const ts = heartRateHistory[i]?.timestamp ?? respRateHistory[i]?.timestamp ?? temperatureHistory[i]?.timestamp;
        let temp = temperatureHistory[i]?.value;
        if (temp != null && isCelsius) temp = (temp - 32) * 5 / 9;
        data.push({
          timestamp: format(new Date(ts), 'yyyy-MM-dd HH:mm:ss'),
          ...(heartRateHistory[i] != null && { heartRate: heartRateHistory[i].value }),
          ...(respRateHistory[i] != null && { respRate: respRateHistory[i].value }),
          ...(temperatureHistory[i] != null && { temperature: temp }),
        });
      }
      const payload = {
        petName: activePet?.name || 'Unknown',
        exportDate: new Date().toISOString(),
        units: { temperature: isCelsius ? 'C' : 'F', weight: settingsState.weightUnit },
        recordCount: data.length,
        data,
      };
      await Share.share({
        message: JSON.stringify(payload, null, 2),
        title: `AnimalDot_Data_${format(new Date(), 'yyyy-MM-dd')}.json`,
      });
    } catch {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all historical data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            useSensorStore.getState().clearHistory();
            Alert.alert('Success', 'History cleared successfully.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await BLEService.getInstance().disconnect();
            } catch {
              // Ignore disconnect errors
            }
            logout();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              })
            );
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In a real app, this would call an API to delete the account
            Alert.alert(
              'Account Deletion',
              'To delete your account, please contact support@animaldot.com',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleRemoteAccess = () => {
    Alert.alert(
      'Remote Access',
      'Remote access allows you to view your pet\'s data from anywhere. This feature requires a cloud account.',
      [
        { text: 'Learn More', onPress: () => {} },
        { text: 'OK' },
      ]
    );
  };

  const handleBedLocation = () => {
    Alert.alert(
      'Bed Location',
      'Setting the bed location helps optimize monitoring based on environmental factors.',
      [
        { text: 'Living Room', onPress: () => {} },
        { text: 'Bedroom', onPress: () => {} },
        { text: 'Other', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBluetoothSettings = () => {
    Alert.alert(
      'Bluetooth Settings',
      'Manage Bluetooth connection settings.',
      [
        { text: 'Forget Device', style: 'destructive', onPress: () => {} },
        { text: 'Connection Timeout', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAppInfo = () => {
    Alert.alert(
      'AnimalDot',
      'Version 1.0.0\n\nDeveloped by the UGA Capstone Team:\nBryce, Caleb, Colby, Grant, Jalen, Naman\n\nAdvisors:\nDr. Peter Kner, Dr. Jorge Rodriguez\n\nSponsors:\nDr. Ben Brainard, Dr. Wenzhan Song\n\n© 2026 University of Georgia',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us. AnimalDot collects pet health data locally on your device. Data is only shared with your explicit consent.',
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'By using AnimalDot, you agree to use the service responsibly and understand that it is intended for monitoring purposes only and not as a substitute for professional veterinary care.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Account Section */}
      <SectionHeader title="Account" />
      <Card style={styles.sectionCard}>
        <SettingRow
          icon="👤"
          title={user?.name || 'User'}
          subtitle={user?.email || 'user@example.com'}
          onPress={() => {}}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🔐"
          title="Change Password"
          onPress={() => Alert.alert('Change Password', 'Password change functionality')}
        />
      </Card>

      {/* Pet Profile Section */}
      <SectionHeader title="Pet Profile" />
      <Card style={styles.sectionCard}>
        <SettingRow
          icon="🐕"
          title="Pet Name"
          subtitle={activePet?.name || 'Not set'}
          onPress={() => handleEditPetField('name', 'Edit Pet Name', activePet?.name || '', 'Enter pet name')}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🏷️"
          title="Breed"
          subtitle={activePet?.breed || 'Not set'}
          onPress={() => handleEditPetField('breed', 'Edit Breed', activePet?.breed || '', 'Enter breed')}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🎂"
          title="Age"
          subtitle={activePet?.age ? `${activePet.age} years` : 'Not set'}
          onPress={() => handleEditPetField('age', 'Edit Age', activePet?.age?.toString() || '', 'Enter age in years')}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="⚖️"
          title="Baseline Weight"
          subtitle={baselineWeightDisplay != null ? `${baselineWeightDisplay.toFixed(1)} ${settingsState.weightUnit}` : 'Not set'}
          onPress={() => handleEditPetField('baselineWeight', 'Edit Baseline Weight', baselineWeightDisplay?.toFixed(1) ?? '', `Enter weight (${settingsState.weightUnit})`)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="📝"
          title="Medical Notes"
          subtitle={activePet?.medicalNotes || 'No notes'}
          onPress={() => handleEditPetField('medicalNotes', 'Edit Medical Notes', activePet?.medicalNotes || '', 'Enter medical notes', true)}
        />
      </Card>

      {/* Preferences Section */}
      <SectionHeader title="Preferences" />
      <Card style={styles.sectionCard}>
        <SettingRow
          icon="🌐"
          title="Remote Access"
          subtitle="View data from anywhere"
          onPress={handleRemoteAccess}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="📍"
          title="Bed Location"
          subtitle="Living Room"
          onPress={handleBedLocation}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="⚖️"
          title="Weight Units"
          subtitle={isImperial ? 'Pounds (lbs)' : 'Kilograms (kg)'}
          rightElement={
            <Switch
              value={!isImperial}
              onValueChange={handleToggleUnits}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          }
          showChevron={false}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🌡️"
          title="Temperature Units"
          subtitle={isCelsius ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
          rightElement={
            <Switch
              value={isCelsius}
              onValueChange={handleToggleTemperatureUnit}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          }
          showChevron={false}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🔔"
          title="Notifications"
          subtitle="Alert when vitals are abnormal"
          rightElement={
            <Switch
              value={settingsState.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          }
          showChevron={false}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="📶"
          title="Auto-connect"
          subtitle="Automatically connect to last device"
          rightElement={
            <Switch
              value={settingsState.bluetoothAutoConnect}
              onValueChange={handleToggleAutoConnect}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          }
          showChevron={false}
        />
      </Card>

      {/* Data Section */}
      <SectionHeader title="Data" />
      <Card style={styles.sectionCard}>
        <SettingRow
          icon="📤"
          title="Export Data"
          subtitle="Download your pet's health data"
          onPress={handleExportData}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🗑️"
          title="Clear History"
          subtitle="Remove all historical data"
          onPress={handleClearHistory}
        />
      </Card>

      {/* Bluetooth Section */}
      <SectionHeader title="Bluetooth" />
      <Card style={styles.sectionCard}>
        <SettingRow
          icon="📡"
          title="Bluetooth Settings"
          subtitle="Manage device connections"
          onPress={handleBluetoothSettings}
        />
      </Card>

      {/* About Section */}
      <SectionHeader title="About" />
      <Card style={styles.sectionCard}>
        <SettingRow
          icon="ℹ️"
          title="App Information"
          subtitle="Version 1.0.0"
          onPress={handleAppInfo}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="🔒"
          title="Privacy Policy"
          onPress={handlePrivacyPolicy}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="📄"
          title="Terms of Service"
          onPress={handleTermsOfService}
        />
      </Card>

      {/* Account Actions */}
      <View style={styles.accountActions}>
        <Button
          title="Log Out"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
        <TouchableOpacity onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        currentValue={editModal.currentValue}
        placeholder={editModal.placeholder}
        multiline={editModal.multiline}
        onClose={() => setEditModal({ ...editModal, visible: false })}
        onSave={handleSaveEdit}
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
    paddingBottom: 48,
  },
  sectionCard: {
    padding: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
  accountActions: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  logoutButton: {
    width: '100%',
    marginBottom: 16,
  },
  deleteAccountText: {
    fontSize: 14,
    color: Colors.error,
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default SettingsScreen;
