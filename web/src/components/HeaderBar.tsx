import { ArrowLeft } from 'lucide-react';

interface HeaderBarProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function HeaderBar({ title, onBack, rightElement }: HeaderBarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#1F1F1F]" />
          </button>
        )}
        <h1 className="text-[#1F1F1F]">{title}</h1>
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
}