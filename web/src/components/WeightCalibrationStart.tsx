import { Scale } from 'lucide-react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function WeightCalibrationStart({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Weight Calibration" onBack={() => onNavigate('device')} />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full bg-[#A78BFA]/10 flex items-center justify-center mb-8"><Scale className="w-12 h-12 text-[#A78BFA]" /></div>
        <h2 className="text-[#1F1F1F] text-xl mb-4 text-center">Calibrate Load Cells</h2>
        <p className="text-[#1F1F1F]/60 text-center mb-8 px-4">Remove your pet and all objects from the bed. The bed surface must be completely empty before calibration.</p>
        <div className="bg-[#FFD568]/10 rounded-2xl p-4 mb-8 w-full"><p className="text-[#1F1F1F]/80 text-center">This process takes about 30 seconds. Please do not touch the bed during calibration.</p></div>
        <PrimaryButton onClick={() => onNavigate('weightCalibComplete')}>Start Calibration</PrimaryButton>
      </div>
    </div>
  );
}
