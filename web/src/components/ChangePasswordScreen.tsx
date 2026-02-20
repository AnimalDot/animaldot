import { useState } from 'react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function ChangePasswordScreen({ onNavigate }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Change Password" onBack={() => onNavigate('account')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-4 mb-8">
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
        </div>
        <PrimaryButton onClick={() => onNavigate('account')}>Update Password</PrimaryButton>
      </div>
    </div>
  );
}
