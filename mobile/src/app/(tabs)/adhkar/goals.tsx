import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, TextInput, View } from 'react-native';
import { GoalRing } from '../../../components/GoalRing';
import { FadeIn } from '../../../components/motion';
import { BackBar, Cta, IconBtn, say, Screen, Sheet, Statement, Txt } from '../../../components/ui';
import { fmtCount, parseTarget } from '../../../lib/tasbeeh';
import { set, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export default function Goals() {
  const t = useT();
  const router = useRouter();
  const goals = useApp(s => s.goals);
  const [editing, setEditing] = useState<number | null>(null);
  const active = goals.filter(g => g.prog < g.target).length;
  return (
    <Screen top={54}>
      <BackBar title="Goals" right={<Cta label="New goal" height={40} size={13.5} style={{ paddingHorizontal: 16, marginRight: 8 }} onPress={() => router.push('/goal-new')} />} />
      <Statement a={`${WORDS[goals.length] ?? goals.length} ${goals.length === 1 ? 'goal' : 'active'}.`} b={active === 0 && goals.length ? 'All complete today.' : 'Keep them small.'} style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <View style={{ paddingTop: 18, paddingHorizontal: 16, gap: 10 }}>
        {goals.length === 0 && (
          <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 28, alignItems: 'center' }}>
            <Txt style={{ fontSize: 17, fontWeight: 700 }}>No goals yet</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6, marginBottom: 16 }}>Start with one small act of worship.</Txt>
            <Cta label="Create goal" height={48} size={15} style={{ paddingHorizontal: 24 }} onPress={() => router.push('/goal-new')} />
          </View>
        )}
        {goals.map((g, i) => (
          <FadeIn key={g.id} delay={i * 40} style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <GoalRing g={g} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontSize: 16.5, fontWeight: 700 }}>{g.name}</Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{g.streak}-day streak · {g.remind}{g.cg ? ` · counts toward ${g.cg}` : ''}</Txt>
              </View>
              <IconBtn name="chev" label={`Edit ${g.name}`} size={40} onPress={() => setEditing(g.id)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Cta label="Count now" height={44} size={14} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/tasbeeh', params: { goal: String(g.id) } })} />
              <Cta label="Schedule" height={44} size={14} kind="secondary" color={t.tx} style={{ flex: 1, backgroundColor: t.ctl }} onPress={() => router.push({ pathname: '/goal-schedule', params: { goal: String(g.id) } })} />
            </View>
          </FadeIn>
        ))}
      </View>
      <EditGoal id={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

/** Change a goal's daily target, or remove it. Counts already sent to circles and the Ummah stay counted. */
function EditGoal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const t = useT();
  const g = useApp(s => (id === null ? undefined : s.goals.find(x => x.id === id)));
  const [text, setText] = useState('');
  const [shownFor, setShownFor] = useState<number | null>(null);
  if (g && shownFor !== g.id) { setShownFor(g.id); setText(String(g.target)); }
  const n = parseTarget(text);
  const save = () => {
    if (!g || n === null) return;
    // Today's count stays, but never above the new target.
    set(s => ({ goals: s.goals.map(x => (x.id === g.id ? { ...x, target: n, prog: Math.min(x.prog, n) } : x)) }));
    say(`${g.name} · daily target ${fmtCount(n)}`);
    onClose();
  };
  const remove = () => {
    if (!g) return;
    const go = () => { set(s => ({ goals: s.goals.filter(x => x.id !== g.id) })); say(`${g.name} removed`); onClose(); };
    const msg = g.cg ? `What you already counted toward ${g.cg} stays counted.` : 'Its streak and history go with it.';
    if (Platform.OS === 'web') { if (window.confirm(`Remove ${g.name}? ${msg}`)) go(); return; }
    Alert.alert(`Remove ${g.name}?`, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };
  return (
    <Sheet open={!!g} onClose={onClose}>
      {g && (
        <>
          <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>{g.name}</Txt>
          <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 4 }}>{Math.min(g.prog, g.target)} of {g.target} today · {g.streak}-day streak</Txt>
          <Txt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.9, color: t.t4, marginTop: 18, marginBottom: 8 }}>DAILY TARGET</Txt>
          <TextInput value={text} onChangeText={v => setText(v.replace(/[^0-9,]/g, ''))} keyboardType="number-pad" inputMode="numeric" maxLength={7} accessibilityLabel="Daily target"
            style={{ outlineWidth: 0, height: 54, borderRadius: 20, backgroundColor: t.sheetc, boxShadow: n === null ? 'inset 0 0 0 1.5px rgba(240,138,122,0.6)' : t.edge, paddingHorizontal: 18, color: t.txw, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' }} />
          {n === null && <Txt style={{ fontSize: 12.5, color: t.rose, marginTop: 6 }}>A whole number from 1 to 100,000</Txt>}
          <Cta label="Save" height={54} size={15} style={{ marginTop: 16 }} disabled={n === null} onPress={save} />
          <Cta label="Remove goal" kind="danger" height={50} size={14.5} style={{ marginTop: 10 }} onPress={remove} />
        </>
      )}
    </Sheet>
  );
}
