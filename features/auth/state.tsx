import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { describeAuthError } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase';

/**
 * `loading` exists so the app can hold still until the stored session has been
 * read. Without it every cold start renders the sign-in screen for a frame
 * before replacing it, which reads as a bug even though the session was there
 * the whole time.
 */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export type AuthResult = { ok: true } | { ok: false; message: string };

/**
 * Sign-up has three outcomes, not two. When email confirmation is on, Supabase
 * creates the user but returns no session, and the caller has to say so rather
 * than pretending the user is signed in.
 *
 * Confirmation is currently OFF on `max-dev` (see EXTERNAL_SETUP_TRACKER), so
 * `needsConfirmation` is always false in practice today. It is modelled anyway:
 * turning confirmation back on before release must be a dashboard change, not a
 * code change.
 */
export type SignUpResult =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; message: string };

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Guards against setting state after unmount, and against the initial
    // getSession resolving *after* an onAuthStateChange event has already
    // delivered a newer session. Without it a fast sign-in during startup can
    // be overwritten by the stale initial read.
    let settled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (settled) {
        return;
      }
      settled = true;
      setSession(data.session);
      setStatus(data.session ? 'signed-in' : 'signed-out');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      settled = true;
      setSession(nextSession);
      setStatus(nextSession ? 'signed-in' : 'signed-out');
    });

    return () => {
      settled = true;
      subscription.unsubscribe();
    };
  }, []);

  // These return a result rather than throwing, so a screen renders an error
  // instead of unmounting the tree. State is not set here: onAuthStateChange
  // above is the single writer, so there is one path into `session` regardless
  // of whether the change came from this device, a token refresh, or a sign-out
  // triggered elsewhere.
  const value = useMemo<AuthValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return error ? { ok: false, message: describeAuthError(error) } : { ok: true };
      },

      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          return { ok: false, message: describeAuthError(error) };
        }
        // A user with no session means the account exists but is awaiting email
        // confirmation.
        return { ok: true, needsConfirmation: data.session === null };
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return error ? { ok: false, message: describeAuthError(error) } : { ok: true };
      },
    }),
    [status, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
