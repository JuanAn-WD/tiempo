import { Platform, type TextStyle } from 'react-native';

/**
 * Ritual studio — deep ink, copper ember, soft mint. Not Monk blue.
 *
 * Text colors are chosen so every pair used in the UI is at least WCAG AA
 * 4.5:1. Dynamic type can shrink a headline below the large-text cutoff
 * (24px, or 18.5px bold), so the 3:1 large-text exception is not used.
 * Ratios are measured by `scripts/check-contrast.mjs` (WCAG 2.x relative
 * luminance). `faint` / stone-700 stays decorative: 2.74:1 on the background.
 */
export const Palette = {
  bg: '#0B0A09',
  bgElevated: '#141210',
  surface: '#1B1815',
  surfaceHigh: '#26211C',
  ink: '#F7F1E8',
  muted: '#9C8F7E',
  /** stone-700. Borders and idle marks only — not text (2.74:1 on bg). */
  faint: '#5E564C',
  /**
   * stone-500. Tertiary text (footer, dates, legal, step count).
   * 5.33:1 on bg, 5.03:1 on bgElevated, 4.76:1 on surface.
   * Do not put this on surfaceHigh (4.29:1) or on amber/mint washes.
   */
  faintText: '#8E8375',
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

/**
 * Family names registered by `useFonts` in the root layout.
 * Each weight is its own family (Expo SDK 57). Do not also set `fontWeight`:
 * on Android that drops the custom face and synthesizes a faux bold.
 */
export const FontFamily = {
  display: 'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemibold: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
} as const;

/**
 * Caps for the OS text-size setting. Scaling stays on.
 * Body and controls go to 200%. Display type and chrome (tab labels, kickers,
 * the orb) are tighter so a fixed frame does not clip.
 */
export const FontScale = {
  hero: 1.3,
  display: 1.45,
  chrome: 1.35,
  body: 2,
} as const;

export function maxFontScaleForSize(fontSize: number): number {
  if (fontSize >= 40) return FontScale.hero;
  if (fontSize >= 28) return FontScale.display;
  if (fontSize <= 12) return FontScale.chrome;
  return FontScale.body;
}

const display = FontFamily.display;
const displayMedium = FontFamily.displayMedium;

/** Brand scale from brand-tokens (`scale_px`), plus the faces that use it. */
export const Type = {
  /** Fraunces 600, 44px, tracking −2%. Hero figures (“3,2 años”). */
  displayXl: {
    fontFamily: display,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -0.88,
  },
  /** Fraunces 600, 34px, tracking −1.5%. Screen titles. */
  displayL: {
    fontFamily: display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.51,
  },
  /** Fraunces 500, 24px, tracking −1.5%. Secondary figures. */
  title: {
    fontFamily: displayMedium,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.36,
  },
  /** Inter 400, 17px. Primary reading text. */
  bodyL: {
    fontFamily: FontFamily.ui,
    fontSize: 17,
    lineHeight: 25,
  },
  /** Inter 400, 15px. Secondary reading text. */
  body: {
    fontFamily: FontFamily.ui,
    fontSize: 15,
    lineHeight: 22,
  },
  /** Inter 600, 16px. Buttons and row titles. */
  label: {
    fontFamily: FontFamily.uiSemibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  /** Inter 700, 16px. */
  labelBold: {
    fontFamily: FontFamily.uiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  /** Inter 500, 13px. Footer, legal, dates. */
  caption: {
    fontFamily: FontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  /** Inter 700, 13px. */
  captionBold: {
    fontFamily: FontFamily.uiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  /** Inter 700, 11px, uppercase. The smallest brand size. */
  kicker: {
    fontFamily: FontFamily.uiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  /** Inter 600. Wordmark `apartag`, tracking −2% applied per size. */
  wordmark: {
    fontFamily: FontFamily.uiSemibold,
    color: Palette.ink,
  },
  /** JetBrains Mono 500 with tabular figures. Clocks, countdowns, tag ids. */
  mono: {
    fontFamily: FontFamily.mono,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

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
