import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, TextInput, View } from 'react-native';
import { BackBar, buzz, Chips, Cta, H1, Label, Page, say, SwitchRow, Txt, useBack } from '../components/ui';
import { customKey, fmtCount, parseTarget, TARGET_MAX, TARGET_PRESETS, type CustomDhikr } from '../lib/tasbeeh';
import { set, todayKey, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * Add or edit your own dhikr: name, Arabic, optional transliteration and translation, a target,
 * and optionally a daily goal with a reminder. Deleting archives it, so its lifetime count and any
 * goal history are kept.
 */
export default function DhikrEdit() {
  const t = useT();
  const back = useBack();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useApp(s => (id ? s.customDhikr.find(c => c.id === id) : undefined));
  const linked = useApp(s => (id ? s.goals.find(g => g.dhikrId === id) : undefined));
  const [name, setName] = useState(existing?.name ?? '');
  const [ar, setAr] = useState(existing?.ar ?? '');
  const [tr, setTr] = useState(existing?.tr ?? '');
  const [meaning, setMeaning] = useState(existing?.meaning ?? '');
  const [target, setTarget] = useState(String(existing?.target ?? 33));
  const [asGoal, setAsGoal] = useState(!!linked);
  const [tried, setTried] = useState(false);

  const cleanName = name.trim().replace(/\s+/g, ' ');
  const n = parseTarget(target);
  const errors = {
    name: !cleanName ? 'Give it a name' : null,
    ar: ar.trim() && !ARABIC.test(ar) ? 'Use Arabic script here, or leave it empty' : null,
    target: n === null ? `A whole number from 1 to ${fmtCount(TARGET_MAX)}` : null,
  };
  const valid = !errors.name && !errors.ar && !errors.target;

  const save = () => {
    setTried(true);
    if (!valid || n === null) { buzz([40, 40]); return; }
    const dhikrId = existing?.id ?? Date.now().toString(36);
    const d: CustomDhikr = { id: dhikrId, name: cleanName.slice(0, 40), ar: ar.trim().slice(0, 200), tr: tr.trim().slice(0, 120) || undefined, meaning: meaning.trim().slice(0, 200) || undefined, target: n };
    let goalId: number | null = linked?.id ?? null;
    set(s => {
      const customDhikr = existing ? s.customDhikr.map(c => (c.id === dhikrId ? { ...c, ...d } : c)) : [...s.customDhikr, d];
      let goals = s.goals;
      if (asGoal && !linked) {
        goalId = Date.now();
        goals = [...goals, { id: goalId, name: d.name, target: n, prog: 0, streak: 0, remind: '8:00 pm', week: [0, 0, 0, 0, 0, 0, 0], cg: null, day: todayKey(), hist: [], dhikrId }];
      } else if (linked) {
        // The linked goal follows renames and new targets; its history (streak, days met) is kept.
        goals = goals.map(g => (g.id === linked.id ? { ...g, name: d.name, target: n, prog: Math.min(g.prog, n) } : g));
      }
      return { customDhikr, goals, tasTargets: { ...s.tasTargets, [customKey(dhikrId)]: n }, ...(existing ? {} : { dhKey: customKey(dhikrId), tasN: 0 }) };
    });
    buzz([10, 30, 16]);
    say(existing ? `${d.name} saved` : `${d.name} added`);
    // A new daily goal goes straight to its reminder time.
    if (asGoal && !linked && goalId) router.replace({ pathname: '/goal-schedule', params: { goal: String(goalId) } });
    else back();
  };

  const remove = () => {
    if (!existing) return;
    const go = () => {
      // Archived, not erased: lifetime counts and the goal's history stay.
      set(s => ({ customDhikr: s.customDhikr.map(c => (c.id === existing.id ? { ...c, archived: true } : c)), dhKey: s.dhKey === customKey(existing.id) ? 'b:SubhanAllah' : s.dhKey, tasN: s.dhKey === customKey(existing.id) ? 0 : s.tasN }));
      say(`${existing.name} removed · its history is kept`);
      back();
    };
    const msg = linked ? 'Its counts and your goal’s history are kept. The daily goal stays in Goals.' : 'Its lifetime count is kept.';
    if (Platform.OS === 'web') { if (window.confirm(`Remove this dhikr? ${msg}`)) go(); return; }
    Alert.alert('Remove this dhikr?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  const field = (bad: boolean) => ({
    outlineWidth: 0, height: 54, borderRadius: 20, backgroundColor: t.sunk, boxShadow: bad ? 'inset 0 0 0 1.5px rgba(240,138,122,0.6)' : t.edge,
    paddingHorizontal: 16, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold',
  } as const);
  const err = (e: string | null) => (tried && e ? <Txt style={{ fontSize: 12.5, color: t.rose, marginTop: 6, marginLeft: 4 }}>{e}</Txt> : null);

  return (
    <Page bottom={34}>
      <BackBar title={existing ? 'Edit dhikr' : 'New dhikr'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 22 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <H1 style={{ marginTop: 4 }}>{existing ? existing.name : 'Add your own dhikr'}</H1>

        <Label style={{ marginTop: 22, marginBottom: 8 }}>NAME</Label>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. SubhanAllahil-Azim" placeholderTextColor={t.t4} accessibilityLabel="Dhikr name" maxLength={40} style={field(tried && !!errors.name)} />
        {err(errors.name)}

        <Label style={{ marginTop: 18, marginBottom: 8 }}>ARABIC</Label>
        <TextInput value={ar} onChangeText={setAr} placeholder="سُبْحَانَ اللهِ الْعَظِيمِ" placeholderTextColor={t.t4} accessibilityLabel="Arabic text" maxLength={200} multiline
          style={[field(tried && !!errors.ar), { height: undefined, minHeight: 64, paddingVertical: 12, fontFamily: 'ScheherazadeNew_400Regular', fontSize: 24, textAlign: 'right', writingDirection: 'rtl' }]} />
        {err(errors.ar)}

        <Label style={{ marginTop: 18, marginBottom: 8 }}>TRANSLITERATION · OPTIONAL</Label>
        <TextInput value={tr} onChangeText={setTr} placeholder="Subhan Allahil-Azim" placeholderTextColor={t.t4} accessibilityLabel="Transliteration" maxLength={120} style={field(false)} />

        <Label style={{ marginTop: 18, marginBottom: 8 }}>TRANSLATION · OPTIONAL</Label>
        <TextInput value={meaning} onChangeText={setMeaning} placeholder="Glory be to Allah, the Magnificent" placeholderTextColor={t.t4} accessibilityLabel="Translation" maxLength={200} style={field(false)} />

        <Label style={{ marginTop: 18, marginBottom: 8 }}>TARGET</Label>
        <Chips wrap labels={TARGET_PRESETS.map(fmtCount)} isOn={i => n === TARGET_PRESETS[i]} onPick={i => setTarget(String(TARGET_PRESETS[i]))} height={40} size={14} />
        <TextInput value={target} onChangeText={v => setTarget(v.replace(/[^0-9,]/g, ''))} keyboardType="number-pad" inputMode="numeric" maxLength={7}
          placeholder="Any number, e.g. 70" placeholderTextColor={t.t4} accessibilityLabel="Custom target" style={[field(!!errors.target && target !== ''), { marginTop: 10 }]} />
        {err(errors.target)}

        <View style={{ marginTop: 18, marginHorizontal: -16 }}>
          <SwitchRow label="Make it a daily goal" sub={linked ? 'Linked to your goal · its streak is kept' : 'Track it each day, with a reminder at a time you pick'} icon="beads" on={asGoal}
            onToggle={() => { if (linked) { say('Remove the goal from Goals to unlink it', 'error'); return; } setAsGoal(x => !x); }} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, gap: 10 }}>
        <Cta label={existing ? 'Save' : asGoal ? 'Add & set reminder' : 'Add dhikr'} onPress={save} />
        {existing && <Cta label="Remove dhikr" kind="danger" height={50} size={14.5} onPress={remove} />}
      </View>
    </Page>
  );
}
