import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SummaryRow } from '@/components/ui/summary-row';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { OnboardingStep } from '@/features/onboarding/onboarding-step';
import { useOnboarding, useOnboardingDraft } from '@/features/onboarding/state';
import { commitmentLabel, interestLabel } from '@/features/onboarding/types';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingReviewScreen() {
  const colors = useTheme();
  const { draft } = useOnboardingDraft();
  const { complete } = useOnboarding();

  const missing: string[] = [];
  if (draft.interests.length === 0) {
    missing.push('at least one interest');
  }
  if (draft.commitment === null) {
    missing.push('a daily commitment');
  }
  const ready = missing.length === 0;

  return (
    <OnboardingStep
      step={4}
      title="Does this look right?"
      footer={
        <View style={styles.footer}>
          <Button
            label="Enter MAX"
            onPress={() => complete(draft)}
            disabled={!ready}
            accessibilityHint={ready ? undefined : `Still needs ${missing.join(' and ')}`}
          />
          {router.canGoBack() ? (
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          ) : null}
          {ready ? null : (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              Still needs {missing.join(' and ')}.
            </Text>
          )}
        </View>
      }>
      <Card style={styles.summary}>
        <SummaryRow
          label="Interests"
          value={
            draft.interests.length === 0
              ? 'Not set'
              : draft.interests.map(interestLabel).join(', ')
          }
          editHref="/onboarding/interests"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SummaryRow
          label="Daily commitment"
          value={draft.commitment === null ? 'Not set' : commitmentLabel(draft.commitment)}
          editHref="/onboarding/commitment"
        />
      </Card>

      <Text variant="caption" tone="muted">
        These preferences are kept for the current session only. Nothing is saved to a device or
        a server yet.
      </Text>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.sm,
  },
  summary: {
    gap: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
