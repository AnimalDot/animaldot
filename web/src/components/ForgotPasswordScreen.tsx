import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface ForgotPasswordScreenProps { onNavigate: (screen: Screen) => void; }

export default function ForgotPasswordScreen({ onNavigate }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const handleSendReset = () => { setSent(true); setTimeout(() => { onNavigate('signIn'); }, 2000); };
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => onNavigate('signIn')} className="p-1"><ArrowLeft className="w-6 h-6 text-[#1F1F1F]" /></button>
        <h1 className="text-[#1F1F1F]">Reset Password</h1>
      </div>
      <div className="flex-1 flex flex-col px-6 py-8">
        <div className="flex-1">
          <div className="flex justify-center mb-8"><div className="w-20 h-20 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><Mail className="w-10 h-10 text-[#3A7BFF]" /></div></div>
          {!sent ? (<><p className="text-[#1F1F1F]/60 text-center mb-8 px-4">We will send password reset instructions to your email.</p><div className="mb-6"><label className="block text-[#1F1F1F] mb-2 px-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-[#3A7BFF] focus:outline-none focus:ring-2 focus:ring-[#3A7BFF]/20 text-[#1F1F1F] placeholder:text-[#1F1F1F]/40" /></div></>) : (<div className="bg-[#3CCB7F]/10 rounded-2xl p-6 mb-6"><p className="text-[#1F1F1F] text-center">Reset link sent! Check your email.</p></div>)}
        </div>
        {!sent && (<PrimaryButton onClick={handleSendReset}>Send Reset Link</PrimaryButton>)}
      </div>
    </div>
  );
}