import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  value: number;
  max: number;
  /** Human-readable progress, e.g. "2 of 4 actions complete". Shown and announced. */
  label: string;
};

/**
 * Progress is conveyed by the bar, by the visible label, and by the
 * accessibility value — never by colour alone.
 *
 * The fill uses flex rather than a percentage width so no dimension cast is
 * needed and a zero value collapses cleanly.
 */
export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const colors = useTheme();

  const safeMax = Math.max(max, 1);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const filled = Math.round((clamped / safeMax) * 100);

  return (
    <View style={styles.wrapper}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: safeMax, now: clamped }}
        style={[styles.track, { backgroundColor: colors.track }]}>
        <View style={{ flex: filled, backgroundColor: colors.primary }} />
        <View style={{ flex: 100 - filled }} />
      </View>
      {/* Visual duplicate of the announced label; hidden from screen readers. */}
      <Text
        variant="caption"
        tone="secondary"
        accessibilityElementsHidden
        importantForAccessibility="no">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    overflow: 'hidden',
  },
});
