import { CITIES } from '../../data/content';
import { PRAYER_AYAT } from '../../data/ayat';
import { prayerNotice } from '../../data/reminders';
import { tr } from '../i18n';
import { planNotifications } from '../notifications';
import { fmtMin, jamaatAt, timesFor } from '../prayer';
import { getState } from '../../state/store';

const city = CITIES[0];
const wed = new Date(2026, 9, 7, 12);
const fri = new Date(2026, 9, 9, 12);

describe('jamaat times', () => {
  it('are only what the user entered: nothing is derived from start times', () => {
    expect(jamaatAt({}, 'Asr', wed)).toBeNull();
    expect(jamaatAt({ Asr: 16 * 60 + 45 }, 'Isha', wed)).toBeNull();
    const j = jamaatAt({ Asr: 16 * 60 + 45 }, 'Asr', wed)!;
    expect([j.at.getHours(), j.at.getMinutes(), j.jumuah]).toEqual([16, 45, false]);
  });
  it('on Fridays Dhuhr uses the Jumu‘ah time, and nothing if that is unset', () => {
    expect(jamaatAt({ Dhuhr: 13 * 60 + 30, Jumuah: 13 * 60 + 45 }, 'Dhuhr', fri)).toMatchObject({ jumuah: true });
    expect(jamaatAt({ Dhuhr: 13 * 60 + 30, Jumuah: 13 * 60 + 45 }, 'Dhuhr', fri)!.at.getMinutes()).toBe(45);
    expect(jamaatAt({ Dhuhr: 13 * 60 + 30 }, 'Dhuhr', fri)).toBeNull();
    expect(jamaatAt({ Dhuhr: 13 * 60 + 30 }, 'Dhuhr', wed)!.at.getMinutes()).toBe(30);
  });
  it('ignores malformed values', () => {
    expect(jamaatAt({ Asr: -5 }, 'Asr', wed)).toBeNull();
    expect(jamaatAt({ Asr: 1440 }, 'Asr', wed)).toBeNull();
    expect(jamaatAt({ Asr: NaN }, 'Asr', wed)).toBeNull();
  });
  it('formats minutes after midnight', () => {
    expect(fmtMin(0)).toBe('12:00 am');
    expect(fmtMin(13 * 60 + 5)).toBe('1:05 pm');
  });
});

describe('start time adjustments', () => {
  it('move only the adjusted prayer, by whole minutes, capped at an hour', () => {
    const base = timesFor(city, wed, 0, true);
    const adj = timesFor(city, wed, 0, true, { Maghrib: 3, Fajr: -2, Isha: 500 });
    expect(adj.Maghrib.getTime() - base.Maghrib.getTime()).toBe(3 * 60000);
    expect(adj.Fajr.getTime() - base.Fajr.getTime()).toBe(-2 * 60000);
    expect(adj.Isha.getTime() - base.Isha.getTime()).toBe(60 * 60000);
    expect(adj.Asr).toEqual(base.Asr);
    expect(adj.Sunrise).toEqual(base.Sunrise);
  });
  it('Ahl-e-Sunnat (Hanafi) Asr is later than Ahl-e-Hadith (standard) Asr', () => {
    expect(timesFor(city, wed, 0, true).Asr.getTime()).toBeGreaterThan(timesFor(city, wed, 0, false).Asr.getTime());
  });
});

describe('notifications with jamaat', () => {
  it('add a labelled jamaat line only when one is set', () => {
    const a = PRAYER_AYAT[0];
    expect(prayerNotice('en', 'Asr', '4:12 pm', a).body.split('\n')).toHaveLength(3);
    const n = prayerNotice('en', 'Asr', '4:12 pm', a, undefined, { time: '4:45 pm', jumuah: false, masjid: 'Masjid an-Noor' });
    expect(n.body.split('\n')[3]).toBe('Jamaat 4:45 pm · Masjid an-Noor');
    expect(n.title).toBe('Asr · 4:12 pm');
  });
  it('are scheduled with the user’s jamaat and adjusted start time', () => {
    const s = { ...getState(), hydrated: true, onboarded: true, city, notifLang: 'en' as const, notifs: [true, false, false, false, false, false], wakeVerify: [false, false, false, false, false], jamaat: { Asr: 17 * 60 }, adj: { Asr: 5 } };
    const plan = planNotifications(s, new Date(2026, 9, 7, 0, 30));
    const asr = plan.find(p => p.kind.startsWith('adhan.Asr'))!;
    const base = timesFor(city, new Date(2026, 9, 7, 12), s.method, s.hanafi).Asr;
    expect(asr.at.getTime() - base.getTime()).toBe(5 * 60000);
    expect(asr.body).toMatch(/\nJamaat 5:00 pm$/);
    const others = plan.filter(p => p.kind.startsWith('adhan.') && !p.kind.startsWith('adhan.Asr'));
    expect(others.length).toBeGreaterThan(0);
    others.forEach(o => expect(o.body).not.toMatch(/Jamaat/));
  });
});

describe('greeting language', () => {
  it('greets in English or Urdu', () => {
    expect(tr('en', 'greet')).toBe('Salam,');
    expect(tr('ur', 'greet')).toBe('السلام علیکم،');
    expect(tr('ur', 'beginsIn', { p: 'عصر' })).toBe('عصر شروع ہونے میں');
  });
});
