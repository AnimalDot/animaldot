import { useState } from 'react';
import { Camera } from 'lucide-react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface PetProfileScreenProps { onNavigate: (screen: Screen) => void; }

export default function PetProfileScreen({ onNavigate }: PetProfileScreenProps) {
  const [petName, setPetName] = useState('Baxter');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('Golden Retriever');
  const [age, setAge] = useState('5');
  const [baselineWeight, setBaselineWeight] = useState('62.0');
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Pet Profile" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><Camera className="w-8 h-8 text-[#3A7BFF]" /></div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#3A7BFF] rounded-full flex items-center justify-center shadow-lg"><Camera className="w-4 h-4 text-white" /></button>
          </div>
        </div>
        <div className="space-y-4 mb-8">
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Pet Name</label><input type="text" value={petName} onChange={(e) => setPetName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Species</label>
            <select value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none text-[#1F1F1F]">
              <option>Dog</option><option>Cat</option><option>Other</option>
            </select>
          </div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Breed</label><input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Age (years)</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Baseline Weight (lbs)</label><input type="number" step="0.1" value={baselineWeight} onChange={(e) => setBaselineWeight(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
        </div>
        <PrimaryButton onClick={() => onNavigate('settings')}>Save Profile</PrimaryButton>
      </div>
    </div>
  );
}
