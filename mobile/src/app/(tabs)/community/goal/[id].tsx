import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { joinGoal, useCommunityGoals } from '../../../../components/community';
import { BackBar, Cta, H1, Label, Ring, Screen, Txt } from '../../../../components/ui';
import { fmt, participantsLabel } from '../../../../data/content';
import { useApp } from '../../../../state/store';
import { useT } from '../../../../theme/ThemeProvider';

export default function CommunityGoal() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cgs = useCommunityGoals();
  const c = cgs[Number(id)] || cgs[0];
  // Count toward the personal goal linked to this community goal, if there is one.
  const linked = useApp(s => s.goals.find(g => g.cg === c.name));
  const pct = c.done / c.total;
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingTop: 4, paddingHorizontal: 22 }}>
        <H1>{c.name}</H1>
        <Txt style={{ fontSize: 14, color: t.t2, marginTop: 6 }}>{c.live ? `${participantsLabel(c.people)}${c.ends ? (c.ends === 'ended' ? ' · ended' : ` · ends in ${c.ends}`) : ''}` : 'Sign in and connect to see live progress'}</Txt>
      </View>
      <View style={{ paddingTop: 20, alignItems: 'center' }}>
        <Ring size={230} r={100} stroke={14} pct={pct} track={t.sheetc} gradient={['#F7BD5A', '#E07A4B']}>
          <View style={{ alignItems: 'center' }}>
            <Txt style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.3 }}>{c.live ? `${Math.round(pct * 1000) / 10}%` : '—'}</Txt>
            <Txt style={{ fontSize: 13, color: t.t2, marginTop: 4 }}>{c.live ? `${fmt(c.done)} / ${fmt(c.total)}` : `Target ${fmt(c.total)}`}</Txt>
          </View>
        </Ring>
      </View>
      <View style={{ paddingTop: 18, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        {[['YOUR CONTRIBUTION', c.live ? fmt(c.mine) : '—'], ['THIS HOUR', c.live ? `+${fmt(c.hour)}` : '—']].map(([k, v]) => (
          <View key={k} style={{ flex: 1, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }}>
            <Label>{k}</Label>
            <Txt style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{v}</Txt>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
        <Cta label={c.joined ? 'Contribute with Tasbeeh' : 'Join & contribute'} onPress={() => {
          if (!c.joined) joinGoal(c.i);
          router.push(linked ? { pathname: '/tasbeeh', params: { goal: String(linked.id) } } : '/tasbeeh');
        }} />
      </View>
    </Screen>
  );
}
