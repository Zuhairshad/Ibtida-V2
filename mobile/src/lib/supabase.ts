import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Supabase client. Reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY (publishable key only,
 * never service_role). When either is missing the app runs fully offline: `supabase` is null and
 * every caller treats that as "signed out".
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export const supabaseUrl = URL;
export const supabaseKey = KEY;

export const supabase: SupabaseClient | null = URL && KEY
  ? createClient(URL, KEY, {
    auth: {
      // Sessions can exceed SecureStore's 2 KB value limit, so they live in AsyncStorage
      // (app-sandboxed). Tokens are short-lived and refreshed.
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      lock: processLock,
    },
  })
  : null;

export const backendEnabled = !!supabase;

let session: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

export function currentSession() {
  return session;
}

export function currentUserId(): string | null {
  return session?.user.id ?? null;
}

export function onSession(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    session = data.session;
    listeners.forEach(l => l(session));
  }).catch(() => {});
  supabase.auth.onAuthStateChange((_e, s) => {
    session = s;
    listeners.forEach(l => l(s));
  });
  // Refresh tokens only while the app is in the foreground (supabase-js guidance for RN).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', st => {
      if (st === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }
}
