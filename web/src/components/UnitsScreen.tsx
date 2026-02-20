import { useState } from 'react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function UnitsScreen({ onNavigate }: Props) {
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [tempUnit, setTempUnit] = useState('F');
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Units" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100"><h3 className="text-[#1F1F1F] mb-3">Weight</h3>
            <div className="flex gap-2">
              {['lbs', 'kg'].map(u => (<button key={u} onClick={() => setWeightUnit(u)} className={`flex-1 py-2 px-4 rounded-xl transition-all ${weightUnit === u ? 'bg-[#3A7BFF] text-white' : 'bg-gray-100 text-[#1F1F1F]/60'}`}>{u}</button>))}
            </div>
          </div>
          <div className="p-4"><h3 className="text-[#1F1F1F] mb-3">Temperature</h3>
            <div className="flex gap-2">
              {['°F', '°C'].map(u => (<button key={u} onClick={() => setTempUnit(u === '°F' ? 'F' : 'C')} className={`flex-1 py-2 px-4 rounded-xl transition-all ${tempUnit === (u === '°F' ? 'F' : 'C') ? 'bg-[#3A7BFF] text-white' : 'bg-gray-100 text-[#1F1F1F]/60'}`}>{u}</button>))}
            </div>
          </div>
        </div>
        <PrimaryButton onClick={() => onNavigate('settings')}>Save Preferences</PrimaryButton>
      </div>
    </div>
  );
}
