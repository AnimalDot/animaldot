import { ChevronRight } from 'lucide-react';
import BottomTabBar from './BottomTabBar';
import type { Screen, TabScreen } from '../App';

interface SettingsScreenProps { activeTab: TabScreen; onNavigate: (screen: Screen) => void; }

export default function SettingsScreen({ activeTab, onNavigate }: SettingsScreenProps) {
  const settingsItems = [
    { label: 'Account', action: () => onNavigate('account') },
    { label: 'Pet Profile', action: () => onNavigate('petProfile') },
    { label: 'Remote Access', action: () => onNavigate('remoteAccess') },
    { label: 'Bed Location', action: () => onNavigate('bedLocation') },
    { label: 'Units (lbs/kg, F/C)', action: () => onNavigate('units') },
    { label: 'Data Export', action: () => onNavigate('dataExport') },
    { label: 'Bluetooth Settings', action: () => onNavigate('bluetoothSettings') },
    { label: 'App Information', action: () => onNavigate('appInformation') },
  ];
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100"><h1 className="text-[#1F1F1F]">Settings</h1></div>
      <div className="flex-1 overflow-auto px-6 py-6 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {settingsItems.map((item, index) => (
            <button key={index} onClick={item.action} className="w-full flex items-center justify-between p-4 hover:bg-[#F5F7FA] transition-colors border-b border-gray-100 last:border-b-0">
              <span className="text-[#1F1F1F]">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-[#1F1F1F]/40" />
            </button>
          ))}
        </div>
      </div>
      <BottomTabBar activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}