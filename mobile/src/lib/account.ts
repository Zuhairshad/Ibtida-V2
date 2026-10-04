import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getState, set } from '../state/store';
import { refreshLive, resetLive } from './live';
import { supabase, supabaseKey, supabaseUrl } from './supabase';
import { flushBeforeSignOut, startSync } from './sync';

/**
 * Accounts (Supabase Auth): email + password, magic link (PKCE, deep link back into the app) and
 * Google OAuth. Without EXPO_PUBLIC_SUPABASE_* the app stays local-only and these report that.
 */

WebBrowser.maybeCompleteAuthSession();

/** Where auth emails / OAuth return to: ibtida://auth-callback in a build, exp://…/--/auth-callback in Expo Go. */
export const authRedirect = () => Linking.createURL('auth-callback');

export type AuthResult = { ok: true; needsConfirm?: boolean } | { ok: false; message: string };

const offline: AuthResult = { ok: false, message: 'Accounts aren’t set up in this build — continuing on this device' };

function friendly(e: { message?: string; status?: number; code?: string }): string {
  const m = (e.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email or password doesn’t match';
  if (m.includes('already registered') || e.code === 'user_already_exists') return 'That email already has an account — sign in instead';
  if (m.includes('password') && m.includes('characters')) return 'Use at least 6 characters for your password';
  if (m.includes('email not confirmed')) return 'Confirm your email first — check your inbox';
  if (m.includes('rate limit') || e.status === 429) return 'Too many tries — wait a minute and try again';
  if (m.includes('network') || m.includes('fetch')) return 'You’re offline — try again when connected';
  return e.message || 'Something went wrong — please try again';
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return offline;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: authRedirect(), data: { full_name: getState().name } },
  });
  if (error) return { ok: false, message: friendly(error) };
  // With "Confirm email" on (Supabase default) there is no session until the link is opened.
  return { ok: true, needsConfirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return offline;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export async function sendMagicLink(email: string): Promise<AuthResult> {
  if (!supabase) return offline;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirect() } });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

/** Whether the Google provider is enabled for the project (public auth settings endpoint). */
async function googleEnabled(): Promise<boolean | null> {
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } });
    if (!r.ok) return null;
    const j = (await r.json()) as { external?: Record<string, boolean> };
    return !!j.external?.google;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return offline;
  const enabled = await googleEnabled();
  if (enabled === null) return { ok: false, message: 'You’re offline — try again when connected' };
  if (!enabled) return { ok: false, message: 'Google sign-in isn’t available yet — use email for now' };
  const redirectTo = authRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) return { ok: false, message: friendly(error || { message: '' }) };
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return { ok: false, message: 'Google sign-in was cancelled' };
  return handleAuthUrl(res.url);
}

const handled = new Map<string, Promise<AuthResult>>();

/**
 * Completes a sign-in from an auth deep link (PKCE `?code=` or implicit `#access_token=`).
 * The root listener and the /auth-callback route may both see the same URL; they share one result.
 */
export function handleAuthUrl(url: string): Promise<AuthResult> {
  if (!supabase || !url.includes('auth-callback')) return Promise.resolve({ ok: false, message: '' });
  let p = handled.get(url);
  if (!p) { p = completeAuth(url); handled.set(url, p); }
  return p;
}

async function completeAuth(url: string): Promise<AuthResult> {
  if (!supabase) return offline;
  const q = new URLSearchParams((url.split('?')[1] || '').split('#')[0]);
  const h = new URLSearchParams(url.split('#')[1] || '');
  const err = q.get('error_description') || h.get('error_description');
  if (err) return { ok: false, message: err.replace(/\+/g, ' ') };
  const code = q.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, message: 'Open the link on the same phone you requested it from' } : { ok: true };
  }
  const access = h.get('access_token');
  const refresh = h.get('refresh_token');
  if (access && refresh) {
    const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    return error ? { ok: false, message: friendly(error) } : { ok: true };
  }
  return { ok: false, message: 'That sign-in link is incomplete — request a new one' };
}

export async function signOut() {
  if (supabase) {
    await flushBeforeSignOut();
    await supabase.auth.signOut().catch(() => {});
    await resetLive();
  }
  set({ signedIn: false });
}

let started = false;
/** Called once from the root layout after the store hydrates. */
export function startBackend() {
  if (started) return;
  started = true;
  startSync();
  if (!supabase) return;
  Linking.getInitialURL().then(u => { if (u) handleAuthUrl(u).catch(() => {}); }).catch(() => {});
  Linking.addEventListener('url', ({ url }) => { handleAuthUrl(url).catch(() => {}); });
  refreshLive().catch(() => {});
}
