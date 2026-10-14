import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { joinGoal, useCommunityGoals } from '../../../../components/community';
import { Icon } from '../../../../components/Icon';
import { Breathe, FadeIn } from '../../../../components/motion';
import { BackBar, Cta, Label, Ring, Screen, Txt } from '../../../../components/ui';
import { cgDhikrKey, COMMUNITY_GOALS, fmt, participantsLabel } from '../../../../data/content';
import { todayKey, useApp } from '../../../../state/store';
import { useT } from '../../../../theme/ThemeProvider';
import { G, bgImage } from '../../../../theme/tokens';

export default function CommunityGoal() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cgs = useCommunityGoals();
  const c = cgs[Number(id)] || cgs[0];
  const def = COMMUNITY_GOALS[c.i];
  const dhikrKey = cgDhikrKey(c.i);
  const dhikr = 'dhikr' in def.counts ? def.counts.dhikr : null;
  // Count toward the personal goal linked to this community goal, if there is one.
  const linked = useApp(s => s.goals.find(g => g.cg === c.name));
  const fajrToday = useApp(s => s.logs[todayKey()]?.Fajr === 'prayed');
  const pct = c.done / c.total;

  const contribute = () => {
    if (!c.joined) joinGoal(c.i);
    if (!dhikrKey) { router.navigate('/prayer'); return; }
    // A linked personal goal keeps its own progress; otherwise the counter opens on this goal's dhikr.
    router.push(linked ? { pathname: '/tasbeeh', params: { goal: String(linked.id) } } : { pathname: '/tasbeeh', params: { dhikr: dhikrKey } });
  };
  const cta = dhikr
    ? (c.joined ? 'Contribute with Tasbeeh' : 'Join & contribute')
    : fajrToday ? (c.joined ? 'Fajr marked today · open Prayer' : 'Join · Fajr marked today') : (c.joined ? 'Mark today’s Fajr' : 'Join & mark Fajr');
  const how = dhikr
    ? linked
      ? `Your goal “${linked.name}” counts toward this. Every ${dhikr} you count in Tasbeeh adds to it too.`
      : `Every ${dhikr} you count in Tasbeeh adds to this goal once you join.`
    : 'Each Fajr you mark as prayed in the Prayer tab adds one to this goal once you join.';

  return (
    <Screen top={54}>
      <BackBar />
      <FadeIn key={c.i} dur={450} style={{ paddingTop: 4, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 36, overflow: 'hidden', padding: 22, ...bgImage(G.featured[c.i % G.featured.length]) }}>
          <Breathe bg={G.glowWhite} style={{ width: 240, height: 240, right: -80, top: -90 }} dur={11000} />
          <Breathe bg={G.glowGoldSoft} style={{ width: 200, height: 200, left: -70, bottom: -80 }} dur={9000} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.22)' }}>
              <Txt style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{dhikr ? `Counts ${dhikr}` : 'Counts Fajr prayed'}</Txt>
            </View>
            {c.joined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Icon name="check" size={13} color="#FFFFFF" />
                <Txt style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>Joined</Txt>
              </View>
            )}
          </View>
          <Txt accessibilityRole="header" style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 34, marginTop: 16, color: '#FFFFFF' }}>{c.name}</Txt>
          <Txt ar style={{ fontSize: 26, lineHeight: 46, color: '#FFE3B8', marginTop: 4 }}>{def.ar}</Txt>
          <Txt style={{ fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.86)', marginTop: 4 }}>{def.about}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 }}>
            <Ring size={104} r={44} stroke={9} pct={pct} track="rgba(255,255,255,0.22)" color="#FFFFFF">
              <Txt style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>{c.live ? `${Math.round(pct * 1000) / 10}%` : '—'}</Txt>
            </Ring>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: '#FFFFFF' }}>{c.live ? fmt(c.done) : `Target ${fmt(c.total)}`}</Txt>
              <Txt style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 3 }}>
                {c.live ? `of ${fmt(c.total)} · ${participantsLabel(c.people)}${c.ends ? (c.ends === 'ended' ? ' · ended' : ` · ends in ${c.ends}`) : ''}` : 'Sign in and connect to see live progress'}
              </Txt>
            </View>
          </View>
        </View>
      </FadeIn>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        {[['YOUR CONTRIBUTION', c.live ? fmt(c.mine) : '—'], ['THIS HOUR', c.live ? `+${fmt(c.hour)}` : '—']].map(([k, v]) => (
          <View key={k} style={{ flex: 1, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 16, ...bgImage(t.glass) }}>
            <Label>{k}</Label>
            <Txt style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{v}</Txt>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 10, marginHorizontal: 16, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', ...bgImage(t.glass) }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.tAmb, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={dhikr ? 'beads' : 'prayer'} size={18} color={t.acc} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 14.5, fontWeight: 700 }}>How it counts</Txt>
          <Txt style={{ fontSize: 13, lineHeight: 19, color: t.t2, marginTop: 3 }}>{how}</Txt>
        </View>
      </View>
      <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
        <Cta label={cta} onPress={contribute} />
      </View>
    </Screen>
  );
}
