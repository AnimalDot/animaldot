import { useState, useEffect, useRef } from 'react';
import { Heart, Wind, Thermometer, Weight, Droplets, Activity } from 'lucide-react';

type VitalType = 'heart' | 'respiration' | 'temperature' | 'weight' | 'humidity' | 'bloodPressure';
type StatusType = 'normal' | 'warning' | 'danger';

interface VitalCardProps {
  type: VitalType;
  value: number | null | undefined;
  /** For bloodPressure: diastolic value (systolic is value) */
  valueSecondary?: number | null | undefined;
  unit: string;
  normalRange: string;
  status: StatusType;
}

export default function VitalCard({ type, value, valueSecondary, unit, normalRange, status }: VitalCardProps) {
  const [pulse, setPulse] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    const current = type === 'bloodPressure' ? `${value ?? ''}/${valueSecondary ?? ''}` : value;
    if (current != null && prevValue.current !== current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      prevValue.current = current;
      return () => clearTimeout(t);
    }
  }, [value, valueSecondary, type]);

  const getIcon = () => {
    switch (type) {
      case 'heart': return <Heart className="w-6 h-6" />;
      case 'respiration': return <Wind className="w-6 h-6" />;
      case 'temperature': return <Thermometer className="w-6 h-6" />;
      case 'weight': return <Weight className="w-6 h-6" />;
      case 'humidity': return <Droplets className="w-6 h-6" />;
      case 'bloodPressure': return <Activity className="w-6 h-6" />;
    }
  };
  const getTitle = () => {
    switch (type) {
      case 'heart': return 'Heart Rate';
      case 'respiration': return 'Respiration Rate';
      case 'temperature': return 'Temperature';
      case 'weight': return 'Weight';
      case 'humidity': return 'Humidity';
      case 'bloodPressure': return 'Blood Pressure';
    }
  };
  const displayValue = type === 'bloodPressure'
    ? (value != null || valueSecondary != null ? `${value ?? '--'}/${valueSecondary ?? '--'}` : '--/--')
    : (value != null ? value : '--');
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
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${getBorderColor()} transition-transform ${pulse ? 'scale-[1.02]' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={getIconColor()}>{getIcon()}</div>
        <span className="text-[#1F1F1F]/60">{getTitle()}</span>
      </div>
      <div className="mb-2">
        <span className="text-[#1F1F1F]">{displayValue}</span>
        <span className="text-[#1F1F1F]/60 ml-1">{unit}</span>
      </div>
      <div className="text-[#1F1F1F]/40">{normalRange}</div>
    </div>
  );
}
