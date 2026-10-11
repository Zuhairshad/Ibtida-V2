// Supabase Edge Function `invite`: turns a shareable https link into an app deep link.
// Deploy with verify_jwt off — it is opened from WhatsApp and browsers, with no key:
//   supabase functions deploy invite --no-verify-jwt
// It never joins anyone: the app checks the code again with join_circle_by_code after sign-in.
import { cleanCode, respond, type Preview } from './core.ts';

const projectUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

async function preview(code: string): Promise<Preview | null> {
  try {
    const r = await fetch(`${projectUrl}/rest/v1/rpc/circle_invite_preview`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
    });
    return r.ok ? ((await r.json()) as Preview) : null;
  } catch {
    return null;
  }
}

Deno.serve(async req => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const code = cleanCode(url.searchParams.get('c'));
  // The circle preview is only needed for the plain-text fallback page.
  const p = code && url.searchParams.get('app') === '0' ? await preview(code) : null;
  return respond(req.url, req.headers.get('user-agent') ?? '', p);
});
