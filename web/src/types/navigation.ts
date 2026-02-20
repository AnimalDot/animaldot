export type Screen =
  | 'welcome' | 'signIn' | 'createAccount' | 'setupProfile' | 'forgotPassword'
  | 'deviceScan' | 'live' | 'trends' | 'device' | 'settings'
  | 'petProfile' | 'weightCalibStart' | 'weightCalibComplete'
  | 'tempCalibStart' | 'tempCalibComplete' | 'bedLocation' | 'units'
  | 'dataExport' | 'bluetoothSettings' | 'appInformation'
  | 'remoteAccess' | 'connectedDevices' | 'account' | 'editProfile' | 'changePassword';

export type TabScreen = 'live' | 'trends' | 'device' | 'settings';
