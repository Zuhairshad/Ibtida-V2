/**
 * English / Urdu text for the greeting and the main screens (Home, Prayer, Masjid & timings).
 * Screens not listed here stay in English. The user's name is shown exactly as saved in both.
 */
import { MILESTONES, type PrayerName } from '../data/content';
import { PRAYER_UR } from '../data/reminders';
import { useApp, type Lang } from '../state/store';
import { DOW, hijri, hijriParts, MON } from './prayer';

export const STR = {
  greet: { en: 'Salam,', ur: 'السلام علیکم،' },
  friend: { en: 'friend', ur: 'دوست' },
  basedOnLocation: { en: 'BASED ON YOUR LOCATION', ur: 'آپ کے مقام کے مطابق' },
  timeline: { en: 'Prayer timeline', ur: 'نماز کا شیڈول' },
  nextPrayer: { en: 'NEXT PRAYER', ur: 'اگلی نماز' },
  beginsIn: { en: '{p} begins in', ur: '{p} شروع ہونے میں' },
  prayerTimes: { en: 'Prayer times', ur: 'نماز کے اوقات' },
  titleA: { en: 'Prayer', ur: 'نماز کے' },
  titleB: { en: 'Times', ur: 'اوقات' },
  untilAdhan: { en: 'until adhan', ur: 'اذان تک' },
  begins: { en: 'Begins', ur: 'وقت شروع' },
  jamaat: { en: 'Jamaat', ur: 'جماعت' },
  jumuah: { en: 'Jumu‘ah', ur: 'جمعہ' },
  notSet: { en: 'Not set', ur: 'مقرر نہیں' },
  sunrise: { en: 'Sunrise', ur: 'طلوعِ آفتاب' },
  notPrayer: { en: 'Not a prayer time', ur: 'نماز کا وقت نہیں' },
  prayed: { en: 'Prayed · logged', ur: 'ادا ہو گئی' },
  missed: { en: 'Missed · tap to make up', ur: 'قضا · ادا کرنے کے لیے ٹیپ کریں' },
  missedShort: { en: 'Missed · make up', ur: 'قضا' },
  next: { en: 'Next', ur: 'اگلی' },
  adhanOn: { en: 'Adhan on', ur: 'اذان آن' },
  adhanOff: { en: 'Adhan off', ur: 'اذان بند' },
  masjidTimes: { en: 'Masjid & jamaat times', ur: 'مسجد اور جماعت کے اوقات' },
  masjidTimesA11y: { en: 'Masjid and jamaat times', ur: 'مسجد اور جماعت کے اوقات' },
  addMasjid: { en: 'Add your masjid’s jamaat times', ur: 'اپنی مسجد کی جماعت کے اوقات شامل کریں' },
  // Home
  dailyAdhkar: { en: 'Daily adhkar', ur: 'روزانہ اذکار' },
  quran: { en: 'Quran', ur: 'قرآن' },
  ibadahLock: { en: 'Ibadah Lock', ur: 'عبادت لاک' },
  startReading: { en: 'Start reading', ur: 'پڑھنا شروع کریں' },
  focusSub: { en: 'Focus while you recite', ur: 'تلاوت کے دوران یکسوئی' },
  catMorning: { en: 'Morning', ur: 'صبح' },
  catEvening: { en: 'Evening', ur: 'شام' },
  catSleep: { en: 'Before Sleep', ur: 'سونے سے پہلے' },
  minutes: { en: '{n} min', ur: '{n} منٹ' },
  qibla: { en: 'QIBLA', ur: 'قبلہ' },
  kalimat: { en: 'KALIMAT', ur: 'کلمات' },
  search: { en: 'Search', ur: 'تلاش' },
  notifications: { en: 'Notifications', ur: 'اطلاعات' },
  calendarProgress: { en: 'Calendar and progress', ur: 'کیلنڈر اور پیش رفت' },
  showingTimes: { en: 'Showing times for {d}', ur: 'اوقات برائے {d}' },
  nextPrayerA11y: { en: 'Next prayer {p} in {c}', ur: 'اگلی نماز {p}، {c} میں' },
  showSky: { en: 'Show {p} sky', ur: '{p} کا آسمان دکھائیں' },
  yourConsistency: { en: 'YOUR CONSISTENCY', ur: 'آپ کا تسلسل' },
  dailyInsight: { en: 'Daily insight', ur: 'روزانہ بصیرت' },
  openDailyInsight: { en: 'Open daily insight', ur: 'روزانہ بصیرت کھولیں' },
  dayStreak: { en: 'day streak', ur: 'دن کا تسلسل' },
  openInsight: { en: 'Open insight', ur: 'بصیرت کھولیں' },
  startStreak: { en: 'Log a prayer or a dhikr today to start your streak.', ur: 'اپنا تسلسل شروع کرنے کے لیے آج کوئی نماز یا ذکر درج کریں۔' },
  earnedMs: { en: '{m} earned. ', ur: '{m} حاصل ہوا۔ ' },
  toReachMs: { en: '{n} more {u} to reach {m}.', ur: '{m} تک پہنچنے میں {n} دن باقی۔' },
  allMs: { en: 'Every milestone reached — keep going.', ur: 'تمام سنگِ میل حاصل ہو گئے — جاری رکھیں۔' },
  ummahToday: { en: 'THE UMMAH TODAY', ur: 'آج کی امت' },
  communityImpact: { en: 'Community impact', ur: 'امت کا اثر' },
  dhikrToday: { en: 'dhikr counted today', ur: 'آج گنے گئے اذکار' },
  plusHour: { en: '+{n} this hour', ur: 'اس گھنٹے میں +{n}' },
  firstHour: { en: 'be the first this hour', ur: 'اس گھنٹے میں پہلے بنیں' },
  countTogether: { en: 'Count together with the Ummah', ur: 'امت کے ساتھ مل کر ذکر کریں' },
  signInLive: { en: 'Sign in and connect to see today’s live total.', ur: 'آج کا براہِ راست مجموعہ دیکھنے کے لیے سائن اِن کریں اور آن لائن ہوں۔' },
  hadithMoment: { en: 'HADITH OF THE MOMENT', ur: 'اس لمحے کی حدیث' },
  // Prayer
  locationMethod: { en: 'Location and method', ur: 'مقام اور طریقہ' },
  wakeAlarm: { en: 'Wake alarm', ur: 'جگانے والا الارم' },
  hanafiAsr: { en: 'Hanafi Asr', ur: 'حنفی عصر' },
  standardAsr: { en: 'Standard Asr', ur: 'معیاری عصر' },
  adjusted: { en: 'adjusted', ur: 'ایڈجسٹ شدہ' },
  prayerCap: { en: 'PRAYER', ur: 'نماز' },
  adhanFor: { en: 'Adhan for {p}', ur: 'اذان: {p}' },
  adhanOnFor: { en: 'Adhan on for {p}', ur: 'اذان آن: {p}' },
  adhanOffFor: { en: 'Adhan off for {p}', ur: 'اذان بند: {p}' },
  unmark: { en: 'Unmark {p}', ur: '{p} کا نشان ہٹائیں' },
  markPrayed: { en: 'Mark {p} as prayed', ur: '{p} کو ادا شدہ نشان کریں' },
  logged: { en: '{p} logged · May Allah accept it', ur: '{p} درج ہو گئی · اللہ قبول فرمائے' },
  yourMasjid: { en: 'Your masjid', ur: 'آپ کی مسجد' },
  setByYou: { en: '{n} set by you', ur: '{n} آپ نے مقرر کیے' },
  qiblaDirection: { en: 'Qibla direction', ur: 'قبلے کی سمت' },
  qiblaBearing: { en: '{deg}° {dir} of true north', ur: '{deg}° {dir}، حقیقی شمال سے' },
  tapCompass: { en: 'Tap “Use compass” to turn the live compass on.', ur: 'لائیو قطب نما چلانے کے لیے «قطب نما استعمال کریں» دبائیں۔' },
  compassDenied: { en: 'Compass access is off. The dial shows the bearing from true north — line its N up with north.', ur: 'قطب نما کی اجازت بند ہے۔ ڈائل حقیقی شمال سے سمت دکھاتا ہے — اس کے N کو شمال کے سامنے رکھیں۔' },
  compassNone: { en: 'This device has no compass. The dial shows the bearing from true north.', ur: 'اس آلے میں قطب نما نہیں ہے۔ ڈائل حقیقی شمال سے سمت دکھاتا ہے۔' },
  compassStarting: { en: 'Starting the compass…', ur: 'قطب نما شروع ہو رہا ہے…' },
  facingQibla: { en: 'You are facing the Qibla.', ur: 'آپ کا رخ قبلے کی طرف ہے۔' },
  turnRight: { en: 'Turn right {n}°', ur: 'دائیں مڑیں {n}°' },
  turnLeft: { en: 'Turn left {n}°', ur: 'بائیں مڑیں {n}°' },
  sideRight: { en: 'right', ur: 'دائیں' },
  sideLeft: { en: 'left', ur: 'بائیں' },
  compassAhead: { en: 'Compass. Qibla is straight ahead', ur: 'قطب نما۔ قبلہ بالکل سامنے ہے' },
  compassSide: { en: 'Compass. Qibla is {n} degrees to your {s}', ur: 'قطب نما۔ قبلہ آپ کے {s} جانب {n} درجے پر ہے' },
  compassBearing: { en: 'Qibla bearing {deg} degrees from true north', ur: 'قبلے کی سمت حقیقی شمال سے {deg} درجے' },
  useCompass: { en: 'Use compass', ur: 'قطب نما استعمال کریں' },
  calibrate: { en: 'Compass needs calibrating — move your phone in a figure-8 a few times, away from metal and magnets.', ur: 'قطب نما کو درست کرنا ہے — فون کو دھات اور مقناطیس سے دور رکھ کر چند بار آٹھ (8) کی شکل میں گھمائیں۔' },
  holdFlat: { en: 'Hold your phone flat. {c} → Makkah, great-circle bearing.', ur: 'فون کو سیدھا رکھیں۔ {c} سے مکہ مکرمہ تک، سیدھے فضائی راستے کی سمت۔' },
  magCorrected: { en: ' Magnetic north corrected by {d}° (WMM 2025).', ur: ' مقناطیسی شمال کی اصلاح {d}° (WMM 2025)۔' },
  trueNorthPhone: { en: ' True north from your phone.', ur: ' فون سے حقیقی شمال۔' },
  statusPrayed: { en: 'Prayed', ur: 'ادا شدہ' },
  statusMissed: { en: 'Missed', ur: 'قضا' },
  statusUpcoming: { en: 'Upcoming', ur: 'آنے والی' },
  until: { en: 'until {x}', ur: '{x} تک' },
  calcLocation: { en: 'Calculated for your location', ur: 'آپ کے مقام کے مطابق حساب شدہ' },
  calcAdjusted: { en: 'Calculated, {n} min by you', ur: 'حساب شدہ، آپ کی طرف سے {n} منٹ' },
  beginsCap: { en: 'BEGINS', ur: 'وقت شروع' },
  jamaatCap: { en: 'JAMAAT', ur: 'جماعت' },
  jumuahCap: { en: 'JUMU‘AH', ur: 'جمعہ' },
  jamaatEdit: { en: 'Jamaat {t}, edit', ur: 'جماعت {t}، تبدیل کریں' },
  setJamaat: { en: 'Set jamaat time', ur: 'جماعت کا وقت مقرر کریں' },
  setByYouShort: { en: 'Set by you', ur: 'آپ کا مقرر کردہ' },
  addMasjidTime: { en: 'Add your masjid’s time', ur: 'اپنی مسجد کا وقت شامل کریں' },
  rakahCap: { en: 'RAK’AH · COMMON HANAFI PRACTICE', ur: 'رکعات · عام حنفی طریقہ' },
  adhanSound: { en: 'ADHAN SOUND', ur: 'اذان کی آواز' },
  shortOpening: { en: 'Short opening only', ur: 'صرف مختصر آغاز' },
  shortOpeningSub: { en: '“Allahu Akbar, Allahu Akbar” instead of the full adhan', ur: 'مکمل اذان کی جگہ صرف «اللہ اکبر، اللہ اکبر»' },
  playsAtVolume: { en: 'Plays at your notification volume; a phone on silent stays silent.', ur: 'نوٹیفکیشن کی آواز کے مطابق بجتی ہے؛ سائلنٹ فون خاموش ہی رہتا ہے۔' },
  hearIt: { en: 'Hear it', ur: 'سنیں' },
  hearAdhan: { en: 'Hear the adhan sound', ur: 'اذان کی آواز سنیں' },
  missedBtn: { en: 'Missed', ur: 'قضا' },
  prayedOnTime: { en: 'Prayed on time', ur: 'وقت پر ادا کی' },
  addedQada: { en: '{p} added to Qada', ur: '{p} قضا میں شامل' },
  wakeVerify: { en: 'Set up wake verification', ur: 'جاگنے کی تصدیق مقرر کریں' },
  // Masjid & timings
  jTitle: { en: 'Masjid & timings', ur: 'مسجد اور اوقات' },
  jStmA: { en: 'Your masjid’s times.', ur: 'آپ کی مسجد کے اوقات۔' },
  jStmB: { en: 'Entered by you, never guessed.', ur: 'آپ کے درج کردہ، اندازے سے نہیں۔' },
  masjidCap: { en: 'MASJID', ur: 'مسجد' },
  masjidPlaceholder: { en: 'e.g. Masjid an-Noor', ur: 'مثلاً مسجد النور' },
  masjidName: { en: 'Masjid name', ur: 'مسجد کا نام' },
  jamaatTimesCap: { en: 'JAMAAT TIMES', ur: 'جماعت کے اوقات' },
  jumuahSub: { en: 'Fridays · in place of Dhuhr jamaat', ur: 'جمعہ کے دن · ظہر کی جماعت کی جگہ' },
  beginsToday: { en: 'Begins {t} today', ur: 'آج {t} سے شروع' },
  slotJamaat: { en: '{l} jamaat', ur: '{l} کی جماعت' },
  notSetLower: { en: 'not set', ur: 'مقرر نہیں' },
  neverCalculated: { en: 'Jamaat times differ from masjid to masjid, so Ibtida never calculates them. Only the times you enter are shown, and an empty one stays empty.', ur: 'جماعت کے اوقات ہر مسجد میں مختلف ہوتے ہیں، اس لیے ابتدا ان کا حساب نہیں لگاتی۔ صرف وہی اوقات دکھائے جاتے ہیں جو آپ درج کریں، اور خالی وقت خالی ہی رہتا ہے۔' },
  schoolCap: { en: 'SCHOOL OF THOUGHT · ASR', ur: 'مسلک · عصر' },
  schoolSunnat: { en: 'Ahl-e-Sunnat', ur: 'اہلِ سنت' },
  schoolHadith: { en: 'Ahl-e-Hadith', ur: 'اہلِ حدیث' },
  hanafiExplain: { en: 'Hanafi Asr, as followed by Ahl-e-Sunnat (Barelvi and Deobandi): Asr begins when an object’s shadow is twice its length.', ur: 'حنفی عصر، جیسا کہ اہلِ سنت (بریلوی اور دیوبندی) کے ہاں ہے: عصر اس وقت شروع ہوتی ہے جب کسی چیز کا سایہ اس کی لمبائی سے دگنا ہو جائے۔' },
  standardExplain: { en: 'Standard Asr, as followed by Ahl-e-Hadith (and the Shafi‘i, Maliki and Hanbali schools): Asr begins when an object’s shadow equals its length.', ur: 'معیاری عصر، جیسا کہ اہلِ حدیث (اور شافعی، مالکی اور حنبلی مسالک) کے ہاں ہے: عصر اس وقت شروع ہوتی ہے جب کسی چیز کا سایہ اس کی لمبائی کے برابر ہو جائے۔' },
  asrToday: { en: 'Asr today begins at {t}.', ur: 'آج عصر {t} پر شروع ہوتی ہے۔' },
  adjustCap: { en: 'ADJUST START TIMES', ur: 'آغاز کے اوقات میں ردوبدل' },
  reset: { en: 'Reset', ur: 'ری سیٹ' },
  resetToast: { en: 'Start times reset to calculated', ur: 'آغاز کے اوقات حساب شدہ پر واپس' },
  calculated: { en: 'calculated', ur: 'حساب شدہ' },
  oneEarlier: { en: '{p} one minute earlier', ur: '{p} ایک منٹ پہلے' },
  oneLater: { en: '{p} one minute later', ur: '{p} ایک منٹ بعد' },
  adjustmentA11y: { en: '{p} adjustment {v} minutes', ur: '{p} میں ردوبدل {v} منٹ' },
  adjustHelp: { en: 'Move a start time by a few minutes to match your local timetable. Adhan notifications and the Fajr alarm follow these times.', ur: 'اپنے مقامی ٹائم ٹیبل سے ملانے کے لیے آغاز کا وقت چند منٹ آگے پیچھے کریں۔ اذان کی اطلاعات اور فجر کا الارم انہی اوقات کے مطابق چلتے ہیں۔' },
  enterTime: { en: 'Enter the time from your masjid’s timetable.', ur: 'اپنی مسجد کے ٹائم ٹیبل سے وقت درج کریں۔' },
  minEarlier: { en: 'One minute earlier', ur: 'ایک منٹ پہلے' },
  minLater: { en: 'One minute later', ur: 'ایک منٹ بعد' },
  earlyWarn: { en: 'This is before {l} begins today ({t}). Check it against your masjid’s timetable.', ur: 'یہ آج {l} شروع ہونے سے پہلے کا وقت ہے ({t})۔ اپنی مسجد کے ٹائم ٹیبل سے ملا لیں۔' },
  clear: { en: 'Clear', ur: 'مٹائیں' },
  save: { en: 'Save', ur: 'محفوظ کریں' },
  savedJamaat: { en: '{l} jamaat · {t}', ur: '{l} کی جماعت · {t}' },
  clearedJamaat: { en: '{l} jamaat cleared', ur: '{l} کی جماعت ہٹا دی گئی' },
  amPm: { en: 'AM', ur: 'صبح' },
  ovPrayers: { en: 'Prayers', ur: 'نمازیں' },
  ovDhikr: { en: 'Dhikr', ur: 'ذکر' },
  ovAdhkar: { en: 'Adhkar', ur: 'اذکار' },
  ovAyahs: { en: 'Ayahs', ur: 'آیات' },
  ovTodayA11y: { en: 'Today: {p} percent of today\'s targets met. {m}', ur: 'آج: روزانہ اہداف کا {p} فیصد پورا ہوا۔ {m}' },
  ovStatA11y: { en: '{l} today: {s}', ur: 'آج {l}: {s}' },
  ovDone: { en: 'Done', ur: 'مکمل' },
  ovDaily: { en: '{p}% · daily target', ur: '{p}% · روزانہ ہدف' },
  ovDayStreak: { en: '{n}-day streak', ur: '{n} دن کا سلسلہ' },
  ovNoStreak: { en: 'No streak yet', ur: 'ابھی کوئی سلسلہ نہیں' },
  ovGoalsMet: { en: '{a}/{b} goals met', ur: '{a}/{b} اہداف پورے' },
  ovAllGoals: { en: 'All goals', ur: 'تمام اہداف' },
  ovAddGoal: { en: 'Add a goal', ur: 'ہدف شامل کریں' },
  ovCounts: { en: 'counts toward {c}', ur: '{c} میں شمار ہوتا ہے' },
  ovEnded: { en: 'ended', ur: 'ختم ہو چکا' },
  ovEndsIn: { en: 'ends in {e}', ur: '{e} میں ختم' },
  ovGoalDone: { en: 'done', ur: 'مکمل' },
  ovOf: { en: '{a} of {b}', ur: '{b} میں سے {a}' },
  insToday: { en: 'TODAY’S INSPIRATION · {n}', ur: 'آج کی تحریک · {n}' },
  insStudio: { en: 'INSPIRATION STUDIO', ur: 'تحریک اسٹوڈیو' },
  insOpenFeed: { en: 'Open the feed for the latest reminders.', ur: 'تازہ یاد دہانیوں کے لیے فیڈ کھولیں۔' },
  insBlurb: { en: 'Daily Ayahs, hadith and reminders — designed beautifully for your Status and Stories.', ur: 'روزانہ آیات، احادیث اور یاد دہانیاں — آپ کے اسٹیٹس اور اسٹوریز کے لیے خوبصورت ڈیزائن میں۔' },
  insShare: { en: 'Design & share', ur: 'ڈیزائن کریں اور شیئر کریں' },
  insA11y: { en: 'Today’s inspiration: {k}. {l}', ur: 'آج کی تحریک۔ {l}' },
  insStudioA11y: { en: 'Inspiration studio', ur: 'تحریک اسٹوڈیو' },
} satisfies Record<string, Record<Lang, string>>;

export type StrKey = keyof typeof STR;

/** Unicode first-strong isolate: keeps a name in its own direction inside either language's line. */
export const iso = (s: string) => `⁨${s}⁩`;

export function tr(lang: Lang, k: StrKey, vars: Record<string, string> = {}) {
  return STR[k][lang].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
}

/** Prayer name in the app language ("Asr" / "عصر"). */
export const prayerName = (lang: Lang, p: PrayerName | 'Sunrise') => (lang === 'ur' ? PRAYER_UR[p] : p);

/** Urdu weekday names, Sunday first (index = Date#getDay). */
export const DOW_UR = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
export const MON_UR = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
const HIJRI_UR = ['محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعد', 'ذوالحجہ'];
const MILESTONE_UR = ['3 دن کی چنگاری', '7 دن کا سپاہی', '2 ہفتے کی استقامت', '30 دن کی لگن', '60 دن کا خشوع', 'سو دن کا مجاہد'];
const DIR_UR: Record<string, string> = { N: 'شمال', S: 'جنوب', E: 'مشرق', W: 'مغرب' };
const CAT_KEY = { Morning: 'catMorning', Evening: 'catEvening', 'Before Sleep': 'catSleep' } as const;

/** Weekday abbreviation (`SUN`) or the Urdu name; `i` is Date#getDay. */
export const dowLabel = (lang: Lang, i: number) => (lang === 'ur' ? DOW_UR[i] : DOW[i]);
/** Month abbreviation (`OCT`) or the Urdu name; `i` is Date#getMonth. */
export const monLabel = (lang: Lang, i: number) => (lang === 'ur' ? MON_UR[i] : MON[i]);
/** Title-case weekday for sentences ("Thu") or the Urdu name. */
export const dowWord = (lang: Lang, i: number) => (lang === 'ur' ? DOW_UR[i] : `${DOW[i][0]}${DOW[i].slice(1).toLowerCase()}`);

/** Hijri date line: the English one is `hijri()` unchanged; Urdu uses Urdu month names. */
export function hijriText(lang: Lang, date: Date) {
  if (lang !== 'ur') return hijri(date);
  const { id, im, iy } = hijriParts(date);
  return `${id} ${HIJRI_UR[im - 1]} ${iy} ہجری`;
}

/** Compass bearing in words ("NW" → "شمال مغرب"). */
export const dirUr = (dir: string) => dir.split('').map(c => DIR_UR[c]).join(' ');

/** Adhkar time-of-day name in the app language. */
export const adhkarCatName = (lang: Lang, k: string) => (k in CAT_KEY ? tr(lang, CAT_KEY[k as keyof typeof CAT_KEY]) : k);

/** Countdown ("1h 05m" / "4m 09s"); Urdu spells the units out. */
export function countdownText(lang: Lang, secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  if (lang === 'ur') return h > 0 ? `${h} گھنٹے ${mm} منٹ` : `${m} منٹ ${String(s).padStart(2, '0')} سیکنڈ`;
  return h > 0 ? `${h}h ${mm}m` : `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Rounded "time left" for a prayer row ("2h 5m" / "12 min"); Urdu spells the units out. */
export function leftText(lang: Lang, secs: number) {
  const h = Math.floor(secs / 3600);
  if (lang === 'ur') return secs >= 3600 ? `${h} گھنٹے ${Math.ceil((secs % 3600) / 60)} منٹ` : `${Math.ceil(secs / 60)} منٹ`;
  return secs >= 3600 ? `${h}h ${Math.ceil((secs % 3600) / 60)}m` : `${Math.ceil(secs / 60)} min`;
}

/** Day count from `endsIn()` ("a day" / "3 days"). */
export function daysText(lang: Lang, e: string) {
  if (lang !== 'ur') return e;
  if (e === 'a day') return 'ایک دن';
  const m = e.match(/^(\d+) days$/);
  return m ? `${m[1]} دن` : e;
}

const OVERVIEW_UR: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Alhamdulillah — every prayer/, () => 'الحمدللہ — آج کی تمام نمازیں اور اہداف مکمل ہوئے۔ اللہ قبول فرمائے۔'],
  [/^Keep your (\d+)-day streak going/, m => `اپنا ${m[1]} دن کا سلسلہ جاری رکھیں — آغاز کے لیے ایک نماز یا ایک ذکر کافی ہے۔`],
  [/^A new day\./, () => 'نیا دن۔ بسم اللہ سے آغاز کریں اور ایک چھوٹا سا نیک عمل کریں۔'],
  [/^It’s not too late/, () => 'ابھی دیر نہیں ہوئی — ایک ذکر سے شروع کریں۔'],
  [/^Every goal met today/, () => 'آج کے تمام اہداف پورے ہوئے۔ پسندیدہ ترین اعمال وہ ہیں جو مسلسل ہوں۔'],
  [/^Nearly there — (\d+) more for (.+)\.$/, m => `بس تھوڑا سا باقی — ${iso(m[2])} کے لیے مزید ${m[1]}۔`],
  [/^(\d) of 5 prayers logged/, m => `5 میں سے ${m[1]} نمازیں درج ہو چکی ہیں۔ ہر نماز اپنے وقت پر ادا کریں۔`],
  [/^Small and steady/, () => 'تھوڑا مگر مسلسل۔ ہر گنتی لکھی جاتی ہے۔'],
];
/** Urdu form of the Home overview message (built in English by lib/overview.ts). */
export function overviewMessage(lang: Lang, en: string) {
  if (lang !== 'ur') return en;
  for (const [re, f] of OVERVIEW_UR) { const m = en.match(re); if (m) return f(m); }
  return en;
}

/** The sentence under the streak number on the insight card. */
export function streakNote(lang: Lang, streak: number) {
  if (streak === 0) return tr(lang, 'startStreak');
  const ur = lang === 'ur';
  const nameOf = (i: number) => (ur ? MILESTONE_UR[i] : MILESTONES[i][1]);
  const ei = MILESTONES.map(m => m[2]).reduce((a, d, i) => (streak >= d ? i : a), -1);
  const ni = MILESTONES.findIndex(m => streak < m[2]);
  const earned = ei >= 0 ? tr(lang, 'earnedMs', { m: nameOf(ei) }) : '';
  if (ni < 0) return earned + tr(lang, 'allMs');
  const n = MILESTONES[ni][2] - streak;
  return earned + tr(lang, 'toReachMs', { n: String(n), u: n === 1 ? 'day' : 'days', m: nameOf(ni) });
}

/** Current app language and a translator bound to it; re-renders when the language changes. */
export function useLang() {
  const lang = useApp(s => s.lang) ?? 'en';
  return { lang, ur: lang === 'ur', t: (k: StrKey, vars?: Record<string, string>) => tr(lang, k, vars) };
}

/** The user's first name from their profile, live (updates after sign-in pulls the profile). */
export function useFirstName() {
  const name = useApp(s => s.name);
  const lang = useApp(s => s.lang) ?? 'en';
  return name.trim().split(/\s+/)[0] || tr(lang, 'friend');
}
