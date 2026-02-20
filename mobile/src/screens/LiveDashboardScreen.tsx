/**
 * AnimalDot Mobile App - Live Dashboard Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, MetricCard, StatusBadge, Colors } from '../components/UI';
import { useSensorStore, usePetStore, useDeviceStore, useSettingsStore } from '../services/store';
import { bleService } from '../services/BLEService';
import { NORMAL_RANGES } from '../types';
import {
  formatTemp,
  formatWeight,
  tempForDisplay,
  weightForDisplay,
  formatNormalTempRange,
  weightUnitLabel,
  tempUnitLabel,
} from '../utils/units';

// ============================================
// Live Dashboard Screen
// ============================================

export const LiveDashboardScreen: React.FC = () => {
  const { vitals, environment, weight, updateVitals, updateEnvironment, updateWeight, updateDeviceStatus } = useSensorStore();
  const { getActivePet } = usePetStore();
  const { connectionState } = useDeviceStore();
  const { settings } = useSettingsStore();
  const tempUnit = settings.temperatureUnit;
  const weightUnit = settings.weightUnit;
  const [refreshing, setRefreshing] = useState(false);
  const activePet = getActivePet();
  const baselineForDisplay = activePet?.baselineWeight != null
    ? (weightUnit === 'kg' ? activePet.baselineWeight * 0.453592 : activePet.baselineWeight)
    : null;

  useEffect(() => {
    // Set up BLE data callbacks
    bleService.setOnVitalsUpdate((data) => {
      updateVitals(data);
    });
    bleService.setOnEnvironmentUpdate((data) => {
      updateEnvironment(data);
    });
    bleService.setOnWeightUpdate((data) => {
      updateWeight(data);
    });
    bleService.setOnStatusUpdate((data) => {
      updateDeviceStatus(data);
    });

    return () => {
      // Cleanup callbacks
      bleService.setOnVitalsUpdate(() => {});
      bleService.setOnEnvironmentUpdate(() => {});
      bleService.setOnWeightUpdate(() => {});
      bleService.setOnStatusUpdate(() => {});
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Trigger a re-read of all characteristics
    setTimeout(() => setRefreshing(false), 1000);
  };

  const _getHeartRateStatus = () => {
    if (!vitals) return 'normal';
    const { heartRate } = vitals;
    if (heartRate < NORMAL_RANGES.heartRate.min || heartRate > NORMAL_RANGES.heartRate.max) {
      return 'alert';
    }
    return 'normal';
  };

  const _getRespRateStatus = () => {
    if (!vitals) return 'normal';
    const { respiratoryRate } = vitals;
    if (respiratoryRate < NORMAL_RANGES.respiratoryRate.min || respiratoryRate > NORMAL_RANGES.respiratoryRate.max) {
      return 'alert';
    }
    return 'normal';
  };

  const getSignalQualityText = () => {
    if (!vitals) return 'No Signal';
    switch (vitals.qualityLevel) {
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  const isConnected = connectionState === 'connected';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.petName}>{activePet?.name || 'Pet'}</Text>
            <Text style={styles.lastUpdate}>
              Last updated: {vitals?.timestamp ? formatTime(vitals.timestamp) : 'Never'}
            </Text>
          </View>
          <StatusBadge
            status={isConnected ? 'stable' : 'disconnected'}
            label={isConnected ? 'Stable' : 'Disconnected'}
          />
        </View>

        {/* Vital Signs Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Heart Rate"
            value={vitals?.heartRate?.toFixed(0) || '--'}
            unit="bpm"
            subtitle={`Normal: ${NORMAL_RANGES.heartRate.min}-${NORMAL_RANGES.heartRate.max} bpm`}
            color={Colors.heartRate}
            style={styles.metricCard}
          />
          <MetricCard
            title="Respiration Rate"
            value={vitals?.respiratoryRate?.toFixed(0) || '--'}
            unit="rpm"
            subtitle={`Normal: ${NORMAL_RANGES.respiratoryRate.min}-${NORMAL_RANGES.respiratoryRate.max} rpm`}
            color={Colors.respRate}
            style={styles.metricCard}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Temperature"
            value={tempForDisplay(environment?.temperature, tempUnit)?.toFixed(1) ?? '--'}
            unit={tempUnitLabel(tempUnit)}
            subtitle={formatNormalTempRange(tempUnit)}
            color={Colors.temperature}
            style={styles.metricCard}
          />
          <MetricCard
            title="Weight"
            value={weightForDisplay(weight?.weight, weightUnit)?.toFixed(1) ?? '--'}
            unit={weightUnitLabel(weightUnit)}
            subtitle={`Baseline: ${baselineForDisplay != null ? baselineForDisplay.toFixed(1) : '--'} ${weightUnit}`}
            color={Colors.weight}
            style={styles.metricCard}
          />
        </View>

        {/* Signal Quality */}
        <Card style={styles.signalCard}>
          <View style={styles.signalHeader}>
            <Text style={styles.signalLabel}>📶 Signal Quality: {getSignalQualityText()}</Text>
          </View>
          <Text style={styles.signalSubtext}>
            Data streamed from cloud via BedDot system
          </Text>
        </Card>

        {/* Quick Stats */}
        {environment && (
          <Card style={styles.environmentCard}>
            <Text style={styles.environmentTitle}>Environment</Text>
            <View style={styles.environmentRow}>
              <View style={styles.environmentItem}>
                <Text style={styles.environmentLabel}>Humidity</Text>
                <Text style={styles.environmentValue}>
                  {environment.humidity?.toFixed(0) || '--'}%
                </Text>
              </View>
              <View style={styles.environmentItem}>
                <Text style={styles.environmentLabel}>Bed Temp</Text>
                <Text style={styles.environmentValue}>
                  {formatTemp(environment.temperature, tempUnit)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Connection Status Alert */}
        {!isConnected && (
          <Card style={styles.alertCard}>
            <Text style={styles.alertTitle}>⚠️ Not Connected</Text>
            <Text style={styles.alertText}>
              Your AnimalDot bed is not connected. Go to the Device tab to reconnect.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to format time
const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return new Date(date).toLocaleTimeString();
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {},
  petName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  lastUpdate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
  },
  signalCard: {
    marginTop: 8,
    marginBottom: 12,
  },
  signalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  signalSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  environmentCard: {
    marginBottom: 12,
  },
  environmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  environmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  environmentItem: {
    alignItems: 'center',
  },
  environmentLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  environmentValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  alertCard: {
    backgroundColor: Colors.warning + '20',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: Colors.text,
  },
});

export default LiveDashboardScreen;
