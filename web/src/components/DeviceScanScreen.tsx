import HeaderBar from './HeaderBar';
import DeviceListItem from './DeviceListItem';
import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface DeviceScanScreenProps { onNavigate: (screen: Screen) => void; }

export default function DeviceScanScreen({ onNavigate }: DeviceScanScreenProps) {
  const devices = ['AnimalDot Bed 001', 'AnimalDot Bed 002', 'AnimalDot Bed 003'];
  return (
    <div className="h-full flex flex-col bg-[#F5F7FA]">
      <HeaderBar title="Connect to AnimalDot Bed" onBack={() => onNavigate('welcome')} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="space-y-3 mb-6">
          {devices.map((device, index) => (<DeviceListItem key={index} name={device} />))}
        </div>
      </div>
      <div className="px-6 pb-6 bg-white pt-4">
        <PrimaryButton onClick={() => onNavigate('live')}>Pair Device</PrimaryButton>
        <p className="text-[#1F1F1F]/40 text-center mt-4">Make sure the smart bed is powered on</p>
      </div>
    </div>
  );
}