import { useState } from 'react';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import type { Screen } from '../App';

interface SignInScreenProps { onNavigate: (screen: Screen) => void; }

export default function SignInScreen({ onNavigate }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="flex flex-col items-center mb-12 mt-8">
          <div className="w-24 h-24 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#3A7BFF]/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#3A7BFF]"></div>
            </div>
          </div>
          <h1 className="text-[#1F1F1F] mb-2">AnimalDot</h1>
          <p className="text-[#1F1F1F]/60">Sign in to continue</p>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[#1F1F1F] mb-2 px-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" />
          </div>
          <div>
            <label className="block text-[#1F1F1F] mb-2 px-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" />
          </div>
        </div>
        <button onClick={() => onNavigate('forgotPassword')} className="text-[#3A7BFF] mb-6 px-1">Forgot Password?</button>
        <div className="space-y-3">
          <PrimaryButton onClick={() => onNavigate('deviceScan')}>Sign In</PrimaryButton>
          <SecondaryButton onClick={() => onNavigate('createAccount')}>Create Account</SecondaryButton>
        </div>
      </div>
    </div>
  );
}