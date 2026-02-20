import { useState } from 'react';
import { Camera } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface SetupProfileScreenProps { onNavigate: (screen: Screen) => void; }

export default function SetupProfileScreen({ onNavigate }: SetupProfileScreenProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const handleFinishSetup = () => { onNavigate('deviceScan'); };
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100"><h1 className="text-[#1F1F1F]">Set Up Your Profile</h1></div>
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><Camera className="w-8 h-8 text-[#3A7BFF]" /></div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#3A7BFF] rounded-full flex items-center justify-center shadow-lg"><Camera className="w-4 h-4 text-white" /></button>
          </div>
        </div>
        <div className="space-y-4 mb-8">
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your name" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
        </div>
        <PrimaryButton onClick={handleFinishSetup}>Finish Setup</PrimaryButton>
        <button onClick={handleFinishSetup} className="w-full text-center text-[#1F1F1F]/60 mt-4">Skip for now</button>
      </div>
    </div>
  );
}