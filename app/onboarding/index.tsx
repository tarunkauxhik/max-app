import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { OnboardingStep } from '@/features/onboarding/onboarding-step';
import { useOnboarding } from '@/features/onboarding/state';

const VALUE_POINTS = [
  'Turn a goal you care about into a few small actions for today.',
  'Check in each day and watch the streak build.',
  'Adjust the plan when life gets in the way.',
];

/**
 * Named `index` so this directory has an unambiguous entry point. Without it
 * the stack has no defined initial route and resolves to an arbitrary step.
 */
export default function WelcomeScreen() {
  const { skip } = useOnboarding();

  return (
    <OnboardingStep
      step={1}
      title="Welcome to MAX"
      subtitle="MAX turns meaningful goals into short daily actions you actually finish."
      footer={
        <View style={styles.footer}>
          <Button label="Get started" onPress={() => router.push('/onboarding/interests')} />
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={skip}
            accessibilityHint="Go straight to Today without choosing preferences"
          />
        </View>
      }>
      <Card style={styles.points}>
        {VALUE_POINTS.map((point) => (
          <Text key={point} variant="body" tone="secondary">
            {point}
          </Text>
        ))}
      </Card>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.sm,
  },
  points: {
    gap: Spacing.lg,
  },
});
