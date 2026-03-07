import { useRef, useCallback } from 'react';
import StatusPill from '../components/StatusPill';
import VitalCard from '../components/VitalCard';
import GraphCard from '../components/GraphCard';
import ConnectionPanel from '../components/beddot/ConnectionPanel';
import RawDataPanel from '../components/beddot/RawDataPanel';
import { useBedDotStore } from '../lib/beddot/useBedDotStore';
import { requestDevice, connectAndSubscribe } from '../lib/beddot/bleService';
import { connectMqtt } from '../lib/beddot/mqttService';
import { connectLocalBridge, decodeGeophoneSamples } from '../lib/beddot/bridgeClient';
import { processVitals } from '../lib/beddot/signalProcessor';
import type { VitalReading, DeviceStatus } from '../lib/beddot/types';

const FS = 100;
const VITALS_BUFFER_SECONDS = 30;
const VITALS_BUFFER_SIZE = FS * VITALS_BUFFER_SECONDS;
const VITALS_UPDATE_MS = 500;

type VitalStatus = 'normal' | 'warning' | 'danger';

function getHrStatus(hr: number | null | undefined): VitalStatus {
  if (hr == null) return 'normal';
  if (hr < 40 || hr > 180) return 'danger';
  if (hr < 60 || hr > 120) return 'warning';
  return 'normal';
}
function getRrStatus(rr: number | null | undefined): VitalStatus {
  if (rr == null) return 'normal';
  if (rr < 5 || rr > 60) return 'danger';
  if (rr < 15 || rr > 30) return 'warning';
  return 'normal';
}
function getTempStatus(temp: number | null | undefined): VitalStatus {
  if (temp == null) return 'normal';
  if (temp < 95 || temp > 106) return 'danger';
  if (temp < 100 || temp > 102.5) return 'warning';
  return 'normal';
}
function getBpStatus(systolic: number | null | undefined, diastolic: number | null | undefined): VitalStatus {
  if (systolic == null && diastolic == null) return 'normal';
  const sys = systolic ?? 0;
  const dia = diastolic ?? 0;
  if (sys > 180 || dia > 120 || sys < 90 || dia < 60) return 'danger';
  if (sys > 140 || dia > 90 || sys < 100 || dia < 70) return 'warning';
  return 'normal';
}

export default function BedDotTestPage() {
  const store = useBedDotStore();
  const disconnectRef = useRef<(() => void) | null>(null);

  const handleConnect = useCallback(async () => {
    const {
      dataSource,
      mqttConfig,
      setConnectionState,
      setLastBridgeMessageAt,
      updateVital,
      setDeviceStatus,
      addRawGeophone,
      reset,
    } = useBedDotStore.getState();

    reset();
    setConnectionState('connecting');

    try {
      if (dataSource === 'ble') {
        const device = await requestDevice();
        const disconnect = await connectAndSubscribe(device, {
          onHeartRate: (r: VitalReading) => updateVital('heartRate', r),
          onRespRate: (r: VitalReading) => updateVital('respRate', r),
          onTemperature: (r: VitalReading) => updateVital('temperature', r),
          onHumidity: (r: VitalReading) => updateVital('humidity', r),
          onWeight: (r: VitalReading) => updateVital('weight', r),
          onStatus: (s: DeviceStatus) => setDeviceStatus(s),
          onRawGeophone: (sample: number) => addRawGeophone(sample),
          onDisconnect: () => setConnectionState('disconnected'),
        });
        disconnectRef.current = disconnect;
        setConnectionState('connected');
      } else if (dataSource === 'bridge') {
        const buffer = new Float64Array(VITALS_BUFFER_SIZE);
        let writePosition = 0;
        const rpmHistory: number[] = [];
        const RPM_HISTORY_MAX = 5;

        const vitalsIntervalId = setInterval(() => {
          if (writePosition < VITALS_BUFFER_SIZE) return;
          const contiguous = new Float64Array(VITALS_BUFFER_SIZE);
          for (let i = 0; i < VITALS_BUFFER_SIZE; i++) {
            contiguous[i] = buffer[(writePosition - VITALS_BUFFER_SIZE + i) % VITALS_BUFFER_SIZE];
          }
          const result = processVitals(contiguous, FS);
          const ts = Date.now();
          if (result.heartRate != null) {
            updateVital('heartRate', { value: Math.round(result.heartRate * 10) / 10, timestamp: ts });
          }
          if (result.respiratoryRate != null) {
            rpmHistory.push(result.respiratoryRate);
            if (rpmHistory.length > RPM_HISTORY_MAX) rpmHistory.shift();
            const smoothedRpm = rpmHistory.reduce((a, b) => a + b, 0) / rpmHistory.length;
            updateVital('respRate', { value: Math.round(smoothedRpm * 10) / 10, timestamp: ts });
          }
        }, VITALS_UPDATE_MS);

        let lastSampleFromPreviousPacket: number | undefined;
        const disconnect = connectLocalBridge({
          onOpen: () => setConnectionState('connected'),
          onTemperature: (valueF) => {
            updateVital('temperature', { value: Math.round(valueF * 10) / 10, timestamp: Date.now() });
          },
          onMessage: ({ bytes }) => {
            setLastBridgeMessageAt(Date.now());
            const samples = decodeGeophoneSamples(bytes);
            for (const s of samples) {
              buffer[writePosition % VITALS_BUFFER_SIZE] = s;
              writePosition += 1;
            }
            if (samples.length === 0) return;
            if (lastSampleFromPreviousPacket !== undefined) {
              addRawGeophone(lastSampleFromPreviousPacket);
            }
            const end = samples.length - 1;
            for (let i = 1; i < end; i++) {
              addRawGeophone(samples[i]);
            }
            lastSampleFromPreviousPacket = end > 1 ? samples[end - 1] : samples[end];
          },
          onClose: () => setConnectionState('disconnected'),
          onError: () => setConnectionState('error'),
        });

        disconnectRef.current = () => {
          clearInterval(vitalsIntervalId);
          disconnect();
        };
      } else {
        // MQTT mode: raw geophone processing pipeline (same as bridge mode)
        const buffer = new Float64Array(VITALS_BUFFER_SIZE);
        let writePosition = 0;
        const bpmHistory: number[] = [];
        const rpmHistory: number[] = [];
        const BPM_HISTORY_MAX = 10;
        const RPM_HISTORY_MAX = 5;
        const BED_EMPTY_THRESHOLD = 100;

        const vitalsIntervalId = setInterval(() => {
          if (writePosition < VITALS_BUFFER_SIZE) return;
          const contiguous = new Float64Array(VITALS_BUFFER_SIZE);
          for (let i = 0; i < VITALS_BUFFER_SIZE; i++) {
            contiguous[i] = buffer[(writePosition - VITALS_BUFFER_SIZE + i) % VITALS_BUFFER_SIZE];
          }

          // Bed-empty detection: signal range < threshold
          let min = Infinity;
          let max = -Infinity;
          for (let i = 0; i < VITALS_BUFFER_SIZE; i++) {
            if (contiguous[i] < min) min = contiguous[i];
            if (contiguous[i] > max) max = contiguous[i];
          }
          if (max - min < BED_EMPTY_THRESHOLD) {
            updateVital('heartRate', { value: 0, timestamp: Date.now() });
            updateVital('respRate', { value: 0, timestamp: Date.now() });
            bpmHistory.length = 0;
            rpmHistory.length = 0;
            return;
          }

          const result = processVitals(contiguous, FS);
          const ts = Date.now();
          if (result.heartRate != null) {
            bpmHistory.push(result.heartRate);
            if (bpmHistory.length > BPM_HISTORY_MAX) bpmHistory.shift();
            const smoothedBpm = bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length;
            updateVital('heartRate', { value: Math.round(smoothedBpm * 10) / 10, timestamp: ts });
          }
          if (result.respiratoryRate != null) {
            rpmHistory.push(result.respiratoryRate);
            if (rpmHistory.length > RPM_HISTORY_MAX) rpmHistory.shift();
            const smoothedRpm = rpmHistory.reduce((a, b) => a + b, 0) / rpmHistory.length;
            updateVital('respRate', { value: Math.round(smoothedRpm * 10) / 10, timestamp: ts });
          }
        }, VITALS_UPDATE_MS);

        const disconnect = connectMqtt(mqttConfig, {
          onHeartRate: (r: VitalReading) => updateVital('heartRate', r),
          onRespRate: (r: VitalReading) => updateVital('respRate', r),
          onTemperature: (r: VitalReading) => updateVital('temperature', r),
          onHumidity: (r: VitalReading) => updateVital('humidity', r),
          onWeight: (r: VitalReading) => updateVital('weight', r),
          onRawGeophone: (samples: number[]) => {
            for (const s of samples) {
              buffer[writePosition % VITALS_BUFFER_SIZE] = s;
              writePosition += 1;
            }
            // Feed raw geophone graph
            for (const s of samples) {
              addRawGeophone(s);
            }
          },
          onConnect: () => setConnectionState('connected'),
          onDisconnect: () => setConnectionState('disconnected'),
          onError: () => setConnectionState('error'),
        });

        disconnectRef.current = () => {
          clearInterval(vitalsIntervalId);
          disconnect();
        };
      }
    } catch {
      setConnectionState('error');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    useBedDotStore.getState().setConnectionState('disconnected');
  }, []);

  const overallStatus = (() => {
    const statuses = [
      getHrStatus(store.heartRate?.value),
      getRrStatus(store.respRate?.value),
      getTempStatus(store.temperature?.value),
      getBpStatus(store.systolicBp?.value, store.diastolicBp?.value),
    ];
    if (statuses.includes('danger')) return 'danger';
    if (statuses.includes('warning')) return 'warning';
    return 'stable';
  })();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-[#1F1F1F] text-xl font-semibold">BedDot Test</h1>
          <StatusPill status={overallStatus as 'stable' | 'warning' | 'danger'} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Connection */}
        <ConnectionPanel onConnect={handleConnect} onDisconnect={handleDisconnect} />

        {/* Vital cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <VitalCard type="heart" value={store.heartRate?.value ?? null} unit="bpm" normalRange="Normal: 60-120 bpm" status={getHrStatus(store.heartRate?.value)} />
          <VitalCard type="respiration" value={store.respRate?.value ?? null} unit="rpm" normalRange="Normal: 15-30 rpm" status={getRrStatus(store.respRate?.value)} />
          <VitalCard type="temperature" value={store.temperature?.value ?? null} unit="°F" normalRange="Normal: 100-102.5 °F" status={getTempStatus(store.temperature?.value)} />
          <VitalCard type="bloodPressure" value={store.systolicBp?.value ?? null} valueSecondary={store.diastolicBp?.value ?? null} unit="mmHg" normalRange="Normal: 100-140 / 70-90 mmHg" status={getBpStatus(store.systolicBp?.value, store.diastolicBp?.value)} />
          <VitalCard type="humidity" value={store.humidity?.value ?? null} unit="%" normalRange="Ambient humidity" status="normal" />
          <VitalCard type="weight" value={store.weight?.value ?? null} unit="lbs" normalRange="Pet weight" status="normal" />
        </div>

        {/* Graphs */}
        <div className="space-y-4">
          {store.hrHistory.length > 0 && (
            <GraphCard title="Heart Rate" data={store.hrHistory} color="#FF6B9D" unit="bpm" />
          )}
          {store.rrHistory.length > 0 && (
            <GraphCard title="Respiration Rate" data={store.rrHistory} color="#4ECDC4" unit="rpm" />
          )}
          {store.rawGeophone.length > 0 && (
            <GraphCard
              title="Raw Geophone"
              data={store.rawGeophone.map((value, i) => ({
                time: new Date(Date.now() - (store.rawGeophone.length - 1 - i) * 10).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                value,
              }))}
              color="#3A7BFF"
              unit="raw"
            />
          )}
          {store.tempHistory.length > 0 && (
            <GraphCard title="Temperature" data={store.tempHistory} color="#FFD568" unit="°F" />
          )}
          {(store.systolicHistory.length > 0 || store.diastolicHistory.length > 0) && (
            <>
              <GraphCard title="Systolic BP" data={store.systolicHistory} color="#E91E63" unit="mmHg" />
              <GraphCard title="Diastolic BP" data={store.diastolicHistory} color="#9C27B0" unit="mmHg" />
            </>
          )}
          {store.humHistory.length > 0 && (
            <GraphCard title="Humidity" data={store.humHistory} color="#3A7BFF" unit="%" />
          )}
          {store.weightHistory.length > 0 && (
            <GraphCard title="Weight" data={store.weightHistory} color="#A78BFA" unit="lbs" />
          )}
        </div>

        {/* Raw data */}
        <RawDataPanel />
      </div>
    </div>
  );
}
