/**
 * Static content from the v7 prototype. Religious text is limited to short, well-sourced
 * dhikr and hadith carried over verbatim from the design. Quran verse text is never
 * written here — it is loaded from AlQuran Cloud (Tanzil) by `src/lib/quran.ts`, and the
 * surah index lives in `src/data/surahs.ts` (content governance §35).
 */
import type { IconName } from '../components/Icon';

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
export const PH: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const PRAYER_META: Record<PrayerName | 'Sunrise', { ic: IconName; rak?: string[] }> = {
  Fajr: { ic: 'sunrise', rak: ['2 Sunnah', '2 Fard'] },
  Sunrise: { ic: 'sun' },
  Dhuhr: { ic: 'sun', rak: ['4 Sunnah', '4 Fard', '2 Sunnah', '2 Nafl'] },
  Asr: { ic: 'dusk', rak: ['4 Sunnah', '4 Fard'] },
  Maghrib: { ic: 'sunset', rak: ['3 Fard', '2 Sunnah', '2 Nafl'] },
  Isha: { ic: 'moon', rak: ['4 Sunnah', '4 Fard', '2 Sunnah', '2 Nafl', '3 Witr'] },
};

export type City = { name: string; lat: number; lng: number };
export const CITIES: City[] = [
  { name: 'Lahore, Pakistan', lat: 31.5204, lng: 74.3587 },
  { name: 'Lagos, Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Leicester, UK', lat: 52.6369, lng: -1.1398 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437 },
  { name: 'Karachi, Pakistan', lat: 24.8607, lng: 67.0011 },
  { name: 'Kuala Lumpur, Malaysia', lat: 3.139, lng: 101.6869 },
  { name: 'Istanbul, Türkiye', lat: 41.0082, lng: 28.9784 },
  { name: 'Jakarta, Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Manchester, UK', lat: 53.4808, lng: -2.2426 },
  { name: 'Chicago, USA', lat: 41.8781, lng: -87.6298 },
];

export const METHODS = [
  { k: 'Karachi', name: 'University of Islamic Sciences, Karachi', sub: 'Pakistan, India, Bangladesh' },
  { k: 'MWL', name: 'Muslim World League', sub: 'Europe, Far East' },
  { k: 'ISNA', name: 'ISNA', sub: 'North America' },
  { k: 'Umm Al-Qura', name: 'Umm Al-Qura, Makkah', sub: 'Arabian Peninsula' },
  { k: 'Egypt', name: 'Egyptian General Authority', sub: 'Africa, Syria, Lebanon' },
] as const;

export const CATS = [
  { k: 'Morning', ar: 'أذكار الصباح', n: 18, m: 7, pct: 100, bg: 'linear-gradient(160deg, #D9853F, #8E4430)' },
  { k: 'Evening', ar: 'أذكار المساء', n: 20, m: 8, pct: 30, bg: 'linear-gradient(160deg, #6A5AA8, #2A2552)' },
  { k: 'After Salah', ar: 'بعد الصلاة', n: 9, m: 3, pct: 66, bg: 'linear-gradient(160deg, #2E8079, #1A4447)' },
  { k: 'Protection', ar: 'التحصين', n: 7, m: 3, pct: 0, bg: 'linear-gradient(160deg, #4568B3, #1F2E5E)' },
  { k: 'Forgiveness', ar: 'الاستغفار', n: 6, m: 2, pct: 0, bg: 'linear-gradient(160deg, #8C5AA3, #432A57)' },
  { k: 'Gratitude', ar: 'الشكر', n: 5, m: 2, pct: 40, bg: 'linear-gradient(160deg, #B98440, #6A4520)' },
  { k: 'Before Sleep', ar: 'أذكار النوم', n: 8, m: 4, pct: 0, bg: 'linear-gradient(160deg, #34406A, #12172B)' },
  { k: 'Travel', ar: 'أذكار السفر', n: 5, m: 2, pct: 0, bg: 'linear-gradient(160deg, #4F8A6A, #233F31)' },
];

export const SESS = [
  { ar: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', tr: 'SubhanAllahi wa bihamdihi', en: 'Glory be to Allah, and all praise is His.', src: 'Sahih al-Bukhari 6405', n: 100, ur: 'اللہ پاک ہے اور تمام تعریف اسی کے لیے ہے۔' },
  { ar: 'أَسْتَغْفِرُ اللهَ', tr: 'Astaghfirullah', en: 'I seek the forgiveness of Allah.', src: 'Sahih Muslim 591', n: 3, ur: 'میں اللہ سے مغفرت طلب کرتا ہوں۔' },
  { ar: 'سُبْحَانَ اللهِ', tr: 'SubhanAllah', en: 'Glory be to Allah.', src: 'Sahih Muslim 596', n: 33, ur: 'اللہ پاک ہے۔' },
];

export const DHIKR = [
  { label: 'SubhanAllah', ar: 'سُبْحَانَ اللهِ', t: 33, note: 'After-salah tasbih, 33 times · Sahih Muslim 596' },
  { label: 'Alhamdulillah', ar: 'اَلْحَمْدُ لِلَّهِ', t: 33, note: 'After-salah tahmid, 33 times · Sahih Muslim 596' },
  { label: 'Allahu Akbar', ar: 'اَللهُ أَكْبَرُ', t: 34, note: 'After-salah takbir, 34 times · Sahih Muslim 596' },
  { label: 'Astaghfirullah', ar: 'أَسْتَغْفِرُ اللهَ', t: 100, note: 'Seeking forgiveness a hundred times a day · Sahih Muslim 2702' },
  { label: 'Durood', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', t: 100, note: 'Niyyah: sending blessings upon the Prophet ﷺ' },
];

export const HADITH = [
  { ar: 'أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ', en: 'The most beloved deeds to Allah are those done consistently, even if small.', src: 'Sahih al-Bukhari 6464', ur: 'اللہ کو سب سے زیادہ محبوب وہ عمل ہے جو ہمیشہ کیا جائے، اگرچہ تھوڑا ہو۔' },
  { ar: 'مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ', en: 'Whoever guides someone to goodness will have a reward like the one who does it.', src: 'Sahih Muslim 1893', ur: 'جس نے کسی بھلائی کی طرف رہنمائی کی، اسے اس پر عمل کرنے والے جیسا اجر ملے گا۔' },
  { ar: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ ثَقِيلَتَانِ فِي الْمِيزَانِ', en: 'Two words light on the tongue, heavy on the scale: SubhanAllahi wa bihamdihi, SubhanAllahil-Azim.', src: 'Sahih al-Bukhari 6406', ur: 'دو کلمے زبان پر ہلکے، میزان میں بھاری اور رحمٰن کو محبوب ہیں: سبحان اللہ وبحمدہ، سبحان اللہ العظیم۔' },
];

const AR_NUM = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const arNum = (n: number) => String(n).split('').map(d => AR_NUM[+d]).join('');

export const APPS = ['Instagram', 'TikTok', 'YouTube', 'X', 'Snapchat', 'Facebook'];

export const RESULTS = [
  { type: 'Quran', title: 'Surah Nuh · 71:10', sub: 'Open in the reader', tag: 'Quran', keys: 'istighfar forgiveness astaghfirullah استغفار' },
  { type: 'Hadith', title: 'Sahih Muslim 591', sub: 'Istighfar after salah', tag: 'Sahih', keys: 'istighfar astaghfirullah salah استغفار' },
  { type: 'Hadith', title: 'Sahih Muslim 2702', sub: 'Seeking forgiveness 100 times a day', tag: 'Sahih', keys: 'istighfar forgiveness استغفار' },
  { type: 'Azkar', title: 'Forgiveness adhkar', sub: '6 adhkar · 2 min', tag: 'Category', keys: 'istighfar forgiveness استغفار' },
  { type: 'Hadith', title: 'Sahih al-Bukhari 6405', sub: 'SubhanAllahi wa bihamdihi', tag: 'Sahih', keys: 'tasbih subhanallah dhikr سبحان' },
  { type: 'Quran', title: 'Ayat al-Kursi · 2:255', sub: 'Open in the reader', tag: 'Quran', keys: 'kursi protection throne كرسي' },
  { type: 'Azkar', title: 'Morning adhkar', sub: '18 adhkar · 7 min', tag: 'Category', keys: 'morning sabah صباح' },
  { type: 'Azkar', title: 'Before sleep', sub: '8 adhkar · 4 min', tag: 'Category', keys: 'sleep night نوم' },
] as const;

export type FeedTint = 'amb' | 'mint' | 'blue' | 'lav';
export const FEED: { k: string; icon: IconName; tint: FeedTint; text: string; sub: string; n: number }[] = [
  { k: 'f1', icon: 'flame', tint: 'amb', text: 'Rahman family completed 30 days of Fajr together', sub: 'Your circle · 12 min ago', n: 24 },
  { k: 'f2', icon: 'spark', tint: 'mint', text: 'A circle in Lagos reached 10,000 Salawat', sub: 'Global · 38 min ago', n: 311 },
  { k: 'f3', icon: 'beads', tint: 'blue', text: '1 Million Salawat passed 64%', sub: 'Community goal · 1 hr ago', n: 1204 },
  { k: 'f4', icon: 'people', tint: 'lav', text: 'Amina joined Thursday halaqa', sub: 'Your circle · 2 hr ago', n: 6 },
  { k: 'f5', icon: 'prayer', tint: 'mint', text: '9,117 people logged Fajr in Fajr together', sub: 'Community goal · 5 hr ago', n: 890 },
];

export const COMMUNITY_GOALS = [
  { name: '1 Million Salawat', done: 648329, total: 1000000, people: 18421, ends: '6 days' },
  { name: 'Fajr together · 30 days', done: 101240, total: 300000, people: 9117, ends: '21 days' },
  { name: '10 Million Istighfar', done: 5210400, total: 10000000, people: 41208, ends: '12 days' },
];

export const GOAL_PRESETS: [string, string][] = [
  ['Durood Sharif', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ'],
  ['Istighfar', 'أَسْتَغْفِرُ اللهَ'],
  ['SubhanAllahi wa bihamdihi', 'سُبْحَانَ اللهِ وَبِحَمْدِهِ'],
  ['La ilaha illa Allah', 'لَا إِلٰهَ إِلَّا اللهُ'],
];

export const MILESTONES: [string, string, number][] = [
  ['3', '3-Day Spark', 3], ['7', '7-Day Warrior', 7], ['14', '2-Week Steadfast', 14],
  ['30', '30-Day Devoted', 30], ['60', '60-Day Khushoo', 60], ['100', 'Centennial Mujahid', 100],
];

export const IMPACT_TARGET = 2847391;

/** Deterministic PRNG from the prototype — keeps stars / heatmaps stable between renders. */
export const rnd = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
export const STARS = (() => {
  const r = rnd(7);
  return Array.from({ length: 18 }, () => ({ x: Math.round(r() * 94 + 3), y: Math.round(r() * 55 + 3), s: r() > 0.7 ? 3 : 2, d: 2 + r() * 3, delay: r() * 3 }));
})();

export const fmt = (n: number) => n.toLocaleString('en-US');
export const mmss = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
export const code8 = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 8; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
};
