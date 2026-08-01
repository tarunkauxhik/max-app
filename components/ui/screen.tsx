import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/**
 * Screen container for edge-to-edge Android (`edgeToEdgeEnabled: true`).
 *
 * Applies the top and horizontal insets. The bottom inset is intentionally left
 * alone: inside the tab navigator the tab bar already reserves that space, and
 * padding it twice leaves a visible gap.
 */
export function Screen({ style, children, ...rest }: ViewProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
