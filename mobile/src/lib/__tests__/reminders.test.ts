import { CITIES } from '../../data/content';
import { LAUNCH_AYAT, PRAYER_AYAT } from '../../data/ayat';
import { ayahFor, ayahRef, compose, durUr, ltr, nudge, NUDGES, prayerNotice, QUOTES, quoteFor } from '../../data/reminders';
import { SURAHS } from '../../data/surahs';
import { planNotifications } from '../notifications';
import { getState } from '../../state/store';

describe('reminder quotes', () => {
  it('every quote has English, Urdu and a source', () => {
    for (const list of Object.values(QUOTES)) for (const q of list) {
      expect(q.en.length).toBeGreaterThan(10);
      expect(q.ur).toMatch(/[؀-ۿ]/);
      expect(q.src).toMatch(/\d/);
    }
  });
  it('is stable within a day and changes from day to day', () => {
    const a = quoteFor('adhkar', new Date(2026, 9, 7, 6));
    expect(quoteFor('adhkar', new Date(2026, 9, 7, 21))).toBe(a);
    expect(quoteFor('adhkar', new Date(2026, 9, 8, 6))).not.toBe(a);
  });
});

describe('compose', () => {
  const q = QUOTES.fajr[0];
  it('English, Urdu and both', () => {
    expect(compose('en', { en: 'Time for Fajr', ur: 'فجر کا وقت' }, { en: 'Fajr · 5:00 am', ur: 'فجر · 5:00 am' }, q))
      .toEqual({ title: 'Time for Fajr', body: 'Fajr · 5:00 am\n“Prayer is better than sleep.” — The Fajr adhan · Abu Dawud 500' });
    expect(compose('ur', { en: 'x', ur: 'فجر کا وقت' }, { en: 'x', ur: 'فجر · 5:00 am' }, q).body).toBe('فجر · 5:00 am\n«نماز نیند سے بہتر ہے۔» — \u2066The Fajr adhan · Abu Dawud 500\u2069');
    const both = compose('both', { en: 'Time for Fajr', ur: 'فجر کا وقت' }, { en: 'Fajr', ur: 'فجر' }, null);
    expect(both).toEqual({ title: 'Time for Fajr · فجر کا وقت', body: 'Fajr\nفجر' });
  });
  it('Urdu durations', () => {
    const strip = (x: string) => x.replace(/[\u2066\u2069]/g, '');
    expect(strip(durUr(45))).toBe('45 منٹ');
    expect(strip(durUr(60))).toBe('1 گھنٹہ');
    expect(strip(durUr(150))).toBe('2 گھنٹے 30 منٹ');
  });
  it('keeps times and places in order inside Urdu lines', () => {
    expect(ltr('9:20 am')).toBe('\u20669:20 am\u2069');
  });
});

describe('ayat', () => {
  it('are complete, with valid references', () => {
    for (const a of [...PRAYER_AYAT, ...LAUNCH_AYAT]) {
      expect(a.a).toBeGreaterThan(0);
      expect(a.a).toBeLessThanOrEqual(SURAHS[a.s - 1].ayahs);
      expect(a.ar).toMatch(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+$/);
      expect(a.en.length).toBeGreaterThan(20);
      expect(a.ur).toMatch(/[؀-ۿ]/);
    }
  });
  it('one per prayer slot: stable within a slot, varied across the day', () => {
    const day = new Date(2026, 9, 7, 6);
    expect(ayahFor(new Date(2026, 9, 7, 21), 2)).toBe(ayahFor(day, 2));
    expect(new Set([0, 1, 2, 3, 4].map(i => ayahFor(day, i))).size).toBe(5);
  });
  it('references read naturally', () => {
    expect(ayahRef({ s: 2, a: 153 })).toBe('Al-Baqarah 2:153');
    expect(ayahRef({ s: 2, a: 153 }, 'ur')).toBe('البقرة \u20662:153\u2069');
  });
});

describe('prayer notice', () => {
  const a = PRAYER_AYAT[2];
  it('names the prayer and time once, then the ayah, then a short reminder', () => {
    const n = prayerNotice('en', 'Asr', '3:40 pm', a);
    expect(n.title).toBe('Asr · 3:40 pm');
    const lines = n.body.split('\n');
    expect(lines).toEqual([a.ar, `“${a.en}” — Al-Baqarah 2:153`, 'It’s time to pray. Come to success.']);
    expect(n.body).not.toMatch(/Asr|3:40/);
  });
  it('Urdu and both', () => {
    const ur = prayerNotice('ur', 'Fajr', '5:00 am', a);
    expect(ur.title).toBe('فجر · \u20665:00 am\u2069');
    expect(ur.body.split('\n')[1]).toBe(`${a.ur} (البقرة \u20662:153\u2069)`);
    expect(ur.body.split('\n')[2]).toMatch(/^نماز نیند سے بہتر ہے/);
    const both = prayerNotice('both', 'Fajr', '5:00 am', a);
    expect(both.title).toBe('Fajr · 5:00 am · فجر');
    expect(both.body.split('\n')).toHaveLength(4);
  });
});

describe('planned notifications', () => {
  const base = { ...getState(), hydrated: true, onboarded: true, city: CITIES[0], notifs: [true, true, false, true, false, false], wakeVerify: [false, false, false, false, false] };
  it('prayer notifications open with the ayah, in Urdu when chosen', () => {
    const plan = planNotifications({ ...base, notifLang: 'ur', notifQuotes: true }, new Date(2026, 9, 7, 0, 30));
    const fajr = plan.find(p => p.kind.startsWith('adhan.Fajr'))!;
    expect(fajr.title).toMatch(/^فجر · /);
    const lines = fajr.body.split('\n');
    expect(lines).toHaveLength(3);
    expect(PRAYER_AYAT.map(x => x.ar)).toContain(lines[0]);
    expect(plan.find(p => p.kind.startsWith('adhkar.am'))!.title).toBe('صبح کے اذکار');
    const quran = plan.find(p => p.kind.startsWith('quran'))!.body.split('\n')[0];
    expect(NUDGES.quran.map(l => l.ur)).toContain(quran);
  });
  it('the hadith switch only affects other reminders', () => {
    const plan = planNotifications({ ...base, notifLang: 'en', notifQuotes: false }, new Date(2026, 9, 7, 0, 30));
    const fajr = plan.find(p => p.kind.startsWith('adhan.Fajr'))!;
    expect(fajr.title).toMatch(/^Fajr · \d/);
    expect(fajr.body.split('\n')).toHaveLength(3);
    expect(plan.find(p => p.kind.startsWith('adhkar.am'))!.body).not.toMatch(/\n/);
  });
  it('the wake alarm keeps its scan instruction', () => {
    const plan = planNotifications({ ...base, notifLang: 'en', wakeVerify: [true, false, false, false, false] }, new Date(2026, 9, 7, 0, 30));
    const wake = plan.find(p => p.kind.startsWith('wake.Fajr'))!;
    expect(wake.title).toMatch(/^Fajr · /);
    expect(wake.body.split('\n')[2]).toBe('Scan your wudu station to stop the alarm.');
  });
});

describe('motivational nudges', () => {
  it('every line has English and Urdu', () => {
    for (const list of Object.values(NUDGES)) for (const l of list) {
      expect(l.en.length).toBeGreaterThan(15);
      expect(l.ur).toMatch(/[؀-ۿ]/);
    }
  });
  it('stay the same all day and change the next', () => {
    const a = nudge('adhkarAm', new Date(2026, 9, 7, 5));
    expect(nudge('adhkarAm', new Date(2026, 9, 7, 22))).toEqual(a);
    expect(nudge('adhkarAm', new Date(2026, 9, 8, 5))).not.toEqual(a);
  });
  it('fill numbers, keeping them in order inside Urdu', () => {
    const day = new Date(2026, 9, 7);
    const all = [0, 1, 2].map(salt => nudge('goalStreak', day, salt, { run: 6, day: 7, n: 100 }));
    for (const l of all) {
      expect(l.en).not.toMatch(/[{}]/);
      expect(l.en).toMatch(/100/);
      expect(l.ur).toContain(ltr(100));
    }
  });
});

describe('prayer ending nudges', () => {
  const base = { ...getState(), hydrated: true, onboarded: true, city: CITIES[0], notifs: [true, false, false, false, false, false], wakeVerify: [false, false, false, false, false], notifLang: 'en' as const,
    adhan: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true } };
  const now = new Date(2026, 9, 7, 0, 30);
  const ending = (plan: ReturnType<typeof planNotifications>) => plan.filter(p => p.kind.startsWith('ending.'));

  it('come before each prayer ends, today and tomorrow only, and open Prayer', () => {
    const e = ending(planNotifications(base, now));
    expect(e.map(x => x.kind.split('.')[1])).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
    expect(e[0].title).toBe('Fajr ends in 20 min');
    expect(e.every(x => x.url === '/prayer')).toBe(true);
  });
  it('skip a prayer already marked, and respect the switches', () => {
    const logs = { '2026-10-07': { Fajr: 'prayed' as const } };
    expect(ending(planNotifications({ ...base, logs }, now)).map(x => x.kind)).not.toContain('ending.Fajr.2026-10-07');
    expect(ending(planNotifications({ ...base, notifEnding: false }, now))).toHaveLength(0);
    // A prayer whose own notification is off gets no nudge either (Isha is off by default).
    expect(ending(planNotifications({ ...base, adhan: { ...base.adhan, Isha: false } }, now)).some(x => x.kind.startsWith('ending.Isha'))).toBe(false);
    expect(ending(planNotifications({ ...base, notifs: [false, false, false, false, false, false] }, now))).toHaveLength(0);
  });
});
