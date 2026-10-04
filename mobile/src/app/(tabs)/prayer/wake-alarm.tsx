import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { BackBar, Cta, ListCard, Screen, Statement, SwitchRow, Txt, say } from '../../../components/ui';
import { PH, PRAYER_META } from '../../../data/content';
import { set, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

export default function WakeAlarm() {
  const t = useT();
  const router = useRouter();
  const wake = useApp(s => s.wakeVerify);
  return (
    <Screen top={54}>
      <BackBar title="Wake alarm" />
      <Statement a="Prove you’re up." b="Two scans to stop it." style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <View style={{ paddingTop: 16, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>
        {[['STAGE 1', 'Wudu station'], ['STAGE 2', 'Prayer mat · 10 min']].map(([k, v]) => (
          <View key={k} style={{ flex: 1, borderRadius: 22, backgroundColor: t.card, padding: 14 }}>
            <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.acc }}>{k}</Txt>
            <Txt style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>{v}</Txt>
          </View>
        ))}
      </View>
      <ListCard style={{ marginTop: 10 }}>
        {PH.map((p, i) => (
          <SwitchRow key={p} label={p} sub={wake[i] ? 'Two-stage scan required' : 'Standard adhan only'} icon={PRAYER_META[p].ic} on={wake[i]}
            onToggle={() => { const a = wake.slice(); a[i] = !a[i]; set({ wakeVerify: a }); say(`${p} wake verification ${a[i] ? 'on' : 'off'}`); }} />
        ))}
      </ListCard>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        <Cta label="Print QR tags" icon="qr" height={54} size={15} style={{ flex: 1 }} onPress={() => router.push('/mat-tag')} />
        <Cta label="Test the alarm" kind="secondary" height={54} size={15} style={{ flex: 1 }} onPress={() => router.push('/wake-scan')} />
      </View>
      <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 22, backgroundColor: t.noteBg, boxShadow: 'inset 0 0 0 1px rgba(242,166,90,0.3)', paddingVertical: 14, paddingHorizontal: 16 }}>
        <Txt style={{ fontSize: 13, lineHeight: 20, color: t.noteTx }}>Honest note: phones treat this as a high-priority notification, not a true alarm clock. Keep the volume on and Do Not Disturb exceptions enabled.</Txt>
      </View>
    </Screen>
  );
}
