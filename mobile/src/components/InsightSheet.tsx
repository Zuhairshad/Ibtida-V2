import * as Clipboard from 'expo-clipboard';
import { ScrollView, View } from 'react-native';
import { fmt, MILESTONES, PH } from '../data/content';
import { firstName, usePrayerNow } from '../lib/hooks';
import { useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { FIXED, G } from '../theme/tokens';
import { Icon } from './Icon';
import { Bar, Label, Ring, say, Sheet, Tap, Txt } from './ui';

/** "Today's insight" sheet opened from the Home carousel. */
export function InsightSheet({ open, onClose, impact }: { open: boolean; onClose: () => void; impact: number }) {
  const t = useT();
  const streak = useApp(s => s.streak);
  const goals = useApp(s => s.goals);
  const circles = useApp(s => s.circles);
  const { logs, doneCount } = usePrayerNow();
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Txt style={{ fontSize: 14, color: t.t2 }}>Assalamu Alaikum, {firstName()}</Txt>
          <Txt style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginTop: 4 }}>Today’s insight</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, backgroundColor: 'rgba(242,166,90,0.14)' }}>
          <Icon name="flame" size={16} color={t.acc} />
          <Txt style={{ fontSize: 14, fontWeight: 800, color: t.acc }}>{streak} days</Txt>
        </View>
      </View>

      <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 4 }}>MILESTONES</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 4 }}>
        {MILESTONES.map(([n, label, d]) => {
          const got = streak >= d;
          return (
            <View key={n} style={{ width: 104, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 10, backgroundColor: got ? 'rgba(242,166,90,0.12)' : t.sheetc, alignItems: 'center', opacity: got ? 1 : 0.55 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, experimental_backgroundImage: got ? 'linear-gradient(135deg, #FFD27A, #E07A4B)' : undefined, backgroundColor: got ? undefined : t.ctl4, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: 14, fontWeight: 800, color: FIXED.ink }}>{n}</Txt>
              </View>
              <Txt style={{ fontSize: 12.5, fontWeight: 700, marginTop: 9, lineHeight: 16, textAlign: 'center' }}>{label}</Txt>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ marginTop: 14, borderRadius: 24, backgroundColor: t.sheetc, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring size={76} r={32} stroke={8} pct={doneCount / 5} track={t.ctl3} color={t.acc}>
          <Txt style={{ fontSize: 17, fontWeight: 800 }}>{doneCount}/5</Txt>
        </Ring>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PH.map(p => {
            const on = logs[p] === 'prayed';
            return (
              <View key={p} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: on ? 'rgba(94,184,122,0.16)' : t.ctl3 }}>
                <Txt style={{ fontSize: 12.5, fontWeight: 600, color: on ? t.mint : t.t2 }}>{p}</Txt>
              </View>
            );
          })}
        </View>
      </View>

      <Label style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>ACTIVE GOALS</Label>
      <View style={{ gap: 10 }}>
        {goals.map(g => (
          <View key={g.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</Txt>
              <Txt style={{ fontSize: 14, fontWeight: 600, color: t.t2 }}>{Math.min(g.prog, g.target)}/{g.target}</Txt>
            </View>
            <Bar pct={(g.prog / g.target) * 100} h={6} track={t.ctl2} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      <Label style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>DAWAH NETWORK</Label>
      <View style={{ gap: 8 }}>
        {circles.map(c => (
          <View key={c.id} style={{ borderRadius: 20, backgroundColor: t.sheetc, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14.5, fontWeight: 700 }}>{c.name}</Txt>
              <Txt mono style={{ fontSize: 12.5, color: t.t2, marginTop: 3, letterSpacing: 1.25 }}>{c.code}</Txt>
            </View>
            <Tap onPress={() => { Clipboard.setStringAsync(c.code).catch(() => {}); say('Invite code ' + c.code + ' copied'); }}
              style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.ctl3, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="copy" size={16} color={t.tx} />
              <Txt style={{ fontSize: 13, fontWeight: 700 }}>Copy</Txt>
            </Tap>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 14, borderRadius: 22, padding: 16, experimental_backgroundImage: G.mintNote }}>
        <Txt style={{ fontSize: 14, lineHeight: 21, color: t.mintTx }}>Your 1,240 Salawat this week joined {fmt(impact)} counted by the community today.</Txt>
      </View>
    </Sheet>
  );
}
