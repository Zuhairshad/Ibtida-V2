import { appUrl, cleanCode as fnClean, fallbackText, intentUrl, respond } from '../../../supabase/functions/invite/core';
import { cleanCode, codeFromText, inviteMessage } from '../invite';

describe('invite codes and links in the app', () => {
  it('reads a code from a link, a deep link or the bare code', () => {
    expect(codeFromText('https://x.supabase.co/functions/v1/invite?c=k7q2m9xa')).toBe('K7Q2M9XA');
    expect(codeFromText('ibtida://join?code=K7Q2M9XA')).toBe('K7Q2M9XA');
    expect(codeFromText(' k7q2m9xa ')).toBe('K7Q2M9XA');
    expect(codeFromText('hello there!')).toBeNull();
    expect(cleanCode('')).toBeNull();
  });
  it('the message carries the link and still offers the code', () => {
    const m = inviteMessage({ name: 'Rahman family', code: 'K7Q2M9XA' });
    expect(m).toMatch(/Rahman family/);
    expect(m).toMatch(/(invite\?c=|join\?code=)K7Q2M9XA/);
    expect(m).toMatch(/invite code K7Q2M9XA/);
  });
});

describe('invite redirect (Edge Function)', () => {
  const hasResponse = typeof Response !== 'undefined';
  const base = 'https://p.supabase.co/functions/v1/invite';
  (hasResponse ? it : it.skip)('Android opens the app through an intent with a fallback', () => {
    const r = respond(`${base}?c=k7q2m9xa`, 'Mozilla/5.0 (Linux; Android 14)', null);
    expect(r.status).toBe(302);
    const loc = r.headers.get('location')!;
    expect(loc.startsWith('intent://join?code=K7Q2M9XA#Intent;scheme=ibtida;package=app.ibtida;')).toBe(true);
    expect(decodeURIComponent(loc)).toContain(`${base}?c=k7q2m9xa&app=0`);
  });
  (hasResponse ? it : it.skip)('other devices get the app link; bad codes get a plain message', () => {
    expect(respond(`${base}?c=K7Q2M9XA`, 'iPhone', null).headers.get('location')).toBe('ibtida://join?code=K7Q2M9XA');
    expect(respond(`${base}?c=%3Cscript%3E`, 'iPhone', null).status).toBe(400);
  });
  it('builds safe URLs and honest fallback text', () => {
    expect(fnClean('<x>')).toBeNull();
    expect(appUrl('AB12CD34')).toBe('ibtida://join?code=AB12CD34');
    expect(intentUrl('AB12CD34', 'https://f')).toContain('S.browser_fallback_url=https%3A%2F%2Ff');
    expect(fallbackText('AB12CD34', { status: 'ok', circleName: 'Halaqa', members: 3 })).toMatch(/Halaqa on Ibtida \(3 members\)/);
    expect(fallbackText('AB12CD34', { status: 'expired', circleName: 'Halaqa' })).toMatch(/expired/);
    expect(fallbackText('AB12CD34', { status: 'revoked' })).toMatch(/turned off/);
    expect(fallbackText('AB12CD34', { status: 'invalid' })).toMatch(/isn’t valid/);
  });
});
