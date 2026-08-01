import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Text } from '@/components/ui/text';
import { MinTarget, Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type Option<T> = {
  value: T;
  label: string;
  note?: string;
};

export type OptionGroupProps<T> = {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  /** `wrap` for short chips, `stack` for full-width options carrying a note. */
  layout?: 'wrap' | 'stack';
};

/**
 * Single-select group.
 *
 * Selection is signalled by fill *and* a checkmark glyph, never by colour
 * alone, and every option is at least 48dp tall.
 */
export function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  layout = 'wrap',
}: OptionGroupProps<T>) {
  const colors = useTheme();

  useEffect(() => {
    if (error && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(error);
    }
  }, [error]);

  return (
    <View style={styles.root}>
      <Text variant="bodyStrong">{label}</Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={layout === 'wrap' ? styles.wrap : styles.stack}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={option.note ? `${option.label}. ${option.note}` : option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                layout === 'stack' ? styles.optionStacked : null,
                {
                  backgroundColor: selected ? colors.primary : 'transparent',
                  borderColor: selected ? colors.primary : colors.borderStrong,
                },
                pressed ? styles.pressed : null,
              ]}>
              <View style={styles.optionHeader}>
                <Text variant="bodyStrong" tone={selected ? 'onPrimary' : 'primary'}>
                  {option.label}
                </Text>
                {selected ? (
                  <IconSymbol name="checkmark" size={16} color={colors.onPrimary} />
                ) : null}
              </View>
              {option.note ? (
                <Text variant="caption" tone={selected ? 'onPrimary' : 'muted'}>
                  {option.note}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

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
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stack: {
    gap: Spacing.sm,
  },
  option: {
    minHeight: MinTarget,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  optionStacked: {
    alignItems: 'flex-start',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
