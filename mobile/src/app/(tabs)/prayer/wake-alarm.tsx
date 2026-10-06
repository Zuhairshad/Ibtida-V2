import { useRouter } from 'expo-router';
import { Icon } from '../../../components/Icon';
import { View } from 'react-native';
import { BackBar, Cta, ListCard, Screen, Statement, SwitchRow, Txt, say } from '../../../components/ui';
import { PH, PRAYER_META } from '../../../data/content';
import { enableNotifications } from '../../../lib/notifications';
import { addDays, dayKey, fmtTime } from '../../../lib/prayer';
import { set, useApp, type WakeEntry } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function lastWakeLine(e: WakeEntry | undefined) {
  if (!e) return 'No wake verified yet · try “Test the alarm”';
  const d = new Date(e.at);
  const today = dayKey(new Date());
  const day = e.date === today ? 'today' : e.date === dayKey(addDays(new Date(), -1)) ? 'yesterday' : `${d.getDate()} ${MON[d.getMonth()]}`;
  return `Last verified ${day} at ${fmtTime(d)}`;
}

export default function WakeAlarm() {
  const t = useT();
  const router = useRouter();
  const wake = useApp(s => s.wakeVerify);
  const lastWake = useApp(s => s.wakeLog[s.wakeLog.length - 1]);
  return (
    <Screen top={54}>
      <BackBar title="Wake alarm" />
      <Statement a="Prove you’re up." b="Two scans to stop it." style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <View style={{ paddingTop: 16, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>
        {[['STAGE 1', 'Wudu station'], ['STAGE 2', 'Prayer mat · 10 min']].map(([k, v]) => (
          <View key={k} style={{ flex: 1, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 14 }}>
            <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.acc }}>{k}</Txt>
            <Txt style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>{v}</Txt>
          </View>
        ))}
      </View>
      <ListCard style={{ marginTop: 10 }}>
        {PH.map((p, i) => (
          <SwitchRow key={p} label={p} sub={wake[i] ? 'Two-stage scan required' : 'Standard adhan only'} icon={PRAYER_META[p].ic} on={wake[i]}
            onToggle={() => { const a = wake.slice(); a[i] = !a[i]; set({ wakeVerify: a }); say(`${p} wake verification ${a[i] ? 'on' : 'off'}`); if (a[i]) enableNotifications(); }} />
        ))}
      </ListCard>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        <Cta label="Print QR tags" icon="qr" height={54} size={15} style={{ flex: 1 }} onPress={() => router.push('/mat-tag')} />
        <Cta label="Test the alarm" kind="secondary" height={54} size={15} style={{ flex: 1 }} onPress={() => router.push('/wake-scan')} />
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Icon name="check" size={15} color={lastWake ? t.mint : t.t4} />
        <Txt style={{ fontSize: 12.5, fontWeight: 600, color: lastWake ? t.t2 : t.t4 }}>{lastWakeLine(lastWake)}</Txt>
      </View>
      <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 22, backgroundColor: t.noteBg, boxShadow: 'inset 0 0 0 1px rgba(242,166,90,0.3)', paddingVertical: 14, paddingHorizontal: 16 }}>
        <Txt style={{ fontSize: 13, lineHeight: 20, color: t.noteTx }}>Honest note: phones treat this as a high-priority notification, not a true alarm clock. Keep the volume on and Do Not Disturb exceptions enabled.</Txt>
      </View>
    </Screen>
  );
}
