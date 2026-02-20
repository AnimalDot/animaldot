type StatusType = 'stable' | 'warning' | 'danger';

interface StatusPillProps {
  status: StatusType;
}

export default function StatusPill({ status }: StatusPillProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'stable': return { text: 'Stable', bgColor: 'bg-[#3CCB7F]/10', textColor: 'text-[#3CCB7F]' };
      case 'warning': return { text: 'Warning', bgColor: 'bg-[#FFD568]/10', textColor: 'text-[#D4A636]' };
      case 'danger': return { text: 'Out of range', bgColor: 'bg-[#FF6E6E]/10', textColor: 'text-[#FF6E6E]' };
    }
  };
  const config = getStatusConfig();
  return (
    <div className={`${config.bgColor} ${config.textColor} px-4 py-2 rounded-full inline-block`}>
      {config.text}
    </div>
  );
}