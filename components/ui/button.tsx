import { Pressable, StyleSheet } from 'react-native';

import { Text, type TextTone } from '@/components/ui/text';
import { MinTarget, Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const colors = useTheme();

  const surfaces: Record<ButtonVariant, { backgroundColor: string; borderColor: string }> = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  };

  const tone: TextTone = variant === 'primary' ? 'onPrimary' : 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        surfaces[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}>
      <Text variant="bodyStrong" tone={tone} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MinTarget,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  // WCAG 1.4.3 exempts inactive controls from the contrast minimum.
  disabled: {
    opacity: 0.5,
  },
});
