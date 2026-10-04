import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { GoalRing } from '../../../components/GoalRing';
import { FadeIn } from '../../../components/motion';
import { BackBar, Cta, Screen, Statement, Txt } from '../../../components/ui';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export default function Goals() {
  const t = useT();
  const router = useRouter();
  const goals = useApp(s => s.goals);
  const active = goals.filter(g => g.prog < g.target).length;
  return (
    <Screen top={54}>
      <BackBar title="Goals" right={<Cta label="New goal" height={40} size={13.5} style={{ paddingHorizontal: 16, marginRight: 8 }} onPress={() => router.push('/goal-new')} />} />
      <Statement a={`${WORDS[goals.length] ?? goals.length} ${goals.length === 1 ? 'goal' : 'active'}.`} b={active === 0 && goals.length ? 'All complete today.' : 'Keep them small.'} style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <View style={{ paddingTop: 18, paddingHorizontal: 16, gap: 10 }}>
        {goals.length === 0 && (
          <View style={{ borderRadius: 28, backgroundColor: t.card, padding: 28, alignItems: 'center' }}>
            <Txt style={{ fontSize: 17, fontWeight: 700 }}>No goals yet</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6, marginBottom: 16 }}>Start with one small act of worship.</Txt>
            <Cta label="Create goal" height={48} size={15} style={{ paddingHorizontal: 24 }} onPress={() => router.push('/goal-new')} />
          </View>
        )}
        {goals.map((g, i) => (
          <FadeIn key={g.id} delay={i * 40} style={{ borderRadius: 28, backgroundColor: t.card, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <GoalRing g={g} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontSize: 16.5, fontWeight: 700 }}>{g.name}</Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{g.streak}-day streak · {g.remind}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Cta label="Count now" height={44} size={14} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/tasbeeh', params: { goal: String(g.id) } })} />
              <Cta label="Schedule" height={44} size={14} kind="secondary" color={t.tx} style={{ flex: 1, backgroundColor: t.ctl }} onPress={() => router.push({ pathname: '/goal-schedule', params: { goal: String(g.id) } })} />
            </View>
          </FadeIn>
        ))}
      </View>
    </Screen>
  );
}
