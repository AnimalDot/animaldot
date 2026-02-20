// App.tsx
// Main application entry point with navigation configuration

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useAuthStore,
  useDeviceStore,
  useSettingsStore,
  usePetStore,
  loadPetsForUser,
  loadSettingsForUser,
  savePetsForUser,
  saveSettingsForUser,
} from './src/services/store';
import { BLEService } from './src/services/BLEService';
import { Colors } from './src/components/UI';

// Import screens
import { SplashScreen, AuthScreen, CreateAccountScreen } from './src/screens/AuthScreens';
import { DevicePairingScreen, PetProfileScreen } from './src/screens/SetupScreens';
import { LiveDashboardScreen } from './src/screens/LiveDashboardScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import { DeviceStatusScreen } from './src/screens/DeviceStatusScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

// Type definitions
import { RootStackParamList, MainTabParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon component
interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const icons: Record<string, string> = {
    Live: '💓',
    Trends: '📊',
    Device: '📡',
    Settings: '⚙️',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
};

// Main tab navigator
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.text,
      })}
    >
      <Tab.Screen
        name="Live"
        component={LiveDashboardScreen}
        options={{
          title: 'Live Dashboard',
          tabBarLabel: 'Live',
        }}
      />
      <Tab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{
          title: 'Health Trends',
          tabBarLabel: 'Trends',
        }}
      />
      <Tab.Screen
        name="Device"
        component={DeviceStatusScreen}
        options={{
          title: 'Device Status',
          tabBarLabel: 'Device',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Loading screen while checking auth state
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <View style={styles.loadingContent}>
      <Text style={styles.loadingLogo}>🐾</Text>
      <Text style={styles.loadingTitle}>AnimalDot</Text>
      <Text style={styles.loadingSubtitle}>Smart Animal Bed Monitoring</Text>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loadingSpinner} />
    </View>
  </View>
);

// Main App Component
const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  const { isAuthenticated, checkAuth } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const { settings } = useSettingsStore();
  const pets = usePetStore((s) => s.pets);
  const activePetId = usePetStore((s) => s.activePetId);
  const autoConnect = settings.bluetoothAutoConnect;
  const lastConnectedDeviceId = settings.lastConnectedDeviceId;
  const loadedForUserIdRef = useRef<string | null>(null);

  // Load this user's pets and settings when they log in or app rehydrates with a user
  useEffect(() => {
    if (!user) {
      loadedForUserIdRef.current = null;
      usePetStore.getState().clearUserData();
      useSettingsStore.getState().clearUserData();
      return;
    }
    let cancelled = false;
    loadedForUserIdRef.current = null;
    Promise.all([
      loadPetsForUser(user.id),
      loadSettingsForUser(user.id),
    ]).then(([{ pets: p, activePetId: a }, s]) => {
      if (cancelled) return;
      usePetStore.getState().replaceStateForUser(p, a);
      useSettingsStore.getState().replaceStateForUser(s);
      loadedForUserIdRef.current = user.id;
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persist pets when they change (only after we've loaded for this user)
  useEffect(() => {
    if (!user || loadedForUserIdRef.current !== user.id) return;
    savePetsForUser(user.id, pets, activePetId);
  }, [user?.id, pets, activePetId]);

  // Persist settings when they change (only after we've loaded for this user)
  useEffect(() => {
    if (!user || loadedForUserIdRef.current !== user.id) return;
    saveSettingsForUser(user.id, settings);
  }, [user?.id, settings]);

  // Request Bluetooth permissions (Android)
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
        
        return allGranted;
      } catch (error) {
        console.error('Permission request error:', error);
        return false;
      }
    }
    // iOS handles permissions differently
    return true;
  };

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check authentication state
        await checkAuth();
        
        // Request permissions
        await requestBluetoothPermissions();
        
        // Initialize BLE service and wire connection state to store
        const ble = BLEService.getInstance();
        ble.setOnConnectionChange((device) => {
          const { setConnectedDevice, setConnectionState } = useDeviceStore.getState();
          if (device) {
            setConnectedDevice(device.id);
            setConnectionState('connected');
          } else {
            setConnectedDevice(null);
            setConnectionState('disconnected');
          }
        });

        // Auto-connect to last device if enabled
        if (autoConnect && lastConnectedDeviceId && isAuthenticated) {
          try {
            await BLEService.getInstance().connect(lastConnectedDeviceId);
          } catch (error) {
            console.log('Auto-connect failed:', error);
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        // Add a small delay for splash screen effect
        setTimeout(() => setIsLoading(false), 1500);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      BLEService.getInstance().disconnect().catch(() => {});
      useDeviceStore.getState().setConnectedDevice(null);
      useDeviceStore.getState().setConnectionState('disconnected');
    };
  }, []);

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
      />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: Colors.text,
          headerBackTitleVisible: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Stack */}
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountScreen}
          options={{
            title: 'Create Account',
            headerShown: true,
          }}
        />

        {/* Setup Stack */}
        <Stack.Screen
          name="DevicePairing"
          component={DevicePairingScreen}
          options={{
            title: 'Connect to AnimalDot Bed',
            headerShown: true,
            headerLeft: () => null, // Prevent going back
          }}
        />
        <Stack.Screen
          name="PetProfile"
          component={PetProfileScreen}
          options={{
            title: 'Pet Profile',
            headerShown: true,
          }}
        />

        {/* Main App Stack */}
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  // Loading screen styles
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 32,
  },
  loadingSpinner: {
    marginTop: 16,
  },

  // Navigation styles
  header: {
    backgroundColor: Colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  tabBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    height: Platform.OS === 'ios' ? 88 : 64,
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
  },
});

export default App;
