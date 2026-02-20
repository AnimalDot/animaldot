/**
 * AnimalDot Mobile App - Authentication Screens
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Colors, LoadingOverlay } from '../components/UI';
import { useAuthStore, usePetStore, useDeviceStore, getAccountByEmail, registerAccount } from '../services/store';
import { RootStackParamList, User } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============================================
// Splash Screen
// ============================================

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useAuthStore();
  const { getActivePet } = usePetStore();
  const { connectedDeviceId } = useDeviceStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (!isAuthenticated) {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        return;
      }
      if (!connectedDeviceId) {
        navigation.reset({ index: 0, routes: [{ name: 'DevicePairing' }] });
        return;
      }
      if (!getActivePet()) {
        navigation.reset({ index: 0, routes: [{ name: 'PetProfile' }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, connectedDeviceId, getActivePet, navigation]);

  return (
    <SafeAreaView style={styles.splashContainer}>
      <View style={styles.splashContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <View style={styles.logoInner} />
          </View>
        </View>
        <Text style={styles.appName}>AnimalDot</Text>
        <Text style={styles.tagline}>Smart Animal Bed Monitoring</Text>
        {loading && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ============================================
// Auth Screen (Login)
// ============================================

export const AuthScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    const user = await getAccountByEmail(email);
    if (!user) {
      setError('No account found with this email. Please create an account.');
      setLoading(false);
      return;
    }

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 500));
    login(user);
    setLoading(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'DevicePairing' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.submitButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Create Account"
              onPress={() => navigation.navigate('CreateAccount')}
              variant="outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={loading} message="Signing in..." />
    </SafeAreaView>
  );
};

// ============================================
// Create Account Screen
// ============================================

export const CreateAccountScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validate()) return;

    setLoading(true);

    const user: User = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date(),
    };
    await registerAccount(user);
    await new Promise((r) => setTimeout(r, 500));
    login(user);
    setLoading(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'DevicePairing' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Create Account</Text>
            </TouchableOpacity>
          )}

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              error={errors.name}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              error={errors.email}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.confirmPassword}
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                style={styles.checkboxTouchable}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                I agree to the{' '}
                <TouchableOpacity onPress={() => setShowTermsModal(true)} activeOpacity={0.7}>
                  <Text style={styles.link}>Terms and Privacy Policy</Text>
                </TouchableOpacity>
              </Text>
            </View>
            <Modal
              visible={showTermsModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowTermsModal(false)}
            >
              <Pressable
                style={styles.termsModalOverlay}
                onPress={() => setShowTermsModal(false)}
              >
                <Pressable style={styles.termsModalContent} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.termsModalHeader}>
                    <Text style={styles.termsModalTitle}>Terms & Privacy Policy</Text>
                    <TouchableOpacity
                      onPress={() => setShowTermsModal(false)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.termsModalClose}>Close</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.termsModalScroll}
                    contentContainerStyle={styles.termsModalScrollContent}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                  >
                    <Text style={[styles.termsSectionTitle, styles.termsSectionTitleFirst]}>Terms of Service</Text>
                    <Text style={styles.termsBody}>
                      By using AnimalDot you agree to use the app and smart bed system for personal pet health monitoring only. Do not use this device or data as a substitute for professional veterinary care. You are responsible for the accuracy of information you provide and for keeping your account secure.
                    </Text>
                    <Text style={styles.termsBody}>
                      AnimalDot may update these terms from time to time. Continued use of the app after changes constitutes acceptance.
                    </Text>
                    <Text style={styles.termsSectionTitle}>Privacy Policy</Text>
                    <Text style={styles.termsBody}>
                      AnimalDot collects pet health data (heart rate, respiration, temperature, weight) from the smart bed sensor. This data is stored locally on your device unless you choose to export or share it.
                    </Text>
                    <Text style={styles.termsBody}>
                      We do not sell your data. Data may be used to improve our services and may be shared with your veterinarian or other parties only with your explicit consent. We use industry-standard practices to protect your information.
                    </Text>
                    <Text style={styles.termsBody}>
                      For questions about privacy or terms, contact support@animaldot.com.
                    </Text>
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
            {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

            <Button
              title="Create Account"
              onPress={handleCreateAccount}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={loading} message="Creating account..." />
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  
  // Splash styles
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 48,
  },
  splashActions: {
    width: '100%',
  },
  getStartedButton: {
    backgroundColor: '#FFFFFF',
  },
  loadingIndicator: {
    marginTop: 24,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Auth styles
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 32,
  },
  form: {
    flex: 1,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    color: Colors.textMuted,
  },
  
  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxTouchable: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  // Terms & Privacy modal
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  termsModalContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    maxHeight: '85%',
    width: '100%',
    overflow: 'hidden',
  },
  termsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  termsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  termsModalClose: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  termsModalScroll: {
    flex: 1,
    maxHeight: 400,
  },
  termsModalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  termsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  termsSectionTitleFirst: {
    marginTop: 0,
  },
  termsBody: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
    marginBottom: 12,
  },
});
