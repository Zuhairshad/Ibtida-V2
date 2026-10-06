import * as Notifications from 'expo-notifications';
import { durLabel, rangeLabel, upcomingLocks } from './lockTimes';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { PH, type PrayerName } from '../data/content';
import { compose, durUr, ltr, PRAYER_UR, quoteFor, type Line, type QuoteKind } from '../data/reminders';
import { getState, subscribe, type AppState as Store, type Goal, type Sched } from '../state/store';
import { say } from './feedback';
import { addDays, dayKey, fmtTime, timesFor } from './prayer';

/**
 * Local notifications. Everything is a one-shot DATE trigger computed on-device for the
 * next HORIZON_DAYS, so prayer times stay correct as they drift day to day. The plan is
 * recomputed whenever the relevant settings change and each time the app comes to the
 * foreground, and applied as a diff against what is already pending — so re-running it is
 * idempotent and never touches notifications another part of the app scheduled.
 */

const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';
const PREFIX = 'ibtida.';
const HORIZON_DAYS = 7;
/** iOS keeps at most 64 pending requests per app; leave headroom for previews/tests. */
const MAX_PENDING = 60;
const MIN = 60_000;

/* ------------------------------------------------------------- Sounds */

/** Index into the "Adhan sound" chips: Makkah, Madinah, Soft chime, Silent. */
const SOUND_KEYS = ['makkah', 'madinah', 'chime', 'silent'] as const;

/**
 * HOOK POINT — adhan audio. No audio ships yet, so every non-silent option plays the
 * system default. To add real adhan recordings:
 *   1. add the files (e.g. `assets/sounds/adhan_makkah.wav`) to the `sounds` array of the
 *      expo-notifications plugin in app.json,
 *   2. put the bare file name here (e.g. `'adhan_makkah.wav'`),
 *   3. bump CHANNEL_VERSION — Android channel sounds are fixed once a channel exists.
 * iOS plays at most 30 s of a notification sound.
 */
const ADHAN_AUDIO: Record<(typeof SOUND_KEYS)[number], string | null> = {
  makkah: null,
  madinah: null,
  chime: null,
  silent: null,
};
const CHANNEL_VERSION = 1;

const CH = {
  adhan: (sound: number) => `adhan-${SOUND_KEYS[sound] || SOUND_KEYS[0]}-v${CHANNEL_VERSION}`,
  wake: `wake-alarm-v${CHANNEL_VERSION}`,
  reminders: `reminders-v${CHANNEL_VERSION}`,
};

function adhanSound(sound: number): Notifications.NotificationContentInput['sound'] {
  const key = SOUND_KEYS[sound] || SOUND_KEYS[0];
  if (key === 'silent') return false;
  return ADHAN_AUDIO[key] || 'default';
}

let channelsReady: Promise<void> | null = null;
function ensureChannels() {
  if (Platform.OS !== 'android') return Promise.resolve();
  channelsReady ??= (async () => {
    const vibrationPattern = [0, 250, 250, 250];
    for (let i = 0; i < SOUND_KEYS.length; i++) {
      const key = SOUND_KEYS[i];
      const silent = key === 'silent';
      await Notifications.setNotificationChannelAsync(CH.adhan(i), {
        name: `Adhan · ${['Makkah', 'Madinah', 'Soft chime', 'Silent'][i]}`,
        description: 'A notification at each prayer time you have switched on.',
        importance: Notifications.AndroidImportance.HIGH,
        sound: silent ? null : ADHAN_AUDIO[key] || 'default',
        enableVibrate: !silent,
        vibrationPattern: silent ? null : vibrationPattern,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    await Notifications.setNotificationChannelAsync(CH.wake, {
      name: 'Wake alarm',
      description: 'Fajr wake alarm that asks you to scan your wudu station.',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      bypassDnd: true,
      enableVibrate: true,
      vibrationPattern: [0, 600, 400, 600, 400, 600],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.SONIFICATION },
    });
    await Notifications.setNotificationChannelAsync(CH.reminders, {
      name: 'Gentle reminders',
      description: 'Adhkar, goal and Quran reminders.',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  })().catch(e => { channelsReady = null; throw e; });
  return channelsReady;
}

/* --------------------------------------------------------- Permission */

async function granted() {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

const DENIED_MSG = Platform.OS === 'ios'
  ? 'Notifications are off · turn them on in Settings › Ibtida'
  : 'Notifications are off · turn them on in Settings › Apps › Ibtida';

/**
 * Ask for permission at a moment the user expects it (end of onboarding, or turning a
 * reminder on). Shows the toast and returns false if they are, or remain, denied.
 */
export async function enableNotifications(): Promise<boolean> {
  if (!NATIVE) return false;
  try {
    // Android 13+ only shows the system prompt once a channel exists.
    await ensureChannels();
    if (await granted()) { syncNotifications(); return true; }
    const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    const ok = p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (ok) syncNotifications();
    else say(DENIED_MSG);
    return ok;
  } catch {
    return false;
  }
}

/** Fires a reminder straight away so the user can hear how it sounds. */
export async function previewReminder() {
  if (!NATIVE) { say('Previews need the mobile app'); return; }
  if (!(await enableNotifications())) return;
  const s = getState();
  const p = compose(s.notifLang ?? 'both', { en: 'Preview', ur: 'نمونہ' }, { en: 'This is how your reminders will look and sound.', ur: 'آپ کی یاد دہانیاں ایسی دکھائی اور سنائی دیں گی۔' }, s.notifQuotes === false ? null : quoteFor('goal', new Date()));
  await Notifications.scheduleNotificationAsync({
    content: { title: p.title, body: p.body, sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId: CH.reminders } : null,
  });
}

/* --------------------------------------------------------------- Plan */

type Planned = {
  at: Date;
  kind: string;
  title: string;
  body: string;
  url: string;
  channelId: string;
  sound: Notifications.NotificationContentInput['sound'];
  urgent?: boolean;
};

const MINS15 = [0, 15, 30, 45];
const WAKE_MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
/** 12-hour wheel → 24-hour clock. */
const to24 = (h: number, a: number) => ((h + 1) % 12) + (a ? 12 : 0);
/** Mon…Sun flag index for a JS date. */
const monIdx = (d: Date) => (d.getDay() + 6) % 7;
const at = (day: Date, h: number, m: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);

/** Older goals only have a `remind` label ("8:00 pm", "after Fajr"); keep honouring it daily. */
function goalTime(g: Goal, day: Date, fajr: Date): Date | null {
  if (g.sched) {
    const s: Sched = g.sched;
    if (!s.days[monIdx(day)]) return null;
    return at(day, to24(s.h, s.a), MINS15[s.m] ?? 0);
  }
  // Frequency chosen in New goal (Every day / Weekdays / Fridays).
  if (g.days && !g.days[monIdx(day)]) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(g.remind.trim());
  if (m) return at(day, (Number(m[1]) % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0), Number(m[2]));
  if (/after fajr/i.test(g.remind)) return new Date(fajr.getTime() + 15 * MIN);
  return null;
}

export function planNotifications(s: Store, now = new Date()): Planned[] {
  const out: Planned[] = [];
  const [prayerOn, adhkarOn, goalsOn, quranOn] = s.notifs;
  const short = s.city.name.split(',')[0];
  const lang = s.notifLang ?? 'both';
  /** Title and body in the user's language, with the day's hadith for this kind of reminder. */
  const txt = (day: Date, kind: QuoteKind, title: Line, body: Line, salt = 0) =>
    compose(lang, title, body, s.notifQuotes === false ? null : quoteFor(kind, day, salt));
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const day = addDays(now, d);
    const times = timesFor(s.city, day, s.method, s.hanafi);
    const key = dayKey(day);

    PH.forEach((p: PrayerName, i) => {
      const t = times[p];
      if (s.wakeVerify[i]) {
        // Fajr wakes at the user's chosen time when it falls before Fajr; otherwise at the prayer.
        let wakeAt = t;
        if (p === 'Fajr') {
          const w = at(day, to24(s.wake.h, s.wake.a), WAKE_MINS[s.wake.m] ?? 0);
          if (w < t && t.getTime() - w.getTime() < 4 * 3600_000) wakeAt = w;
        }
        out.push({
          at: wakeAt, kind: `wake.${p}.${key}`,
          ...txt(day, p === 'Fajr' ? 'fajr' : 'prayer',
            { en: `Wake for ${p}`, ur: `${PRAYER_UR[p]} کے لیے اٹھیں` },
            { en: `${p} · ${fmtTime(t)} · scan your wudu station to stop`, ur: `${PRAYER_UR[p]} · ${ltr(fmtTime(t))} · الارم بند کرنے کے لیے وضو کی جگہ اسکین کریں` }),
          url: '/wake-scan', channelId: CH.wake, sound: 'default', urgent: true,
        });
      } else if (prayerOn && s.adhan[p]) {
        out.push({
          at: t, kind: `adhan.${p}.${key}`,
          ...txt(day, p === 'Fajr' ? 'fajr' : 'prayer',
            { en: `Time for ${p}`, ur: `${PRAYER_UR[p]} کا وقت` },
            { en: `${p} · ${fmtTime(t)} · ${short}`, ur: `${PRAYER_UR[p]} · ${ltr(fmtTime(t))} · ${ltr(short)}` }, i),
          url: '/prayer', channelId: CH.adhan(s.sound), sound: adhanSound(s.sound),
        });
      }
    });

    if (adhkarOn) {
      out.push({
        at: new Date(times.Fajr.getTime() + 10 * MIN), kind: `adhkar.am.${key}`,
        ...txt(day, 'adhkar', { en: 'Morning adhkar', ur: 'صبح کے اذکار' }, { en: 'Your morning adhkar are ready.', ur: 'آپ کے صبح کے اذکار تیار ہیں۔' }),
        url: '/session?cat=Morning', channelId: CH.reminders, sound: 'default',
      });
      out.push({
        at: new Date(times.Asr.getTime() + 10 * MIN), kind: `adhkar.pm.${key}`,
        ...txt(day, 'adhkar', { en: 'Evening adhkar', ur: 'شام کے اذکار' }, { en: 'Your evening adhkar are ready.', ur: 'آپ کے شام کے اذکار تیار ہیں۔' }, 1),
        url: '/session?cat=Evening', channelId: CH.reminders, sound: 'default',
      });
    }
    if (quranOn) {
      out.push({
        at: new Date(times.Fajr.getTime() + 20 * MIN), kind: `quran.${key}`,
        ...txt(day, 'quran', { en: 'Quran', ur: 'قرآن' }, { en: 'A few verses after Fajr?', ur: 'فجر کے بعد چند آیات کی تلاوت؟' }),
        url: '/home/quran', channelId: CH.reminders, sound: 'default',
      });
    }
    if (goalsOn) {
      for (const g of s.goals) {
        const t = goalTime(g, day, times.Fajr);
        if (!t) continue;
        out.push({
          at: t, kind: `goal.${g.id}.${key}`,
          ...txt(day, 'goal', { en: g.name, ur: g.name }, { en: `Your ${g.target} for today · tap to begin.`, ur: `آج کا ہدف ${ltr(g.target)} · شروع کرنے کے لیے ٹیپ کریں۔` }, g.id),
          url: `/tasbeeh?goal=${g.id}`, channelId: CH.reminders, sound: 'default',
        });
      }
    }
    // TODO(community): notifs[5] — circle milestones arrive as push from the backend, not local schedules.
  }
  // Scheduled Ibadah Lock: a heads-up 5 minutes before each window, and when it begins.
  if (s.notifs[4]) {
    for (const u of upcomingLocks(s.locks || [], now, HORIZON_DAYS)) {
      const k = `${u.lock.id}.${u.start.getTime()}`;
      out.push({
        at: new Date(u.start.getTime() - 5 * MIN), kind: `lock.soon.${k}`,
        ...compose(lang, { en: 'Ibadah Lock in 5 minutes', ur: 'عبادت لاک 5 منٹ میں' }, { en: `Apps lock ${rangeLabel(u.lock)} · finish what you’re doing.`, ur: `ایپس ${ltr(rangeLabel(u.lock))} بند رہیں گی · اپنا کام مکمل کر لیں۔` }, null),
        url: '/focus-setup', channelId: CH.reminders, sound: 'default',
      });
      out.push({
        at: u.start, kind: `lock.start.${k}`,
        ...txt(u.start, 'focus', { en: 'Ibadah time has begun', ur: 'عبادت کا وقت شروع ہو گیا' }, { en: `Apps are locked for ${durLabel(u.lock.dur)}. Spend this time with Allah.`, ur: `ایپس ${durUr(u.lock.dur)} کے لیے بند ہیں۔ یہ وقت اللہ کے ساتھ گزاریں۔` }),
        url: '/lock-scheduled', channelId: CH.reminders, sound: 'default',
      });
    }
  }
  // Soonest first, then cap so the nearest reminders always fit iOS's pending limit.
  return out
    .filter(n => n.at.getTime() > now.getTime() + 5000)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PENDING);
}

/* -------------------------------------------------------------- Apply */

/** Stable id: same plan → same ids, so applying twice schedules nothing new. */
function idFor(n: Planned) {
  const sig = `${n.at.getTime()}|${n.title}|${n.body}|${n.url}|${n.channelId}|${String(n.sound)}`;
  let h = 5381;
  for (let i = 0; i < sig.length; i++) h = ((h * 33) ^ sig.charCodeAt(i)) >>> 0;
  return `${PREFIX}${n.kind}.${h.toString(36)}`;
}

async function apply() {
  const s = getState();
  if (!s.hydrated) return;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const ours = pending.map(r => r.identifier).filter(id => id.startsWith(PREFIX));
  if (!s.onboarded || !(await granted())) {
    await Promise.all(ours.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    return;
  }
  await ensureChannels();
  const plan = planNotifications(s).map(n => ({ n, id: idFor(n) }));
  const want = new Set(plan.map(p => p.id));
  const have = new Set(ours);
  await Promise.all(ours.filter(id => !want.has(id)).map(id => Notifications.cancelScheduledNotificationAsync(id)));
  for (const { n, id } of plan) {
    if (have.has(id)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: n.title, body: n.body, sound: n.sound, data: { url: n.url },
        priority: n.urgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        interruptionLevel: n.urgent ? 'timeSensitive' : 'active',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: n.channelId },
    });
  }
}

let chain: Promise<void> = Promise.resolve();
/** Recompute and apply the schedule. Runs are serialised so they never interleave. */
export function syncNotifications() {
  if (!NATIVE) return chain;
  chain = chain.then(apply).catch(() => {});
  return chain;
}

/* --------------------------------------------------------------- Hook */

if (NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Only the fields that change what gets scheduled — tasbeeh taps must not reschedule. */
function signature(s: Store) {
  return JSON.stringify([
    s.hydrated, s.onboarded, s.city, s.method, s.hanafi, s.adhan, s.sound, s.notifs, s.wakeVerify, s.wake,
    s.goals.map(g => [g.id, g.name, g.target, g.remind, g.sched, g.days]),
    s.locks, s.notifLang, s.notifQuotes,
  ]);
}

function openFrom(r: Notifications.NotificationResponse | null) {
  const url = r?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/') && getState().onboarded) router.push(url);
}

/** Mount once in the root layout: keeps the schedule in sync and routes notification taps. */
export function useNotifications() {
  useEffect(() => {
    if (!NATIVE) return;
    let last = '';
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const sig = signature(getState());
      if (sig === last) return;
      last = sig;
      clearTimeout(t);
      t = setTimeout(syncNotifications, 800);
    };
    check();
    const unsub = subscribe(check);
    const app = AppState.addEventListener('change', st => { if (st === 'active') syncNotifications(); });

    // Cold start from a tap: wait a tick so the index redirect settles first.
    const cold = Notifications.getLastNotificationResponse();
    const coldT = cold ? setTimeout(() => { openFrom(cold); Notifications.clearLastNotificationResponse(); }, 300) : undefined;
    const tap = Notifications.addNotificationResponseReceivedListener(r => {
      openFrom(r);
      Notifications.clearLastNotificationResponse();
    });
    return () => { unsub(); app.remove(); tap.remove(); clearTimeout(t); clearTimeout(coldT); };
  }, []);
}
