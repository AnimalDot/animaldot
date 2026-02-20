import { useState } from 'react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function EditProfileScreen({ onNavigate }: Props) {
  const [name, setName] = useState('Jane Doe');
  const [email, setEmail] = useState('jane.doe@uga.edu');
  const [phone, setPhone] = useState('(706) 555-1234');
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Edit Profile" onBack={() => onNavigate('account')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-4 mb-8">
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F]" /></div>
        </div>
        <PrimaryButton onClick={() => onNavigate('account')}>Save Changes</PrimaryButton>
      </div>
    </div>
  );
}
