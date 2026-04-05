import { Bluetooth, Wifi, Server } from 'lucide-react';
import PrimaryButton from '../PrimaryButton';
import { useBedDotStore } from '../../lib/beddot/useBedDotStore';
import { isBleSupported } from '../../lib/beddot/bleService';
import type { DataSource } from '../../lib/beddot/types';

interface ConnectionPanelProps {
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function ConnectionPanel({ onConnect, onDisconnect }: ConnectionPanelProps) {
  const {
    connectionState,
    dataSource,
    mqttConfig,
    setDataSource,
    setMqttConfig,
  } = useBedDotStore();

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const sourceButtons: Array<{ key: DataSource; label: string; icon: React.ReactNode }> = [
    { key: 'ble', label: 'BLE', icon: <Bluetooth className="w-4 h-4" /> },
    { key: 'mqtt', label: 'MQTT', icon: <Wifi className="w-4 h-4" /> },
    { key: 'bridge', label: 'Local bridge', icon: <Server className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-[#1F1F1F] mb-3">Connection</h3>

      {/* Source toggle */}
      <div className="flex gap-2 mb-4">
        {sourceButtons.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setDataSource(key)}
            disabled={isConnected || isConnecting}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all ${
              dataSource === key
                ? 'bg-[#3A7BFF] text-white'
                : 'bg-gray-100 text-[#1F1F1F]/60'
            } disabled:opacity-50`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* BLE mode */}
      {dataSource === 'ble' && (
        <div className="space-y-3">
          {!isBleSupported() && (
            <div className="bg-[#FFD568]/10 text-[#D4A636] px-3 py-2 rounded-xl text-sm">
              Web Bluetooth is not supported in this browser. Use Chrome or Edge on HTTPS/localhost.
            </div>
          )}
        </div>
      )}

      {/* Local bridge mode */}
      {dataSource === 'bridge' && (
        <div className="space-y-3">
          <div className="bg-[#3A7BFF]/10 text-[#3A7BFF] px-3 py-2 rounded-xl text-sm">
            Connect to your local bridge (bridge.js) at ws://localhost:8080 — or MQTT over WebSockets to your broker.
          </div>
        </div>
      )}

      {/* MQTT mode */}
      {dataSource === 'mqtt' && (
        <div className="space-y-3">
          <div>
            <label className="text-[#1F1F1F]/60 text-sm mb-1 block">Broker WebSocket URL</label>
            <input
              type="text"
              value={mqttConfig.brokerUrl}
              onChange={(e) => setMqttConfig({ brokerUrl: e.target.value })}
              disabled={isConnected || isConnecting}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:border-[#3A7BFF] disabled:opacity-50"
              placeholder="ws://sensorweb.us:9001"
            />
          </div>
          <div>
            <label className="text-[#1F1F1F]/60 text-sm mb-1 block">Organization</label>
            <input
              type="text"
              value={mqttConfig.org}
              onChange={(e) => setMqttConfig({ org: e.target.value })}
              disabled={isConnected || isConnecting}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:border-[#3A7BFF] disabled:opacity-50"
              placeholder="sensorweb"
            />
          </div>
          <div>
            <label className="text-[#1F1F1F]/60 text-sm mb-1 block">Device MAC (hex, no colons)</label>
            <input
              type="text"
              value={mqttConfig.macHex}
              onChange={(e) => setMqttConfig({ macHex: e.target.value })}
              disabled={isConnected || isConnecting}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:border-[#3A7BFF] disabled:opacity-50"
              placeholder="aabbccddeeff"
            />
          </div>
        </div>
      )}

      {/* Connect / Disconnect button */}
      <div className="mt-4">
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="w-full bg-[#FF6E6E] text-white py-3 px-6 rounded-2xl hover:bg-[#E55A5A] active:scale-[0.98] transition-all"
          >
            Disconnect
          </button>
        ) : (
          <PrimaryButton
            onClick={onConnect}
            disabled={isConnecting || (dataSource === 'ble' && !isBleSupported()) || (dataSource === 'mqtt' && !mqttConfig.macHex)}
          >
            {isConnecting ? 'Connecting...' : dataSource === 'ble' ? 'Scan & Connect' : 'Connect'}
          </PrimaryButton>
        )}
      </div>

      {/* Error state */}
      {connectionState === 'error' && (
        <div className="mt-3 bg-[#FF6E6E]/10 text-[#FF6E6E] px-3 py-2 rounded-xl text-sm">
          Connection failed. Check your settings and try again.
        </div>
      )}
    </div>
  );
}
