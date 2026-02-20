import { CheckCircle2, Signal } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import BottomTabBar from './BottomTabBar';
import type { Screen, TabScreen } from '../App';

interface DeviceScreenProps { activeTab: TabScreen; onNavigate: (screen: Screen) => void; }

export default function DeviceScreen({ activeTab, onNavigate }: DeviceScreenProps) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100"><h1 className="text-[#1F1F1F]">Device Status</h1></div>
      <div className="flex-1 overflow-auto px-6 py-6 pb-24">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-[#1F1F1F] mb-4">Hardware Components</h3>
          <div className="space-y-3">
            {['Geophone', 'Load Cells', 'Temperature Sensor'].map(name => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#3CCB7F]" /><span className="text-[#1F1F1F]">{name}</span></div>
                <span className="text-[#3CCB7F]">Connected</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-2"><Signal className="w-5 h-5 text-[#3CCB7F]" /><span className="text-[#1F1F1F]">Signal Strength</span></div>
          <div className="text-[#3CCB7F]">Good</div>
        </div>
        <div className="space-y-3 mb-6">
          <PrimaryButton onClick={() => onNavigate('weightCalibStart')}>Calibrate Weight</PrimaryButton>
          <SecondaryButton onClick={() => onNavigate('tempCalibStart')}>Calibrate Temperature</SecondaryButton>
          <SecondaryButton onClick={() => onNavigate('deviceScan')}>Re-scan for Devices</SecondaryButton>
        </div>
        <p className="text-[#1F1F1F]/40 text-center">Device data synced through UGA SensorWeb</p>
      </div>
      <BottomTabBar activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}