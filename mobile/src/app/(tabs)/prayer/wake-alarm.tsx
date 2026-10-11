import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { Icon, type IconName } from '../../../components/Icon';
import { BackBar, buzz, Chips, Cta, Label, ListCard, say, Screen, Sheet, Statement, SwitchRow, Tap, Txt, WheelSet } from '../../../components/ui';
import { ALARM_SOUNDS, FajrAlarm, testAlarm, wakeAt } from '../../../lib/fajrAlarm';
import { usePrayerNow } from '../../../lib/hooks';
import { enableNotifications } from '../../../lib/notifications';
import { addDays, dayKey, fmtTime, timesFor } from '../../../lib/prayer';
import { getState, set, useApp, type WakeEntry } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HRS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function lastWakeLine(e: WakeEntry | undefined) {
  if (!e) return 'No wake verified yet · try the test alarm';
  const d = new Date(e.at);
  const today = dayKey(new Date());
  const day = e.date === today ? 'today' : e.date === dayKey(addDays(new Date(), -1)) ? 'yesterday' : `${d.getDate()} ${MON[d.getMonth()]}`;
  return `Last verified ${day} at ${fmtTime(d)}`;
}

const whenLabel = (ms: number) => {
  const d = new Date(ms);
  const today = dayKey(new Date());
  const day = dayKey(d) === today ? 'Today' : dayKey(d) === dayKey(addDays(new Date(), 1)) ? 'Tomorrow' : `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  return `${day} · ${fmtTime(d)}`;
};

type Check = { key: string; label: string; ok: boolean; okText: string; fixText: string; why: string; icon: IconName; fix: () => void };

/** Native alarm requirements, re-read whenever the user comes back from system settings. */
function useAlarmStatus() {
  const [status, setStatus] = useState(() => FajrAlarm.getStatus());
  const refresh = useCallback(() => setStatus(FajrAlarm.getStatus()), []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') setTimeout(refresh, 300); });
    const id = setInterval(refresh, 4000);
    return () => { sub.remove(); clearInterval(id); };
  }, [refresh]);
  return { status, refresh };
}

export default function WakeAlarm() {
  const t = useT();
  const router = useRouter();
  const on = useApp(s => s.wakeVerify[0]);
  const wake = useApp(s => s.wake);
  const sound = useApp(s => s.alarmSound) || 'alarm';
  const modes = useApp(s => s.wakeMode);
  const lastWake = useApp(s => s.wakeLog[s.wakeLog.length - 1]);
  const { times } = usePrayerNow();
  const [cam, requestCam] = useCameraPermissions();
  const native = FajrAlarm.isSupported();
  const { status, refresh } = useAlarmStatus();
  const [timeOpen, setTimeOpen] = useState(false);
  const [testAt, setTestAt] = useState<number | null>(null);

  const tomorrowFajr = timesFor(getState().city, addDays(new Date(), 1), getState().method, getState().hanafi, getState().adj).Fajr;
  const ringsAt = wakeAt({ wake }, addDays(new Date(), 1), tomorrowFajr);
  const atFajr = ringsAt.getTime() === tomorrowFajr.getTime();
  const sounds = native ? ALARM_SOUNDS.filter(s => FajrAlarm.availableSounds([s.key]).length > 0) : [];

  const checks: Check[] = native && status ? [
    { key: 'notifications', label: 'Notifications', ok: status.notifications, okText: 'Allowed', fixText: 'Allow', icon: 'bell',
      why: 'Shows the alarm on your lock screen.', fix: async () => { const ok = await enableNotifications(); if (!ok) FajrAlarm.openSettings('notifications'); refresh(); } },
    { key: 'exact', label: 'Alarms & reminders', ok: status.exactAlarms, okText: 'Allowed', fixText: 'Allow', icon: 'alarm',
      why: 'Lets the alarm ring at the exact minute, even in battery saver.', fix: () => FajrAlarm.openSettings('exactAlarm') },
    { key: 'full', label: 'Full-screen alarm', ok: status.fullScreen, okText: 'Allowed', fixText: 'Allow', icon: 'lock',
      why: 'Wakes the screen and shows the alarm over the lock screen.', fix: () => FajrAlarm.openSettings('fullScreen') },
    { key: 'battery', label: 'Battery', ok: status.batteryUnrestricted, okText: 'Unrestricted', fixText: 'Allow', icon: 'flame',
      why: 'Stops your phone from closing Ibtida overnight. Some phones (Xiaomi, Oppo, Vivo, Huawei, Samsung) also need “Autostart” or “Never sleeping apps” turned on.', fix: () => FajrAlarm.openSettings('battery') },
    { key: 'volume', label: 'Alarm volume', ok: status.alarmVolume > 0.15, okText: `${Math.round(status.alarmVolume * 100)}%`, fixText: status.alarmVolume === 0 ? 'Muted' : 'Low', icon: 'vib',
      why: 'The alarm follows your phone’s alarm volume. Raise it with the volume keys (Alarm slider) or in Settings › Sound.', fix: () => { say('Raise the Alarm slider with your volume keys'); } },
    { key: 'camera', label: 'Camera', ok: !!cam?.granted, okText: 'Allowed', fixText: 'Allow', icon: 'qr',
      why: 'Scans your wudu station and prayer mat to stop the alarm.', fix: async () => { const r = await requestCam(); if (!r.granted && !r.canAskAgain) Linking.openSettings(); } },
  ] : [];
  const missing = checks.filter(c => !c.ok && c.key !== 'volume' && c.key !== 'battery');
  const ready = on && native && missing.length === 0;

  const toggle = async () => {
    buzz(6);
    const next = !on;
    set(s => { const a = s.wakeVerify.slice(); a[0] = next; return { wakeVerify: a }; });
    say(`Fajr wake alarm ${next ? 'on' : 'off'}`);
    if (next) await enableNotifications();
    refresh();
  };

  const runTest = async () => {
    if (!native) { router.push('/wake-scan'); return; }
    if (missing.length) say(`Allow ${missing.map(m => m.label.toLowerCase()).join(', ')} first for a reliable alarm`);
    const at = await testAlarm(15);
    setTestAt(at);
    setTimeout(() => setTestAt(null), 75_000);
    say('Test alarm in 15 seconds · lock your phone to try it');
  };

  const headline = !on ? 'Off' : !native ? 'Reminder only' : missing.length ? `Needs ${missing.length} ${missing.length === 1 ? 'step' : 'steps'}` : 'Active';
  const headInk = !on ? t.t4 : ready ? t.mint : t.acc;
  const sub = !on
    ? 'Turn it on to wake for Fajr with a real alarm.'
    : !native
      ? Platform.OS === 'android'
        ? 'This build has no alarm module (for example Expo Go). Install the Ibtida app build for a real alarm.'
        : 'On iPhone the wake is a time-sensitive notification, not a ringing alarm.'
      : status?.nextAt ? `Next alarm ${whenLabel(status.nextAt)}` : 'Scheduling…';

  return (
    <Screen top={54}>
      <BackBar title="Fajr wake alarm" />
      <Statement a="Prove you’re up." b="Two scans to stop it." style={{ paddingTop: 10, paddingHorizontal: 22 }} />

      <View accessibilityLabel={`Wake alarm ${headline}. ${sub}`}
        style={{ marginTop: 16, marginHorizontal: 16, borderRadius: 26, backgroundColor: t.card, boxShadow: ready ? 'inset 0 0 0 1.5px rgba(94,184,122,0.45)' : t.edge, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: ready ? 'rgba(94,184,122,0.16)' : t.tAmb, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={ready ? 'check' : 'alarm'} color={headInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 18, fontWeight: 800, color: headInk }}>{headline}</Txt>
          <Txt style={{ fontSize: 13, lineHeight: 19, color: t.t2, marginTop: 3 }}>{sub}</Txt>
          {testAt && <Txt style={{ fontSize: 12.5, color: t.acc, marginTop: 4 }}>Test alarm at {fmtTime(new Date(testAt))}</Txt>}
        </View>
      </View>

      <ListCard style={{ marginTop: 10 }}>
        <SwitchRow label="Fajr wake alarm" sub="Rings until you scan your wudu station, then your prayer mat" icon="sunrise" on={on} onToggle={toggle} />
        <Tap scale={0.99} onPress={() => { buzz(6); setTimeOpen(true); }} accessibilityRole="button" accessibilityLabel={`Rings at ${fmtTime(ringsAt)}, change`}
          style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 15.5, fontWeight: 700 }}>Rings at</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{atFajr ? `At Fajr (${fmtTime(tomorrowFajr)}) · your time isn’t before Fajr` : `Fajr begins ${fmtTime(times.Fajr)} today`}</Txt>
          </View>
          <Txt style={{ fontSize: 16, fontWeight: 800, color: t.acc }}>{fmtTime(ringsAt)}</Txt>
          <Icon name="chev" color={t.t4} />
        </Tap>
        <Tap scale={0.99} onPress={() => router.push('/mat-tag')} accessibilityRole="button"
          style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 15.5, fontWeight: 700 }}>Wudu station & prayer mat</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>
              Scan {modes.W === 'item' ? 'the sink' : 'a QR tag'} · then {modes.M === 'item' ? 'the mat itself' : 'a QR tag'}
            </Txt>
          </View>
          <Icon name="chev" color={t.t4} />
        </Tap>
      </ListCard>

      {native && (
        <>
          <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>MAKE SURE IT RINGS</Label>
          <ListCard>
            {checks.map(c => (
              <View key={c.key} style={{ paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                accessibilityLabel={`${c.label}: ${c.ok ? c.okText : 'needs attention'}. ${c.why}`}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.ok ? t.mint : t.acc }} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 15, fontWeight: 700 }}>{c.label}</Txt>
                  <Txt style={{ fontSize: 12, lineHeight: 17, color: t.t2, marginTop: 2 }}>{c.why}</Txt>
                </View>
                {c.ok
                  ? <Txt style={{ fontSize: 13, fontWeight: 700, color: t.mint }}>{c.okText}</Txt>
                  : <Tap scale={0.94} onPress={() => { buzz(5); c.fix(); }} accessibilityRole="button" accessibilityLabel={`${c.fixText} ${c.label}`}
                      style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: t.cta }}>
                      <Txt style={{ fontSize: 13, fontWeight: 800, color: t.ctaInk }}>{c.fixText}</Txt>
                    </Tap>}
              </View>
            ))}
          </ListCard>

          <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>SOUND</Label>
          <Chips wrap labels={sounds.map(s => s.label)} isOn={i => sounds[i].key === sound}
            onPick={i => { const k = sounds[i].key; set({ alarmSound: k }); FajrAlarm.preview(k, 4).catch(() => {}); }}
            height={40} size={13} style={{ paddingHorizontal: 16 }} />
          <Txt style={{ fontSize: 12, lineHeight: 17, color: t.t4, marginTop: 8, marginHorizontal: 26 }}>
            Tap to hear it at your alarm volume.{ALARM_SOUNDS.length > sounds.length ? ' Adhan recordings appear here once they are added to the app.' : ''}
          </Txt>
        </>
      )}

      <View style={{ paddingTop: 16, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        <Cta label={native ? 'Test alarm · 15 s' : 'Test the scan'} icon="alarm" height={54} size={15} style={{ flex: 1 }} disabled={!on && native} onPress={runTest} />
        <Cta label="Print QR tags" icon="qr" kind="secondary" height={54} size={15} style={{ flex: 1 }} onPress={() => router.push('/mat-tag')} />
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Icon name="check" size={15} color={lastWake ? t.mint : t.t4} />
        <Txt style={{ fontSize: 12.5, fontWeight: 600, color: lastWake ? t.t2 : t.t4 }}>{lastWakeLine(lastWake)}</Txt>
      </View>
      {!native && (
        <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 22, backgroundColor: t.noteBg, boxShadow: 'inset 0 0 0 1px rgba(242,166,90,0.3)', paddingVertical: 14, paddingHorizontal: 16 }}>
          <Txt style={{ fontSize: 13, lineHeight: 20, color: t.noteTx }}>
            Here the wake is a high-priority notification, not a ringing alarm clock. Keep the volume on and allow Ibtida through Do Not Disturb.
          </Txt>
        </View>
      )}

      <Sheet open={timeOpen} onClose={() => setTimeOpen(false)}>
        <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Wake me at</Txt>
        <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.t2, marginTop: 6 }}>Fajr begins at {fmtTime(times.Fajr)} today. A time after Fajr rings at Fajr itself.</Txt>
        <View style={{ marginTop: 10 }}>
          <WheelSet inset={30} cols={[
            { values: HRS, idx: wake.h, onPick: h => set(s => ({ wake: { ...s.wake, h } })) },
            { values: MINS, idx: wake.m, onPick: m => set(s => ({ wake: { ...s.wake, m } })) },
            { values: ['AM', 'PM'], idx: wake.a, onPick: a => set(s => ({ wake: { ...s.wake, a } })) },
          ]} />
        </View>
        <Cta label="Done" height={54} size={15} style={{ marginTop: 10 }} onPress={() => { setTimeOpen(false); say(`Fajr alarm · ${fmtTime(wakeAt({ wake: getState().wake }, addDays(new Date(), 1), tomorrowFajr))}`); }} />
      </Sheet>
    </Screen>
  );
}
