import { useState, useEffect, useCallback } from 'react';
import { Signal, Wifi, WifiOff, Radio } from 'lucide-react';
import VitalCard from './VitalCard';
import StatusPill from './StatusPill';
import BottomTabBar from './BottomTabBar';
import { useDevices, useVitalsLatest, useVitalsWebSocket, usePets } from '../hooks/useApi';
import { useBedDotStore } from '../lib/beddot/useBedDotStore';
import type { Screen, TabScreen } from '../App';
import type { VitalsLatest } from '../lib/api/endpoints';

interface LiveViewScreenProps { activeTab: TabScreen; onNavigate: (screen: Screen) => void; }

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

export default function LiveViewScreen({ activeTab, onNavigate }: LiveViewScreenProps) {
  const { data: devices, isLoading: devicesLoading } = useDevices();
  const { data: pets } = usePets();
  const activeDevice = devices?.[0];
  const activePet = pets?.[0];
  const petName = activePet?.name ?? 'Pet';

  // BedDot direct connection store
  const bedDot = useBedDotStore();
  const bedDotActive = bedDot.connectionState === 'connected';

  const { data: latestVitals, isLoading: vitalsLoading } = useVitalsLatest(activeDevice?.deviceId);

  // Real-time vitals from WebSocket
  const [liveVitals, setLiveVitals] = useState<VitalsLatest | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  const handleWsMessage = useCallback((payload: unknown) => {
    const p = payload as Partial<VitalsLatest>;
    if (p.recordedAt) {
      setLiveVitals(p as VitalsLatest);
      setLastUpdated(new Date());
    }
  }, []);

  useVitalsWebSocket(handleWsMessage);

  // Use BedDot data when connected, otherwise fall back to live WS / REST
  const vitals: Partial<VitalsLatest> | null = bedDotActive
    ? {
        heartRate: bedDot.heartRate?.value ?? undefined,
        respiratoryRate: bedDot.respRate?.value ?? undefined,
        temperatureF: bedDot.temperature?.value ?? undefined,
        weightLbs: bedDot.weight?.value ?? undefined,
        qualityLevel: 'good',
        recordedAt: bedDot.lastUpdate ? new Date(bedDot.lastUpdate).toISOString() : undefined,
      }
    : (liveVitals ?? latestVitals) ?? null;

  // Initialize lastUpdated from REST data or BedDot
  useEffect(() => {
    if (bedDotActive && bedDot.lastUpdate) {
      setLastUpdated(new Date(bedDot.lastUpdate));
    } else if (!lastUpdated && vitals?.recordedAt) {
      setLastUpdated(new Date(vitals.recordedAt));
    }
  }, [vitals?.recordedAt, lastUpdated, bedDotActive, bedDot.lastUpdate]);

  // Live "X sec ago" countdown
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const isLoading = devicesLoading || vitalsLoading;
  const noDevice = !devicesLoading && (!devices || devices.length === 0);

  const overallStatus = (() => {
    if (!vitals) return 'stable';
    const statuses = [
      getHrStatus(vitals.heartRate),
      getRrStatus(vitals.respiratoryRate),
      getTempStatus(vitals.temperatureF),
      getBpStatus(vitals.systolicMmhg, vitals.diastolicMmhg),
    ];
    if (statuses.includes('danger')) return 'danger';
    if (statuses.includes('warning')) return 'warning';
    return 'stable';
  })();

  const qualityText = vitals?.qualityLevel
    ? vitals.qualityLevel.charAt(0).toUpperCase() + vitals.qualityLevel.slice(1)
    : 'No Signal';

  const qualityColor = vitals?.qualityLevel === 'good'
    ? 'text-[#3CCB7F]'
    : vitals?.qualityLevel === 'fair'
      ? 'text-[#FFD568]'
      : 'text-[#FF6E6E]';

  const timeLabel = secondsAgo != null
    ? secondsAgo < 60
      ? `${secondsAgo} sec ago`
      : `${Math.floor(secondsAgo / 60)} min ago`
    : 'Never';

  if (noDevice) {
    return (
      <div className="h-full flex flex-col bg-[#F5F7FA]">
        <div className="bg-white px-6 py-6 border-b border-gray-100">
          <h1 className="text-[#1F1F1F]">Live View</h1>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <WifiOff className="w-12 h-12 text-[#1F1F1F]/20 mx-auto mb-4" />
            <h2 className="text-[#1F1F1F] text-lg mb-2">No Device Registered</h2>
            <p className="text-[#1F1F1F]/40">Register your AnimalDot bed in the Device tab to start monitoring vitals.</p>
          </div>
        </div>
        <BottomTabBar activeTab={activeTab} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[#1F1F1F]">{petName}</h1>
          <StatusPill status={overallStatus as 'stable' | 'warning' | 'danger'} />
        </div>
        <p className="text-[#1F1F1F]/40">Last updated: {timeLabel}</p>
      </div>
      <div className="flex-1 overflow-auto px-6 py-6 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <VitalCard type="heart" value={vitals?.heartRate ?? null} unit="bpm" normalRange="Normal: 60-120 bpm" status={getHrStatus(vitals?.heartRate)} />
            <VitalCard type="respiration" value={vitals?.respiratoryRate ?? null} unit="rpm" normalRange="Normal: 15-30 rpm" status={getRrStatus(vitals?.respiratoryRate)} />
            <VitalCard type="temperature" value={vitals?.temperatureF ?? null} unit="°F" normalRange="Normal: 100-102.5 °F" status={getTempStatus(vitals?.temperatureF)} />
            <VitalCard type="bloodPressure" value={vitals?.systolicMmhg ?? null} valueSecondary={vitals?.diastolicMmhg ?? null} unit="mmHg" normalRange="Normal: 100-140 / 70-90 mmHg" status={getBpStatus(vitals?.systolicMmhg, vitals?.diastolicMmhg)} />
            <VitalCard type="weight" value={vitals?.weightLbs ?? null} unit="lbs" normalRange={activePet ? `Baseline: ${activePet.baselineWeight} lbs` : 'No baseline'} status="normal" />
          </div>
        )}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Signal className={`w-5 h-5 ${qualityColor}`} />
            <span className="text-[#1F1F1F]">Signal Quality: {qualityText}</span>
          </div>
          <div className="flex items-center gap-1 text-[#1F1F1F]/40">
            {bedDotActive ? (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Direct BedDot connection ({bedDot.dataSource})</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Data streamed from cloud via BedDot system</span>
              </>
            )}
          </div>
        </div>
      </div>
      <BottomTabBar activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}
