import { Heart, Wind, Thermometer, Weight } from 'lucide-react';

type VitalType = 'heart' | 'respiration' | 'temperature' | 'weight';
type StatusType = 'normal' | 'warning' | 'danger';

interface VitalCardProps {
  type: VitalType;
  value: number;
  unit: string;
  normalRange: string;
  status: StatusType;
}

export default function VitalCard({ type, value, unit, normalRange, status }: VitalCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'heart': return <Heart className="w-6 h-6" />;
      case 'respiration': return <Wind className="w-6 h-6" />;
      case 'temperature': return <Thermometer className="w-6 h-6" />;
      case 'weight': return <Weight className="w-6 h-6" />;
    }
  };
  const getTitle = () => {
    switch (type) {
      case 'heart': return 'Heart Rate';
      case 'respiration': return 'Respiration Rate';
      case 'temperature': return 'Temperature';
      case 'weight': return 'Weight';
    }
  };
  const getBorderColor = () => {
    switch (status) {
      case 'normal': return 'border-[#3CCB7F]';
      case 'warning': return 'border-[#FFD568]';
      case 'danger': return 'border-[#FF6E6E]';
    }
  };
  const getIconColor = () => {
    switch (status) {
      case 'normal': return 'text-[#3CCB7F]';
      case 'warning': return 'text-[#FFD568]';
      case 'danger': return 'text-[#FF6E6E]';
    }
  };
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${getBorderColor()}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={getIconColor()}>{getIcon()}</div>
        <span className="text-[#1F1F1F]/60">{getTitle()}</span>
      </div>
      <div className="mb-2">
        <span className="text-[#1F1F1F]">{value}</span>
        <span className="text-[#1F1F1F]/60 ml-1">{unit}</span>
      </div>
      <div className="text-[#1F1F1F]/40">{normalRange}</div>
    </div>
  );
}