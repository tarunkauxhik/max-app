import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';

export const ONBOARDING_STEPS = 4;

export type OnboardingStepProps = {
  step: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer: ReactNode;
};

/**
 * Shared chrome for every onboarding step: progress, heading, scrolling body
 * and a pinned footer. One layout for all four steps is what makes the flow
 * read as continuous rather than as four similar screens.
 *
 * The stack shows no header here, so the title carries `header` role for
 * screen-reader heading navigation.
 */
export function OnboardingStep({ step, title, subtitle, children, footer }: OnboardingStepProps) {
  const colors = useTheme();

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar
          value={step}
          max={ONBOARDING_STEPS}
          label={`Step ${step} of ${ONBOARDING_STEPS}`}
        />

        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {children}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.sm,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
});
