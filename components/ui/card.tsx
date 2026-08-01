import { StyleSheet, View, type ViewProps } from 'react-native';

import { Elevation, Radii, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

/** Raised content surface. The border is decorative; the fill carries the grouping. */
export function Card({ style, children, ...rest }: ViewProps) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.card,
        Elevation.raised,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
