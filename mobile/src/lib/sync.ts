import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as RNAppState } from 'react-native';
import { COMMUNITY_GOALS, PH, type PrayerName } from '../data/content';
import {
  getState, isRemoteWrite, setFromRemote, subscribe,
  type AppState, type Emergency, type Goal, type PrayerLog, type WakeEntry,
} from '../state/store';
import { currentUserId, onSession, supabase } from './supabase';

/**
 * Offline-first sync.
 *
 * The local store (AsyncStorage) stays the source of truth for the UI: every tap updates it
 * instantly. This module watches the store, turns changes into small operations in a durable
 * outbox (also AsyncStorage) and pushes them to Supabase when signed in and reachable, with
 * exponential backoff. On sign-in it pulls the user's rows and merges them: last write wins by
 * `updated_at`, compared with the per-record local change time kept in `stamps`.
 *
 * Tasbeeh taps are only arithmetic on a pending counter (no I/O per tap) and are flushed in
 * batches through the `log_dhikr` RPC, so counting never waits on the network and a count made
 * offline is uploaded later.
 */

type OpType = 'log' | 'goal' | 'wake' | 'emergency' | 'profile' | 'dhikr' | 'cg' | 'join' | 'ameen' | 'circle-contrib';
export type Op = {
  k: string; t: OpType; uid: string;
  p: Record<string, unknown>;
  tries: number; after: number;
};

const OUTBOX_KEY = 'ibtida.v7.outbox';
const STAMPS_KEY = 'ibtida.v7.stamps';
const MAX_BATCH = 10000; // server bound per log_dhikr / contribute_to_goal call

let outbox: Op[] = [];
let stamps: Record<string, number> = {};
let loaded = false;
let prev: AppState | null = null;
let started = false;
let flushing: Promise<boolean> | null = null;
let flushT: ReturnType<typeof setTimeout> | undefined;
let saveT: ReturnType<typeof setTimeout> | undefined;
let pulledFor: string | null = null;
const syncListeners = new Set<() => void>();

/** Live goal ids by name, filled from get_goal_totals (see live.ts) or fetched on demand. */
const goalIds: Record<string, string> = {};
export function rememberGoalIds(rows: { id: string; name: string }[]) {
  rows.forEach(r => { goalIds[r.name] = r.id; });
}

export function onSyncChange(fn: () => void) {
  syncListeners.add(fn);
  return () => { syncListeners.delete(fn); };
}
const emit = () => syncListeners.forEach(l => l());

export const pendingCount = () => outbox.length;
/** Pending (not yet uploaded) op for this key, for the current user. */
export const pendingOp = (k: string) => outbox.find(o => o.k === k && o.uid === currentUserId());

// ---------------------------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------------------------
function persistSoon() {
  clearTimeout(saveT);
  saveT = setTimeout(persistNow, 300);
}
function persistNow() {
  clearTimeout(saveT);
  AsyncStorage.multiSet([[OUTBOX_KEY, JSON.stringify(outbox)], [STAMPS_KEY, JSON.stringify(stamps)]]).catch(() => {});
}
async function load() {
  if (loaded) return;
  try {
    const [[, o], [, st]] = await AsyncStorage.multiGet([OUTBOX_KEY, STAMPS_KEY]);
    // Anything queued while loading (e.g. a tap during startup) is kept, after the saved ops.
    if (o) outbox = (JSON.parse(o) as Op[]).concat(outbox);
    if (st) stamps = { ...(JSON.parse(st) as Record<string, number>), ...stamps };
  } catch {
    // A corrupt outbox must never block the app; local data is still intact in the store.
  }
  loaded = true;
}

// ---------------------------------------------------------------------------------------------
// Outbox
// ---------------------------------------------------------------------------------------------
function enqueue(t: OpType, k: string, p: Record<string, unknown> = {}, merge?: (old: Op) => void) {
  const uid = currentUserId();
  if (!supabase || !uid) return; // signed out: stays local; merged on next sign-in
  const existing = outbox.find(o => o.k === k && o.uid === uid);
  if (existing) {
    if (merge) merge(existing); else existing.p = p;
    existing.after = 0;
  } else {
    outbox.push({ k, t, uid, p, tries: 0, after: 0 });
  }
  persistSoon();
  scheduleFlush(t === 'dhikr' ? 4000 : 1500);
  emit();
}

function addDhikr(n: number, cg: string | null) {
  if (n === 0) return;
  const k = `dhikr:${cg ?? ''}`;
  if (n > 0) {
    enqueue('dhikr', k, { n, cg }, o => { o.p.n = (o.p.n as number) + n; });
    return;
  }
  // Undo: only take back counts that have not been uploaded yet.
  const uid = currentUserId();
  const o = outbox.find(x => x.k === k && x.uid === uid);
  if (o) {
    o.p.n = Math.max(0, (o.p.n as number) + n);
    if (o.p.n === 0) outbox = outbox.filter(x => x !== o);
    persistSoon();
  }
}

const stamp = (k: string, at = Date.now()) => { stamps[k] = at; persistSoon(); };

// ---------------------------------------------------------------------------------------------
// Diff the store into operations
// ---------------------------------------------------------------------------------------------
const PROFILE_KEYS: (keyof AppState)[] = [
  'name', 'city', 'method', 'hanafi', 'privacy', 'theme', 'adhan', 'sound', 'vib', 'notifs', 'wakeVerify',
  'wake', 'intents', 'fontSize', 'showTr', 'rTheme', 'urduAll', 'focus', 'sched', 'token', 'marks', 'streak', 'dh',
];
const SETTINGS_KEYS = PROFILE_KEYS.filter(k => !['name', 'city', 'method', 'hanafi', 'privacy'].includes(k as string));

export const emergencyKey = (e: Emergency) => `${e.when}|${e.after}|${e.reason}`.slice(0, 200);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

function diff(a: AppState, b: AppState) {
  // Prayer logs
  if (a.logs !== b.logs) {
    const days = new Set([...Object.keys(a.logs), ...Object.keys(b.logs)]);
    days.forEach(d => {
      if (a.logs[d] === b.logs[d]) return;
      PH.forEach(p => {
        const was = a.logs[d]?.[p];
        const now = b.logs[d]?.[p];
        if (was === now) return;
        stamp(`log:${d}:${p}`);
        enqueue('log', `log:${d}:${p}`, { date: d, prayer: p });
        // "Fajr together" counts each Fajr prayed by people who joined it.
        if (p === 'Fajr' && now === 'prayed' && b.joined[1]) enqueue('cg', `cg:fajr:${d}`, { cg: COMMUNITY_GOALS[1].name, n: 1 });
      });
    });
  }

  // Goals and their progress (+ tasbeeh counts made against a goal)
  if (a.goals !== b.goals) {
    const old = new Map(a.goals.map(g => [g.id, g]));
    b.goals.forEach(g => {
      const o = old.get(g.id);
      if (o === g) return;
      stamp(`goal:${g.id}`);
      enqueue('goal', `goal:${g.id}`, { id: g.id });
      if (o) {
        const d = g.prog - o.prog;
        if (d > 0) addDhikr(d, g.cg);
        else if (d === -1) addDhikr(-1, g.cg);
      }
    });
  }

  // Free tasbeeh counter
  if (a.tasN !== b.tasN && a.dh === b.dh) {
    const d = b.tasN - a.tasN;
    if (d > 0) addDhikr(d, null);
    else if (d === -1) addDhikr(-1, null);
  }

  if (a.wakeLog !== b.wakeLog) {
    const seen = new Set(a.wakeLog.map(w => w.at));
    b.wakeLog.forEach(w => { if (!seen.has(w.at)) enqueue('wake', `wake:${w.at}`, { date: w.date, at: w.at }); });
  }

  if (a.emergencies !== b.emergencies) {
    const seen = new Set(a.emergencies);
    b.emergencies.forEach(e => { if (!seen.has(e)) enqueue('emergency', `em:${emergencyKey(e)}`, { ...e }); });
  }

  if (a.joined !== b.joined) {
    b.joined.forEach((j, i) => { if (j && !a.joined[i] && COMMUNITY_GOALS[i]) enqueue('join', `join:${i}`, { cg: COMMUNITY_GOALS[i].name }); });
  }

  if (a.ameen !== b.ameen) {
    Object.keys({ ...a.ameen, ...b.ameen }).forEach(k => {
      if (!!a.ameen[k] !== !!b.ameen[k] && isUuid(k)) enqueue('ameen', `ameen:${k}`, { id: k, on: !!b.ameen[k] });
    });
  }

  if (PROFILE_KEYS.some(k => a[k] !== b[k])) {
    stamp('profile');
    enqueue('profile', 'profile');
  }
}

// ---------------------------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------------------------
const iso = (ms: number | undefined) => new Date(ms || Date.now()).toISOString();

async function goalIdFor(name: string | null | undefined): Promise<string | null> {
  if (!name || !supabase) return null;
  if (goalIds[name]) return goalIds[name];
  const { data } = await supabase.rpc('get_goal_totals', { p_circle_id: null });
  if (Array.isArray(data)) rememberGoalIds(data as { id: string; name: string }[]);
  return goalIds[name] ?? null;
}

function profilePayload(s: AppState) {
  const settings: Record<string, unknown> = {};
  SETTINGS_KEYS.forEach(k => { settings[k as string] = s[k]; });
  return {
    display_name: s.name,
    method: s.method,
    madhab: s.hanafi ? 'hanafi' : 'standard',
    city: s.city,
    privacy: s.privacy,
    settings,
    updated_at: iso(stamps.profile),
  };
}

/** Throws on failure so the caller can back off. */
async function run(op: Op) {
  const db = supabase!;
  const uid = op.uid;
  const s = getState();
  const check = (r: { error: { message: string; code?: string } | null }) => { if (r.error) throw r.error; };
  switch (op.t) {
    case 'log': {
      const { date, prayer } = op.p as { date: string; prayer: PrayerName };
      const status = s.logs[date]?.[prayer] ?? null;
      const at = stamps[`log:${date}:${prayer}`];
      check(await db.from('prayer_logs').upsert({
        user_id: uid, log_date: date, prayer_name: prayer, status, done: status === 'prayed',
        logged_at: status ? iso(at) : null, updated_at: iso(at),
      }, { onConflict: 'user_id,log_date,prayer_name' }));
      return;
    }
    case 'goal': {
      const g = s.goals.find(x => x.id === op.p.id);
      if (!g) return; // goal no longer exists locally
      check(await db.from('adhkar_goals').upsert({
        user_id: uid, client_id: g.id, title: g.name, target: Math.max(1, g.target), progress: g.prog,
        streak: g.streak, remind: g.remind, week: g.week, sched: g.sched ?? null, cg_name: g.cg,
        community_goal_id: await goalIdFor(g.cg), updated_at: iso(stamps[`goal:${g.id}`]),
      }, { onConflict: 'user_id,client_id' }));
      return;
    }
    case 'wake': {
      const { date, at } = op.p as { date: string; at: number };
      check(await db.from('wake_log').upsert({ user_id: uid, log_date: date, scanned_at: iso(at) },
        { onConflict: 'user_id,scanned_at', ignoreDuplicates: true }));
      return;
    }
    case 'emergency': {
      const e = op.p as unknown as Emergency;
      check(await db.from('emergency_unlocks').upsert({
        user_id: uid, client_key: emergencyKey(e), when_label: e.when, after_label: e.after, reason: e.reason, blocked_attempts: e.blocked ?? 0,
      }, { onConflict: 'user_id,client_key', ignoreDuplicates: true }));
      return;
    }
    case 'profile':
      check(await db.from('profiles').update(profilePayload(s)).eq('id', uid));
      return;
    case 'dhikr': {
      let n = op.p.n as number;
      const goal = await goalIdFor(op.p.cg as string | null);
      while (n > 0) {
        const amount = Math.min(n, MAX_BATCH);
        check(await db.rpc('log_dhikr', { p_amount: amount, p_goal_id: goal }));
        n -= amount;
        op.p.n = n; // a partial batch that succeeded is never sent twice
      }
      return;
    }
    case 'cg': {
      const goal = await goalIdFor(op.p.cg as string);
      if (!goal) return;
      check(await db.rpc('contribute_to_goal', { p_goal_id: goal, p_amount: op.p.n as number }));
      return;
    }
    case 'circle-contrib': {
      let n = op.p.n as number;
      while (n > 0) {
        const amount = Math.min(n, MAX_BATCH);
        check(await db.rpc('contribute_to_goal', { p_goal_id: op.p.goal as string, p_amount: amount }));
        n -= amount;
        op.p.n = n;
      }
      return;
    }
    case 'join': {
      const goal = await goalIdFor(op.p.cg as string);
      if (!goal) return;
      check(await db.rpc('join_community_goal', { p_goal_id: goal }));
      return;
    }
    case 'ameen': {
      const id = op.p.id as string;
      if (op.p.on) {
        const r = await db.from('feed_ameens').insert({ item_id: id, user_id: uid });
        if (r.error && r.error.code !== '23505') throw r.error; // already said Ameen: fine
      } else {
        check(await db.from('feed_ameens').delete().eq('item_id', id).eq('user_id', uid));
      }
      return;
    }
  }
}

/** Errors that will never succeed on retry (bad data, missing row). Dropped after a few tries. */
const permanent = (e: { code?: string }) => !!e.code && /^(22|23|42|P0002|PGRST1)/.test(e.code) && e.code !== '42501';

/** Push everything that is due. Resolves true when the outbox drained (or nothing to do). */
export function syncNow(): Promise<boolean> {
  if (flushing) return flushing;
  flushing = (async () => {
    await load();
    const uid = currentUserId();
    if (!supabase || !uid) return false;
    let ok = true;
    const now = Date.now();
    for (const op of outbox.slice()) {
      if (op.uid !== uid || op.after > now) { if (op.uid === uid) ok = false; continue; }
      try {
        await run(op);
        outbox = outbox.filter(o => o !== op);
      } catch (e) {
        op.tries += 1;
        if (permanent(e as { code?: string }) && op.tries >= 5) {
          outbox = outbox.filter(o => o !== op);
        } else {
          op.after = Date.now() + Math.min(300000, 2000 * 2 ** Math.min(op.tries, 8));
        }
        ok = false;
        // A network failure will fail every op; stop and retry later instead of hammering.
        if (!(e as { code?: string }).code) break;
      }
    }
    persistNow();
    emit();
    if (outbox.some(o => o.uid === uid)) {
      const next = Math.min(...outbox.filter(o => o.uid === uid).map(o => o.after)) - Date.now();
      scheduleFlush(Math.max(1500, next));
    }
    return ok;
  })().finally(() => { flushing = null; });
  return flushing;
}

function scheduleFlush(ms: number) {
  clearTimeout(flushT);
  flushT = setTimeout(() => { syncNow().catch(() => {}); }, ms);
}

// ---------------------------------------------------------------------------------------------
// Pull + merge (last write wins)
// ---------------------------------------------------------------------------------------------
type RemoteLog = { log_date: string; prayer_name: PrayerName; status: PrayerLog | null; done: boolean; updated_at: string };
type RemoteGoal = {
  client_id: number | null; title: string; target: number; progress: number; streak: number; remind: string | null;
  week: number[] | null; sched: Goal['sched'] | null; cg_name: string | null; updated_at: string;
};

export async function pullAndMerge() {
  await load();
  const uid = currentUserId();
  if (!supabase || !uid) return;
  const since = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  const [prof, logs, goals, wakes, ems] = await Promise.all([
    supabase.from('profiles').select('display_name, method, madhab, city, privacy, settings, updated_at').eq('id', uid).maybeSingle(),
    supabase.from('prayer_logs').select('log_date, prayer_name, status, done, updated_at').gte('log_date', since).limit(5000),
    supabase.from('adhkar_goals').select('client_id, title, target, progress, streak, remind, week, sched, cg_name, updated_at').limit(500),
    supabase.from('wake_log').select('log_date, scanned_at').order('scanned_at', { ascending: true }).limit(500),
    supabase.from('emergency_unlocks').select('client_key, when_label, after_label, reason, blocked_attempts, created_at').order('created_at', { ascending: false }).limit(500),
  ]);
  if (prof.error || logs.error || goals.error) throw prof.error || logs.error || goals.error;

  const s = getState();
  const patch: Partial<AppState> = {};

  // Profile + settings
  const p = prof.data as null | { display_name: string | null; method: number; madhab: string; city: AppState['city'] | null; privacy: boolean[]; settings: Record<string, unknown>; updated_at: string };
  const remoteHasSettings = !!p && p.settings && Object.keys(p.settings).length > 0;
  if (p && remoteHasSettings && Date.parse(p.updated_at) > (stamps.profile || 0)) {
    if (p.display_name) patch.name = p.display_name;
    if (p.city && typeof p.city === 'object' && 'name' in p.city) patch.city = p.city;
    patch.method = p.method;
    patch.hanafi = p.madhab !== 'standard';
    if (Array.isArray(p.privacy) && p.privacy.length) patch.privacy = p.privacy;
    SETTINGS_KEYS.forEach(k => {
      const v = p.settings[k as string];
      if (v !== undefined && v !== null && typeof v === typeof s[k]) (patch as Record<string, unknown>)[k as string] = v;
    });
    stamps.profile = Date.parse(p.updated_at);
  } else if (p) {
    stamp('profile', stamps.profile || Date.now());
    enqueue('profile', 'profile');
  }

  // Prayer logs
  const nextLogs: AppState['logs'] = { ...s.logs };
  const remoteKeys = new Set<string>();
  ((logs.data || []) as RemoteLog[]).forEach(r => {
    const k = `log:${r.log_date}:${r.prayer_name}`;
    remoteKeys.add(k);
    const rt = Date.parse(r.updated_at);
    const lt = stamps[k] || 0;
    const local = s.logs[r.log_date]?.[r.prayer_name];
    const remote = r.status ?? (r.done ? 'prayed' : null);
    if (rt > lt) {
      const day = { ...(nextLogs[r.log_date] || {}) };
      if (remote) day[r.prayer_name] = remote; else delete day[r.prayer_name];
      nextLogs[r.log_date] = day;
      stamps[k] = rt;
    } else if (lt > rt && local !== remote) {
      enqueue('log', k, { date: r.log_date, prayer: r.prayer_name });
    }
  });
  Object.entries(s.logs).forEach(([d, day]) => {
    if (d < since) return;
    PH.forEach(pn => {
      const k = `log:${d}:${pn}`;
      if (day?.[pn] && !remoteKeys.has(k)) {
        if (!stamps[k]) stamps[k] = Date.now();
        enqueue('log', k, { date: d, prayer: pn });
      }
    });
  });
  patch.logs = nextLogs;

  // Goals
  const byId = new Map(s.goals.map(g => [g.id, g]));
  const nextGoals = s.goals.slice();
  const seenGoals = new Set<number>();
  ((goals.data || []) as RemoteGoal[]).forEach(r => {
    if (r.client_id == null) return;
    const id = Number(r.client_id);
    seenGoals.add(id);
    const k = `goal:${id}`;
    const rt = Date.parse(r.updated_at);
    const local = byId.get(id);
    if (!local || rt > (stamps[k] || 0)) {
      const g: Goal = {
        id, name: r.title, target: r.target, prog: r.progress, streak: r.streak ?? 0, remind: r.remind ?? '8:00 pm',
        week: Array.isArray(r.week) && r.week.length === 7 ? r.week : [0, 0, 0, 0, 0, 0, 0], cg: r.cg_name ?? null,
        ...(r.sched ? { sched: r.sched } : {}),
      };
      const i = nextGoals.findIndex(x => x.id === id);
      if (i >= 0) nextGoals[i] = g; else nextGoals.push(g);
      stamps[k] = rt;
    } else if ((stamps[k] || 0) > rt) {
      enqueue('goal', k, { id });
    }
  });
  s.goals.forEach(g => {
    if (!seenGoals.has(g.id)) {
      if (!stamps[`goal:${g.id}`]) stamps[`goal:${g.id}`] = Date.now();
      enqueue('goal', `goal:${g.id}`, { id: g.id });
    }
  });
  patch.goals = nextGoals;

  // Wake log: union by scan time
  if (!wakes.error) {
    const have = new Set(s.wakeLog.map(w => w.at));
    const remoteAts = new Set<number>();
    const add: WakeEntry[] = [];
    ((wakes.data || []) as { log_date: string; scanned_at: string }[]).forEach(r => {
      const at = Date.parse(r.scanned_at);
      remoteAts.add(at);
      if (!have.has(at)) add.push({ date: r.log_date, at });
    });
    s.wakeLog.forEach(w => { if (!remoteAts.has(w.at)) enqueue('wake', `wake:${w.at}`, { date: w.date, at: w.at }); });
    if (add.length) patch.wakeLog = s.wakeLog.concat(add).sort((x, y) => x.at - y.at).slice(-90);
  }

  // Emergency unlocks: union by key
  if (!ems.error) {
    const have = new Set(s.emergencies.map(emergencyKey));
    const remoteKeysE = new Set<string>();
    const add: Emergency[] = [];
    ((ems.data || []) as { client_key: string; when_label: string; after_label: string | null; reason: string | null; blocked_attempts: number | null }[]).forEach(r => {
      remoteKeysE.add(r.client_key);
      if (!have.has(r.client_key)) add.push({ when: r.when_label, after: r.after_label ?? '', reason: r.reason ?? '', blocked: r.blocked_attempts ?? 0 });
    });
    s.emergencies.forEach(e => { if (!remoteKeysE.has(emergencyKey(e))) enqueue('emergency', `em:${emergencyKey(e)}`, { ...e }); });
    if (add.length) patch.emergencies = s.emergencies.concat(add);
  }

  setFromRemote(patch);
  persistSoon();
  syncNow().catch(() => {});
}

// ---------------------------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------------------------
async function onSignedIn(uid: string) {
  if (pulledFor === uid) return;
  pulledFor = uid;
  if (!getState().signedIn) setFromRemote({ signedIn: true, onboarded: true });
  try {
    await pullAndMerge();
  } catch {
    pulledFor = null; // offline: try again on next foreground
  }
  afterSignIn?.();
}

let afterSignIn: (() => void) | undefined;
/** live.ts registers its refresh here (avoids an import cycle). */
export function setAfterSignIn(fn: () => void) { afterSignIn = fn; }

/** Start once, after the store has hydrated. Safe to call when the backend is not configured. */
export function startSync() {
  if (started) return;
  started = true;
  load().catch(() => {});
  prev = getState();
  subscribe(() => {
    const s = getState();
    if (!s.hydrated) return;
    if (!prev || !prev.hydrated) { prev = s; return; }
    const a = prev;
    prev = s;
    if (isRemoteWrite()) return;
    diff(a, s);
  });
  if (!supabase) return;
  onSession(sess => {
    if (sess?.user) onSignedIn(sess.user.id);
    else pulledFor = null;
  });
  const uid = currentUserId();
  if (uid) onSignedIn(uid);
  RNAppState.addEventListener('change', st => {
    if (st === 'active') {
      const id = currentUserId();
      if (id && pulledFor !== id) onSignedIn(id);
      else syncNow().catch(() => {});
    } else {
      // Going to background: make sure the outbox is on disk and try one last push.
      persistNow();
      syncNow().catch(() => {});
    }
  });
}

/** Called right before signing out: best-effort push of pending changes (bounded wait). */
export async function flushBeforeSignOut(ms = 3000) {
  await Promise.race([syncNow().catch(() => false), new Promise(r => setTimeout(r, ms))]);
  persistNow();
  pulledFor = null;
}

export function enqueueCircleContribution(goalId: string, n: number) {
  enqueue('circle-contrib', `circle-contrib:${goalId}`, { goal: goalId, n }, o => { o.p.n = (o.p.n as number) + n; });
}
