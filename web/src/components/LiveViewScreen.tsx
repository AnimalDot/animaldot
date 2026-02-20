import { Signal } from 'lucide-react';
import VitalCard from './VitalCard';
import StatusPill from './StatusPill';
import BottomTabBar from './BottomTabBar';
import type { Screen, TabScreen } from '../App';

interface LiveViewScreenProps { activeTab: TabScreen; onNavigate: (screen: Screen) => void; }

export default function LiveViewScreen({ activeTab, onNavigate }: LiveViewScreenProps) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[#1F1F1F]">Baxter</h1>
          <StatusPill status="stable" />
        </div>
        <p className="text-[#1F1F1F]/40">Last updated: 2 sec ago</p>
      </div>
      <div className="flex-1 overflow-auto px-6 py-6 pb-24">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <VitalCard type="heart" value={78} unit="bpm" normalRange="Normal: 60–120 bpm" status="normal" />
          <VitalCard type="respiration" value={24} unit="rpm" normalRange="Normal: 15–30 rpm" status="normal" />
          <VitalCard type="temperature" value={101.2} unit="°F" normalRange="Normal: 100–102.5 °F" status="normal" />
          <VitalCard type="weight" value={62.4} unit="lbs" normalRange="Baseline: 62.0 lbs" status="normal" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Signal className="w-5 h-5 text-[#3CCB7F]" />
            <span className="text-[#1F1F1F]">Signal Quality: Good</span>
          </div>
          <p className="text-[#1F1F1F]/40">Data streamed from cloud via BedDot system</p>
        </div>
      </div>
      <BottomTabBar activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}