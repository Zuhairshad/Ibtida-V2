import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { joinGoal, useCommunityGoals } from '../../../../components/community';
import { Avatar, BackBar, Cta, H1, Label, Ring, Screen, Txt } from '../../../../components/ui';
import { fmt } from '../../../../data/content';
import { useT } from '../../../../theme/ThemeProvider';
import { FIXED } from '../../../../theme/tokens';

export default function CommunityGoal() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cgs = useCommunityGoals();
  const c = cgs[Number(id)] || cgs[0];
  const pct = c.done / c.total;
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingTop: 4, paddingHorizontal: 22 }}>
        <H1>{c.name}</H1>
        <Txt style={{ fontSize: 14, color: t.t2, marginTop: 6 }}>{fmt(c.people)} participants · ends in {c.ends}</Txt>
      </View>
      <View style={{ paddingTop: 20, alignItems: 'center' }}>
        <Ring size={230} r={100} stroke={14} pct={pct} track={t.sheetc} gradient={['#F7BD5A', '#E07A4B']}>
          <View style={{ alignItems: 'center' }}>
            <Txt style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.3 }}>{Math.round(pct * 1000) / 10}%</Txt>
            <Txt style={{ fontSize: 13, color: t.t2, marginTop: 4 }}>{fmt(c.done)} / {fmt(c.total)}</Txt>
          </View>
        </Ring>
      </View>
      <View style={{ paddingTop: 18, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        {[['YOUR CONTRIBUTION', c.joined ? fmt(c.mine) : '0'], ['THIS HOUR', `+${fmt(c.hour)}`]].map(([k, v]) => (
          <View key={k} style={{ flex: 1, borderRadius: 24, backgroundColor: t.card, padding: 16 }}>
            <Label>{k}</Label>
            <Txt style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{v}</Txt>
          </View>
        ))}
      </View>
      {/* Live data never names individual contributors (counts only), so this sample row is offline-only. */}
      {!c.live && <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>RECENT CONTRIBUTORS</Label>}
      {!c.live && <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {([['AR', 33], ['SK', 100], ['MA', 33], ['HN', 66], ['ZB', 33]] as const).map(([i, n], k) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingLeft: 5, paddingRight: 14, borderRadius: 21, backgroundColor: t.card }}>
            <Avatar i={i} bg={FIXED.avatars[k]} />
            <Txt style={{ fontSize: 13, fontWeight: 600 }}>+{n}</Txt>
          </View>
        ))}
      </View>}
      <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
        <Cta label={c.joined ? 'Contribute with Tasbeeh' : 'Join & contribute'} onPress={() => {
          if (!c.joined) joinGoal(c.i);
          router.push({ pathname: '/tasbeeh', params: { goal: '1' } });
        }} />
      </View>
    </Screen>
  );
}
