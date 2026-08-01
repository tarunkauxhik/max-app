import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Text } from '@/components/ui/text';
import { MinTarget, Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type MultiOption<T> = {
  value: T;
  label: string;
  note?: string;
};

export type MultiOptionGroupProps<T> = {
  label: string;
  options: MultiOption<T>[];
  values: T[];
  onToggle: (value: T) => void;
  /** Maximum selectable. Unselected options disable once reached. */
  max?: number;
  hint?: string;
  error?: string | null;
  layout?: 'wrap' | 'stack';
};

/**
 * Multi-select group.
 *
 * Sibling to `OptionGroup` rather than a mode of it: this reports `checkbox`
 * semantics, where `OptionGroup` reports `radio`. Conflating the two would tell
 * a screen-reader user that picking one choice clears the others.
 *
 * Selection is signalled by fill *and* a checkmark glyph, never by colour alone.
 */
export function MultiOptionGroup<T extends string | number>({
  label,
  options,
  values,
  onToggle,
  max,
  hint,
  error,
  layout = 'wrap',
}: MultiOptionGroupProps<T>) {
  const colors = useTheme();

  useEffect(() => {
    if (error && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(error);
    }
  }, [error]);

  const atCap = max !== undefined && values.length >= max;

  return (
    <View style={styles.root}>
      <Text variant="bodyStrong">{label}</Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}

      <View style={layout === 'wrap' ? styles.wrap : styles.stack}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          const disabled = atCap && !selected;

          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled }}
              accessibilityLabel={option.label}
              // A disabled option must say why, or it reads as a broken control.
              accessibilityHint={
                disabled && max !== undefined
                  ? `Limit of ${max} reached. Deselect another option to choose this one.`
                  : option.note
              }
              disabled={disabled}
              onPress={() => onToggle(option.value)}
              style={({ pressed }) => [
                styles.option,
                layout === 'stack' ? styles.optionStacked : null,
                {
                  backgroundColor: selected ? colors.primary : 'transparent',
                  borderColor: selected ? colors.primary : colors.borderStrong,
                },
                pressed && !disabled ? styles.pressed : null,
                disabled ? styles.disabled : null,
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
  // WCAG 1.4.3 exempts inactive controls from the contrast minimum.
  disabled: {
    opacity: 0.4,
  },
});
