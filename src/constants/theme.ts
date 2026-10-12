import '@/global.css';

import { Platform } from 'react-native';

/** Ritual studio — deep ink, copper ember, soft mint. Not Monk blue. */
export const Palette = {
  bg: '#0B0A09',
  bgElevated: '#141210',
  surface: '#1B1815',
  surfaceHigh: '#26211C',
  ink: '#F7F1E8',
  muted: '#9C8F7E',
  faint: '#5E564C',
  line: 'rgba(247,241,232,0.08)',
  lineStrong: 'rgba(247,241,232,0.16)',
  accent: '#D4923A',
  accentBright: '#F0B15A',
  accentSoft: 'rgba(212,146,58,0.14)',
  accentText: '#1A1206',
  focus: '#6EE7B0',
  focusSoft: 'rgba(110,231,176,0.12)',
  danger: '#E07060',
  dangerSoft: 'rgba(224,112,96,0.14)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.bg,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.surfaceHigh,
    textSecondary: Palette.muted,
  },
  dark: {
    text: Palette.ink,
    background: Palette.bg,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.surfaceHigh,
    textSecondary: Palette.muted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  full: 999,
} as const;

/** Floating custom tab bar (~64) + safe-area cushion used by Screen padding. */
export const BottomTabInset = Platform.select({ ios: 88, android: 96, default: 96 }) ?? 96;
export const MaxContentWidth = 800;
