/**
 * AnimalDot Mobile App - Live Dashboard Screen
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { connectMqtt, type MqttVitals } from '../services/mqttService';
import { NORMAL_RANGES } from '../types';
import {
  formatTemp,
  tempForDisplay,
  weightForDisplay,
  formatNormalTempRange,
  weightUnitLabel,
  tempUnitLabel,
} from '../utils/units';
import { connectVitalsWs, disconnectVitalsWs, type WsVitalsPayload } from '../api/vitals-ws';
import { fetchLatestVitals } from '../api/vitals';

// ============================================
// Live Dashboard Screen
// ============================================

export const LiveDashboardScreen: React.FC = () => {
  const { vitals, environment, weight, updateVitals, updateEnvironment, updateWeight, updateDeviceStatus } = useSensorStore();
  const { getActivePet } = usePetStore();
  const { connectionState, dataSource: deviceDataSource, mqttConfig } = useDeviceStore();
  const { settings } = useSettingsStore();
  const tempUnit = settings.temperatureUnit;
  const weightUnit = settings.weightUnit;
  const [refreshing, setRefreshing] = useState(false);
  const activePet = getActivePet();
  const baselineForDisplay = activePet?.baselineWeight != null
    ? (weightUnit === 'kg' ? activePet.baselineWeight * 0.453592 : activePet.baselineWeight)
    : null;

  const isBleConnected = connectionState === 'connected';

  // MQTT vitals state
  const [mqttVitals, setMqttVitals] = useState<MqttVitals | null>(null);
  const [mqttConnected, setMqttConnected] = useState(false);

  // Cloud vitals state (used when BLE and MQTT are not connected)
  const [cloudVitals, setCloudVitals] = useState<WsVitalsPayload | null>(null);
  const [dataSource, setDataSource] = useState<'ble' | 'mqtt' | 'cloud' | 'none'>('none');

  // Determine data source
  useEffect(() => {
    if (isBleConnected) {
      setDataSource('ble');
    } else if (deviceDataSource === 'mqtt' && mqttConnected) {
      setDataSource('mqtt');
    } else if (cloudVitals) {
      setDataSource('cloud');
    } else {
      setDataSource('none');
    }
  }, [isBleConnected, deviceDataSource, mqttConnected, cloudVitals]);

  // BLE callbacks (existing behavior)
  useEffect(() => {
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
      bleService.setOnVitalsUpdate(() => {});
      bleService.setOnEnvironmentUpdate(() => {});
      bleService.setOnWeightUpdate(() => {});
      bleService.setOnStatusUpdate(() => {});
    };
  }, []);

  // MQTT connection: process raw geophone data into vitals
  useEffect(() => {
    if (deviceDataSource !== 'mqtt' || isBleConnected || !mqttConfig.macHex) return;

    const disconnect = connectMqtt(mqttConfig, {
      onVitalsUpdate: (v) => {
        setMqttVitals(v);
        if (v.heartRate != null || v.respiratoryRate != null) {
          updateVitals({
            heartRate: v.heartRate ?? 0,
            respiratoryRate: v.respiratoryRate ?? 0,
            signalQuality: v.signalQuality,
            qualityLevel: v.qualityLevel,
            isValid: true,
            timestamp: new Date(),
          });
        }
      },
      onConnect: () => setMqttConnected(true),
      onDisconnect: () => setMqttConnected(false),
      onError: () => setMqttConnected(false),
    });

    return () => {
      disconnect();
      setMqttConnected(false);
      setMqttVitals(null);
    };
  }, [deviceDataSource, isBleConnected, mqttConfig, updateVitals]);

  // Cloud fallback: connect WebSocket + fetch initial data when BLE is not connected
  const handleWsVitals = useCallback((payload: WsVitalsPayload) => {
    setCloudVitals(payload);
    // Also update the store so other screens can use the data
    if (payload.heartRate != null || payload.respiratoryRate != null) {
      updateVitals({
        heartRate: payload.heartRate ?? 0,
        respiratoryRate: payload.respiratoryRate ?? 0,
        signalQuality: payload.signalQuality ?? 0,
        qualityLevel: (payload.qualityLevel as 'good' | 'fair' | 'poor') ?? 'poor',
        timestamp: new Date(payload.recordedAt),
      });
    }
    if (payload.temperatureF != null) {
      updateEnvironment({
        temperature: payload.temperatureF,
        humidity: environment?.humidity ?? null,
      });
    }
  }, [updateVitals, updateEnvironment, environment?.humidity]);

  useEffect(() => {
    if (isBleConnected || (deviceDataSource === 'mqtt' && mqttConnected)) {
      disconnectVitalsWs();
      return;
    }

    // Connect WebSocket for real-time cloud data
    connectVitalsWs(handleWsVitals);

    // Also fetch initial data via REST (first registered device)
    fetchLatestVitals('default').then((data) => {
      if (data) {
        setCloudVitals({
          deviceId: 'default',
          heartRate: data.heartRate ?? undefined,
          respiratoryRate: data.respiratoryRate ?? undefined,
          temperatureF: data.temperatureF ?? undefined,
          weightLbs: data.weightLbs ?? undefined,
          signalQuality: data.signalQuality ?? undefined,
          qualityLevel: data.qualityLevel ?? undefined,
          recordedAt: data.recordedAt,
        });
      }
    }).catch(() => {});

    return () => disconnectVitalsWs();
  }, [isBleConnected, deviceDataSource, mqttConnected, handleWsVitals]);

  const onRefresh = async () => {
    setRefreshing(true);
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

  const dataSourceLabel = dataSource === 'ble' ? 'BLE' : dataSource === 'mqtt' ? 'MQTT' : dataSource === 'cloud' ? 'Cloud' : 'None';

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
            status={isBleConnected || dataSource === 'mqtt' || dataSource === 'cloud' ? 'stable' : 'disconnected'}
            label={isBleConnected ? 'BLE' : dataSource === 'mqtt' ? 'MQTT' : dataSource === 'cloud' ? 'Cloud' : 'Disconnected'}
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
            <Text style={styles.signalLabel}>
              {dataSource === 'ble' ? '📡' : '☁️'} Signal Quality: {getSignalQualityText()}
            </Text>
          </View>
          <Text style={styles.signalSubtext}>
            Data source: {dataSourceLabel}
            {dataSource === 'cloud' && ' — streamed via BedDot system'}
            {dataSource === 'ble' && ' — direct Bluetooth connection'}
            {dataSource === 'mqtt' && ' — raw geophone processing'}
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

        {/* Bed Empty Alert (MQTT) */}
        {dataSource === 'mqtt' && mqttVitals?.bedEmpty && (
          <Card style={styles.alertCard}>
            <Text style={styles.alertTitle}>Bed appears empty</Text>
            <Text style={styles.alertText}>
              Signal level is too low to detect vitals. The pet may not be on the bed.
            </Text>
          </Card>
        )}

        {/* MQTT Info */}
        {dataSource === 'mqtt' && !mqttVitals?.bedEmpty && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>MQTT Direct Processing</Text>
            <Text style={styles.infoText}>
              Processing raw geophone data locally. Vitals are computed on-device from the signal processor.
            </Text>
          </Card>
        )}

        {/* Connection Status Alert */}
        {!isBleConnected && dataSource === 'cloud' && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>☁️ Using Cloud Data</Text>
            <Text style={styles.infoText}>
              BLE is not connected. Showing vitals from the cloud. Connect via BLE in the Device tab for direct streaming.
            </Text>
          </Card>
        )}

        {!isBleConnected && dataSource === 'none' && (
          <Card style={styles.alertCard}>
            <Text style={styles.alertTitle}>⚠️ No Connection</Text>
            <Text style={styles.alertText}>
              No BLE or cloud connection available. Check that your AnimalDot bed is powered on and connected to WiFi.
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
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
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
