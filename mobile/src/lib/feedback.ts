import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { getState } from '../state/store';

/**
 * Maps the prototype's navigator.vibrate() patterns onto native haptics:
 * tiny numbers are selection ticks, single counts are light taps, multi-step
 * patterns are success notifications, a single long pulse is a heavy tap.
 */
export function buzz(p: number | number[]) {
  if (!getState().vib) return;
  try {
    if (Array.isArray(p)) {
      if (p.length === 1) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (p <= 6) Haptics.selectionAsync();
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are best-effort.
  }
}

/** Gentle "that didn't work" haptic (wrong tag, rejected input). */
export function buzzError() {
  if (!getState().vib) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } catch {
    // Haptics are best-effort.
  }
}

export type ToastKind = 'ok' | 'error';
type Toast = { msg: string; on: boolean; key: number; kind: ToastKind };
let toast: Toast = { msg: '', on: false, key: 0, kind: 'ok' };
const ls = new Set<() => void>();
let t: ReturnType<typeof setTimeout> | undefined;

/** Messages that report a failure or a refusal, so they aren't shown with a success tick. */
const FAILURE = new RegExp([
  /\b(couldn[’']t|can[’']t|cannot|failed|offline|isn[’']t|doesn[’']t|not valid|invalid|too many|try again|denied|expired|wrong|unavailable)\b/.source,
  // Something the user still has to do before it works ("Add some text first", "Choose at least one day").
  /\bfirst\b|\bat least\b|^(add|give|choose|enter|set|use|allow) |^name your\b|\bnot your\b|\bis a number\b|\bare \d+ characters\b|\bhas \d+ ayahs\b|^sign in to\b/.source,
].join('|'), 'i');

/** A short status message. Errors are guessed from the wording unless `kind` says otherwise. */
export function say(msg: string, kind: ToastKind = FAILURE.test(msg) ? 'error' : 'ok') {
  clearTimeout(t);
  toast = { msg, on: true, key: toast.key + 1, kind };
  ls.forEach(l => l());
  // Long enough to read: about 2.4 s for a short message, up to 6 s for a long one.
  t = setTimeout(() => {
    toast = { ...toast, on: false };
    ls.forEach(l => l());
  }, Math.min(6000, Math.max(2400, msg.length * 55)));
}

export function useToast() {
  return useSyncExternalStore(
    l => { ls.add(l); return () => { ls.delete(l); }; },
    () => toast,
    () => toast,
  );
}
