/**
 * Circle invitation links.
 *
 * A link is https://<project>.supabase.co/functions/v1/invite?c=CODE (the `invite` Edge Function),
 * which opens ibtida://join?code=CODE. The app then shows which circle it is, asks the person to
 * sign in if needed (keeping the invite through sign-in or sign-up), and joins with
 * join_circle_by_code, which checks the code again on the server. Plain 8-character codes still work.
 */
import { Linking, Share } from 'react-native';
import { getState, set, type Circle } from '../state/store';
import { supabase, supabaseUrl } from './supabase';

export type InvitePreview =
  | { status: 'ok'; circleName: string; members: number; joined: boolean; expiresAt: string | null }
  | { status: 'expired'; circleName?: string }
  | { status: 'revoked' | 'invalid' }
  /** The server couldn't be asked (offline, or the preview function isn't deployed yet). */
  | { status: 'unknown' };

/** Uppercase, trimmed code, or null if it can't be an invite code. */
export function cleanCode(raw: string | null | undefined): string | null {
  const c = (raw ?? '').trim().toUpperCase();
  return /^[A-Z0-9-]{6,40}$/.test(c) ? c : null;
}

/** Pulls a code out of anything pasted or opened: a link, a deep link, or the bare code. */
export function codeFromText(text: string): string | null {
  const m = /[?&](?:c|code)=([A-Za-z0-9-]+)/.exec(text) ?? /join\/([A-Za-z0-9-]+)/.exec(text);
  return cleanCode(m ? m[1] : text);
}

const INVITE_BASE = process.env.EXPO_PUBLIC_INVITE_BASE || (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/invite` : '');

/** The shareable https link for a code (falls back to the app link when no backend is configured). */
export function inviteLink(code: string) {
  return INVITE_BASE ? `${INVITE_BASE}?c=${encodeURIComponent(code)}` : `ibtida://join?code=${encodeURIComponent(code)}`;
}

export function inviteMessage(c: Pick<Circle, 'name' | 'code'>) {
  return `Assalamu alaikum! Join my circle “${c.name}” on Ibtida so we can keep our worship goals together:\n${inviteLink(c.code)}\n\nOr enter invite code ${c.code} in Ibtida › Community › Join a circle.`;
}

/** WhatsApp directly when installed, otherwise the share sheet. */
export async function shareInvite(c: Pick<Circle, 'name' | 'code'>, via: 'whatsapp' | 'sheet') {
  const message = inviteMessage(c);
  if (via === 'whatsapp') {
    const app = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      if (await Linking.canOpenURL(app)) { await Linking.openURL(app); return 'whatsapp'; }
    } catch { /* fall through */ }
    try {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      return 'whatsapp';
    } catch { /* fall through */ }
  }
  await Share.share({ message, title: `Join ${c.name} on Ibtida` });
  return 'sheet';
}

/** Which circle a code belongs to, and whether it still works. Needs no sign-in. */
export async function previewInvite(code: string): Promise<InvitePreview> {
  if (!supabase) return { status: 'unknown' };
  try {
    const { data, error } = await supabase.rpc('circle_invite_preview', { p_code: code });
    if (error || !data) return { status: 'unknown' };
    return data as InvitePreview;
  } catch {
    return { status: 'unknown' };
  }
}

/** Kept through sign-in / sign-up (and app restarts) until the person joins or dismisses it. */
export const holdInvite = (code: string) => set({ pendingInvite: code });
export const clearInvite = () => set({ pendingInvite: null });
export const pendingInvite = () => getState().pendingInvite;
