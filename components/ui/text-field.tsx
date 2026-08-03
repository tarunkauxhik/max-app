import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { MinTarget, Radii, Spacing, Typography } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Inline error, or null when valid. */
  error?: string | null;
  hint?: string;
};

export function TextField({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: TextFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);

  // Android announces via accessibilityLiveRegion below; iOS has no equivalent,
  // so the error is announced explicitly there.
  useEffect(() => {
    if (error && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(error);
    }
  }, [error]);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={styles.root}>
      <Text variant="bodyStrong">{label}</Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}

      {/*
        `multiline` is handled here rather than left to callers. `style` is
        omitted from this component's props on purpose, so a caller passing
        `multiline` alone would get a single-line-height box with its text
        vertically centred on Android — the primitive owns that, not the screen.
      */}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          Typography.body,
          multiline ? styles.multiline : null,
          { color: colors.textPrimary, backgroundColor: colors.bg, borderColor },
        ]}
        {...rest}
      />

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.sm,
  },
  input: {
    minHeight: MinTarget,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  multiline: {
    // Roughly four lines, so the field looks like somewhere to write a sentence
    // rather than a name. It still grows with the content.
    minHeight: MinTarget * 2.5,
    // Android centres multiline text vertically by default, which leaves the
    // caret floating in the middle of an empty box. iOS already top-aligns.
    textAlignVertical: 'top',
  },
});
