import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { COMMUNITY_GOALS, FEED, fmt } from '../data/content';
import { buzz } from '../lib/feedback';
import { endsIn, useLive, type LiveFeedItem } from '../lib/live';
import { set, useApp, type Circle } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { FIXED } from '../theme/tokens';
import { Icon } from './Icon';
import { useReducedMotion } from './motion';
import { Avatar, Tap, Txt, say } from './ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LINE = 'M0 50 C30 47 45 40 70 42 S110 30 135 32 S180 18 205 22 S250 10 300 6';

/** Ummah trend sparkline that draws itself in (ibDraw). */
export function Sparkline() {
  const v = useRef(new Animated.Value(420)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) { v.setValue(0); return; }
    Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start();
  }, [v, rm]);
  return (
    <Svg width="100%" height={62} viewBox="0 0 300 62" preserveAspectRatio="none" style={{ marginTop: 14 }}>
      <Defs>
        <LinearGradient id="cmg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${LINE} L300 62 L0 62 Z`} fill="url(#cmg)" />
      <AnimatedPath d={LINE} stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="420" strokeDashoffset={v} />
    </Svg>
  );
}

/** Community goals: live totals when signed in and online, otherwise the bundled sample. */
export function useCommunityGoals() {
  const joined = useApp(s => s.joined);
  const on = useLive(l => l.on);
  const goals = useLive(l => l.goals);
  return COMMUNITY_GOALS.map((c, i) => {
    const g = on ? goals[c.name] : undefined;
    if (g) return { ...c, i, joined: joined[i], done: g.total, total: g.target, people: g.people, ends: endsIn(g.endsAt, c.ends), mine: g.mine, hour: g.thisHour, live: true };
    return { ...c, i, joined: joined[i], done: c.done + (i === 0 && joined[0] ? 1240 : 0), mine: joined[i] ? 1240 : 0, hour: 18421, live: false };
  });
}

/** Feed items: live (with Ameen counts) when available, otherwise the sample feed. */
export function useFeed(): LiveFeedItem[] {
  const on = useLive(l => l.on);
  const feed = useLive(l => l.feed);
  return on && feed ? feed : FEED;
}

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
  const f = liveItem || FEED.find(x => x.k === k);
  const on = useApp(s => !!s.ameen[k]);
  if (!f) return null;
  const tint = { amb: [t.tAmb, t.acc], mint: [t.tMint, t.mint], blue: [t.tBlue, t.peri], lav: [t.tLav, t.lav] }[f.tint];
  return (
    <View style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 14, paddingRight: 12, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
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

export function AvatarRow({ c, size = 32 }: { c: Circle; size?: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', paddingLeft: 9 }}>
      {['A', 'S', 'M'].map((i, k) => <Avatar key={k} i={i} bg={FIXED.avatars[(k + c.id) % FIXED.avatars.length]} size={size} border={t.card} style={{ marginLeft: -9 }} />)}
    </View>
  );
}

export const circlePct = (c: Circle) => (c.goals[0] ? Math.round((c.goals[0].done / c.goals[0].total) * 100) : 0);
