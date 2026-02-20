import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface CreateAccountScreenProps { onNavigate: (screen: Screen) => void; }

export default function CreateAccountScreen({ onNavigate }: CreateAccountScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => onNavigate('signIn')} className="p-1"><ArrowLeft className="w-6 h-6 text-[#1F1F1F]" /></button>
        <h1 className="text-[#1F1F1F]">Create Account</h1>
      </div>
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-4 mb-6">
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
          <div><label className="block text-[#1F1F1F] mb-2 px-1">Confirm Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div>
        </div>
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#3A7BFF] focus:ring-[#3A7BFF]" />
            <span className="text-[#1F1F1F]/80">I agree to the <span className="text-[#3A7BFF]">Terms and Privacy Policy</span></span>
          </label>
        </div>
        <PrimaryButton onClick={() => onNavigate('setupProfile')}>Create Account</PrimaryButton>
      </div>
    </div>
  );
}