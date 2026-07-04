import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C', background: '#fff', tint: '#0a7ea4',
    icon: '#687076', tabIconDefault: '#687076', tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE', background: '#151718', tint: '#fff',
    icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export interface Theme {
  background: string; surface: string; surfaceLow: string; surfaceHigh: string;
  surfaceContainer: string; surfaceBright: string;
  primary: string; secondary: string; tertiary: string;
  onSurface: string; onSurfaceVariant: string; error: string;
  primaryContainer: string; secondaryContainer: string; tertiaryContainer: string;
  outline: string; outlineVariant: string;
  glassBg: string; glassBorder: string;
  headerBg: string; borderColor: string; inputBg: string; inputBorder: string;
  chipBg: string; chipBorder: string;
  tabBarBg: string; tabBarBorder: string;
}

export const LifeSyncDark: Theme = {
  background: '#051424',
  surface: '#122131',
  surfaceLow: '#0d1c2d',
  surfaceHigh: '#1c2b3c',
  surfaceContainer: '#122131',
  surfaceBright: '#2c3a4c',
  primary: '#adc6ff',
  secondary: '#4edea3',
  tertiary: '#d0bcff',
  onSurface: '#d4e4fa',
  onSurfaceVariant: '#a2a8b8',
  error: '#ffb4ab',
  primaryContainer: '#4d8eff',
  secondaryContainer: '#00a572',
  tertiaryContainer: '#a078ff',
  outline: '#8c909f',
  outlineVariant: '#424754',
  glassBg: 'rgba(255, 255, 255, 0.07)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  headerBg: 'rgba(5, 20, 36, 0.85)',
  borderColor: 'rgba(255, 255, 255, 0.06)',
  inputBg: 'rgba(0, 0, 0, 0.25)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  chipBg: 'rgba(255, 255, 255, 0.06)',
  chipBorder: 'rgba(255, 255, 255, 0.1)',
  tabBarBg: 'rgba(5, 20, 36, 0.85)',
  tabBarBorder: 'rgba(255, 255, 255, 0.1)',
};

export const LifeSyncLight: Theme = {
  background: '#f0f4fa',
  surface: '#ffffff',
  surfaceLow: '#f8fafc',
  surfaceHigh: '#ffffff',
  surfaceContainer: '#ffffff',
  surfaceBright: '#ffffff',
  primary: '#3b71ca',
  secondary: '#10b981',
  tertiary: '#7c3aed',
  onSurface: '#1a2233',
  onSurfaceVariant: '#5a6070',
  error: '#dc2626',
  primaryContainer: '#dbeafe',
  secondaryContainer: '#d1fae5',
  tertiaryContainer: '#ede9fe',
  outline: '#9ca3af',
  outlineVariant: '#d1d5db',
  glassBg: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  headerBg: 'rgba(240, 244, 250, 0.9)',
  borderColor: 'rgba(0, 0, 0, 0.06)',
  inputBg: 'rgba(0, 0, 0, 0.04)',
  inputBorder: 'rgba(0, 0, 0, 0.15)',
  chipBg: 'rgba(0, 0, 0, 0.04)',
  chipBorder: 'rgba(0, 0, 0, 0.1)',
  tabBarBg: 'rgba(240, 244, 250, 0.9)',
  tabBarBorder: 'rgba(0, 0, 0, 0.1)',
};

export function getTheme(dark: boolean): Theme {
  return dark ? LifeSyncDark : LifeSyncLight;
}
