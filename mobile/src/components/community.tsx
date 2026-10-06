import { View } from 'react-native';
import { COMMUNITY_GOALS, fmt } from '../data/content';
import { buzz } from '../lib/feedback';
import { endsIn, useLive, type LiveFeedItem } from '../lib/live';
import { set, useApp, type Circle } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { FIXED } from '../theme/tokens';
import { Icon } from './Icon';
import { Avatar, Tap, Txt, say } from './ui';

/** Ummah activity for the last 12 hours, drawn from real hourly totals (oldest first). */
export function HourBars({ hours, color = '#FFFFFF', height = 56 }: { hours: number[]; color?: string; height?: number }) {
  const max = Math.max(1, ...hours);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height, marginTop: 14 }} accessibilityLabel="Dhikr counted in each of the last 12 hours">
      {hours.map((h, i) => (
        <View key={i} style={{ flex: 1, borderRadius: 4, height: `${Math.max(4, (h / max) * 100)}%`, backgroundColor: color, opacity: h ? 0.35 + (0.65 * i) / Math.max(1, hours.length - 1) : 0.18 }} />
      ))}
    </View>
  );
}

export type CommunityGoalView = {
  i: number; name: string; total: number; joined: boolean; live: boolean;
  done: number; people: number; ends: string; mine: number; hour: number;
};

/** Community goals with live totals. Signed out or offline, only the name and target are known. */
export function useCommunityGoals(): CommunityGoalView[] {
  const joined = useApp(s => s.joined);
  const on = useLive(l => l.on);
  const goals = useLive(l => l.goals);
  return COMMUNITY_GOALS.map((c, i) => {
    const g = on ? goals[c.name] : undefined;
    if (g) return { i, name: c.name, total: g.target, joined: joined[i], live: true, done: g.total, people: g.people, ends: endsIn(g.endsAt, ''), mine: g.mine, hour: g.thisHour };
    return { i, name: c.name, total: c.total, joined: !!joined[i], live: false, done: 0, people: 0, ends: '', mine: 0, hour: 0 };
  });
}

/** Feed items, live from the server only. */
export function useFeed(): LiveFeedItem[] {
  const on = useLive(l => l.on);
  const feed = useLive(l => l.feed);
  return on && feed ? feed : NO_FEED;
}
const NO_FEED: LiveFeedItem[] = [];

export function joinGoal(i: number) {
  set(s => {
    if (s.joined[i]) return {};
    const j = s.joined.slice(); j[i] = true;
    return { joined: j };
  });
  buzz([10, 30, 16]);
  say('Joined ' + COMMUNITY_GOALS[i].name);
}

/** Feed row — the only reaction is "Ameen"; no likes, no ranks. */
export function FeedRow({ k }: { k: string }) {
  const t = useT();
  const liveItem = useLive(l => l.feed?.find(x => x.k === k));
  const f = liveItem;
  const on = useApp(s => !!s.ameen[k]);
  if (!f) return null;
  const tint = { amb: [t.tAmb, t.acc], mint: [t.tMint, t.mint], blue: [t.tBlue, t.peri], lav: [t.tLav, t.lav] }[f.tint];
  return (
    <View style={{ borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, paddingVertical: 14, paddingRight: 12, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={f.icon} color={tint[1]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 19.5 }}>{f.text}</Txt>
        <Txt style={{ fontSize: 12, color: t.t2, marginTop: 4 }}>{f.sub}</Txt>
      </View>
      <Tap scale={0.9} accessibilityLabel="Say Ameen" accessibilityState={{ selected: on }}
        onPress={() => { buzz(on ? 5 : [8, 24, 8]); set(s => ({ ameen: { ...s.ameen, [k]: !on } })); }}
        style={{ minWidth: 66, height: 44, paddingHorizontal: 10, borderRadius: 22, backgroundColor: on ? 'rgba(242,166,90,0.2)' : t.ctl, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 12.5, fontWeight: 800, color: on ? t.acc : t.t5, lineHeight: 15 }}>Ameen</Txt>
        <Txt style={{ fontSize: 11, fontWeight: 700, color: on ? t.acc : t.t5, lineHeight: 13 }}>{fmt(f.n + (on ? 1 : 0))}</Txt>
      </Tap>
    </View>
  );
}

/** Member initials for a circle: real names once loaded, otherwise a member count bubble. */
export function AvatarRow({ c, size = 32 }: { c: Circle; size?: number }) {
  const t = useT();
  const me = useApp(s => s.name);
  const list = useLive(l => (c.remoteId ? l.members[c.remoteId] : undefined));
  const names = list ? list.map(m => m.name) : c.remoteId ? [] : [me || 'You'];
  const shown = names.slice(0, 3);
  const extra = Math.max(0, c.members - shown.length);
  return (
    <View style={{ flexDirection: 'row', paddingLeft: 9 }}>
      {shown.map((n, k) => <Avatar key={k} i={initialsOf(n)} bg={FIXED.avatars[(k + c.id) % FIXED.avatars.length]} size={size} border={t.card} style={{ marginLeft: -9 }} />)}
      {extra > 0 && <Avatar i={`+${extra}`} bg={FIXED.avatars[3]} size={size} fs={size * 0.34} border={t.card} style={{ marginLeft: -9 }} />}
    </View>
  );
}

export const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '·';

export const circlePct = (c: Circle) => (c.goals[0] ? Math.round((c.goals[0].done / c.goals[0].total) * 100) : 0);
