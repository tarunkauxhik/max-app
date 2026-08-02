import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  title: string;
  body: string;
};

/**
 * The icon is a neutral empty tray, not a checkmark: a tick means "done", which
 * is the opposite of what an empty state is reporting.
 */
export function EmptyState({ title, body }: EmptyStateProps) {
  const colors = useTheme();

  return (
    <View style={styles.root}>
      <IconSymbol name="tray" size={40} color={colors.textMuted} />
      <Text variant="heading">{title}</Text>
      <Text variant="body" tone="secondary" style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  body: {
    textAlign: 'center',
  },
});
