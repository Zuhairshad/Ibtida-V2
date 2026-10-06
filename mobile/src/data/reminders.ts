/**
 * Reminder and notification wording in English and Urdu, with a short motivating hadith for each
 * kind of reminder. Every quote is an authentic narration with its source; Quran verse text is
 * never written here (see src/lib/quran.ts).
 */
import type { PrayerName } from './content';

export type NotifLang = 'en' | 'ur' | 'both';
export type Quote = { en: string; ur: string; src: string };
export type QuoteKind = 'prayer' | 'fajr' | 'adhkar' | 'quran' | 'goal' | 'focus';

export const QUOTES: Record<QuoteKind, Quote[]> = {
  prayer: [
    { en: 'The most beloved deed to Allah is prayer at its proper time.', ur: 'اللہ کو سب سے محبوب عمل وقت پر نماز پڑھنا ہے۔', src: 'Sahih al-Bukhari 527' },
    { en: 'The five prayers are like a river at your door in which you bathe five times a day.', ur: 'پانچ نمازیں تمہارے دروازے پر بہتی نہر کی مانند ہیں جس میں تم دن میں پانچ بار نہاتے ہو۔', src: 'Sahih al-Bukhari 528 · Sahih Muslim 667' },
    { en: 'The first deed a servant will be asked about on the Day of Resurrection is the prayer.', ur: 'قیامت کے دن بندے سے سب سے پہلے نماز کا حساب لیا جائے گا۔', src: 'Sunan an-Nasaʾi 465 · at-Tirmidhi 413' },
    { en: 'Prayer in congregation is twenty-seven degrees better than praying alone.', ur: 'باجماعت نماز اکیلے نماز سے ستائیس درجے افضل ہے۔', src: 'Sahih al-Bukhari 645 · Sahih Muslim 650' },
    { en: 'Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.', ur: 'جس نے دو ٹھنڈی نمازیں (فجر اور عصر) پڑھیں وہ جنت میں داخل ہوگا۔', src: 'Sahih al-Bukhari 574 · Sahih Muslim 635' },
  ],
  fajr: [
    { en: 'Prayer is better than sleep.', ur: 'نماز نیند سے بہتر ہے۔', src: 'The Fajr adhan · Abu Dawud 500' },
    { en: 'The two rakʿahs of Fajr are better than this world and all it contains.', ur: 'فجر کی دو رکعتیں دنیا اور جو کچھ اس میں ہے اس سے بہتر ہیں۔', src: 'Sahih Muslim 725' },
    { en: 'Whoever prays Fajr is under the protection of Allah.', ur: 'جس نے فجر کی نماز پڑھی وہ اللہ کی حفاظت میں ہے۔', src: 'Sahih Muslim 657' },
    { en: 'Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.', ur: 'جس نے دو ٹھنڈی نمازیں (فجر اور عصر) پڑھیں وہ جنت میں داخل ہوگا۔', src: 'Sahih al-Bukhari 574 · Sahih Muslim 635' },
  ],
  adhkar: [
    { en: 'The one who remembers his Lord and the one who does not are like the living and the dead.', ur: 'اپنے رب کو یاد کرنے والے اور یاد نہ کرنے والے کی مثال زندہ اور مردہ کی سی ہے۔', src: 'Sahih al-Bukhari 6407' },
    { en: 'Keep your tongue moist with the remembrance of Allah.', ur: 'اپنی زبان کو اللہ کے ذکر سے تر رکھو۔', src: 'Jamiʿ at-Tirmidhi 3375' },
    { en: 'Two words light on the tongue, heavy on the scale, beloved to the Most Merciful.', ur: 'دو کلمے زبان پر ہلکے، میزان میں بھاری اور رحمٰن کو محبوب ہیں۔', src: 'Sahih al-Bukhari 6406' },
    { en: 'Allah says: I am with My servant when he remembers Me.', ur: 'اللہ فرماتا ہے: میں اپنے بندے کے ساتھ ہوتا ہوں جب وہ مجھے یاد کرتا ہے۔', src: 'Sahih al-Bukhari 7405 · Sahih Muslim 2675' },
    { en: 'Whoever says SubhanAllahi wa bihamdihi a hundred times a day, his sins are forgiven even if like the foam of the sea.', ur: 'جس نے دن میں سو بار سبحان اللہ وبحمدہ کہا، اس کے گناہ معاف کر دیے جاتے ہیں چاہے سمندر کی جھاگ کے برابر ہوں۔', src: 'Sahih al-Bukhari 6405' },
  ],
  quran: [
    { en: 'Read the Quran, for it will come as an intercessor for its companions on the Day of Resurrection.', ur: 'قرآن پڑھا کرو، کیونکہ یہ قیامت کے دن اپنے پڑھنے والوں کے لیے سفارشی بن کر آئے گا۔', src: 'Sahih Muslim 804' },
    { en: 'Whoever reads a letter from the Book of Allah receives a good deed, and each good deed is multiplied ten times.', ur: 'جس نے کتاب اللہ کا ایک حرف پڑھا اسے ایک نیکی ملے گی، اور ہر نیکی دس گنا ہوتی ہے۔', src: 'Jamiʿ at-Tirmidhi 2910' },
    { en: 'The best of you are those who learn the Quran and teach it.', ur: 'تم میں سب سے بہتر وہ ہے جو قرآن سیکھے اور سکھائے۔', src: 'Sahih al-Bukhari 5027' },
    { en: 'The one who reads the Quran with difficulty, stumbling over it, has a double reward.', ur: 'جو قرآن اٹک اٹک کر مشقت سے پڑھے اس کے لیے دوہرا اجر ہے۔', src: 'Sahih Muslim 798' },
  ],
  goal: [
    { en: 'The most beloved deeds to Allah are those done consistently, even if small.', ur: 'اللہ کو سب سے محبوب وہ عمل ہے جو ہمیشہ کیا جائے، اگرچہ تھوڑا ہو۔', src: 'Sahih al-Bukhari 6464' },
    { en: 'Whoever sends one blessing upon me, Allah sends ten upon him.', ur: 'جو مجھ پر ایک بار درود بھیجے، اللہ اس پر دس رحمتیں بھیجتا ہے۔', src: 'Sahih Muslim 408' },
    { en: 'The Prophet ﷺ sought Allah’s forgiveness a hundred times a day.', ur: 'نبی ﷺ دن میں سو مرتبہ اللہ سے استغفار کیا کرتے تھے۔', src: 'Sahih Muslim 2702' },
    { en: 'Allah says: My servant keeps drawing near to Me with voluntary deeds until I love him.', ur: 'اللہ فرماتا ہے: میرا بندہ نفل عبادات سے میرے قریب ہوتا رہتا ہے یہاں تک کہ میں اس سے محبت کرنے لگتا ہوں۔', src: 'Sahih al-Bukhari 6502' },
  ],
  focus: [
    { en: 'Two blessings many people are deceived about: health and free time.', ur: 'دو نعمتیں ایسی ہیں جن کے بارے میں اکثر لوگ دھوکے میں ہیں: صحت اور فراغت۔', src: 'Sahih al-Bukhari 6412' },
    { en: 'Part of the excellence of a person’s Islam is leaving what does not concern him.', ur: 'آدمی کے اسلام کی خوبی میں سے ہے کہ وہ بے فائدہ چیزوں کو چھوڑ دے۔', src: 'Jamiʿ at-Tirmidhi 2317' },
    { en: 'A servant’s feet will not move on the Day of Resurrection until he is asked how he spent his life.', ur: 'قیامت کے دن بندے کے قدم نہیں ہلیں گے جب تک اس سے نہ پوچھ لیا جائے کہ اس نے اپنی عمر کہاں گزاری۔', src: 'Jamiʿ at-Tirmidhi 2417' },
  ],
};

export const PRAYER_UR: Record<PrayerName | 'Sunrise', string> = {
  Fajr: 'فجر', Sunrise: 'طلوعِ آفتاب', Dhuhr: 'ظہر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء',
};

/** Same quote all day for a reminder (so the schedule stays stable), a different one each day. */
export function quoteFor(kind: QuoteKind, day: Date, salt = 0): Quote {
  const list = QUOTES[kind];
  const n = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000);
  return list[(n + salt) % list.length];
}

/** Durations in Urdu: "45 منٹ", "1 گھنٹہ 30 منٹ". */
export function durUr(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hrs = `${ltr(h)} ${h === 1 ? 'گھنٹہ' : 'گھنٹے'}`;
  if (!h) return `${ltr(m)} منٹ`;
  return m ? `${hrs} ${ltr(m)} منٹ` : hrs;
}

export type Line = { en: string; ur: string };

/**
 * Wraps Latin text (a time, a city, a number) in Unicode left-to-right isolates so it keeps its
 * order inside an Urdu (right-to-left) line: "فجر · 9:20 am · London", not "am · London 9:20".
 */
export const ltr = (s: string | number) => `\u2066${s}\u2069`;

/**
 * Builds a notification in the chosen language, with an optional quote under the message.
 * `both` puts English first, then Urdu, so either reader finds their line.
 */
export function compose(lang: NotifLang, title: Line, body: Line, quote: Quote | null): { title: string; body: string } {
  const q = (l: 'en' | 'ur') => (quote ? (l === 'en' ? `“${quote.en}” — ${quote.src}` : `«${quote.ur}» — ${ltr(quote.src)}`) : '');
  if (lang === 'en') return { title: title.en, body: [body.en, q('en')].filter(Boolean).join('\n') };
  if (lang === 'ur') return { title: title.ur, body: [body.ur, q('ur')].filter(Boolean).join('\n') };
  return { title: `${title.en} · ${title.ur}`, body: [body.en, body.ur, q('ur')].filter(Boolean).join('\n') };
}
