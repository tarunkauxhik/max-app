import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';

export type StatTileProps = {
  value: string;
  label: string;
};

/**
 * A number over a caption.
 *
 * Grouped into one accessible node so it announces as "Current streak: 12"
 * rather than as two disconnected strings.
 */
export function StatTile({ value, label }: StatTileProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.root}>
      <Text variant="title" importantForAccessibility="no">
        {value}
      </Text>
      <Text variant="caption" tone="muted" importantForAccessibility="no">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: Spacing.xxs,
  },
});
