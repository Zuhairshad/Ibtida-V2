import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GoalCard } from '../../../components/GoalRing';
import { FadeIn } from '../../../components/motion';
import { Cta, IconBtn, PillShortcut, Screen, Seg, SerifTitle, Tap, Txt } from '../../../components/ui';
import { CATS } from '../../../data/content';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

export default function Adhkar() {
  const t = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const goals = useApp(s => s.goals);
  const [mode, setMode] = useState(0);
  const tileW = (width - 42) / 2;
  return (
    <Screen>
      <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <SerifTitle a="Daily" b="Adhkar" style={{ flexShrink: 1 }} />
        <IconBtn name="plus" label="New goal" bg={t.cta} color={t.ctaInk} onPress={() => router.push('/goal-new')} />
      </FadeIn>
      <View style={{ paddingTop: 18, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        <PillShortcut icon="beads" kicker="COUNTER" title="Tasbeeh" onPress={() => router.push('/tasbeeh')} />
        <PillShortcut icon="chart" kicker="HISTORY" title="Progress" onPress={() => router.push('/adhkar/progress')} />
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 16 }}>
        <Seg labels={['Categories', 'Personal goals']} value={mode} onChange={setMode} />
      </View>
      {mode === 0 ? (
        <View style={{ paddingTop: 14, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {CATS.map((c, i) => (
            <FadeIn key={c.k} delay={i * 40} dur={450}>
              <Tap scale={0.96} onPress={() => router.push({ pathname: '/session', params: { cat: c.k } })} accessibilityLabel={`${c.k} adhkar, ${c.n} adhkar, ${c.m} minutes`}
                style={{ width: tileW, height: 176, borderRadius: 30, experimental_backgroundImage: c.bg, padding: 16, justifyContent: 'space-between', overflow: 'hidden' }}>
                <Txt ar style={{ fontSize: 24, lineHeight: 31, textAlign: 'right', color: 'rgba(255,255,255,0.95)' }}>{c.ar}</Txt>
                <View>
                  <Txt style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF' }}>{c.k}</Txt>
                  <Txt style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{c.n} adhkar · {c.m} min</Txt>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.25)', marginTop: 10, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${c.pct}%`, backgroundColor: '#FFFFFF', borderRadius: 3 }} />
                  </View>
                </View>
              </Tap>
            </FadeIn>
          ))}
        </View>
      ) : (
        <View style={{ paddingTop: 14, paddingHorizontal: 16, gap: 10 }}>
          {goals.length === 0 && (
            <View style={{ borderRadius: 28, backgroundColor: t.card, padding: 28, alignItems: 'center' }}>
              <Txt style={{ fontSize: 17, fontWeight: 700 }}>No goals yet</Txt>
              <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Start with one small act of worship.</Txt>
            </View>
          )}
          {goals.map((g, i) => (
            <FadeIn key={g.id} delay={i * 40} dur={400}>
              <GoalCard g={g} onPress={() => router.push({ pathname: '/tasbeeh', params: { goal: String(g.id) } })} />
            </FadeIn>
          ))}
          <Cta label={goals.length ? 'Manage all goals' : 'Create goal'} kind={goals.length ? 'secondary' : 'primary'} height={52} size={14.5}
            color={goals.length ? t.tx : undefined} style={goals.length ? { backgroundColor: t.card } : undefined}
            onPress={() => router.push(goals.length ? '/adhkar/goals' : '/goal-new')} />
        </View>
      )}
    </Screen>
  );
}
