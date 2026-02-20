import { useState } from 'react';
import { Wifi, Globe } from 'lucide-react';
import HeaderBar from './HeaderBar';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function RemoteAccessScreen({ onNavigate }: Props) {
  const [cloudSync, setCloudSync] = useState(true);
  const [remoteView, setRemoteView] = useState(false);
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Remote Access" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><Globe className="w-8 h-8 text-[#3A7BFF]" /></div></div>
        <p className="text-[#1F1F1F]/60 text-center mb-6">Access your pet's vitals remotely via the UGA SensorWeb cloud platform.</p>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3"><Wifi className="w-5 h-5 text-[#3A7BFF]" /><div><div className="text-[#1F1F1F]">Cloud Sync</div><div className="text-[#1F1F1F]/40 text-sm">Upload data to SensorWeb</div></div></div>
            <button onClick={() => setCloudSync(!cloudSync)} className={`w-12 h-7 rounded-full transition-all ${cloudSync ? 'bg-[#3A7BFF]' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${cloudSync ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><Globe className="w-5 h-5 text-[#3A7BFF]" /><div><div className="text-[#1F1F1F]">Remote Viewing</div><div className="text-[#1F1F1F]/40 text-sm">Allow web dashboard access</div></div></div>
            <button onClick={() => setRemoteView(!remoteView)} className={`w-12 h-7 rounded-full transition-all ${remoteView ? 'bg-[#3A7BFF]' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${remoteView ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
        </div>
        {cloudSync && <div className="bg-[#3CCB7F]/10 rounded-2xl p-4"><p className="text-[#1F1F1F]/80 text-sm text-center">Cloud sync is active. Data uploads every 5 minutes.</p></div>}
      </div>
    </div>
  );
}
