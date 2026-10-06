import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { CircleTargets, type CircleTarget } from '../components/CircleTargets';
import { BackBar, buzz, Cta, H1, Label, Option, Page, say, Txt } from '../components/ui';
import { code8 } from '../data/content';
import { addCircleGoalLive, createCircleLive, liveOn } from '../lib/live';
import { set } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const PRIV: [string, string][] = [['Private', 'Only you and people you add'], ['Invite only', 'Anyone with the 8-character code'], ['Friends', 'Friends of members can request'], ['Discoverable', 'Listed in community search']];

export default function CircleNew() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [priv, setPriv] = useState(0);
  const [busy, setBusy] = useState(false);
  const [targets, setTargets] = useState<CircleTarget[]>([]);
  const create = () => {
    if (!name.trim()) { say('Give your circle a name'); return; }
    if (busy) return;
    if (liveOn()) {
      setBusy(true);
      createCircleLive(name.trim().slice(0, 60), PRIV[priv][0])
        .then(async c => {
          // Targets are added one by one so a failure on one still keeps the circle and the others.
          let failed = 0;
          for (const x of targets) await addCircleGoalLive(c, x.name, x.total).catch(() => { failed++; });
          buzz([10, 30, 16]);
          say(failed ? `Circle created · ${failed} target${failed === 1 ? '' : 's'} couldn’t be added` : 'Circle created · share your code');
          router.replace(`/community/circle/${c.id}`);
        })
        .catch((e: Error) => { say(e.message); setBusy(false); });
      return;
    }
    const c = { id: Date.now(), name: name.trim(), priv: PRIV[priv][0], members: 1, code: code8(), role: 'Owner' as const, goals: targets.map(x => ({ name: x.name, done: 0, total: x.total })) };
    buzz([10, 30, 16]);
    set(s => ({ circles: s.circles.concat([c]) }));
    say('Circle created · share your code');
    // Close this modal first so the circle opens on the Ummah stack and Back returns to Ummah, not Home.
    if (router.canGoBack()) router.back();
    router.push(`/community/circle/${c.id}`);
  };
  return (
    <Page>
      <BackBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 6, paddingHorizontal: 22 }}><H1>Name your circle</H1></View>
      <View style={{ paddingTop: 18, paddingHorizontal: 22 }}>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Thursday halaqa" placeholderTextColor={t.t4} accessibilityLabel="Circle name" returnKeyType="done"
          style={{ outlineWidth: 0, height: 60, borderRadius: 22, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 18, color: t.txw, fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold' }} />
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 22, gap: 10 }}>
        {PRIV.map(([l, s], i) => <Option key={l} title={l} sub={s} on={priv === i} onPress={() => setPriv(i)} />)}
      </View>
      <Label style={{ marginTop: 22, marginBottom: 4, marginHorizontal: 26 }}>SHARED TARGETS</Label>
      <View style={{ paddingHorizontal: 22, paddingBottom: 6 }}>
        <Txt style={{ fontSize: 13, color: t.t2, marginBottom: 12 }}>Optional — pick from the community goals or make your own. You can add more later.</Txt>
        <CircleTargets value={targets} onChange={setTargets} />
      </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, paddingTop: 10 }}><Cta label={busy ? 'Creating…' : targets.length ? `Create circle · ${targets.length} target${targets.length === 1 ? '' : 's'}` : 'Create circle'} disabled={!name.trim() || busy} onPress={create} /></View>
    </Page>
  );
}
