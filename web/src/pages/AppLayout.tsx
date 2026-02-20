import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Screen, TabScreen } from '../types/navigation';
import WelcomeScreen from '../components/WelcomeScreen';
import DeviceScanScreen from '../components/DeviceScanScreen';
import LiveViewScreen from '../components/LiveViewScreen';
import TrendsScreen from '../components/TrendsScreen';
import DeviceScreen from '../components/DeviceScreen';
import SettingsScreen from '../components/SettingsScreen';
import PetProfileScreen from '../components/PetProfileScreen';
import WeightCalibrationStart from '../components/WeightCalibrationStart';
import WeightCalibrationComplete from '../components/WeightCalibrationComplete';
import TempCalibrationStart from '../components/TempCalibrationStart';
import TempCalibrationComplete from '../components/TempCalibrationComplete';
import BedLocationScreen from '../components/BedLocationScreen';
import UnitsScreen from '../components/UnitsScreen';
import DataExportScreen from '../components/DataExportScreen';
import BluetoothSettingsScreen from '../components/BluetoothSettingsScreen';
import AppInformationScreen from '../components/AppInformationScreen';
import SignInScreen from '../components/SignInScreen';
import CreateAccountScreen from '../components/CreateAccountScreen';
import SetupProfileScreen from '../components/SetupProfileScreen';
import ForgotPasswordScreen from '../components/ForgotPasswordScreen';
import RemoteAccessScreen from '../components/RemoteAccessScreen';
import ConnectedDevicesScreen from '../components/ConnectedDevicesScreen';
import AccountScreen from '../components/AccountScreen';
import EditProfileScreen from '../components/EditProfileScreen';
import ChangePasswordScreen from '../components/ChangePasswordScreen';

export default function AppLayout() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [activeTab, setActiveTab] = useState<TabScreen>('live');

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    if (screen === 'live' || screen === 'trends' || screen === 'device' || screen === 'settings') {
      setActiveTab(screen);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome': return <WelcomeScreen onNavigate={navigateTo} />;
      case 'signIn': return <SignInScreen onNavigate={navigateTo} />;
      case 'createAccount': return <CreateAccountScreen onNavigate={navigateTo} />;
      case 'setupProfile': return <SetupProfileScreen onNavigate={navigateTo} />;
      case 'forgotPassword': return <ForgotPasswordScreen onNavigate={navigateTo} />;
      case 'deviceScan': return <DeviceScanScreen onNavigate={navigateTo} />;
      case 'live': return <LiveViewScreen activeTab={activeTab} onNavigate={navigateTo} />;
      case 'trends': return <TrendsScreen activeTab={activeTab} onNavigate={navigateTo} />;
      case 'device': return <DeviceScreen activeTab={activeTab} onNavigate={navigateTo} />;
      case 'settings': return <SettingsScreen activeTab={activeTab} onNavigate={navigateTo} />;
      case 'petProfile': return <PetProfileScreen onNavigate={navigateTo} />;
      case 'weightCalibStart': return <WeightCalibrationStart onNavigate={navigateTo} />;
      case 'weightCalibComplete': return <WeightCalibrationComplete onNavigate={navigateTo} />;
      case 'tempCalibStart': return <TempCalibrationStart onNavigate={navigateTo} />;
      case 'tempCalibComplete': return <TempCalibrationComplete onNavigate={navigateTo} />;
      case 'bedLocation': return <BedLocationScreen onNavigate={navigateTo} />;
      case 'units': return <UnitsScreen onNavigate={navigateTo} />;
      case 'dataExport': return <DataExportScreen onNavigate={navigateTo} />;
      case 'bluetoothSettings': return <BluetoothSettingsScreen onNavigate={navigateTo} />;
      case 'appInformation': return <AppInformationScreen onNavigate={navigateTo} />;
      case 'remoteAccess': return <RemoteAccessScreen onNavigate={navigateTo} />;
      case 'connectedDevices': return <ConnectedDevicesScreen onNavigate={navigateTo} />;
      case 'account': return <AccountScreen onNavigate={navigateTo} />;
      case 'editProfile': return <EditProfileScreen onNavigate={navigateTo} />;
      case 'changePassword': return <ChangePasswordScreen onNavigate={navigateTo} />;
      default: return <WelcomeScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-6">
      <div className="w-full max-w-md flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden relative border border-slate-100">
        <Link
          to="/"
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Back to site
        </Link>
        {renderScreen()}
      </div>
    </div>
  );
}
