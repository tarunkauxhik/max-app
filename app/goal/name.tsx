import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/tokens';
import { useGoalDraft } from '@/features/goals/state';
import { TITLE_MAX_LENGTH, validateTitle } from '@/features/goals/types';
import { useTheme } from '@/hooks/use-theme';

export default function GoalNameScreen() {
  const colors = useTheme();
  const { draft, update } = useGoalDraft();
  const [showError, setShowError] = useState(false);

  const error = validateTitle(draft.title);

  function handleContinue() {
    if (error) {
      setShowError(true);
      return;
    }
    router.push('/goal/time');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ProgressBar value={1} max={4} label="Step 1 of 4" />
          <Text variant="title" accessibilityRole="header">
            What do you want to achieve?
          </Text>
          <TextField
            label="Goal"
            hint="Something specific you can act on every day."
            placeholder="Run a half marathon"
            value={draft.title}
            onChangeText={(title) => update({ title })}
            onBlur={() => setShowError(true)}
            error={showError ? error : null}
            maxLength={TITLE_MAX_LENGTH}
            returnKeyType="next"
            onSubmitEditing={handleContinue}
            autoCapitalize="sentences"
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button label="Continue" onPress={handleContinue} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
