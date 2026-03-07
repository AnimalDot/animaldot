/**
 * AnimalDot Design Tokens
 * Per brief: blue primary, green secondary, warm neutrals (beige/cream).
 * High-contrast accents (orange/red) reserved for CTAs and urgent alerts only.
 */

export const lightPalette = {
  // Primary – blue (stability, calm, competence)
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',

  // Secondary – green (health, renewal, success)
  secondary: '#059669',
  secondaryLight: '#10B981',
  secondaryMuted: 'rgba(5, 150, 105, 0.15)',

  // Warm neutrals (empathy, nurturing)
  background: '#F8F6F3',
  backgroundAlt: '#F0EDE8',
  card: '#FFFFFF',
  cardMuted: '#FAFAF9',

  // Text
  text: '#1C1917',
  textSecondary: 'rgba(28, 25, 23, 0.72)',
  textMuted: 'rgba(28, 25, 23, 0.5)',

  // UI
  border: '#E7E5E4',
  borderLight: '#F5F5F4',

  // Semantic
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // Metric accents (consistent with brief)
  heartRate: '#DC2626',
  respRate: '#059669',
  temperature: '#D97706',
  weight: '#2563EB',

  // Surfaces for buttons/cards
  surfacePrimary: 'rgba(37, 99, 235, 0.12)',
  textLight: '#1C1917',
} as const;

export const darkPalette = {
  // Off-black / navy backgrounds (reduce glare)
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',

  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryMuted: 'rgba(16, 185, 129, 0.2)',

  background: '#0F172A',
  backgroundAlt: '#1E293B',
  card: '#1E293B',
  cardMuted: '#334155',

  text: '#F1F5F9',
  textSecondary: 'rgba(241, 245, 249, 0.8)',
  textMuted: 'rgba(241, 245, 249, 0.55)',

  border: '#334155',
  borderLight: '#475569',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  heartRate: '#F87171',
  respRate: '#34D399',
  temperature: '#FBBF24',
  weight: '#60A5FA',

  surfacePrimary: 'rgba(59, 130, 246, 0.2)',
  textLight: '#F1F5F9',
} as const;

export type ThemePalette = typeof lightPalette | typeof darkPalette;
