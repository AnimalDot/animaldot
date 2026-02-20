import PrimaryButton from './PrimaryButton';
import type { Screen } from '../App';

interface WelcomeScreenProps { onNavigate: (screen: Screen) => void; }

export default function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 bg-gradient-to-br from-[#F5F7FA] to-white">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <h1 className="text-[#3A7BFF] mb-4">AnimalDot</h1>
          <p className="text-[#1F1F1F]/60">Smart Animal Bed Monitoring</p>
        </div>
        <div className="w-32 h-32 rounded-full bg-[#3A7BFF]/10 flex items-center justify-center mb-12">
          <div className="w-20 h-20 rounded-full bg-[#3A7BFF]/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#3A7BFF]"></div>
          </div>
        </div>
      </div>
      <div className="w-full mb-8">
        <PrimaryButton onClick={() => onNavigate('signIn')}>Get Started</PrimaryButton>
      </div>
    </div>
  );
}