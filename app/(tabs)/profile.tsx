import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SettingsRow } from '@/components/ui/settings-row';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { Radii, Spacing } from '@/constants/tokens';
import { profileMock } from '@/features/profile/mock-data';
import { useTheme } from '@/hooks/use-theme';

type PlaceholderRow = {
  id: string;
  label: string;
  value?: string;
  status?: string;
};

const PREFERENCES: PlaceholderRow[] = [
  { id: 'notifications', label: 'Notifications', value: 'On' },
  { id: 'appearance', label: 'Appearance', value: 'System' },
  { id: 'reminder', label: 'Daily reminder', value: '20:00' },
];

const SUPPORT: PlaceholderRow[] = [
  { id: 'help', label: 'Help centre', status: 'Coming later' },
  { id: 'feedback', label: 'Send feedback', status: 'Coming later' },
  { id: 'rate', label: 'Rate MAX', status: 'Coming later' },
];

const PRIVACY: PlaceholderRow[] = [
  { id: 'privacy', label: 'Privacy policy', status: 'Coming later' },
  { id: 'terms', label: 'Terms of use', status: 'Coming later' },
  { id: 'data', label: 'Your data', status: 'Coming later' },
];

const PLACEHOLDER_HINT = 'Not available in this preview.';

function RowGroup({ rows }: { rows: PlaceholderRow[] }) {
  const colors = useTheme();

  return (
    <Card style={styles.list}>
      {rows.map((row, index) => (
        <View key={row.id}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <SettingsRow
            label={row.label}
            value={row.value}
            status={row.status}
            accessibilityHint={PLACEHOLDER_HINT}
          />
        </View>
      ))}
    </Card>
  );
}

export default function ProfileScreen() {
  const colors = useTheme();
  const { name, initials, bio, achievements } = profileMock;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            Profile
          </Text>
        </View>

        <Card>
          <View style={styles.identity}>
            <View
              style={[styles.avatar, { backgroundColor: colors.primary }]}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden>
              <Text variant="heading" tone="onPrimary">
                {initials}
              </Text>
            </View>
            <View style={styles.identityCopy}>
              <Text variant="heading">{name}</Text>
              <Text variant="caption" tone="secondary">
                {bio}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text variant="heading">Achievements</Text>
          <View style={styles.tiles}>
            {achievements.map((achievement) => (
              <StatTile
                key={achievement.id}
                value={achievement.value}
                label={achievement.label}
              />
            ))}
          </View>
        </Card>

        <View style={styles.section}>
          <Text variant="heading">Preferences</Text>
          <Text variant="caption" tone="muted">
            Settings are placeholders in this preview and do not change anything yet.
          </Text>
          <RowGroup rows={PREFERENCES} />
        </View>

        <View style={styles.section}>
          <Text variant="heading">Support</Text>
          <RowGroup rows={SUPPORT} />
        </View>

        <View style={styles.section}>
          <Text variant="heading">Privacy</Text>
          <RowGroup rows={PRIVACY} />
        </View>

        <View style={styles.section}>
          <Text variant="heading">Account</Text>
          <Card style={styles.list}>
            <SettingsRow
              label="Sign out"
              status="Coming later"
              accessibilityHint={PLACEHOLDER_HINT}
            />
          </Card>
        </View>

        {/*
          Destructive actions are separated four ways, never by colour alone:
          their own section, their own heading, an explicit warning line, and a
          hint stating the consequence.
        */}
        <View style={styles.section}>
          <Text variant="heading" tone="danger">
            Danger zone
          </Text>
          <Text variant="caption" tone="secondary">
            These actions cannot be undone.
          </Text>
          <Card style={[styles.list, { borderColor: colors.danger }]}>
            <SettingsRow
              label="Delete account"
              status="Coming later"
              destructive
              accessibilityHint="Permanently deletes your account and all data. Not available in this preview."
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
  },
  section: {
    gap: Spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  list: {
    gap: 0,
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
