import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';

export type SummaryRowProps = {
  label: string;
  /** Already formatted, including whatever "not chosen" reads as. */
  value: string;
  /** The step this value came from. `dismissTo` returns rather than pushing a duplicate. */
  editHref: Href;
};

/**
 * One reviewed value with a way back to the step that set it.
 *
 * Shared by both review screens so the goal and onboarding flows cannot drift
 * apart. The Edit button carries an explicit accessibility label because a
 * review screen has several of them and "Edit" alone announces identically.
 */
export function SummaryRow({ label, value, editHref }: SummaryRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
      <Button
        label="Edit"
        variant="ghost"
        accessibilityLabel={`Edit ${label.toLowerCase()}`}
        onPress={() => router.dismissTo(editHref)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  copy: {
    flex: 1,
    gap: Spacing.xxs,
  },
});
