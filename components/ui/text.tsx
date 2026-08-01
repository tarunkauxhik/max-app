import { Text as RNText, type TextProps } from 'react-native';

import { Typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant = keyof typeof Typography;

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'danger'
  | 'streak'
  | 'onPrimary';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

/**
 * Token-driven text. Font scaling is deliberately left enabled and uncapped —
 * layouts flex instead of clamping the user's chosen size.
 */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  const colors = useTheme();

  const tones: Record<TextTone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    accent: colors.primary,
    success: colors.success,
    danger: colors.danger,
    streak: colors.streak,
    onPrimary: colors.onPrimary,
  };

  return <RNText style={[Typography[variant], { color: tones[tone] }, style]} {...rest} />;
}
