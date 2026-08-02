import { createClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

/**
 * The Supabase client, and the only place credentials are read.
 *
 * Storage note. Expo's current guide (docs.expo.dev/guides/using-supabase,
 * checked 2026-08-02) shows `import 'expo-sqlite/localStorage/install'` and
 * passes the patched global `localStorage`. This uses `expo-sqlite/kv-store`
 * instead — the same package and the same SQLite-backed store, reached through
 * a different entry point. Three reasons, in order of weight:
 *
 * 1. `./localStorage/install` has no `types` entry in expo-sqlite's export map.
 *    It typechecks here only because `expo/tsconfig.base` happens to include the
 *    DOM lib for react-native-web. That is an accident we would rather not
 *    depend on. `./kv-store` ships real declarations.
 * 2. A global named `localStorage` in a React Native file reads as a mistake to
 *    anyone maintaining it.
 * 3. It patches a global. `kv-store` is an ordinary import.
 *
 * Both were verified to compile under `strict` before choosing. The token is
 * stored unencrypted in app-private SQLite either way — see ADR-013 for that
 * trade-off and when to revisit it.
 */

// Referenced as full static expressions because Metro inlines EXPO_PUBLIC_*
// variables by textual substitution. Destructuring `process.env` first would
// leave both undefined at runtime.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// These throw at module load rather than returning a broken client, because the
// alternative is an opaque network failure on the first sign-in attempt, several
// screens away from the actual cause.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase credentials are missing. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then ' +
      'restart the dev server — Metro inlines these at build time, so a reload is not enough.'
  );
}

// The one mistake that would matter. A secret key bypasses Row Level Security
// entirely, and EXPO_PUBLIC_ variables are compiled into every installed copy of
// the app, so this would hand every user full read and write access to every
// other user's data. It has to fail loudly, not work quietly.
if (supabasePublishableKey.startsWith('sb_secret_')) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key. Secret keys bypass ' +
      'Row Level Security and must never reach the client bundle. Replace it with ' +
      'the sb_publishable_ key and rotate the secret key, which should now be ' +
      'treated as disclosed.'
  );
}

if (!supabasePublishableKey.startsWith('sb_publishable_')) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not in the expected sb_publishable_ ' +
      'format. Legacy anon JWTs are deprecated; see ADR-011.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: Storage,
    autoRefreshToken: true,
    persistSession: true,
    // There is no URL to read a session from on native. Leaving this on makes
    // the client wait for a browser redirect that never arrives.
    detectSessionInUrl: false,
  },
});

/**
 * Refresh tokens only while the app is in the foreground.
 *
 * Documented in the Supabase API reference for `auth.startAutoRefresh` but in
 * neither the Expo nor the Supabase React Native guide: outside a browser the
 * refresh loop otherwise keeps running in the background, doing periodic network
 * work for an app the user is not looking at.
 *
 * Registered once, at module scope, because the module is a singleton. A
 * component-level effect would add a listener per mount.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});

// AppState only emits on transitions, so a cold start into the foreground —
// which is every normal launch — would otherwise never start the refresher.
if (AppState.currentState === 'active') {
  void supabase.auth.startAutoRefresh();
}
