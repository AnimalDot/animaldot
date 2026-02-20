import { Activity, TrendingUp, Wifi, Settings } from 'lucide-react';
import type { Screen, TabScreen } from '../App';

interface BottomTabBarProps {
  activeTab: TabScreen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomTabBar({ activeTab, onNavigate }: BottomTabBarProps) {
  const tabs = [
    { id: 'live' as TabScreen, label: 'Live', icon: Activity },
    { id: 'trends' as TabScreen, label: 'Trends', icon: TrendingUp },
    { id: 'device' as TabScreen, label: 'Device', icon: Wifi },
    { id: 'settings' as TabScreen, label: 'Settings', icon: Settings },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 safe-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onNavigate(tab.id)} className="flex flex-col items-center gap-1 flex-1 py-2">
              <Icon className={`w-6 h-6 ${isActive ? 'text-[#3A7BFF]' : 'text-[#1F1F1F]/40'}`} />
              <span className={`${isActive ? 'text-[#3A7BFF]' : 'text-[#1F1F1F]/40'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}