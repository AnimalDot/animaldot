import { useState } from 'react';
import { Bluetooth } from 'lucide-react';
import HeaderBar from './HeaderBar';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function BluetoothSettingsScreen({ onNavigate }: Props) {
  const [autoConnect, setAutoConnect] = useState(true);
  const [scanTimeout, setScanTimeout] = useState('30');
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Bluetooth Settings" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><Bluetooth className="w-8 h-8 text-[#3A7BFF]" /></div></div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div><div className="text-[#1F1F1F]">Auto-Connect</div><div className="text-[#1F1F1F]/40 text-sm">Reconnect to last device</div></div>
            <button onClick={() => setAutoConnect(!autoConnect)} className={`w-12 h-7 rounded-full transition-all ${autoConnect ? 'bg-[#3A7BFF]' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoConnect ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
          <div className="p-4 border-b border-gray-100">
            <div className="text-[#1F1F1F] mb-2">Scan Timeout</div>
            <select value={scanTimeout} onChange={(e) => setScanTimeout(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-gray-200 text-[#1F1F1F]">
              <option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option>
            </select>
          </div>
          <button onClick={() => onNavigate('connectedDevices')} className="w-full p-4 text-left hover:bg-[#F5F7FA] transition-colors">
            <div className="text-[#1F1F1F]">Connected Devices</div><div className="text-[#1F1F1F]/40 text-sm">Manage paired beds</div>
          </button>
        </div>
      </div>
    </div>
  );
}
