import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

export type ScreenProps = ViewProps & {
  /**
   * Which safe-area edges to pad. The default suits a tab screen with no
   * header: the tab bar already reserves the bottom.
   *
   * A screen inside a stack that shows a header should drop `top`, since the
   * header consumes that inset itself, and add `bottom`, since there is no tab
   * bar below it.
   */
  edges?: ScreenEdge[];
};

/** Screen container for edge-to-edge Android (`edgeToEdgeEnabled: true`). */
export function Screen({
  style,
  children,
  edges = ['top', 'left', 'right'],
  ...rest
}: ScreenProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingLeft: edges.includes('left') ? insets.left : 0,
          paddingRight: edges.includes('right') ? insets.right : 0,
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
