import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Text } from '@/components/ui/text';
import { MinTarget, Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export type SettingsRowProps = {
  label: string;
  value?: string;
  /** Short state note for a row that is not usable yet, e.g. "Coming later". */
  status?: string;
  /** Omit to render a non-interactive row. */
  onPress?: () => void;
  /** Renders in the danger tone. Always pair with a hint stating the consequence. */
  destructive?: boolean;
  accessibilityHint?: string;
};

/**
 * A settings row that is interactive only when it has somewhere to go.
 *
 * With `onPress` it renders as a Pressable with the `button` role and a
 * chevron. Without it the row is a plain View with the `text` role and no
 * chevron: announcing "button" for something that cannot be pressed is a false
 * promise to a screen-reader user, and a chevron makes the same promise
 * visually.
 *
 * Either way the row is a single accessible node, so the chevron is never
 * announced. Danger styling is never the only signal that a row is
 * destructive; the hint carries the consequence in words.
 */
export function SettingsRow({
  label,
  value,
  status,
  onPress,
  destructive = false,
  accessibilityHint,
}: SettingsRowProps) {
  const colors = useTheme();

  const detail = value ?? status;
  const accessibilityLabel = detail ? `${label}, ${detail}` : label;

  const content = (
    <>
      <Text variant="body" tone={destructive ? 'danger' : 'primary'} style={styles.label}>
        {label}
      </Text>

      {value ? (
        <Text variant="body" tone="muted">
          {value}
        </Text>
      ) : null}

      {status && !value ? (
        <Text variant="caption" tone="muted">
          {status}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
      {content}

      <View style={styles.chevron}>
        <IconSymbol
          name="chevron.right"
          size={18}
          color={destructive ? colors.danger : colors.textMuted}
        />
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
  label: {
    flex: 1,
  },
  chevron: {
    // Fixed box so rows align regardless of whether a value is present.
    width: 18,
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});
