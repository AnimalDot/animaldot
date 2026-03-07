/**
 * AnimalDot Mobile App - Shared UI Components
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

// ============================================
// Color Theme
// ============================================

// Aligned with AnimalDot website (primary #3A7BFF, same semantic palette)
export const Colors = {
  primary: '#3A7BFF',
  primaryLight: '#5B92FF',
  primaryDark: '#2563EB',
  secondary: '#D6E4FF',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1F1F1F',
  textLight: '#1F1F1F',
  textSecondary: 'rgba(31, 31, 31, 0.7)',
  textMuted: 'rgba(31, 31, 31, 0.5)',
  border: '#E5E7EB',
  success: '#3CCB7F',
  warning: '#FFD568',
  error: '#FF6E6E',
  heartRate: '#FF6E6E',
  respRate: '#3CCB7F',
  temperature: '#FFD568',
  weight: '#3A7BFF',
};

// ============================================
// Button Component
// ============================================

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// Card Component
// ============================================

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const content = <View style={[styles.card, style]}>{children}</View>;
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  
  return content;
};

// ============================================
// Input Component
// ============================================

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  numberOfLines,
  error,
  style,
}) => {
  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
};

// ============================================
// Metric Card Component
// ============================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  color = Colors.primary,
  style,
}) => {
  return (
    <Card style={[styles.metricCard, style]}>
      <View style={styles.metricHeader}>
        {icon && <View style={styles.metricIcon}>{icon}</View>}
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <View style={styles.metricValue}>
        <Text style={[styles.metricNumber, { color }]}>{value}</Text>
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </Card>
  );
};

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'stable' | 'alert';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const statusColors = {
    connected: Colors.success,
    disconnected: Colors.textMuted,
    stable: Colors.success,
    alert: Colors.warning,
  };

  const statusLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    stable: 'Stable',
    alert: 'Alert',
  };

  return (
    <View style={[styles.badge, { backgroundColor: statusColors[status] + '20' }]}>
      <View style={[styles.badgeDot, { backgroundColor: statusColors[status] }]} />
      <Text style={[styles.badgeText, { color: statusColors[status] }]}>
        {label || statusLabels[status]}
      </Text>
    </View>
  );
};

// ============================================
// Loading Overlay
// ============================================

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {message && <Text style={styles.loadingText}>{message}</Text>}
      </View>
    </View>
  );
};

// ============================================
// Section Header
// ============================================

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// List Item Component
// ============================================

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightElement,
  onPress,
  showChevron = true,
}) => {
  const content = (
    <View style={styles.listItem}>
      {leftIcon && <View style={styles.listItemIcon}>{leftIcon}</View>}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showChevron && onPress && (
        <Text style={styles.listItemChevron}>›</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Button styles
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: {
    backgroundColor: Colors.primary,
  },
  button_secondary: {
    backgroundColor: Colors.secondary,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  button_text: {
    backgroundColor: 'transparent',
  },
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: '600',
  },
  buttonText_primary: {
    color: '#FFFFFF',
  },
  buttonText_secondary: {
    color: '#FFFFFF',
  },
  buttonText_outline: {
    color: Colors.primary,
  },
  buttonText_text: {
    color: Colors.primary,
  },
  buttonText_small: {
    fontSize: 14,
  },
  buttonText_medium: {
    fontSize: 16,
  },
  buttonText_large: {
    fontSize: 18,
  },

  // Card styles
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Input styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputErrorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },

  // Metric Card styles
  metricCard: {
    flex: 1,
    minWidth: 140,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Status Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Loading Overlay styles
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },

  // Section Header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionAction: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // List Item styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemIcon: {
    marginRight: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  listItemChevron: {
    fontSize: 24,
    color: Colors.textMuted,
    marginLeft: 8,
  },
});
