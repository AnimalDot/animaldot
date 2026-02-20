import HeaderBar from './HeaderBar';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function AppInformationScreen({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="App Information" onBack={() => onNavigate('settings')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#3A7BFF]/20 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-[#3A7BFF]"></div></div>
          </div>
          <h2 className="text-[#1F1F1F] text-xl mb-1">AnimalDot</h2>
          <p className="text-[#1F1F1F]/40">Version 1.0.0 (Build 42)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {[
            { label: 'Developer', value: 'UGA College of Engineering' },
            { label: 'Platform', value: 'ESP32 + React Native' },
            { label: 'BLE Protocol', value: 'NimBLE' },
            { label: 'Sensors', value: 'Geophone, HX711, DHT22' },
            { label: 'License', value: 'Research Use' },
          ].map((item, i) => (
            <div key={i} className="p-4 border-b border-gray-100 last:border-b-0 flex justify-between">
              <span className="text-[#1F1F1F]/60">{item.label}</span><span className="text-[#1F1F1F]">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-[#1F1F1F] mb-2">About</h3>
          <p className="text-[#1F1F1F]/60 text-sm leading-relaxed">AnimalDot is a smart animal bed monitoring system developed at the University of Georgia. It uses embedded sensors to non-invasively track heart rate, respiration, temperature, and weight of companion animals.</p>
        </div>
      </div>
    </div>
  );
}
