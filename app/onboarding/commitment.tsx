import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { OptionGroup } from '@/components/ui/option-group';
import { Spacing } from '@/constants/tokens';
import { OnboardingStep } from '@/features/onboarding/onboarding-step';
import { useOnboardingDraft } from '@/features/onboarding/state';
import { COMMITMENT_OPTIONS, type Commitment } from '@/features/onboarding/types';

export default function CommitmentScreen() {
  const { draft, setCommitment } = useOnboardingDraft();
  const [showError, setShowError] = useState(false);

  const error = draft.commitment === null ? 'Choose a daily commitment' : null;

  function handleContinue() {
    if (error) {
      setShowError(true);
      return;
    }
    router.push('/onboarding/review');
  }

  return (
    <OnboardingStep
      step={3}
      title="How much time can you give it?"
      subtitle="Be honest rather than ambitious. A small habit you keep beats a big one you drop."
      footer={
        <View style={styles.footer}>
          <Button label="Continue" onPress={handleContinue} />
          {router.canGoBack() ? (
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          ) : null}
        </View>
      }>
      <OptionGroup
        label="Daily commitment"
        layout="stack"
        options={COMMITMENT_OPTIONS}
        value={draft.commitment}
        onChange={(commitment: Commitment) => {
          setCommitment(commitment);
          setShowError(false);
        }}
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
