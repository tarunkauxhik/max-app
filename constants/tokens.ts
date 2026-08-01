import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * MAX design tokens.
 *
 * Every colour pair used for text or for a meaningful UI boundary is verified
 * against WCAG 2.1 (4.5:1 for ordinary text, 3:1 for large text and UI
 * boundaries). Re-run the contrast check before changing any colour value.
 */

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Android Material asks for 48dp, iOS HIG for 44pt. We apply the larger on both. */
export const MinTarget = 48;

export const Motion = {
  fast: 120,
  base: 180,
} as const;

/**
 * System font stack only. SDK 54 recommends the expo-font config plugin for
 * custom fonts, which embeds at build time and requires a prebuild — out of
 * scope for M1a, so no custom families are referenced here.
 *
 * Android resolves only `serif` and `monospace` from the template `Fonts` map,
 * so weight carries the hierarchy rather than family.
 */
export const Typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export type ThemeColors = {
  /** Screen background. */
  bg: string;
  /** Raised surface (cards). */
  surface: string;
  /** Decorative hairline / divider. Not a meaningful boundary. */
  border: string;
  /** Control outlines that carry meaning. Verified at >= 3:1. */
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  /** Foreground for text and icons placed on `primary`. */
  onPrimary: string;
  success: string;
  danger: string;
  streak: string;
  /** Unfilled progress track. */
  track: string;
};

export const Palette: Record<'light' | 'dark', ThemeColors> = {
  light: {
    bg: '#FFFFFF',
    surface: '#F4F6F8',
    border: '#DDE1E6',
    borderStrong: '#6B7280',
    textPrimary: '#15181C',
    textSecondary: '#4A515C',
    textMuted: '#5F6773',
    primary: '#1F4FD8',
    onPrimary: '#FFFFFF',
    success: '#16704A',
    danger: '#B3261E',
    streak: '#8A4B08',
    track: '#DDE1E6',
  },
  dark: {
    bg: '#0F1216',
    surface: '#181D23',
    border: '#2C333C',
    borderStrong: '#8A94A2',
    textPrimary: '#ECEFF2',
    textSecondary: '#AEB6C2',
    textMuted: '#98A1AD',
    primary: '#9DB4FF',
    onPrimary: '#0F1216',
    success: '#5FD39B',
    danger: '#FF9A93',
    streak: '#F0A94C',
    track: '#2C333C',
  },
};

/**
 * Shadows are effectively invisible on dark backgrounds, so dark mode relies on
 * its lighter `surface` value to separate layers rather than on elevation.
 */
const raised: ViewStyle = Platform.select({
  android: { elevation: 2 },
  default: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

export const Elevation: Record<'flat' | 'raised', ViewStyle> = {
  flat: {},
  raised,
};
