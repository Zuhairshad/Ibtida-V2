import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { fmt, GOAL_PRESETS } from '../data/content';
import { useT } from '../theme/ThemeProvider';
import { FIXED } from '../theme/tokens';
import { useCommunityGoals } from './community';
import { Icon } from './Icon';
import { buzz, Chips, Cta, Label, say, Seg, Tap, Txt } from './ui';

/** A shared target for a circle: a name and a count to reach together. */
export type CircleTarget = { name: string; total: number; from?: string };

export const TARGET_MAX = 100_000_000;
const QUICK = [33, 100, 313, 1000, 10000];

function NumberField({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const t = useT();
  const [text, setText] = useState(String(value));
  return (
    <TextInput value={text} keyboardType="number-pad" inputMode="numeric" accessibilityLabel={label} maxLength={9}
      onChangeText={v => { const d = v.replace(/\D/g, ''); setText(d); const n = Number(d); if (n > 0) onChange(Math.min(TARGET_MAX, n)); }}
      onBlur={() => setText(String(value))}
      style={{ outlineWidth: 0, width: 110, height: 44, borderRadius: 14, backgroundColor: t.sunk, borderWidth: 1, borderColor: t.bord, paddingHorizontal: 12, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'right' }} />
  );
}

/**
 * Choose shared targets for a circle — adopt one of the Ummah's community goals (with a
 * circle-sized count you can change) or write your own.
 */
export function CircleTargets({ value, onChange }: { value: CircleTarget[]; onChange: (v: CircleTarget[]) => void }) {
  const t = useT();
  const cgs = useCommunityGoals();
  const [mode, setMode] = useState(0);
  const [name, setName] = useState('');
  const [total, setTotal] = useState(1000);
  const [totalText, setTotalText] = useState('1000');

  const has = (n: string) => value.some(v => v.name.toLowerCase() === n.toLowerCase());
  const add = (x: CircleTarget) => {
    if (has(x.name)) { say('That target is already added'); return; }
    if (value.length >= 10) { say('Up to 10 shared targets'); return; }
    buzz(8);
    onChange([...value, x]);
  };
  const remove = (i: number) => { buzz(5); onChange(value.filter((_, k) => k !== i)); };
  const setTotalAt = (i: number, n: number) => onChange(value.map((v, k) => (k === i ? { ...v, total: n } : v)));

  const addOwn = () => {
    const n = name.trim().slice(0, 80);
    if (!n) { say('Name your target'); return; }
    if (!(total > 0)) { say('Set a count to reach'); return; }
    add({ name: n, total });
    setName('');
  };

  return (
    <View>
      {value.length > 0 && (
        <View style={{ gap: 8, marginBottom: 14 }}>
          {value.map((v, i) => (
            <View key={v.name} style={{ borderRadius: 20, backgroundColor: t.opt, paddingVertical: 12, paddingLeft: 16, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 10, boxShadow: FIXED.sel }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontSize: 15, fontWeight: 700 }} numberOfLines={2}>{v.name}</Txt>
                <Txt style={{ fontSize: 12, color: t.t2, marginTop: 2 }}>{v.from ? 'From community goals' : 'Your own target'}</Txt>
              </View>
              <NumberField value={v.total} onChange={n => setTotalAt(i, n)} label={`Target for ${v.name}`} />
              <Tap onPress={() => remove(i)} accessibilityLabel={`Remove ${v.name}`} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={14} color={t.tx} />
              </Tap>
            </View>
          ))}
        </View>
      )}

      <Seg labels={['Community goals', 'Make my own']} value={mode} onChange={setMode} height={42} size={13.5} />

      {mode === 0 ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          {cgs.map(c => {
            const on = has(c.name);
            return (
              <Tap key={c.name} scale={0.985} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                onPress={() => (on ? remove(value.findIndex(v => v.name.toLowerCase() === c.name.toLowerCase())) : add({ name: c.name, total: Math.min(c.total, 10000), from: c.name }))}
                style={{ borderRadius: 20, backgroundColor: t.opt, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: on ? FIXED.sel : t.edge }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</Txt>
                  <Txt style={{ fontSize: 12, color: t.t2, marginTop: 3 }}>
                    {c.live ? `Ummah: ${fmt(c.done)} of ${fmt(c.total)}` : `Ummah target ${fmt(c.total)}`} · your circle sets its own count
                  </Txt>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: on ? t.acc : t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={on ? 'check' : 'plus'} size={14} color={on ? t.ctaInk : t.tx} />
                </View>
              </Tap>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. 10,000 Durood before Jumuʿah" placeholderTextColor={t.t4} accessibilityLabel="Target name" maxLength={80}
            style={{ outlineWidth: 0, height: 54, borderRadius: 18, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 16, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }} />
          <Chips wrap labels={GOAL_PRESETS.map(p => p[0])} isOn={i => name === GOAL_PRESETS[i][0]} onPick={i => setName(GOAL_PRESETS[i][0])} height={38} size={12.5} style={{ marginTop: 10 }} />
          <Label style={{ marginTop: 14, marginBottom: 8, marginHorizontal: 4 }}>COUNT TO REACH TOGETHER</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput value={totalText} keyboardType="number-pad" inputMode="numeric" accessibilityLabel="Count to reach" maxLength={9}
              onChangeText={v => { const d = v.replace(/\D/g, ''); setTotalText(d); setTotal(Math.min(TARGET_MAX, Number(d) || 0)); }}
              style={{ outlineWidth: 0, flex: 1, height: 54, borderRadius: 18, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 16, color: t.txw, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' }} />
            <Cta label="Add target" height={54} size={14.5} style={{ paddingHorizontal: 18 }} disabled={!name.trim() || !(total > 0)} onPress={addOwn} />
          </View>
          <Chips labels={QUICK.map(fmt)} isOn={i => total === QUICK[i]} onPick={i => { setTotal(QUICK[i]); setTotalText(String(QUICK[i])); }} height={36} size={12.5} style={{ marginTop: 10 }} />
        </View>
      )}
    </View>
  );
}
