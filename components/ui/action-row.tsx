import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MinTarget, Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type ActionRowProps = {
  title: string;
  note?: string;
  completed: boolean;
  onToggle: () => void;
};

/**
 * A single daily action.
 *
 * Completion is signalled three ways so colour is never the only cue: the box
 * fills *and* gains a checkmark glyph, the label gains a strikethrough, and the
 * accessibility state reports `checked`.
 */
export function ActionRow({ title, note, completed, onToggle }: ActionRowProps) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={title}
      accessibilityHint={note}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
      <View
        style={[
          styles.box,
          completed
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { borderColor: colors.borderStrong },
        ]}>
        {completed ? <IconSymbol name="checkmark" size={16} color={colors.onPrimary} /> : null}
      </View>
      <View style={styles.copy}>
        <Text variant="bodyStrong" style={completed ? styles.completedLabel : undefined}>
          {title}
        </Text>
        {note ? (
          <Text variant="caption" tone="muted">
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MinTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  completedLabel: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.7,
  },
});
