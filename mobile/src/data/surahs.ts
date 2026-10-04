/**
 * Static Quran index metadata (Tanzil numbering, Hafs ayah counts) so the surah list,
 * juz list, progress and search work offline. Names, counts and places only — verse
 * text and translations are never stored here; they come from AlQuran Cloud via
 * `src/lib/quran.ts`.
 */

export type Revelation = 'Makkah' | 'Madinah';
export type SurahMeta = { n: number; name: string; ar: string; ayahs: number; place: Revelation };

/** Surahs Tanzil lists as Medinan; every other surah is Meccan. */
const MEDINAN = new Set([2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110]);

const RAW: [string, string, number][] = [
  ['Al-Fatihah', 'الفاتحة', 7], ['Al-Baqarah', 'البقرة', 286], ['Ali ‘Imran', 'آل عمران', 200],
  ['An-Nisa', 'النساء', 176], ['Al-Ma’idah', 'المائدة', 120], ['Al-An‘am', 'الأنعام', 165],
  ['Al-A‘raf', 'الأعراف', 206], ['Al-Anfal', 'الأنفال', 75], ['At-Tawbah', 'التوبة', 129],
  ['Yunus', 'يونس', 109], ['Hud', 'هود', 123], ['Yusuf', 'يوسف', 111],
  ['Ar-Ra‘d', 'الرعد', 43], ['Ibrahim', 'إبراهيم', 52], ['Al-Hijr', 'الحجر', 99],
  ['An-Nahl', 'النحل', 128], ['Al-Isra', 'الإسراء', 111], ['Al-Kahf', 'الكهف', 110],
  ['Maryam', 'مريم', 98], ['Ta-Ha', 'طه', 135], ['Al-Anbiya', 'الأنبياء', 112],
  ['Al-Hajj', 'الحج', 78], ['Al-Mu’minun', 'المؤمنون', 118], ['An-Nur', 'النور', 64],
  ['Al-Furqan', 'الفرقان', 77], ['Ash-Shu‘ara', 'الشعراء', 227], ['An-Naml', 'النمل', 93],
  ['Al-Qasas', 'القصص', 88], ['Al-‘Ankabut', 'العنكبوت', 69], ['Ar-Rum', 'الروم', 60],
  ['Luqman', 'لقمان', 34], ['As-Sajdah', 'السجدة', 30], ['Al-Ahzab', 'الأحزاب', 73],
  ['Saba', 'سبأ', 54], ['Fatir', 'فاطر', 45], ['Ya-Sin', 'يس', 83],
  ['As-Saffat', 'الصافات', 182], ['Sad', 'ص', 88], ['Az-Zumar', 'الزمر', 75],
  ['Ghafir', 'غافر', 85], ['Fussilat', 'فصلت', 54], ['Ash-Shura', 'الشورى', 53],
  ['Az-Zukhruf', 'الزخرف', 89], ['Ad-Dukhan', 'الدخان', 59], ['Al-Jathiyah', 'الجاثية', 37],
  ['Al-Ahqaf', 'الأحقاف', 35], ['Muhammad', 'محمد', 38], ['Al-Fath', 'الفتح', 29],
  ['Al-Hujurat', 'الحجرات', 18], ['Qaf', 'ق', 45], ['Adh-Dhariyat', 'الذاريات', 60],
  ['At-Tur', 'الطور', 49], ['An-Najm', 'النجم', 62], ['Al-Qamar', 'القمر', 55],
  ['Ar-Rahman', 'الرحمن', 78], ['Al-Waqi‘ah', 'الواقعة', 96], ['Al-Hadid', 'الحديد', 29],
  ['Al-Mujadilah', 'المجادلة', 22], ['Al-Hashr', 'الحشر', 24], ['Al-Mumtahanah', 'الممتحنة', 13],
  ['As-Saff', 'الصف', 14], ['Al-Jumu‘ah', 'الجمعة', 11], ['Al-Munafiqun', 'المنافقون', 11],
  ['At-Taghabun', 'التغابن', 18], ['At-Talaq', 'الطلاق', 12], ['At-Tahrim', 'التحريم', 12],
  ['Al-Mulk', 'الملك', 30], ['Al-Qalam', 'القلم', 52], ['Al-Haqqah', 'الحاقة', 52],
  ['Al-Ma‘arij', 'المعارج', 44], ['Nuh', 'نوح', 28], ['Al-Jinn', 'الجن', 28],
  ['Al-Muzzammil', 'المزمل', 20], ['Al-Muddaththir', 'المدثر', 56], ['Al-Qiyamah', 'القيامة', 40],
  ['Al-Insan', 'الإنسان', 31], ['Al-Mursalat', 'المرسلات', 50], ['An-Naba', 'النبأ', 40],
  ['An-Nazi‘at', 'النازعات', 46], ['‘Abasa', 'عبس', 42], ['At-Takwir', 'التكوير', 29],
  ['Al-Infitar', 'الانفطار', 19], ['Al-Mutaffifin', 'المطففين', 36], ['Al-Inshiqaq', 'الانشقاق', 25],
  ['Al-Buruj', 'البروج', 22], ['At-Tariq', 'الطارق', 17], ['Al-A‘la', 'الأعلى', 19],
  ['Al-Ghashiyah', 'الغاشية', 26], ['Al-Fajr', 'الفجر', 30], ['Al-Balad', 'البلد', 20],
  ['Ash-Shams', 'الشمس', 15], ['Al-Layl', 'الليل', 21], ['Ad-Duha', 'الضحى', 11],
  ['Ash-Sharh', 'الشرح', 8], ['At-Tin', 'التين', 8], ['Al-‘Alaq', 'العلق', 19],
  ['Al-Qadr', 'القدر', 5], ['Al-Bayyinah', 'البينة', 8], ['Az-Zalzalah', 'الزلزلة', 8],
  ['Al-‘Adiyat', 'العاديات', 11], ['Al-Qari‘ah', 'القارعة', 11], ['At-Takathur', 'التكاثر', 8],
  ['Al-‘Asr', 'العصر', 3], ['Al-Humazah', 'الهمزة', 9], ['Al-Fil', 'الفيل', 5],
  ['Quraysh', 'قريش', 4], ['Al-Ma‘un', 'الماعون', 7], ['Al-Kawthar', 'الكوثر', 3],
  ['Al-Kafirun', 'الكافرون', 6], ['An-Nasr', 'النصر', 3], ['Al-Masad', 'المسد', 5],
  ['Al-Ikhlas', 'الإخلاص', 4], ['Al-Falaq', 'الفلق', 5], ['An-Nas', 'الناس', 6],
];

export const SURAHS: SurahMeta[] = RAW.map(([name, ar, ayahs], i) => ({
  n: i + 1, name, ar, ayahs, place: MEDINAN.has(i + 1) ? 'Madinah' : 'Makkah',
}));

export const TOTAL_AYAHS = 6236;

/** First ayah of each of the 30 juz, as [surah, ayah]. */
export const JUZ_STARTS: [number, number][] = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

export const isSurah = (s: unknown): s is number => typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= 114;
export const surahMeta = (s: number): SurahMeta | undefined => (isSurah(s) ? SURAHS[s - 1] : undefined);
export const isAyahRef = (s: number, a: number) => isSurah(s) && Number.isInteger(a) && a >= 1 && a <= SURAHS[s - 1].ayahs;

const OFFSETS = SURAHS.reduce<number[]>((acc, s, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + SURAHS[i - 1].ayahs); return acc; }, []);

/** 1-based position of an ayah in the whole mushaf (1:1 → 1, 114:6 → 6236). */
export const globalIndex = (s: number, a: number) => OFFSETS[s - 1] + a;

/** Juz (1–30) that contains surah:ayah. */
export function juzOf(s: number, a: number) {
  const g = globalIndex(s, a);
  let j = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) if (globalIndex(...JUZ_STARTS[i]) <= g) j = i + 1;
  return j;
}

/** How far through juz `j` the ayah s:a is, 0–100 (null when it lies outside that juz). */
export function juzPct(j: number, s: number, a: number): number | null {
  const start = globalIndex(...JUZ_STARTS[j - 1]);
  const end = j < 30 ? globalIndex(...JUZ_STARTS[j]) : TOTAL_AYAHS + 1;
  const g = globalIndex(s, a);
  if (g < start || g >= end) return null;
  return Math.round(((g - start + 1) / (end - start)) * 100);
}

/** Percent of a surah read when the reader is at ayah `a`. */
export const surahPct = (s: number, a: number) => {
  const m = surahMeta(s);
  return m ? Math.max(0, Math.min(100, Math.round((a / m.ayahs) * 100))) : 0;
};

/** Parses "2:255", "2.255" or "2 : 255" into a valid reference, else null. */
export function parseRef(q: string): { s: number; a: number } | null {
  const m = /^\s*(\d{1,3})\s*[:.]\s*(\d{1,3})\s*$/.exec(q);
  if (!m) return null;
  const s = +m[1];
  const a = +m[2];
  return isAyahRef(s, a) ? { s, a } : null;
}

const fold = (x: string) => x.toLowerCase().replace(/[‘’'`\-\s]/g, '');

/** Surah search by number, transliteration (punctuation-insensitive) or Arabic name. */
export function searchSurahs(q: string): SurahMeta[] {
  const raw = q.trim();
  if (!raw) return SURAHS;
  if (/^\d{1,3}$/.test(raw)) return SURAHS.filter(s => String(s.n) === raw || String(s.n).startsWith(raw));
  const f = fold(raw);
  return SURAHS.filter(s => fold(s.name).includes(f) || s.ar.includes(raw));
}
