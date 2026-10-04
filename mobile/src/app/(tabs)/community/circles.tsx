import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { BackBar, buzz, Cta, H1, Label, say, Screen, Tap, Txt } from '../../../components/ui';
import { joinCircleLive, liveOn } from '../../../lib/live';
import { set, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

export default function Circles() {
  const t = useT();
  const router = useRouter();
  const circles = useApp(s => s.circles);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = code.length === 8 && !busy;
  const join = () => {
    if (!ok) { say('Invite codes are 8 characters'); return; }
    if (circles.some(c => c.code === code)) { say('You’re already in that circle'); return; }
    if (liveOn()) {
      setBusy(true);
      joinCircleLive(code)
        .then(c => { buzz([10, 30, 16]); setCode(''); say('Joined ' + c.name); })
        .catch((e: Error) => say(e.message))
        .finally(() => setBusy(false));
      return;
    }
    const c = { id: Date.now(), name: 'Masjid youth circle', priv: 'Invite only', members: 23, code, role: 'Member' as const, goals: [{ name: 'Fajr in jama’ah', done: 120, total: 400 }] };
    buzz([10, 30, 16]);
    set(s => ({ circles: s.circles.concat([c]) }));
    setCode('');
    say('Joined ' + c.name);
  };
  return (
    <Screen top={54}>
      <BackBar title="My circles" />
      <View style={{ paddingTop: 10, paddingHorizontal: 22 }}><H1>Have an invite code?</H1></View>
      <View style={{ paddingTop: 16, paddingHorizontal: 22 }}>
        <TextInput value={code} onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} autoCapitalize="characters" autoCorrect={false}
          placeholder="8-CHAR CODE" placeholderTextColor={t.t4} accessibilityLabel="Invite code"
          style={{ height: 64, borderRadius: 24, borderWidth: 1, borderColor: ok ? t.acc : t.bord, backgroundColor: t.sunk, textAlign: 'center', color: t.txw, fontSize: 24, fontWeight: '800', letterSpacing: 7, fontFamily: 'monospace' }} />
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 22 }}>
        <Cta label="Join circle" height={56} size={16} disabled={!ok} onPress={join} />
      </View>
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>JOINED</Label>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {circles.map(c => (
          <Tap key={c.id} scale={0.985} onPress={() => router.push(`/community/circle/${c.id}`)}
            style={{ borderRadius: 24, backgroundColor: t.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{c.members} members</Txt>
            </View>
            <View style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12, backgroundColor: t.ctl }}>
              <Txt style={{ fontSize: 12, fontWeight: 700, color: t.t5 }}>{c.priv}</Txt>
            </View>
            <Icon name="chev" color={t.t4} />
          </Tap>
        ))}
      </View>
    </Screen>
  );
}
