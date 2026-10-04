import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { BackBar, buzz, Cta, H1, Option, Page, say } from '../components/ui';
import { code8 } from '../data/content';
import { createCircleLive, liveOn } from '../lib/live';
import { set } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const PRIV: [string, string][] = [['Private', 'Only you and people you add'], ['Invite only', 'Anyone with the 8-character code'], ['Friends', 'Friends of members can request'], ['Discoverable', 'Listed in community search']];

export default function CircleNew() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [priv, setPriv] = useState(0);
  const [busy, setBusy] = useState(false);
  const create = () => {
    if (!name.trim()) { say('Give your circle a name'); return; }
    if (busy) return;
    if (liveOn()) {
      setBusy(true);
      createCircleLive(name.trim().slice(0, 60), PRIV[priv][0])
        .then(c => { buzz([10, 30, 16]); say('Circle created · share your code'); router.replace(`/community/circle/${c.id}`); })
        .catch((e: Error) => { say(e.message); setBusy(false); });
      return;
    }
    const c = { id: Date.now(), name: name.trim(), priv: PRIV[priv][0], members: 1, code: code8(), role: 'Owner' as const, goals: [] };
    buzz([10, 30, 16]);
    set(s => ({ circles: s.circles.concat([c]) }));
    say('Circle created · share your code');
    router.replace(`/community/circle/${c.id}`);
  };
  return (
    <Page>
      <BackBar />
      <View style={{ paddingTop: 6, paddingHorizontal: 22 }}><H1>Name your circle</H1></View>
      <View style={{ paddingTop: 18, paddingHorizontal: 22 }}>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Thursday halaqa" placeholderTextColor={t.t4} accessibilityLabel="Circle name" returnKeyType="done"
          style={{ height: 60, borderRadius: 22, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 18, color: t.txw, fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold' }} />
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 22, gap: 10 }}>
        {PRIV.map(([l, s], i) => <Option key={l} title={l} sub={s} on={priv === i} onPress={() => setPriv(i)} />)}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 22 }}><Cta label="Create circle" disabled={!name.trim()} onPress={create} /></View>
    </Page>
  );
}
