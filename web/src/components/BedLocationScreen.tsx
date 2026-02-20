import { useState } from 'react';
import { MapPin } from 'lucide-react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function BedLocationScreen({ onNavigate }: Props) {
  const [location, setLocation] = useState('Living Room');
  const [label, setLabel] = useState('Main Floor');
  const locations = ['Living Room', 'Bedroom', 'Office', 'Garage', 'Other'];
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Bed Location" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><MapPin className="w-8 h-8 text-[#3A7BFF]" /></div></div>
        <p className="text-[#1F1F1F]/60 text-center mb-6">Set where your AnimalDot bed is located for context in reports.</p>
        <div className="space-y-4 mb-8">
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Room</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none text-[#1F1F1F]">
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Custom Label</label><input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
        </div>
        <PrimaryButton onClick={() => onNavigate('settings')}>Save Location</PrimaryButton>
      </div>
    </div>
  );
}
