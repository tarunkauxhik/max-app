import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { AuthForm } from '@/features/auth/auth-form';
import { useAuth } from '@/features/auth/state';

export default function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <AuthForm
      title="Welcome back"
      submitLabel="Sign in"
      busyLabel="Signing in…"
      passwordAutoComplete="current-password"
      onSubmit={signIn}
      footer={
        <Button
          label="Create an account"
          variant="secondary"
          onPress={() => router.push('/sign-up')}
          accessibilityHint="Opens the sign-up screen"
        />
      }
    />
  );
}
