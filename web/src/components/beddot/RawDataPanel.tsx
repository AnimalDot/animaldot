import { useState, useEffect } from 'react';
import { Cpu, Info } from 'lucide-react';
import { useBedDotStore } from '../../lib/beddot/useBedDotStore';

const BRIDGE_RECENT_MS = 30000;

export default function RawDataPanel() {
  const {
    dataSource,
    deviceStatus,
    connectionState,
    lastUpdate,
    readingsCount,
    lastBridgeMessageAt,
  } = useBedDotStore();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (dataSource !== 'bridge' || lastBridgeMessageAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dataSource, lastBridgeMessageAt]);

  const effectiveStatus =
    connectionState === 'connected' ||
    (dataSource === 'bridge' && lastBridgeMessageAt != null && now - lastBridgeMessageAt < BRIDGE_RECENT_MS)
      ? 'connected'
      : connectionState;

  return (
    <div className="space-y-4">
      {/* Device status — BLE only */}
      {dataSource === 'ble' && deviceStatus && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-[#3A7BFF]" />
            <h3 className="text-[#1F1F1F]">Device Status</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <StatusFlag label="DHT Sensor" connected={deviceStatus.dhtConnected} />
            <StatusFlag label="Load Cells" connected={deviceStatus.loadCellsConnected} />
            <StatusFlag label="Geophone" connected={deviceStatus.geophoneConnected} />
            <StatusFlag label="ADXL355" connected={deviceStatus.adxl355Connected} />
          </div>
          {deviceStatus.errorCode !== 0 && (
            <div className="mt-2 text-sm text-[#FF6E6E]">
              Error code: 0x{deviceStatus.errorCode.toString(16).padStart(2, '0').toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Connection info */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-[#3A7BFF]" />
          <h3 className="text-[#1F1F1F]">Connection Info</h3>
        </div>
        <div className="space-y-1 text-sm text-[#1F1F1F]/60">
          <p>Source: <span className="text-[#1F1F1F]">{dataSource.toUpperCase()}</span></p>
          <p>Status: <span className="text-[#1F1F1F]">{effectiveStatus}</span></p>
          <p>Readings: <span className="text-[#1F1F1F]">{readingsCount}</span></p>
          <p>Last update: <span className="text-[#1F1F1F]">{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}</span></p>
        </div>
      </div>
    </div>
  );
}

function StatusFlag({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#3CCB7F]' : 'bg-[#FF6E6E]'}`} />
      <span className="text-[#1F1F1F]/60">{label}</span>
    </div>
  );
}
