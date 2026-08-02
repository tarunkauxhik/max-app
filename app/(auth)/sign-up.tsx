import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/tokens';
import { AuthForm, type AuthSubmitResult } from '@/features/auth/auth-form';
import { useAuth } from '@/features/auth/state';
import { PASSWORD_MIN_LENGTH } from '@/features/auth/validation';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSignUp(email: string, password: string): Promise<AuthSubmitResult> {
    const result = await signUp(email, password);

    if (!result.ok) {
      return result;
    }

    // Confirmation is currently off on max-dev, so this branch does not run
    // today and the session guard takes over instead. It exists so that turning
    // confirmation back on before release is a dashboard change rather than a
    // code change. See EXTERNAL_SETUP_TRACKER.
    if (result.needsConfirmation) {
      setPendingEmail(email.trim());
    }
    return { ok: true };
  }

  if (pendingEmail) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']} style={styles.pending}>
        <Card>
          <Text variant="title" accessibilityRole="header">
            Confirm your email
          </Text>
          <Text variant="body" tone="secondary">
            We sent a link to {pendingEmail}. Open it to finish creating your account, then come back
            and sign in.
          </Text>
        </Card>
        <Button
          label="Back to sign in"
          onPress={() => router.dismissTo('/sign-in')}
          accessibilityHint="Returns to the sign-in screen"
        />
      </Screen>
    );
  }

  return (
    <AuthForm
      title="Create your account"
      submitLabel="Create account"
      busyLabel="Creating account…"
      passwordAutoComplete="new-password"
      passwordHint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      onSubmit={handleSignUp}
      footer={
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/sign-in'))}
          accessibilityHint="Returns to the sign-in screen"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  pending: {
    padding: Spacing.xl,
    gap: Spacing.xl,
    justifyContent: 'center',
  },
});
