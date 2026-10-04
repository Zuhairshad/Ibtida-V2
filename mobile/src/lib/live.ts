import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import type { IconName } from '../components/Icon';
import { COMMUNITY_GOALS, type FeedTint } from '../data/content';
import { getState, setFromRemote, type Circle } from '../state/store';
import { currentUserId, supabase } from './supabase';
import { enqueueCircleContribution, pendingOp, rememberGoalIds, setAfterSignIn } from './sync';

/**
 * Live community data from Supabase (Ummah totals, community goals, feed, circles).
 * `on` is true only while signed in and the last refresh succeeded; otherwise screens fall back
 * to the bundled sample data, so the Community tab looks the same offline.
 */
export type LiveGoal = {
  id: string; name: string; total: number; target: number; people: number;
  endsAt: string | null; joined: boolean; mine: number; thisHour: number;
};
export type LiveFeedItem = { k: string; icon: IconName; tint: FeedTint; text: string; sub: string; n: number };
export type LiveMember = { name: string; role: 'Owner' | 'Member'; me: boolean };
type Live = {
  on: boolean;
  goals: Record<string, LiveGoal>;
  ummah: { today: number; hour: number; now: number } | null;
  feed: LiveFeedItem[] | null;
  members: Record<string, LiveMember[]>;
};

let live: Live = { on: false, goals: {}, ummah: null, feed: null, members: {} };
const ls = new Set<() => void>();
const put = (p: Partial<Live>) => { live = { ...live, ...p }; ls.forEach(l => l()); };
const sub = (l: () => void) => { ls.add(l); return () => { ls.delete(l); }; };

export function useLive<T>(sel: (l: Live) => T): T {
  return useSyncExternalStore(sub, () => sel(live), () => sel(live));
}

export const liveOn = () => !!supabase && !!currentUserId();

const LOCAL_CIRCLES_KEY = 'ibtida.v7.localCircles';

/** Stable numeric id for routes (`/community/circle/[id]`) from a uuid. 52 bits, exact in JS. */
export const circleNumId = (uuid: string) => parseInt(uuid.replace(/-/g, '').slice(0, 13), 16);

const PRIV_TO_DB: Record<string, string> = { Discoverable: 'Public' };
const PRIV_FROM_DB: Record<string, string> = { Public: 'Discoverable' };

function ago(isoTime: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(isoTime)) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function endsIn(endsAt: string | null, fallback: string) {
  if (!endsAt) return fallback;
  const ms = Date.parse(endsAt) - Date.now();
  if (ms <= 0) return 'ended';
  const d = Math.ceil(ms / 86400000);
  return d <= 1 ? 'a day' : `${d} days`;
}

type GoalRow = { id: string; name: string; target: number | string; ends_at: string | null; total: number | string; participants: number; this_hour: number | string; mine: number | string; joined: boolean };
type CircleRow = { id: string; name: string; privacy: string; invite_code: string; role: string; member_count: number };
type FeedRow = { id: string; icon: IconName; tint: FeedTint; body: string; scope: 'circle' | 'goal' | 'global'; created_at: string; ameen_count: number; mine: boolean };

const SCOPE: Record<FeedRow['scope'], string> = { circle: 'Your circle', goal: 'Community goal', global: 'Global' };

async function circleGoals(id: string) {
  const { data } = await supabase!.rpc('get_goal_totals', { p_circle_id: id });
  return ((data || []) as GoalRow[]).map(g => {
    const pend = pendingOp(`circle-contrib:${g.id}`);
    return { id: g.id, name: g.name, done: Number(g.total) + ((pend?.p.n as number) || 0), total: Number(g.target) };
  });
}

function toCircle(r: CircleRow, goals: Circle['goals']): Circle {
  return {
    id: circleNumId(r.id), remoteId: r.id, name: r.name, priv: PRIV_FROM_DB[r.privacy] || r.privacy,
    members: r.member_count, code: r.invite_code, role: r.role === 'owner' ? 'Owner' : 'Member', goals,
  };
}

async function applyCircles(rows: CircleRow[]) {
  const circles = await Promise.all(rows.map(async r => toCircle(r, await circleGoals(r.id))));
  // Keep the on-device circles so signing out restores them.
  try {
    if (!(await AsyncStorage.getItem(LOCAL_CIRCLES_KEY))) {
      const local = getState().circles.filter(c => !c.remoteId);
      await AsyncStorage.setItem(LOCAL_CIRCLES_KEY, JSON.stringify(local));
    }
  } catch { /* best effort */ }
  setFromRemote({ circles });
}

export async function refreshCircles() {
  if (!liveOn()) return;
  const { data, error } = await supabase!.rpc('get_my_circles');
  if (error) throw error;
  await applyCircles((data || []) as CircleRow[]);
}

/** Pull everything the Community tab shows. Failures leave `on` false (sample fallback). */
export async function refreshLive() {
  if (!liveOn()) { put({ on: false }); return; }
  const db = supabase!;
  try {
    const [st, goals, feed, circles] = await Promise.all([
      db.rpc('get_ummah_stats'),
      db.rpc('get_goal_totals', { p_circle_id: null }),
      db.rpc('get_feed', { p_limit: 30 }),
      db.rpc('get_my_circles'),
    ]);
    if (st.error || goals.error || feed.error || circles.error) throw st.error || goals.error || feed.error || circles.error;

    const g: Record<string, LiveGoal> = {};
    ((goals.data || []) as GoalRow[]).forEach(r => {
      g[r.name] = {
        id: r.id, name: r.name, total: Number(r.total), target: Number(r.target), people: r.participants,
        endsAt: r.ends_at, joined: r.joined, mine: Number(r.mine), thisHour: Number(r.this_hour),
      };
    });
    rememberGoalIds(Object.values(g));

    const items = (feed.data || []) as FeedRow[];
    const fi: LiveFeedItem[] = items.map(f => ({
      k: f.id, icon: f.icon, tint: f.tint, text: f.body, sub: `${SCOPE[f.scope]} · ${ago(f.created_at)}`,
      n: Math.max(0, f.ameen_count - (f.mine ? 1 : 0)),
    }));
    const s0 = st.data as { today: number; this_hour: number; people_now: number };

    put({ on: true, goals: g, feed: fi, ummah: { today: Number(s0.today), hour: Number(s0.this_hour), now: Number(s0.people_now) } });

    // Mirror server state into the local store (without echoing it back as changes);
    // anything still waiting in the outbox wins over the server copy.
    const s = getState();
    const joined = COMMUNITY_GOALS.map((c, i) => !!g[c.name]?.joined || !!pendingOp(`join:${i}`));
    const ameen = { ...s.ameen };
    items.forEach(f => {
      const pend = pendingOp(`ameen:${f.id}`);
      ameen[f.id] = pend ? !!pend.p.on : f.mine;
    });
    setFromRemote({ joined, ameen });
    await applyCircles((circles.data || []) as CircleRow[]);
  } catch {
    put({ on: false });
  }
}
setAfterSignIn(() => { refreshLive().catch(() => {}); });

/** Refresh on mount and every 30 s while a community screen is open. */
export function useLiveRefresh() {
  useEffect(() => {
    refreshLive().catch(() => {});
    const id = setInterval(() => { refreshLive().catch(() => {}); }, 30000);
    return () => clearInterval(id);
  }, []);
}

/** Restore the on-device circles and drop live data (sign out). */
export async function resetLive() {
  put({ on: false, goals: {}, ummah: null, feed: null, members: {} });
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CIRCLES_KEY);
    await AsyncStorage.removeItem(LOCAL_CIRCLES_KEY);
    const local = raw ? (JSON.parse(raw) as Circle[]) : getState().circles.filter(c => !c.remoteId);
    setFromRemote({ circles: local });
  } catch {
    setFromRemote({ circles: getState().circles.filter(c => !c.remoteId) });
  }
}

// ---------------------------------------------------------------------------------------------
// Circle actions (need a connection; callers fall back to local behaviour when signed out)
// ---------------------------------------------------------------------------------------------
const friendly = (e: { message?: string; code?: string } | null | undefined, fallback: string) => {
  if (!e) return fallback;
  if (e.code === 'P0002') return 'No circle found with that code';
  if (!e.code) return 'You’re offline — try again when connected';
  return fallback;
};

export async function createCircleLive(name: string, priv: string): Promise<Circle> {
  const uid = currentUserId()!;
  const { data, error } = await supabase!.from('community_circles')
    .insert({ name, privacy: PRIV_TO_DB[priv] || priv, created_by: uid })
    .select('id, name, privacy, invite_code').single();
  if (error || !data) throw new Error(friendly(error, 'Couldn’t create the circle'));
  const c = toCircle({ ...(data as Omit<CircleRow, 'role' | 'member_count'>), role: 'owner', member_count: 1 }, []);
  setFromRemote(s => ({ circles: s.circles.filter(x => x.remoteId !== c.remoteId).concat([c]) }));
  return c;
}

export async function joinCircleLive(code: string): Promise<Circle> {
  const { data, error } = await supabase!.rpc('join_circle_by_code', { p_code: code });
  if (error) throw new Error(friendly(error, 'Couldn’t join that circle'));
  await refreshCircles().catch(() => {});
  const id = (data as { circleId: string }).circleId;
  const c = getState().circles.find(x => x.remoteId === id);
  if (!c) throw new Error('Joined — pull to refresh your circles');
  return c;
}

export async function regenerateCodeLive(c: Circle): Promise<string> {
  const { data, error } = await supabase!.rpc('regenerate_circle_invite', { p_circle_id: c.remoteId });
  if (error) throw new Error(friendly(error, 'Only the owner can regenerate the code'));
  const code = data as string;
  setFromRemote(s => ({ circles: s.circles.map(x => (x.remoteId === c.remoteId ? { ...x, code } : x)) }));
  return code;
}

export async function leaveCircleLive(c: Circle) {
  const uid = currentUserId()!;
  const r = c.role === 'Owner'
    ? await supabase!.from('community_circles').delete().eq('id', c.remoteId!)
    : await supabase!.from('circle_members').delete().eq('circle_id', c.remoteId!).eq('user_id', uid);
  if (r.error) throw new Error(friendly(r.error, c.role === 'Owner' ? 'Couldn’t delete the circle' : 'Couldn’t leave the circle'));
  setFromRemote(s => ({ circles: s.circles.filter(x => x.remoteId !== c.remoteId) }));
}

export async function addCircleGoalLive(c: Circle, name: string, total: number) {
  const { data, error } = await supabase!.from('community_goals')
    .insert({ circle_id: c.remoteId, name, target: total, created_by: currentUserId() })
    .select('id').single();
  if (error || !data) throw new Error(friendly(error, 'Couldn’t add the goal'));
  const g = { id: (data as { id: string }).id, name, done: 0, total };
  setFromRemote(s => ({ circles: s.circles.map(x => (x.remoteId === c.remoteId ? { ...x, goals: x.goals.concat([g]) } : x)) }));
}

/** Optimistic: updates the card now, uploads through the outbox (works offline). */
export function contributeCircleLive(c: Circle, goalId: string, n: number) {
  setFromRemote(s => ({
    circles: s.circles.map(x => (x.remoteId === c.remoteId
      ? { ...x, goals: x.goals.map(g => (g.id === goalId ? { ...g, done: Math.min(g.total, g.done + n) } : g)) }
      : x)),
  }));
  enqueueCircleContribution(goalId, n);
}

export async function loadMembers(c: Circle) {
  if (!c.remoteId || !liveOn()) return;
  const uid = currentUserId();
  const { data, error } = await supabase!.rpc('get_circle_member_profiles', { p_circle_id: c.remoteId });
  if (error) return;
  const list = ((data || []) as { user_id: string; display_name: string | null; role: string }[]).map(m => ({
    name: m.user_id === uid ? (getState().name || 'You') : (m.display_name || 'Circle member'),
    role: (m.role === 'owner' ? 'Owner' : 'Member') as LiveMember['role'],
    me: m.user_id === uid,
  }));
  put({ members: { ...live.members, [c.remoteId]: list } });
  if (list.length !== c.members) {
    setFromRemote(s => ({ circles: s.circles.map(x => (x.remoteId === c.remoteId ? { ...x, members: list.length } : x)) }));
  }
}
