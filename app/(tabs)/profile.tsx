import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SettingsRow } from '@/components/ui/settings-row';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { SAMPLE_DATA_NOTE } from '@/constants/copy';
import { Radii, Spacing } from '@/constants/tokens';
import { useAuth } from '@/features/auth/state';
import { commitmentLabel, interestLabel } from '@/features/onboarding/types';
import { profileMock } from '@/features/profile/mock-data';
import { useProfile } from '@/features/profile/use-profile';
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

/**
 * `profiles.timezone` defaults to `'UTC'`, and `deviceTimeZone()` deliberately
 * declines to overwrite it when Hermes cannot name the real zone. So a stored
 * `'UTC'` is ambiguous — either the device really is on UTC, or the engine never
 * told us. Saying so is more honest than presenting a default as a measurement.
 */
const UNKNOWN_TIMEZONE_NOTE = 'UTC — your device did not report a zone';

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

/**
 * The first control on this screen that does something.
 *
 * Confirmed before acting: signing out is not destructive, but it is a full
 * context switch reached from a scrolling list, so a mis-tap should not end the
 * session. No navigation happens here — the route guard in `app/_layout.tsx`
 * watches the session and unmounts this tree, per ADR-008.
 */
function SignOutRow() {
  const { signOut, user } = useAuth();
  const [busy, setBusy] = useState(false);

  function confirm() {
    if (busy) {
      return;
    }

    Alert.alert('Sign out?', user?.email ? `You are signed in as ${user.email}.` : undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void signOut().then((result) => {
            if (!result.ok) {
              // Only reachable if the network call fails. The local session is
              // cleared regardless, so the guard still moves the user out; this
              // reports why the server was not told.
              setBusy(false);
              Alert.alert('Sign out', result.message);
            }
          });
        },
      },
    ]);
  }

  return (
    <SettingsRow
      label="Sign out"
      status={busy ? 'Signing out…' : undefined}
      onPress={confirm}
      accessibilityHint="Ends your session and returns to the sign-in screen"
    />
  );
}

/**
 * The signed-in account, shown for real.
 *
 * This replaced a fixture name, initials and bio. Once M4 gave the app a
 * genuine identity, presenting an invented one became exactly the kind of
 * misleading placeholder ADR-009 and ADR-010 set out to remove — worse than a
 * blank, because it looks like data.
 *
 * `display_name` exists on the `profiles` row but nothing reads it until M5, so
 * the email stands in and the caption says so rather than implying the name is
 * simply missing.
 */
function Identity() {
  const colors = useTheme();
  const { user } = useAuth();

  const email = user?.email ?? '';
  // Local part only: an avatar showing the domain would be the same two letters
  // for everyone on a shared provider.
  const initials = email.slice(0, 2).toUpperCase() || '?';

  return (
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
          <Text variant="heading">{email}</Text>
          <Text variant="caption" tone="secondary">
            Display name and bio arrive in a later update.
          </Text>
        </View>
      </View>
    </Card>
  );
}

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

/**
 * The `profiles` row, read back from the database.
 *
 * Deliberately reads the server rather than the device cache that
 * `OnboardingProvider` keeps for the route guard. Two sources for the same
 * three values is the defect ADR-009 exists to prevent, and the cache is a fast
 * path for a routing decision, not a display copy. The visible cost is that this
 * card needs loading and error states where it previously had none — which is
 * the correct cost, because it is now telling the truth about stored data.
 */
function ProfileDetails() {
  const state = useProfile();

  if (state.status === 'loading') {
    return (
      <View style={styles.section}>
        <Text variant="heading">Your profile</Text>
        <Card accessible accessibilityLabel="Loading your profile">
          <Skeleton height={20} width="55%" />
          <Skeleton height={20} width="40%" />
          <Skeleton height={20} width="48%" />
        </Card>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.section}>
        <Text variant="heading">Your profile</Text>
        <Card>
          <Text variant="body" tone="secondary">
            {state.message}
          </Text>
          <Button label="Try again" variant="secondary" onPress={state.retry} />
        </Card>
      </View>
    );
  }

  const { interests, commitment, timezone } = state.profile;

  return (
    <View style={styles.section}>
      <Text variant="heading">Your profile</Text>
      <Card style={styles.list}>
        {commitment === null && interests.length === 0 ? (
          <SettingsRow
            label="Onboarding"
            status="Skipped"
            accessibilityHint="You can set these up later."
          />
        ) : (
          <>
            <SettingsRow label="Interests" value={interests.map(interestLabel).join(', ')} />
            {commitment ? (
              <SettingsRow label="Daily commitment" value={commitmentLabel(commitment)} />
            ) : null}
          </>
        )}
        <SettingsRow
          label="Time zone"
          value={timezone === 'UTC' ? UNKNOWN_TIMEZONE_NOTE : timezone}
          accessibilityHint="Read from your device. Used to decide which day a check-in belongs to."
        />
      </Card>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useTheme();
  const { achievements } = profileMock;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            Profile
          </Text>
        </View>

        <Identity />

        <ProfileDetails />

        <Card>
          <Text variant="heading">Achievements</Text>
          <Text variant="caption" tone="muted">
            {SAMPLE_DATA_NOTE}
          </Text>
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
            <SignOutRow />
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
