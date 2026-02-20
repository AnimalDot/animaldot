/**
 * AnimalDot Mobile App - Trends Screen
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Card, Colors } from '../components/UI';
import { useSensorStore, useSettingsStore } from '../services/store';
import { DataPoint } from '../types';
import { format, subDays, subHours, isAfter } from 'date-fns';
import { fahrenheitToCelsius } from '../utils/units';

const screenWidth = Dimensions.get('window').width;

type TimeRange = 'day' | 'week';

// ============================================
// Trends Screen
// ============================================

export const TrendsScreen: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const { heartRateHistory, respRateHistory, temperatureHistory } = useSensorStore();
  const { settings } = useSettingsStore();
  const tempUnit = settings.temperatureUnit;
  const isCelsius = tempUnit === 'C';

  // Generate sample data if no real data exists
  const generateSampleData = (count: number, min: number, max: number): DataPoint[] => {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => ({
      timestamp: new Date(now.getTime() - (count - i) * 3600000),
      value: min + Math.random() * (max - min),
    }));
  };

  // Filter data based on time range
  const filterByTimeRange = (data: DataPoint[]): DataPoint[] => {
    const now = new Date();
    const cutoff = timeRange === 'day' ? subHours(now, 24) : subDays(now, 7);
    return data.filter((d) => isAfter(new Date(d.timestamp), cutoff));
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    // Use real data or generate sample data
    const hrData = heartRateHistory.length > 0 
      ? filterByTimeRange(heartRateHistory)
      : generateSampleData(timeRange === 'day' ? 24 : 168, 70, 100);
    
    const rrData = respRateHistory.length > 0
      ? filterByTimeRange(respRateHistory)
      : generateSampleData(timeRange === 'day' ? 24 : 168, 18, 28);
    
    const tempData = temperatureHistory.length > 0
      ? filterByTimeRange(temperatureHistory)
      : generateSampleData(timeRange === 'day' ? 24 : 168, 100, 102);

    // Sample down for display
    const sampleSize = timeRange === 'day' ? 12 : 7;
    const sampleData = (data: DataPoint[], size: number) => {
      const step = Math.max(1, Math.floor(data.length / size));
      return data.filter((_, i) => i % step === 0).slice(0, size);
    };

    const tempSampled = sampleData(tempData, sampleSize);
    const temperature = isCelsius
      ? tempSampled.map((p) => ({ ...p, value: fahrenheitToCelsius(p.value) }))
      : tempSampled;

    return {
      heartRate: sampleData(hrData, sampleSize),
      respRate: sampleData(rrData, sampleSize),
      temperature,
    };
  }, [heartRateHistory, respRateHistory, temperatureHistory, timeRange, isCelsius]);

  const formatChartData = (data: DataPoint[], color: string) => {
    const labels = data.map((d) => {
      const date = new Date(d.timestamp);
      return timeRange === 'day' 
        ? format(date, 'ha')
        : format(date, 'EEE');
    });

    return {
      labels: labels.slice(0, 6), // Limit labels to prevent overlap
      datasets: [
        {
          data: data.map((d) => d.value),
          color: () => color,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: Colors.card,
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    decimalPlaces: 0,
    color: (_opacity = 1) => `rgba(45, 90, 90, ${_opacity})`,
    labelColor: () => Colors.textMuted,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Colors.border,
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.title}>Trends</Text>

        {/* Time Range Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              timeRange === 'day' && styles.toggleButtonActive,
            ]}
            onPress={() => setTimeRange('day')}
          >
            <Text
              style={[
                styles.toggleText,
                timeRange === 'day' && styles.toggleTextActive,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              timeRange === 'week' && styles.toggleButtonActive,
            ]}
            onPress={() => setTimeRange('week')}
          >
            <Text
              style={[
                styles.toggleText,
                timeRange === 'week' && styles.toggleTextActive,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
        </View>

        {/* Heart Rate Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Heart Rate</Text>
          <Text style={styles.chartSubtitle}>bpm</Text>
          <LineChart
            data={formatChartData(chartData.heartRate, Colors.heartRate)}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: () => Colors.heartRate,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withShadow={false}
          />
        </Card>

        {/* Respiratory Rate Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Respiration Rate</Text>
          <Text style={styles.chartSubtitle}>rpm</Text>
          <LineChart
            data={formatChartData(chartData.respRate, Colors.respRate)}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: () => Colors.respRate,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withShadow={false}
          />
        </Card>

        {/* Temperature Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Temperature</Text>
          <Text style={styles.chartSubtitle}>{isCelsius ? '°C' : '°F'}</Text>
          <LineChart
            data={formatChartData(chartData.temperature, Colors.temperature)}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: () => Colors.temperature,
              decimalPlaces: 1,
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withShadow={false}
          />
        </Card>

        {/* Summary Stats */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {timeRange === 'day' ? "Today's" : "This Week's"} Summary
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Heart Rate</Text>
              <Text style={[styles.summaryValue, { color: Colors.heartRate }]}>
                {Math.round(
                  chartData.heartRate.reduce((a, b) => a + b.value, 0) /
                    chartData.heartRate.length
                )}{' '}
                bpm
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Resp Rate</Text>
              <Text style={[styles.summaryValue, { color: Colors.respRate }]}>
                {Math.round(
                  chartData.respRate.reduce((a, b) => a + b.value, 0) /
                    chartData.respRate.length
                )}{' '}
                rpm
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Temperature</Text>
              <Text style={[styles.summaryValue, { color: Colors.temperature }]}>
                {(
                  chartData.temperature.reduce((a, b) => a + b.value, 0) /
                  chartData.temperature.length
                ).toFixed(1)}
                {isCelsius ? '°C' : '°F'}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  chart: {
    marginLeft: -16,
    borderRadius: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TrendsScreen;
