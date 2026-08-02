import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type WeekDay = {
  key: string;
  label: string;
  completed: number;
  total: number;
};

export type WeekBarsProps = {
  days: WeekDay[];
  /** Human-readable summary, e.g. "3 of 7 days complete". Shown and announced. */
  summary: string;
};

const BAR_HEIGHT = 72;

/**
 * Seven day bars built from plain views — no chart library, no animation.
 *
 * The whole group is a single accessible node carrying `summary`. Seven sibling
 * views would otherwise be seven focus stops with nothing meaningful to
 * announce.
 *
 * A fully completed day uses `primary`; a partial day uses `borderStrong`, so
 * the difference is carried by height *and* fill rather than by height alone.
 */
export function WeekBars({ days, summary }: WeekBarsProps) {
  const colors = useTheme();

  return (
    <View accessible accessibilityLabel={`This week. ${summary}`} style={styles.root}>
      <View
        style={styles.row}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        {days.map((day) => {
          const filled = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
          const isComplete = day.total > 0 && day.completed === day.total;

          return (
            <View key={day.key} style={styles.column}>
              <View style={[styles.track, { backgroundColor: colors.track }]}>
                <View style={{ flex: 100 - filled }} />
                <View
                  style={{
                    flex: filled,
                    backgroundColor: isComplete ? colors.primary : colors.borderStrong,
                    borderRadius: Radii.sm,
                  }}
                />
              </View>
              <Text variant="micro" tone="muted">
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text variant="caption" tone="secondary">
        {summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  track: {
    height: BAR_HEIGHT,
    alignSelf: 'stretch',
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
});
