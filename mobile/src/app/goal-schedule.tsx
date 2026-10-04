import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackBar, buzz, Cta, H1, Page, say, Tap, Txt, useBack, WheelSet } from '../components/ui';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const HRS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINS = ['00', '15', '30', '45'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function GoalSchedule() {
  const t = useT();
  const back = useBack();
  const { goal } = useLocalSearchParams<{ goal?: string }>();
  const s = useApp(st => st.sched);
  const put = (p: Partial<typeof s>) => set(st => ({ sched: { ...st.sched, ...p } }));
  // Start from the goal's own reminder days rather than whatever was last picked for another goal.
  const goalDays = useApp(st => st.goals.find(g => g.id === Number(goal))?.days);
  useEffect(() => { if (goalDays) put({ days: goalDays }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const label = `${HRS[s.h]}:${MINS[s.m]} ${s.a ? 'pm' : 'am'}`;
    if (goal) set(st => ({ goals: st.goals.map(g => (g.id === Number(goal) ? { ...g, remind: label, days: s.days } : g)) }));
    back();
    say(`Reminder saved for ${HRS[s.h]}:${MINS[s.m]} ${s.a ? 'PM' : 'AM'}`);
  };
  return (
    <Page>
      <BackBar title="Reminder schedule" />
      <H1 style={{ textAlign: 'center', marginTop: 16, marginHorizontal: 22 }}>When should we{'\n'}remind you?</H1>
      <View style={{ marginTop: 34 }}>
        <WheelSet inset={40} cols={[
          { values: HRS, idx: s.h, onPick: h => put({ h }) },
          { values: MINS, idx: s.m, onPick: m => put({ m }) },
          { values: ['AM', 'PM'], idx: s.a, onPick: a => put({ a }) },
        ]} />
      </View>
      <View style={{ paddingTop: 26, paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {DAYS.map((d, i) => {
          const on = !!s.days[i];
          return (
            <Tap key={d} scale={0.9} accessibilityLabel={d} accessibilityState={{ selected: on }}
              onPress={() => { buzz(5); const days = s.days.slice(); days[i] = on ? 0 : 1; put({ days }); }}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? t.cta : t.opt, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 14, fontWeight: 700, color: on ? t.ctaInk : t.t2 }}>{d[0]}</Txt>
            </Tap>
          );
        })}
      </View>
      <Tap onPress={() => { buzz([20, 80, 20]); say('Playing gentle chime'); }}
        style={{ marginTop: 18, marginHorizontal: 22, height: 52, borderRadius: 26, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="bell" color={t.acc} />
        <Txt style={{ fontSize: 14.5, fontWeight: 700 }}>Preview reminder tone</Txt>
      </Tap>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 22 }}><Cta label="Save schedule" onPress={save} /></View>
    </Page>
  );
}
