/**
 * Encouragement check-ins, in English and Urdu. They are drawn from the person's own progress and
 * written to be warm, never guilt: no shaming, no false urgency, no counting what was missed. Each
 * kind says something true about the history it is built from, and the last one in a long absence
 * says plainly that we will stop knocking.
 */
import { dayNum, ltr, type Line, type QuoteKind } from './reminders';

export type CareKind = 'keep' | 'keep1' | 'back3' | 'back7' | 'back14' | 'back30' | 'start1' | 'start3' | 'start7' | 'milestone' | 'log';

export type CareCtx = {
  /** First name, or '' when we do not know it. */
  name: string;
  /** Length of the run the message is about (a streak, or the milestone reached). */
  run: number;
  /** Prayers marked as prayed, and dhikr counted, over the person's whole history. */
  prayed: number;
  dhikr: number;
};

export type CareMsg = { title: Line; body: Line; quote: QuoteKind | null; url: string };

export const MILESTONES = [3, 7, 14, 21, 30, 40, 60, 100, 200, 365];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const grp = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** "Yusuf, your streak…" when the name is known, else "Your streak…". */
const addr = (name: string, en: string, ur: string): Line => (name ? { en: `${name}, ${en}`, ur: `${ltr(name)}، ${ur}` } : { en: cap(en), ur });
const pick = <T,>(xs: T[], day: Date) => xs[dayNum(day) % xs.length];

export function careMessage(kind: CareKind, c: CareCtx, day: Date): CareMsg {
  const n = c.run;
  switch (kind) {
    case 'keep': {
      const t = pick<Line>([
        addr(c.name, `your ${n}-day streak is waiting`, `${ltr(n)} دن کا سلسلہ آپ کا منتظر ہے`),
        { en: `Day ${n + 1} is one small step away`, ur: `دن ${ltr(n + 1)} بس ایک چھوٹے قدم کی دوری پر ہے` },
        { en: `${n} days of showing up`, ur: `${ltr(n)} دن کی حاضری` },
      ], day);
      const b = pick<Line>([
        { en: `Tonight, one dhikr or one ayah carries it forward. ${n} days in a row is real.`, ur: `آج رات ایک ذکر یا ایک آیت اسے آگے بڑھا دے گی۔ مسلسل ${ltr(n)} دن معمولی بات نہیں۔` },
        { en: `A single tasbih, a few ayahs, or a prayer marked: any of them keeps your ${n} days going.`, ur: `ایک تسبیح، چند آیات یا ایک نماز کا اندراج: ان میں سے کوئی بھی آپ کے ${ltr(n)} دن جاری رکھتا ہے۔` },
        { en: 'Allah loves the deed that is steady, even if small. Take one quiet minute for Him tonight.', ur: 'اللہ کو وہ عمل پسند ہے جو مسلسل ہو، چاہے تھوڑا ہو۔ آج رات اس کے لیے ایک خاموش منٹ نکالیں۔' },
      ], day);
      return { title: t, body: b, quote: 'goal', url: '/tasbeeh' };
    }
    case 'keep1':
      return {
        title: addr(c.name, 'yesterday you showed up', 'کل آپ نے حاضری دی'),
        body: { en: 'Come back tonight: even one minute turns one day into two.', ur: 'آج رات بھی آئیں: ایک منٹ بھی ایک دن کو دو دن بنا دیتا ہے۔' },
        quote: 'goal', url: '/tasbeeh',
      };
    case 'back3':
      return n >= 3
        ? {
          title: { en: `Your ${n} days are still yours`, ur: `آپ کے ${ltr(n)} دن اب بھی آپ کے ہیں` },
          body: { en: `You walked ${n} days with Allah. Nothing is taken away: begin again with one small act whenever you are ready.`, ur: `آپ ${ltr(n)} دن اللہ کے ساتھ چلے۔ کچھ چھینا نہیں گیا: جب تیار ہوں ایک چھوٹے عمل سے دوبارہ آغاز کریں۔` },
          quote: 'return', url: '/home',
        }
        : {
          title: addr(c.name, 'just a gentle hello', 'بس ایک نرم سا سلام'),
          body: { en: 'No pressure. A single dhikr is enough to begin again, and Allah welcomes even the smallest step.', ur: 'کوئی دباؤ نہیں۔ دوبارہ آغاز کے لیے ایک ذکر کافی ہے، اور اللہ چھوٹے سے چھوٹے قدم کو بھی قبول کرتا ہے۔' },
          quote: 'return', url: '/home',
        };
    case 'back7':
      return {
        title: { en: 'The door is always open', ur: 'دروازہ ہمیشہ کھلا ہے' },
        body: { en: 'It has been a week. Whatever kept you busy, return gently: one sincere dhikr is a fresh beginning.', ur: 'ایک ہفتہ ہو گیا۔ جو بھی مصروفیت رہی، نرمی سے لوٹ آئیں: ایک سچا ذکر نئی شروعات ہے۔' },
        quote: 'return', url: '/home',
      };
    case 'back14':
      return {
        title: { en: 'Your journey is safe here', ur: 'آپ کا سفر یہاں محفوظ ہے' },
        body: c.prayed + c.dhikr > 0
          ? { en: `${grp(c.prayed)} prayers marked and ${grp(c.dhikr)} dhikr counted are all still here. Pick up right where you left off.`, ur: `${ltr(grp(c.prayed))} نمازیں درج اور ${ltr(grp(c.dhikr))} ذکر شمار، سب کچھ یہیں ہے۔ جہاں چھوڑا تھا وہیں سے شروع کریں۔` }
          : { en: 'Everything is ready when you are. Begin with a single ayah.', ur: 'جب آپ تیار ہوں سب کچھ حاضر ہے۔ ایک آیت سے آغاز کریں۔' },
        quote: 'return', url: '/home',
      };
    case 'back30':
      return {
        title: { en: 'Whenever you are ready', ur: 'جب بھی آپ تیار ہوں' },
        body: { en: 'We will not keep knocking. Your journey will be here, waiting. May Allah make it easy for you.', ur: 'ہم بار بار دستک نہیں دیں گے۔ آپ کا سفر یہیں آپ کا انتظار کرے گا۔ اللہ آپ پر آسانی فرمائے۔' },
        quote: null, url: '/home',
      };
    case 'start1':
      return {
        title: addr(c.name, 'your first step is a small one', 'پہلا قدم چھوٹا سا ہے'),
        body: { en: 'One dhikr. One ayah. That is all it takes to begin.', ur: 'ایک ذکر، ایک آیت: آغاز کے لیے بس اتنا ہی کافی ہے۔' },
        quote: null, url: '/tasbeeh',
      };
    case 'start3':
      return {
        title: { en: 'A quiet minute for Allah?', ur: 'اللہ کے لیے ایک خاموش منٹ؟' },
        body: { en: 'Count a single tasbih and your streak begins at day one.', ur: 'ایک تسبیح پڑھیں اور آپ کا سلسلہ پہلے دن سے شروع ہو جائے گا۔' },
        quote: 'adhkar', url: '/tasbeeh',
      };
    case 'start7':
      return {
        title: { en: 'We will be here', ur: 'ہم یہیں ہیں' },
        body: { en: 'No rush. Whenever you want a gentle companion for your worship, Ibtida is ready.', ur: 'کوئی جلدی نہیں۔ جب بھی عبادت میں ایک نرم ساتھی چاہیے ہو، ابتدا حاضر ہے۔' },
        quote: null, url: '/home',
      };
    case 'milestone':
      return {
        title: addr(c.name, `${n} days in a row, masha’Allah`, `${ltr(n)} دن مسلسل، ماشاء اللہ`),
        body: { en: `This is what steadiness looks like. Today is day ${n + 1}: take it gently.`, ur: `استقامت ایسی ہی ہوتی ہے۔ آج دن ${ltr(n + 1)} ہے: نرمی سے آگے بڑھیں۔` },
        quote: 'goal', url: '/home',
      };
    case 'log':
      return {
        title: { en: 'Close your day with a moment of reflection', ur: 'دن کا اختتام ایک لمحۂ غور کے ساتھ' },
        body: { en: 'Mark the prayers you prayed today so your journey stays honest and complete.', ur: 'آج جو نمازیں پڑھیں انہیں درج کر لیں تاکہ آپ کا سفر سچا اور مکمل رہے۔' },
        quote: null, url: '/prayer',
      };
  }
}
