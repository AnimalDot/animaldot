import { Download, FileText, Table } from 'lucide-react';
import HeaderBar from './HeaderBar';
import SecondaryButton from './SecondaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function DataExportScreen({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Data Export" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center"><Download className="w-8 h-8 text-[#3A7BFF]" /></div></div>
        <p className="text-[#1F1F1F]/60 text-center mb-8">Export your pet's vitals data for sharing with your veterinarian or for personal records.</p>
        <div className="space-y-3 mb-8">
          <button className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-[#F5F7FA] transition-colors">
            <FileText className="w-6 h-6 text-[#3A7BFF]" />
            <div className="text-left"><div className="text-[#1F1F1F]">PDF Report</div><div className="text-[#1F1F1F]/40">Summary with charts</div></div>
          </button>
          <button className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:bg-[#F5F7FA] transition-colors">
            <Table className="w-6 h-6 text-[#3CCB7F]" />
            <div className="text-left"><div className="text-[#1F1F1F]">CSV Data</div><div className="text-[#1F1F1F]/40">Raw vitals data</div></div>
          </button>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-[#1F1F1F] mb-3">Date Range</h3>
          <div className="flex gap-2">
            {['Last 7 days', 'Last 30 days', 'All time'].map(r => (<button key={r} className="flex-1 py-2 px-3 rounded-xl bg-gray-100 text-[#1F1F1F]/60 hover:bg-[#3A7BFF] hover:text-white transition-all text-sm">{r}</button>))}
          </div>
        </div>
        <SecondaryButton onClick={() => onNavigate('settings')}>Back to Settings</SecondaryButton>
      </div>
    </div>
  );
}
