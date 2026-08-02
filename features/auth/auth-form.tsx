import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Radii, Spacing } from '@/constants/tokens';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { useTheme } from '@/hooks/use-theme';

export type AuthSubmitResult = { ok: true } | { ok: false; message: string };

export type AuthFormProps = {
  title: string;
  /** Label on the idle submit button. */
  submitLabel: string;
  /** Label while the request is in flight. Doubles as the busy indicator. */
  busyLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
  passwordHint?: string;
  onSubmit: (email: string, password: string) => Promise<AuthSubmitResult>;
  /** The link to the other screen, rendered below the submit button. */
  footer: ReactNode;
};

/**
 * The form shared by sign-in and sign-up, following the same pattern as
 * `features/onboarding/onboarding-step.tsx`: the layout, validation and busy
 * handling live here, and each screen supplies only what differs.
 *
 * Nothing here navigates on success. The route guard in `app/_layout.tsx`
 * watches the session and swaps the tree when it changes, per ADR-008. A
 * `router.replace` here would race that guard and could push a screen the
 * guard is about to unmount.
 */
export function AuthForm({
  title,
  submitLabel,
  busyLabel,
  passwordAutoComplete,
  passwordHint,
  onSubmit,
  footer,
}: AuthFormProps) {
  const colors = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  async function handleSubmit() {
    // Two guards, not one. `disabled` on the button stops the common case, but
    // two touches landing in the same frame both dispatch before React
    // re-renders, and a duplicate sign-up is not something to leave to timing.
    if (busy) {
      return;
    }

    if (emailError || passwordError) {
      setShowErrors(true);
      return;
    }

    setBusy(true);
    setFormError(null);

    try {
      const result = await onSubmit(email, password);
      if (!result.ok) {
        setFormError(result.message);
      }
    } finally {
      // In `finally` so a thrown error still releases the button. Without it an
      // unexpected failure would leave the form permanently unusable with no
      // way back except restarting the app.
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>

          {formError ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
              <Text variant="body" tone="danger">
                {formError}
              </Text>
            </View>
          ) : null}

          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setShowErrors(true)}
            error={showErrors ? emailError : null}
            editable={!busy}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
          />

          <TextField
            label="Password"
            hint={passwordHint}
            value={password}
            onChangeText={setPassword}
            onBlur={() => setShowErrors(true)}
            error={showErrors ? passwordError : null}
            editable={!busy}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={passwordAutoComplete}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {/* The label carries the busy state as well as the dimming, so it is
              not signalled by appearance alone. */}
          <Button
            label={busy ? busyLabel : submitLabel}
            onPress={handleSubmit}
            disabled={busy}
            accessibilityHint={busy ? 'Waiting for the server' : undefined}
          />
          {footer}
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
  banner: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  footer: {
    padding: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
