import { Bluetooth } from 'lucide-react';

interface DeviceListItemProps {
  name: string;
  onClick?: () => void;
}

export default function DeviceListItem({ name, onClick }: DeviceListItemProps) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-[#3A7BFF] hover:bg-[#F5F7FA] transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center">
        <Bluetooth className="w-5 h-5 text-[#3A7BFF]" />
      </div>
      <span className="text-[#1F1F1F]">{name}</span>
    </button>
  );
}