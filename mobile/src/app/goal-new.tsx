import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BackBar, buzz, Chips, Cta, H1, Option, Page, say, Seg, Tap, Txt, useBack } from '../components/ui';
import { useCommunityGoals } from '../components/community';
import { fmt, GOAL_PRESETS, participantsLabel } from '../data/content';
import { set, todayKey } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { FIXED } from '../theme/tokens';

/** Mon..Sun reminder days for Every day / Weekdays / Fridays. */
const FREQ_DAYS = [[1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 0, 0], [0, 0, 0, 0, 1, 0, 0]];

export default function GoalNew() {
  const t = useT();
  const back = useBack();
  const [mode, setMode] = useState(0);
  const [cg, setCg] = useState(0);
  const [preset, setPreset] = useState(0);
  const [target, setTarget] = useState(100);
  const [freq, setFreq] = useState(0);
  const cgs = useCommunityGoals();
  const create = () => {
    const name = GOAL_PRESETS[preset][0];
    const g = { id: Date.now(), name, target, prog: 0, streak: 0, remind: '8:00 pm', week: [0, 0, 0, 0, 0, 0, 0], cg: mode === 1 ? cgs[cg].name : null, days: FREQ_DAYS[freq], day: todayKey(), hist: [] };
    buzz([10, 30, 16]);
    set(s => ({ goals: s.goals.concat([g]) }));
    say('Goal created · ' + name);
    back();
  };
  return (
    <Page bottom={34}>
      <BackBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 6, paddingHorizontal: 22 }}><H1>What would you like to recite?</H1></View>
        <View style={{ paddingTop: 18, paddingHorizontal: 22 }}>
          <Seg labels={['Personal goal', 'Community linked']} value={mode} onChange={setMode} size={14} />
        </View>
        {mode === 1 && (
          <View style={{ paddingTop: 12, paddingHorizontal: 22, gap: 8 }}>
            {cgs.map((c, i) => (
              <Tap key={c.name} scale={0.985} onPress={() => setCg(i)} accessibilityRole="radio" accessibilityState={{ checked: cg === i }}
                style={{ borderRadius: 22, backgroundColor: t.opt, paddingVertical: 14, paddingHorizontal: 16, boxShadow: cg === i ? FIXED.sel : t.edge }}>
                <Txt style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{c.live ? `${participantsLabel(c.people)} · ${Math.round((c.done / c.total) * 100)}% complete` : `Target ${fmt(c.total)} · live progress when signed in`}</Txt>
              </Tap>
            ))}
          </View>
        )}
        <View style={{ paddingTop: 16, paddingHorizontal: 22, gap: 10 }}>
          {GOAL_PRESETS.map(([name, ar], i) => <Option key={name} title={name} ar={ar} on={preset === i} onPress={() => setPreset(i)} />)}
        </View>
        <View style={{ paddingTop: 16, paddingHorizontal: 22 }}>
          <View style={{ borderRadius: 22, backgroundColor: t.opt, boxShadow: t.edge, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.t2 }}>DAILY TARGET</Txt>
              <Txt style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{target}</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[['−', 'Decrease', -33], ['+', 'Increase', 33]].map(([s, l, d]) => (
                <Tap key={l as string} scale={0.9} accessibilityLabel={l as string} onPress={() => { buzz(5); setTarget(x => Math.max(33, x + (d as number))); }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 20, color: t.tx }}>{s as string}</Txt>
                </Tap>
              ))}
            </View>
          </View>
        </View>
        <View style={{ paddingTop: 10, paddingHorizontal: 22 }}>
          <Chips flex labels={['Every day', 'Weekdays', 'Fridays']} isOn={i => freq === i} onPick={setFreq} height={46} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22 }}><Cta label="Create goal" onPress={create} /></View>
    </Page>
  );
}
