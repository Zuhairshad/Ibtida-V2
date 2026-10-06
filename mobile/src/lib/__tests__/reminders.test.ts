import { CITIES } from '../../data/content';
import { compose, durUr, ltr, QUOTES, quoteFor } from '../../data/reminders';
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

describe('planned notifications', () => {
  const base = { ...getState(), hydrated: true, onboarded: true, city: CITIES[0], notifs: [true, true, false, true, false, false], wakeVerify: [false, false, false, false, false] };
  it('are written in Urdu with a hadith when chosen', () => {
    const plan = planNotifications({ ...base, notifLang: 'ur', notifQuotes: true }, new Date(2026, 9, 7, 0, 30));
    const fajr = plan.find(p => p.kind.startsWith('adhan.Fajr'))!;
    expect(fajr.title).toBe('فجر کا وقت');
    expect(fajr.body.split('\n')).toHaveLength(2);
    expect(plan.find(p => p.kind.startsWith('adhkar.am'))!.title).toBe('صبح کے اذکار');
    expect(plan.find(p => p.kind.startsWith('quran'))!.body).toMatch(/^فجر کے بعد/);
  });
  it('drop the hadith when turned off', () => {
    const plan = planNotifications({ ...base, notifLang: 'en', notifQuotes: false }, new Date(2026, 9, 7, 0, 30));
    const fajr = plan.find(p => p.kind.startsWith('adhan.Fajr'))!;
    expect(fajr.title).toBe('Time for Fajr');
    expect(fajr.body).not.toMatch(/\n/);
  });
});
