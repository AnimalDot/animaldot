/**
 * Resolves effective color scheme: user preference or system.
 * Per brief: dark mode is non-negotiable; use off-black/off-white in dark.
 */

import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '../services/store';
import { lightPalette, darkPalette, type ThemePalette } from './tokens';

export function useResolvedColorScheme(): 'light' | 'dark' {
  const system = useRNColorScheme();
  const preference = useSettingsStore((s) => s.settings.colorScheme) ?? 'system';
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}

export function useTheme(): ThemePalette {
  const resolved = useResolvedColorScheme();
  return resolved === 'dark' ? darkPalette : lightPalette;
}
