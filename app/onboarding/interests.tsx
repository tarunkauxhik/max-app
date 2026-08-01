import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { MultiOptionGroup } from '@/components/ui/multi-option-group';
import { Spacing } from '@/constants/tokens';
import { OnboardingStep } from '@/features/onboarding/onboarding-step';
import { useOnboardingDraft } from '@/features/onboarding/state';
import { INTEREST_OPTIONS, MAX_INTERESTS } from '@/features/onboarding/types';

export default function InterestsScreen() {
  const { draft, toggleInterest } = useOnboardingDraft();
  const [showError, setShowError] = useState(false);

  const error = draft.interests.length === 0 ? 'Choose at least one interest' : null;

  function handleContinue() {
    if (error) {
      setShowError(true);
      return;
    }
    router.push('/onboarding/commitment');
  }

  return (
    <OnboardingStep
      step={2}
      title="What matters to you right now?"
      subtitle="This shapes the goals MAX suggests. You can change it later."
      footer={
        <View style={styles.footer}>
          <Button label="Continue" onPress={handleContinue} />
          {router.canGoBack() ? (
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          ) : null}
        </View>
      }>
      <MultiOptionGroup
        label="Interests"
        hint={`Choose up to ${MAX_INTERESTS}`}
        options={INTEREST_OPTIONS}
        values={draft.interests}
        onToggle={(value) => {
          toggleInterest(value);
          setShowError(false);
        }}
        max={MAX_INTERESTS}
        error={showError ? error : null}
      />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.sm,
  },
});
