import type { Page } from '@playwright/test';

/**
 * Offline stand-in for the Supabase project. Auth accepts one known account and rejects other
 * passwords; REST reads return empty sets and writes succeed, so sync runs without the network.
 */
export const TEST_USER = { email: 'yusuf@example.com', password: 'bismillah123', id: '00000000-0000-4000-8000-000000000001' };

/** A circle that can be joined from an invitation link in tests. */
export const INVITE = { code: 'HALAQA22', name: 'Thursday halaqa', id: '11111111-1111-4111-8111-111111111111' };
const joined = new WeakSet<Page>();

/** Inspiration posts per test page: two published today; admins can add more. */
type Post = { id: string; kind: string; title: string | null; body_ar: string | null; body_en: string | null; body_ur: string | null; source: string | null; surah: number | null; ayah: number | null; status: string; publish_at: string };
const posts = new WeakMap<Page, Post[]>();
const admins = new WeakSet<Page>();
/** Lets a test sign in as an admin. */
export const makeAdmin = (page: Page) => admins.add(page);
const seedPosts = (): Post[] => {
  const t = Date.now();
  return [
    { id: 'p1', kind: 'hadith', title: 'Consistency', body_ar: null, body_en: 'The most beloved deeds to Allah are those done consistently, even if small.', body_ur: null, source: 'Sahih al-Bukhari 6464', surah: null, ayah: null, status: 'published', publish_at: new Date(t - 3_600_000).toISOString() },
    { id: 'p2', kind: 'reminder', title: null, body_ar: null, body_en: 'Pray before you are prayed upon.', body_ur: 'نماز پڑھو اس سے پہلے کہ تمہاری نماز پڑھی جائے۔', source: null, surah: null, ayah: null, status: 'published', publish_at: new Date(t - 7_200_000).toISOString() },
  ];
};

const now = () => Math.floor(Date.now() / 1000);
const session = (email: string) => ({
  access_token: 'e2e-access-token', token_type: 'bearer', expires_in: 3600, expires_at: now() + 3600, refresh_token: 'e2e-refresh',
  user: { id: TEST_USER.id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() },
});

export async function mockSupabase(page: Page) {
  // Supabase Realtime (Phoenix channels, serializer 2.0: [join_ref, ref, topic, event, payload]).
  // Accept joins and heartbeats so live feeds connect quietly; no changes are pushed.
  await page.routeWebSocket(/supabase\.co\/realtime/, ws => {
    ws.onMessage(raw => {
      let m: [string | null, string | null, string, string, { config?: { postgres_changes?: { event: string; schema: string; table: string }[] } }];
      try { m = JSON.parse(String(raw)); } catch { return; }
      if (!Array.isArray(m)) return;
      const [joinRef, ref, topic, event, payload] = m;
      if (event === 'phx_join' || event === 'heartbeat' || event === 'access_token') {
        const pg = (payload?.config?.postgres_changes ?? []).map((c, i) => ({ ...c, id: i + 1 }));
        ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: event === 'phx_join' ? { postgres_changes: pg } : {} }]));
      }
    });
  });
  await page.route('**://*.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/token') {
      const b = req.postDataJSON() as { email?: string; password?: string } | null;
      if (url.searchParams.get('grant_type') === 'password') {
        if (b?.email === TEST_USER.email && b?.password === TEST_USER.password) return json(200, session(b.email));
        return json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      return json(200, session(TEST_USER.email));
    }
    if (url.pathname === '/auth/v1/signup') {
      const b = req.postDataJSON() as { email: string };
      return json(200, session(b.email));
    }
    if (url.pathname === '/auth/v1/user') return json(200, session(TEST_USER.email).user);
    if (url.pathname.startsWith('/auth/v1/')) return json(200, {});
    // The Quran Foundation proxy (EXPO_PUBLIC_QURAN_SOURCE=quran.foundation in .env) answers with a
    // body the app doesn't accept, so it falls back to AlQuran Cloud (mocked in quranMock.ts) —
    // the same path a real proxy failure takes — without a 404 in the console.
    if (url.pathname === '/functions/v1/quran') return json(200, { source: 'unavailable-in-tests' });
    if (url.pathname === '/rest/v1/rpc/is_admin') return json(200, admins.has(page));
    if (url.pathname === '/rest/v1/inspirations') {
      if (!posts.has(page)) posts.set(page, seedPosts());
      const list = posts.get(page)!;
      const method = req.method();
      const one = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
      if (method === 'GET') {
        const due = url.searchParams.get('status') === 'eq.published'
          ? list.filter(p => p.status === 'published' && Date.parse(p.publish_at) <= Date.now())
          : admins.has(page) ? list : list.filter(p => p.status === 'published');
        return json(200, [...due].sort((a, b) => Date.parse(b.publish_at) - Date.parse(a.publish_at)));
      }
      if (!admins.has(page)) return json(403, { code: '42501', message: 'new row violates row-level security policy', details: null, hint: null });
      if (method === 'POST') {
        const b = req.postDataJSON() as Omit<Post, 'id'>;
        const day = (iso: string) => iso.slice(0, 10);
        if (b.status === 'published' && list.filter(p => p.status === 'published' && day(p.publish_at) === day(b.publish_at)).length >= 3) {
          return json(400, { code: 'P0010', message: 'Three posts are already published for that day. Archive one or choose another day.', details: null, hint: null });
        }
        const row = { ...b, id: `p${list.length + 1}` };
        list.push(row);
        return json(201, one ? row : [row]);
      }
      if (method === 'PATCH' || method === 'DELETE') {
        const id = (url.searchParams.get('id') ?? '').replace(/^eq\./, '');
        const i = list.findIndex(p => p.id === id);
        if (i < 0) return json(404, {});
        if (method === 'DELETE') { list.splice(i, 1); return route.fulfill({ status: 204, body: '' }); }
        list[i] = { ...list[i], ...(req.postDataJSON() as Partial<Post>) };
        return json(200, one ? list[i] : [list[i]]);
      }
    }
    if (url.pathname === '/rest/v1/rpc/circle_invite_preview') {
      const code = String((req.postDataJSON() as { p_code?: string } | null)?.p_code ?? '').toUpperCase();
      if (code === INVITE.code) return json(200, { status: 'ok', circleName: INVITE.name, members: 4, joined: joined.has(page), expiresAt: null });
      if (code === 'EXPIRED2') return json(200, { status: 'expired', circleName: INVITE.name });
      if (code === 'REVOKED2') return json(200, { status: 'revoked' });
      return json(200, { status: 'invalid' });
    }
    if (url.pathname === '/rest/v1/rpc/join_circle_by_code') {
      const code = String((req.postDataJSON() as { p_code?: string } | null)?.p_code ?? '').toUpperCase();
      if (code === 'EXPIRED2') return json(400, { code: 'P0004', message: 'This invitation has expired. Ask for a new link.', details: null, hint: null });
      if (code !== INVITE.code) return json(400, { code: 'P0002', message: 'No circle found with that invite code.', details: null, hint: null });
      joined.add(page);
      return json(200, { circleId: INVITE.id, circleName: INVITE.name, joined: true });
    }
    if (url.pathname === '/rest/v1/rpc/get_my_circles') {
      return json(200, joined.has(page) ? [{ id: INVITE.id, name: INVITE.name, privacy: 'Private', invite_code: INVITE.code, role: 'member', member_count: 5 }] : []);
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json(200, null);
    if (url.pathname.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    return json(404, {});
  });
}
