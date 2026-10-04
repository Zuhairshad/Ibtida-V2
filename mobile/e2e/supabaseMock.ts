import type { Page } from '@playwright/test';

/**
 * Offline stand-in for the Supabase project. Auth accepts one known account and rejects other
 * passwords; REST reads return empty sets and writes succeed, so sync runs without the network.
 */
export const TEST_USER = { email: 'yusuf@example.com', password: 'bismillah123', id: '00000000-0000-4000-8000-000000000001' };

const now = () => Math.floor(Date.now() / 1000);
const session = (email: string) => ({
  access_token: 'e2e-access-token', token_type: 'bearer', expires_in: 3600, expires_at: now() + 3600, refresh_token: 'e2e-refresh',
  user: { id: TEST_USER.id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() },
});

export async function mockSupabase(page: Page) {
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
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json(200, null);
    if (url.pathname.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    return json(404, {});
  });
}
