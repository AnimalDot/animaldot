import { Thermometer } from 'lucide-react';
import HeaderBar from './HeaderBar';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface Props { onNavigate: (screen: Screen) => void; }

export default function TempCalibrationStart({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Temperature Calibration" onBack={() => onNavigate('device')} />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full bg-[#FFD568]/10 flex items-center justify-center mb-8"><Thermometer className="w-12 h-12 text-[#FFD568]" /></div>
        <h2 className="text-[#1F1F1F] text-xl mb-4 text-center">Calibrate Temperature</h2>
        <p className="text-[#1F1F1F]/60 text-center mb-8 px-4">Allow the DHT22 sensor to equilibrate to room temperature. Keep the bed in a stable environment away from drafts.</p>
        <div className="bg-[#FFD568]/10 rounded-2xl p-4 mb-8 w-full"><p className="text-[#1F1F1F]/80 text-center">Calibration takes about 60 seconds while the sensor stabilizes.</p></div>
        <PrimaryButton onClick={() => onNavigate('tempCalibComplete')}>Start Calibration</PrimaryButton>
      </div>
    </div>
  );
}
