// Pure logic for the `invite` Edge Function (shared with the Jest tests).
//
// A shared link https://<project>.supabase.co/functions/v1/invite?c=CODE opens the app at
// ibtida://join?code=CODE, where the code is checked again and joined after sign-in. Supabase's
// default domain can't serve HTML pages, so this only redirects:
//   Android → an intent:// URL (opens Ibtida, or the fallback text when it isn't installed)
//   others  → ibtida://join?code=CODE
// `?app=0` (the fallback) answers in plain text: which circle it is and how to join with the code.

export type Preview = { status: 'ok' | 'expired' | 'revoked' | 'invalid'; circleName?: string; members?: number };

export const PACKAGE = 'app.ibtida';
export const SCHEME = 'ibtida';

/** Codes are 8 characters today; older uuid-style codes are still accepted. */
export function cleanCode(raw: string | null): string | null {
  const c = (raw ?? '').trim().toUpperCase();
  return /^[A-Z0-9-]{6,40}$/.test(c) ? c : null;
}

export const appUrl = (code: string) => `${SCHEME}://join?code=${encodeURIComponent(code)}`;

/** Chrome on Android: open the app if installed, else the fallback page. */
export function intentUrl(code: string, fallback: string) {
  return `intent://join?code=${encodeURIComponent(code)}#Intent;scheme=${SCHEME};package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

export function fallbackText(code: string | null, p: Preview | null): string {
  if (!code) return 'This invitation link is incomplete. Ask for the link again.';
  if (!p) return `Join on Ibtida with invite code ${code}: open Ibtida › Community › Join a circle, and enter the code.`;
  switch (p.status) {
    case 'expired': return `This invitation to ${p.circleName ?? 'the circle'} has expired. Ask for a new link.`;
    case 'revoked': return 'This invitation was turned off by the circle owner. Ask for a new link.';
    case 'invalid': return 'This invitation link isn’t valid. Check it, or ask for a new one.';
    default: return [
      `You’re invited to join ${p.circleName} on Ibtida${p.members ? ` (${p.members} ${p.members === 1 ? 'member' : 'members'})` : ''}.`,
      '',
      'Install Ibtida, then open this link again — or open Ibtida › Community › Join a circle and enter the code:',
      code,
    ].join('\n');
  }
}

/** The response for one request. `preview` is only needed for the fallback text. */
export function respond(reqUrl: string, userAgent: string, preview: Preview | null): Response {
  const url = new URL(reqUrl);
  const code = cleanCode(url.searchParams.get('c'));
  const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };
  if (!code || url.searchParams.get('app') === '0') {
    return new Response(fallbackText(code, preview), { status: code ? 200 : 400, headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' } });
  }
  const fallback = new URL(url);
  fallback.searchParams.set('app', '0');
  const location = /Android/i.test(userAgent) ? intentUrl(code, fallback.toString()) : appUrl(code);
  return new Response(null, { status: 302, headers: { ...headers, location } });
}
