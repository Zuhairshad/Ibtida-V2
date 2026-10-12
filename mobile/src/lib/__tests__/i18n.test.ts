import { STR, adhkarCatName, countdownText, daysText, overviewMessage, dirUr, dowLabel, dowWord, hijriText, leftText, monLabel, streakNote, tr } from '../i18n';
import { hijri } from '../prayer';

const d = new Date(2026, 9, 12, 12);

describe('i18n english stays unchanged', () => {
  it('weekday and month labels', () => {
    expect(dowLabel('en', 1)).toBe('MON');
    expect(dowWord('en', 1)).toBe('Mon');
    expect(monLabel('en', 9)).toBe('OCT');
  });
  it('hijri line matches hijri()', () => {
    expect(hijriText('en', d)).toBe(hijri(d));
  });
  it('countdowns', () => {
    expect(countdownText('en', 3900)).toBe('1h 05m');
    expect(countdownText('en', 249)).toBe('4m 09s');
    expect(leftText('en', 7500)).toBe('2h 5m');
    expect(leftText('en', 700)).toBe('12 min');
  });
  it('streak note', () => {
    expect(streakNote('en', 0)).toBe(tr('en', 'startStreak'));
  });
  it('adhkar category passthrough', () => {
    expect(adhkarCatName('en', 'Morning')).toBe('Morning');
    expect(adhkarCatName('en', 'Custom')).toBe('Custom');
  });
});

describe('i18n urdu', () => {
  it('has Urdu weekday, month and Hijri names with Latin digits', () => {
    expect(dowLabel('ur', 1)).toBe('پیر');
    expect(monLabel('ur', 9)).toBe('اکتوبر');
    const h = hijriText('ur', d);
    expect(h).toMatch(/^\d+ \S/);
    expect(h).toMatch(/ہجری$/);
    expect(h).not.toMatch(/[A-Za-z]|AH/);
  });
  it('spells countdown units out, keeping Latin digits', () => {
    expect(countdownText('ur', 3900)).toBe('1 گھنٹے 05 منٹ');
    expect(countdownText('ur', 249)).toBe('4 منٹ 09 سیکنڈ');
    expect(leftText('ur', 700)).toBe('12 منٹ');
  });
  it('compass bearings in words', () => {
    expect(dirUr('NW')).toBe('شمال مغرب');
  });
  it('every string has a non-empty Urdu value without stray placeholders', () => {
    const table: Record<string, { en: string; ur: string }> = STR;
    for (const v of Object.values(table)) {
      expect(v.ur.length).toBeGreaterThan(0);
      const en = v.en.match(/\{\w+\}/g) ?? [];
      for (const ph of v.ur.match(/\{\w+\}/g) ?? []) expect(en).toContain(ph);
    }
  });
  it('streak note is Urdu after a milestone', () => {
    expect(streakNote('ur', 5)).not.toMatch(/[A-Za-z]/);
  });
});

describe('home overview message', () => {
  const en = [
    'Alhamdulillah — every prayer and goal met today. May Allah accept it.',
    'Keep your 4-day streak going — one prayer or one dhikr is enough to begin.',
    'A new day. Begin with Bismillah and one small act.',
    'It’s not too late — start with one dhikr.',
    'Every goal met today. The most beloved deeds are the consistent ones.',
    'Nearly there — 12 more for Salawat.',
    '3 of 5 prayers logged. Keep each one on time.',
    'Small and steady. Every count is written.',
  ];
  it('english passes through untouched', () => {
    for (const m of en) expect(overviewMessage('en', m)).toBe(m);
  });
  it('every message has an Urdu form (goal name is the only Latin text)', () => {
    for (const m of en) expect(overviewMessage('ur', m).replace(/\u2068.*?\u2069/g, '')).not.toMatch(/[A-Za-z]/);
    expect(overviewMessage('ur', en[1])).toContain('4');
  });
  it('day counts', () => {
    expect(daysText('en', '3 days')).toBe('3 days');
    expect(daysText('ur', 'a day')).toBe('ایک دن');
    expect(daysText('ur', '3 days')).toBe('3 دن');
  });
});
