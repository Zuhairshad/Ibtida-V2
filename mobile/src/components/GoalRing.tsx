import { View } from 'react-native';
import type { Goal } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Ring, Tap, Txt } from './ui';

export const goalPct = (g: Goal) => Math.min(100, Math.round((g.prog / g.target) * 100));

export function GoalRing({ g }: { g: Goal }) {
  const t = useT();
  return (
    <Ring size={58} r={24} stroke={6} pct={goalPct(g) / 100} track={t.ctl3} color={t.acc}>
      <Txt style={{ fontSize: 13, fontWeight: 800 }}>{goalPct(g)}%</Txt>
    </Ring>
  );
}

/** Goal card with ring, streak flame and 7-day strip (Adhkar → Personal goals). */
export function GoalCard({ g, onPress }: { g: Goal; onPress: () => void }) {
  const t = useT();
  return (
    <Tap scale={0.985} onPress={onPress} accessibilityLabel={`${g.name}, ${goalPct(g)} percent, count now`}
      style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <GoalRing g={g} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={{ fontSize: 16.5, fontWeight: 700 }}>{g.name}</Txt>
          <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{Math.min(g.prog, g.target)} of {g.target} · reminder {g.remind}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="flame" size={16} color={t.acc} />
          <Txt style={{ fontSize: 13, fontWeight: 800, color: t.acc }}>{g.streak}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 14 }}>
        {g.week.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: v ? t.acc : t.ctl3 }} />
            <Txt style={{ fontSize: 11, color: t.t4 }}>{'MTWTFSS'[i]}</Txt>
          </View>
        ))}
      </View>
      {g.cg && (
        <View style={{ alignSelf: 'flex-start', marginTop: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(90,160,138,0.18)' }}>
          <Txt style={{ fontSize: 12, fontWeight: 700, color: t.mint }}>Linked · {g.cg}</Txt>
        </View>
      )}
    </Tap>
  );
}
