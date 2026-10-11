import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { BackBar, buzz, Chips, Cta, H1, Option, Page, say, Seg, Tap, Txt, useBack } from '../components/ui';
import { useCommunityGoals } from '../components/community';
import { fmt, GOAL_PRESETS, participantsLabel } from '../data/content';
import { fmtCount, parseTarget, TARGET_MAX } from '../lib/tasbeeh';
import { set, todayKey, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { FIXED } from '../theme/tokens';

/** Mon..Sun reminder days for Every day / Weekdays / Fridays. */
/** Daily targets offered as chips; any other whole number can be typed. */
const GOAL_TARGETS = [33, 70, 100, 150, 500, 1000];

const FREQ_DAYS = [[1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 0, 0], [0, 0, 0, 0, 1, 0, 0]];

export default function GoalNew() {
  const t = useT();
  const back = useBack();
  const [mode, setMode] = useState(0);
  const [cg, setCg] = useState(0);
  const [preset, setPreset] = useState(0);
  const [targetText, setTargetText] = useState('100');
  const target = parseTarget(targetText);
  const custom = useApp(s => s.customDhikr).filter(c => !c.archived);
  const router = useRouter();
  // Built-in presets first, then the user's own dhikr.
  const options: { name: string; ar: string; dhikrId?: string }[] = [...GOAL_PRESETS.map(([name, ar]) => ({ name, ar })), ...custom.map(c => ({ name: c.name, ar: c.ar, dhikrId: c.id }))];
  const [freq, setFreq] = useState(0);
  const cgs = useCommunityGoals();
  const create = () => {
    if (target === null) { buzz([40, 40]); say('Enter a target from 1 to 100,000'); return; }
    const opt = options[Math.min(preset, options.length - 1)];
    const name = opt.name;
    const g = { id: Date.now(), name, target, prog: 0, streak: 0, remind: '8:00 pm', week: [0, 0, 0, 0, 0, 0, 0], cg: mode === 1 ? cgs[cg].name : null, days: FREQ_DAYS[freq], day: todayKey(), hist: [], ...(opt.dhikrId ? { dhikrId: opt.dhikrId } : {}) };
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
          {options.map((o, i) => <Option key={o.dhikrId ?? o.name} title={o.name} ar={o.ar} on={preset === i} onPress={() => setPreset(i)} />)}
          <Tap scale={0.985} onPress={() => router.push('/dhikr-edit')} accessibilityRole="button" accessibilityLabel="Add custom dhikr"
            style={{ borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(242,166,90,0.5)', paddingVertical: 16, alignItems: 'center' }}>
            <Txt style={{ fontSize: 15, fontWeight: 700, color: t.acc }}>+ Add custom dhikr</Txt>
          </Tap>
        </View>
        <View style={{ paddingTop: 16, paddingHorizontal: 22 }}>
          <View style={{ borderRadius: 22, backgroundColor: t.opt, boxShadow: target === null ? 'inset 0 0 0 1.5px rgba(240,138,122,0.6)' : t.edge, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.t2 }}>DAILY TARGET</Txt>
              <TextInput value={targetText} onChangeText={v => setTargetText(v.replace(/[^0-9,]/g, ''))} keyboardType="number-pad" inputMode="numeric" maxLength={7}
                accessibilityLabel="Daily target" placeholder="e.g. 70" placeholderTextColor={t.t4}
                style={{ outlineWidth: 0, padding: 0, marginTop: 4, color: t.txw, fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold' }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[['−', 'Decrease', -33], ['+', 'Increase', 33]].map(([s, l, d]) => (
                <Tap key={l as string} scale={0.9} accessibilityLabel={l as string} onPress={() => { buzz(5); setTargetText(String(Math.min(TARGET_MAX, Math.max(1, (target ?? 0) + (d as number))))); }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 20, color: t.tx }}>{s as string}</Txt>
                </Tap>
              ))}
            </View>
          </View>
        </View>
        {target === null && <Txt style={{ fontSize: 12.5, color: t.rose, marginTop: 6, marginHorizontal: 26 }}>Enter a whole number from 1 to 100,000</Txt>}
        <View style={{ paddingTop: 10, paddingHorizontal: 22 }}>
          <Chips wrap labels={GOAL_TARGETS.map(fmtCount)} isOn={i => target === GOAL_TARGETS[i]} onPick={i => setTargetText(String(GOAL_TARGETS[i]))} height={40} size={13.5} />
        </View>
        <View style={{ paddingTop: 10, paddingHorizontal: 22 }}>
          <Chips flex labels={['Every day', 'Weekdays', 'Fridays']} isOn={i => freq === i} onPick={setFreq} height={46} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22 }}><Cta label="Create goal" disabled={target === null} onPress={create} /></View>
    </Page>
  );
}
