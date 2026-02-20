import { CheckCircle2 } from 'lucide-react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function TempCalibrationComplete({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Temperature Calibration" onBack={() => onNavigate('device')} />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full bg-[#3CCB7F]/10 flex items-center justify-center mb-8"><CheckCircle2 className="w-16 h-16 text-[#3CCB7F]" /></div>
        <h2 className="text-[#1F1F1F] text-xl mb-4 text-center">Calibration Complete</h2>
        <p className="text-[#1F1F1F]/60 text-center mb-4">Temperature sensor has been successfully calibrated.</p>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-full mb-8">
          <div className="flex justify-between mb-2"><span className="text-[#1F1F1F]/60">Ambient temp</span><span className="text-[#1F1F1F]">72.4°F</span></div>
          <div className="flex justify-between"><span className="text-[#1F1F1F]/60">Accuracy</span><span className="text-[#3CCB7F]">±0.3°F</span></div>
        </div>
        <PrimaryButton onClick={() => onNavigate('device')}>Done</PrimaryButton>
      </div>
    </div>
  );
}
