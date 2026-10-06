import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { CircleTargets, type CircleTarget } from '../components/CircleTargets';
import { BackBar, buzz, Cta, H1, Page, say, Txt, useBack } from '../components/ui';
import { addCircleGoalLive } from '../lib/live';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

/** Add shared targets to an existing circle: community goals or your own. */
export default function CircleGoal() {
  const t = useT();
  const back = useBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useApp(s => s.circles.find(x => x.id === Number(id)));
  const [targets, setTargets] = useState<CircleTarget[]>([]);
  const [busy, setBusy] = useState(false);
  if (!c) {
    return <Page><BackBar /><View style={{ padding: 28, alignItems: 'center' }}><Txt style={{ fontSize: 17, fontWeight: 700 }}>This circle is no longer available</Txt></View></Page>;
  }
  const existing = new Set(c.goals.map(g => g.name.toLowerCase()));
  const fresh = targets.filter(x => !existing.has(x.name.toLowerCase()));
  const save = async () => {
    if (!fresh.length) { say(targets.length ? 'Those targets are already in this circle' : 'Choose or write a target'); return; }
    if (c.remoteId) {
      setBusy(true);
      let ok = 0; let err = '';
      for (const x of fresh) await addCircleGoalLive(c, x.name, x.total).then(() => { ok++; }).catch((e: Error) => { err = e.message; });
      setBusy(false);
      if (!ok) { say(err || 'Couldn’t add the target'); return; }
      say(ok === fresh.length ? `${ok} target${ok === 1 ? '' : 's'} added` : `${ok} added · ${err}`);
    } else {
      set(s => ({ circles: s.circles.map(x => (x.id === c.id ? { ...x, goals: x.goals.concat(fresh.map(f => ({ name: f.name, done: 0, total: f.total }))) } : x)) }));
      say(`${fresh.length} target${fresh.length === 1 ? '' : 's'} added`);
    }
    buzz([10, 30, 16]);
    back();
  };
  return (
    <Page>
      <BackBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 6, paddingHorizontal: 22 }}>
          <H1>Add a shared target</H1>
          <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 8 }}>For {c.name}. Everyone in the circle counts toward it together.</Txt>
        </View>
        <View style={{ paddingTop: 18, paddingHorizontal: 22 }}>
          <CircleTargets value={targets} onChange={setTargets} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
        <Cta label={busy ? 'Adding…' : fresh.length > 1 ? `Add ${fresh.length} targets` : 'Add target'} disabled={!fresh.length || busy} onPress={save} />
      </View>
    </Page>
  );
}
