import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';
import type { City, PrayerName } from '../data/content';
import { PH } from '../data/content';

const METHOD_FNS = [
  CalculationMethod.Karachi,
  CalculationMethod.MuslimWorldLeague,
  CalculationMethod.NorthAmerica,
  CalculationMethod.UmmAlQura,
  CalculationMethod.Egyptian,
];

export type DayTimes = Record<PrayerName | 'Sunrise', Date>;

export function timesFor(city: City, date: Date, method: number, hanafi: boolean): DayTimes {
  const params = (METHOD_FNS[method] || METHOD_FNS[0])();
  params.madhab = hanafi ? Madhab.Hanafi : Madhab.Shafi;
  const pt = new PrayerTimes(new Coordinates(city.lat, city.lng), date, params);
  return { Fajr: pt.fajr, Sunrise: pt.sunrise, Dhuhr: pt.dhuhr, Asr: pt.asr, Maghrib: pt.maghrib, Isha: pt.isha };
}

/** "4:21 pm" — the casing the v7 design uses everywhere. */
export function fmtTime(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export type NextInfo = {
  /** Index into PH of the upcoming prayer. */
  idx: number;
  name: PrayerName;
  at: Date;
  /** Seconds until `at`. */
  secs: number;
  /** Length of the current window in seconds (previous prayer → next prayer). */
  span: number;
  /** Phase currently in progress (for the sky gradient). */
  phase: PrayerName;
};

export function nextPrayer(city: City, now: Date, method: number, hanafi: boolean): NextInfo {
  const today = timesFor(city, now, method, hanafi);
  for (let i = 0; i < PH.length; i++) {
    const t = today[PH[i]];
    if (t.getTime() > now.getTime()) {
      const prev = i === 0 ? timesFor(city, new Date(now.getTime() - 864e5), method, hanafi).Isha : today[PH[i - 1]];
      return {
        idx: i, name: PH[i], at: t,
        secs: Math.max(0, Math.round((t.getTime() - now.getTime()) / 1000)),
        span: Math.max(1, Math.round((t.getTime() - prev.getTime()) / 1000)),
        phase: i === 0 ? 'Isha' : PH[i - 1],
      };
    }
  }
  const tomorrow = timesFor(city, new Date(now.getTime() + 864e5), method, hanafi);
  return {
    idx: 0, name: 'Fajr', at: tomorrow.Fajr,
    secs: Math.max(0, Math.round((tomorrow.Fajr.getTime() - now.getTime()) / 1000)),
    span: Math.max(1, Math.round((tomorrow.Fajr.getTime() - today.Isha.getTime()) / 1000)),
    phase: 'Isha',
  };
}

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const DIR_WORDS: Record<string, string> = { N: 'north', S: 'south', E: 'east', W: 'west' };

export function qibla(city: City) {
  const deg = Math.round(Qibla(new Coordinates(city.lat, city.lng)));
  const dir = DIRS[Math.round(deg / 22.5) % 16];
  const words = dir.split('').map(c => DIR_WORDS[c]);
  const long = words.length === 3 ? `${words[0]}-${words[1]}${words[2]}` : words.join('');
  return { deg, dir, long };
}

/** Tabular (Kuwaiti) Hijri conversion — ±1 day, needs no Intl calendar support. */
const HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabi’ al-Awwal', 'Rabi’ al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhu al-Qa’dah', 'Dhu al-Hijjah'];
export function hijri(date: Date) {
  const d = date.getDate();
  let m = date.getMonth();
  let y = date.getFullYear();
  if (m < 2) { y -= 1; m += 12; }
  let a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  if (y < 1583) b = 0;
  if (y === 1582) { if (m > 9) b = 0; if (m === 9 && d > 4) b = 0; }
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 2)) + d + b - 1524;
  const iyear = 10631 / 30;
  const epochastro = 1948084;
  const shift1 = 8.01 / 60;
  let z = jd - epochastro;
  const cyc = Math.floor(z / 10631);
  z -= 10631 * cyc;
  const j = Math.floor((z - shift1) / iyear);
  const iy = 30 * cyc + j;
  z -= Math.floor(j * iyear + shift1);
  let im = Math.floor((z + 28.5001) / 29.5);
  if (im === 13) im = 12;
  const id = z - Math.floor(29.5001 * im - 29);
  return `${id} ${HIJRI_MONTHS[im - 1]} ${iy} AH`;
}

export const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
