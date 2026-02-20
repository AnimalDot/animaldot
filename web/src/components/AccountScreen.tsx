import { ChevronRight, LogOut } from 'lucide-react';
import HeaderBar from './HeaderBar';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function AccountScreen({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Account" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center mb-3"><span className="text-[#3A7BFF] text-2xl font-semibold">JD</span></div>
          <h2 className="text-[#1F1F1F] text-lg">Jane Doe</h2>
          <p className="text-[#1F1F1F]/40">jane.doe@uga.edu</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {[
            { label: 'Edit Profile', action: () => onNavigate('editProfile') },
            { label: 'Change Password', action: () => onNavigate('changePassword') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="w-full flex items-center justify-between p-4 hover:bg-[#F5F7FA] transition-colors border-b border-gray-100 last:border-b-0">
              <span className="text-[#1F1F1F]">{item.label}</span><ChevronRight className="w-5 h-5 text-[#1F1F1F]/40" />
            </button>
          ))}
        </div>
        <button onClick={() => onNavigate('welcome')} className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-[#FF6E6E]/30 text-[#FF6E6E] hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
