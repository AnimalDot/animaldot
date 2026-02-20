import { useState } from 'react';
import GraphCard from './GraphCard';
import BottomTabBar from './BottomTabBar';
import type { Screen, TabScreen } from '../App';

interface TrendsScreenProps { activeTab: TabScreen; onNavigate: (screen: Screen) => void; }

export default function TrendsScreen({ activeTab, onNavigate }: TrendsScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week'>('day');
  const heartRateData = [{ time: '6am', value: 72 },{ time: '9am', value: 85 },{ time: '12pm', value: 78 },{ time: '3pm', value: 82 },{ time: '6pm', value: 75 }];
  const respirationData = [{ time: '6am', value: 22 },{ time: '9am', value: 26 },{ time: '12pm', value: 24 },{ time: '3pm', value: 25 },{ time: '6pm', value: 23 }];
  const temperatureData = [{ time: '6am', value: 100.8 },{ time: '9am', value: 101.2 },{ time: '12pm', value: 101.5 },{ time: '3pm', value: 101.3 },{ time: '6pm', value: 101.0 }];
  const weightData = [{ time: '6am', value: 62.2 },{ time: '9am', value: 62.4 },{ time: '12pm', value: 62.3 },{ time: '3pm', value: 62.5 },{ time: '6pm', value: 62.4 }];
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <h1 className="text-[#1F1F1F] mb-4">Trends</h1>
        <div className="flex gap-2">
          <button onClick={() => setSelectedPeriod('day')} className={`flex-1 py-2 px-4 rounded-xl transition-all ${selectedPeriod === 'day' ? 'bg-[#3A7BFF] text-white' : 'bg-gray-100 text-[#1F1F1F]/60'}`}>Day</button>
          <button onClick={() => setSelectedPeriod('week')} className={`flex-1 py-2 px-4 rounded-xl transition-all ${selectedPeriod === 'week' ? 'bg-[#3A7BFF] text-white' : 'bg-gray-100 text-[#1F1F1F]/60'}`}>Week</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-6 pb-24 space-y-4">
        <GraphCard title="Heart Rate" data={heartRateData} color="#FF6B9D" unit="bpm" />
        <GraphCard title="Respiration Rate" data={respirationData} color="#4ECDC4" unit="rpm" />
        <GraphCard title="Temperature" data={temperatureData} color="#FFD568" unit="°F" />
        <GraphCard title="Weight" data={weightData} color="#A78BFA" unit="lbs" />
      </div>
      <BottomTabBar activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}