/**
 * Tasbeeh counting rules, kept pure so they can be tested.
 *
 * A round counts from 0 up to its target and never past it. Reaching the target completes the round
 * exactly once; what the next tap does depends on the chosen behaviour: start the same dhikr again,
 * move on to the next dhikr (SubhanAllah → Alhamdulillah → Allahu Akbar …), or stop until reset.
 * Lifetime totals are kept apart from the round, so resetting a round never loses them.
 */
import { DHIKR } from '../data/content';

export type TasAfter = 'repeat' | 'next' | 'stop';
export const TAS_AFTER: { key: TasAfter; label: string }[] = [
  { key: 'repeat', label: 'Start again' },
  { key: 'next', label: 'Next dhikr' },
  { key: 'stop', label: 'Stop' },
];

/** Smallest and largest target a user can set. */
export const TARGET_MIN = 1;
export const TARGET_MAX = 100_000;
/** Targets offered as one-tap chips (the custom field takes any other). */
export const TARGET_PRESETS = [33, 34, 99, 100, 313, 1000];

/** A dhikr the counter can count: built-in, or added by the user. */
export type Dhikr = { key: string; label: string; ar: string; t: number; note: string; tr?: string; meaning?: string; custom?: boolean };

/** User-added dhikr. Deleting one archives it, so its lifetime count and linked goal history stay. */
export type CustomDhikr = {
  id: string;
  name: string;
  ar: string;
  /** Optional transliteration and translation. */
  tr?: string;
  meaning?: string;
  target: number;
  archived?: boolean;
};

export const builtInKey = (label: string) => `b:${label}`;
export const customKey = (id: string) => `c:${id}`;

/** Every dhikr shown in the counter: the built-ins, then the user's own (not archived). */
export function allDhikr(custom: CustomDhikr[] = [], targets: Record<string, number> = {}): Dhikr[] {
  const built = DHIKR.map(d => ({ key: builtInKey(d.label), label: d.label, ar: d.ar, t: d.t, note: d.note }));
  const own = custom.filter(c => !c.archived).map(c => ({
    key: customKey(c.id), label: c.name, ar: c.ar, t: c.target, tr: c.tr, meaning: c.meaning, custom: true,
    note: [c.tr, c.meaning].filter(Boolean).join(' · ') || 'Your own dhikr',
  }));
  return [...built, ...own].map(d => ({ ...d, t: validTarget(targets[d.key]) ?? d.t }));
}

/**
 * Parses a typed target: a whole number from 1 to 100,000 (commas and spaces allowed, e.g. "1,000").
 * Returns null for anything else — empty, zero, negative, decimal or non-numeric.
 */
export function parseTarget(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') return validTarget(input);
  if (typeof input !== 'string') return null;
  const s = input.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(s)) return null;
  return validTarget(Number(s));
}

function validTarget(n: unknown): number | null {
  return typeof n === 'number' && Number.isInteger(n) && n >= TARGET_MIN && n <= TARGET_MAX ? n : null;
}

export type Round = { count: number; target: number };

export type TapResult = {
  /** The count to show and store (0 … target). */
  count: number;
  /** How much to add to lifetime totals (0 when the tap was ignored). */
  added: number;
  /** True only on the tap that reaches the target. */
  completed: boolean;
  /** Set when this tap started a new round on the next dhikr. */
  advance: boolean;
};

/**
 * One tap. Counting stops at the target: the completing tap reports `completed` once, and the tap
 * after that starts a new round (same or next dhikr) or, with 'stop', is ignored.
 */
export function tap(r: Round, after: TasAfter): TapResult {
  const target = Math.max(1, r.target);
  const count = Math.max(0, Math.min(r.count, target));
  if (count >= target) {
    if (after === 'stop') return { count, added: 0, completed: false, advance: false };
    // A new round begins with this tap.
    return { count: 1, added: 1, completed: target === 1, advance: after === 'next' };
  }
  const next = count + 1;
  return { count: next, added: 1, completed: next === target, advance: false };
}

/** Undo one count in the current round (never below zero). Reports whether a completed round was reopened. */
export function undo(r: Round): { count: number; removed: number; reopened: boolean } {
  const count = Math.max(0, Math.min(r.count, r.target));
  if (count === 0) return { count: 0, removed: 0, reopened: false };
  return { count: count - 1, removed: 1, reopened: count === r.target };
}

/** The dhikr after `key` in the list, wrapping round (used by 'Next dhikr'). */
export function nextKey(list: Dhikr[], key: string) {
  const i = list.findIndex(d => d.key === key);
  return list[(i + 1) % list.length]?.key ?? key;
}

/** "1,000" */
export const fmtCount = (n: number) => n.toLocaleString('en-US');
