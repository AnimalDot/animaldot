import { Bluetooth, Trash2 } from 'lucide-react';
import HeaderBar from './HeaderBar';
import SecondaryButton from './SecondaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function ConnectedDevicesScreen({ onNavigate }: Props) {
  const devices = [
    { name: 'AnimalDot Bed 001', status: 'Connected', rssi: '-42 dBm' },
    { name: 'AnimalDot Bed 002', status: 'Saved', rssi: 'N/A' },
  ];
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Connected Devices" onBack={() => onNavigate('bluetoothSettings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-3 mb-8">
          {devices.map((device, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bluetooth className={`w-5 h-5 ${device.status === 'Connected' ? 'text-[#3A7BFF]' : 'text-[#1F1F1F]/40'}`} />
                <div><div className="text-[#1F1F1F]">{device.name}</div><div className="text-[#1F1F1F]/40 text-sm">{device.status} • RSSI: {device.rssi}</div></div>
              </div>
              <button className="p-2 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-5 h-5 text-[#FF6E6E]" /></button>
            </div>
          ))}
        </div>
        <SecondaryButton onClick={() => onNavigate('deviceScan')}>Scan for New Devices</SecondaryButton>
      </div>
    </div>
  );
}
