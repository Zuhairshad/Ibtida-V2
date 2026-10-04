import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { BackBar, buzz, Chips, Cta, H1, Label, Option, Page, say, Txt } from '../components/ui';
import { APPS } from '../data/content';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function FocusSetup() {
  const t = useT();
  const router = useRouter();
  const focus = useApp(s => s.focus);
  const goals = useApp(s => s.goals).filter(g => g.prog < g.target);
  const put = (p: Partial<typeof focus>) => set(s => ({ focus: { ...s.focus, ...p } }));
  return (
    <Page>
      <BackBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 4, paddingHorizontal: 22 }}>
          <H1>Ibadah Lock</H1>
          <Txt style={{ fontSize: 15, lineHeight: 22.5, color: t.t3, marginTop: 8 }}>Distractions stay locked until your dhikr is done.</Txt>
        </View>
        <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>DURATION</Label>
        <View style={{ paddingHorizontal: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Until goal completed', '15 min', '30 min', '1 hour'].map((l, i) => (
            <View key={l} style={{ width: '48.5%' }}>
              <Chips flex labels={[l]} isOn={() => focus.dur === i} onPick={() => put({ dur: i })} height={52} size={14} />
            </View>
          ))}
        </View>
        <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>WORSHIP GOAL</Label>
        <View style={{ paddingHorizontal: 22, gap: 8 }}>
          {goals.length === 0 && <Txt style={{ fontSize: 13.5, color: t.t2 }}>All goals are complete today. Create a new one from Adhkar.</Txt>}
          {goals.map((g, i) => <Option key={g.id} title={g.name} sub={`${g.target - g.prog} repetitions left`} on={focus.goal === i} onPress={() => put({ goal: i })} pad={14} titleSize={15} dot={26} />)}
        </View>
        <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>APPS TO LOCK</Label>
        <View style={{ paddingHorizontal: 22 }}>
          <Chips wrap labels={APPS} isOn={i => focus.apps[i]} onPick={i => { const a = focus.apps.slice(); a[i] = !a[i]; put({ apps: a }); }} />
        </View>
        <View style={{ marginTop: 16, marginHorizontal: 22, borderRadius: 22, backgroundColor: t.iosBg, boxShadow: 'inset 0 0 0 1px rgba(111,135,201,0.3)', paddingVertical: 14, paddingHorizontal: 16 }}>
          <Txt style={{ fontSize: 13, lineHeight: 20, color: t.iosTx }}>
            <Txt style={{ fontSize: 13, fontWeight: 700, color: t.iosB }}>iOS</Txt> uses Screen Time (FamilyControls) to shield apps. <Txt style={{ fontSize: 13, fontWeight: 700, color: t.iosB }}>Android</Txt> uses an Accessibility service. Calls and emergency services always stay available.
          </Txt>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22 }}>
        <Cta label="Activate Ibadah Lock" icon="lock" disabled={goals.length === 0} onPress={() => {
          if (!goals.length) return;
          buzz([20, 40, 20]);
          say(`Ibadah Lock on · ${focus.apps.filter(Boolean).length} apps shielded`);
          router.replace({ pathname: '/focus-active', params: { goal: String(goals[Math.min(focus.goal, goals.length - 1)].id) } });
        }} />
      </View>
    </Page>
  );
}
