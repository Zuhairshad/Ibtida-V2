import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackBar, buzz, Chips, Cta, H1, Label, Page, say, Tap, Txt, useBack, WheelSet } from '../components/ui';
import { clock12, daysLabel, DUR_MAX, DUR_MIN, durLabel, overlaps, rangeLabel, type LockSched } from '../lib/lockTimes';
import { enableNotifications } from '../lib/notifications';
import { IbadahLock } from '../lib/shield';
import { getState, set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const HRS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const QUICK = [15, 30, 45, 60, 90, 120];
const PRESETS: [string, number[]][] = [['Every day', [1, 1, 1, 1, 1, 1, 1]], ['Weekdays', [1, 1, 1, 1, 1, 0, 0]], ['Weekends', [0, 0, 0, 0, 0, 1, 1]]];

/** Add or edit a scheduled Ibadah Lock: start time, duration and days. */
export default function LockSchedule() {
  const t = useT();
  const back = useBack();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useApp(s => s.locks.find(l => l.id === id));
  const locks = useApp(s => s.locks);
  const others = locks.filter(l => l.id !== id && l.on);
  const [h, setH] = useState(existing?.h ?? 5);
  const [m, setM] = useState(existing ? Math.round(existing.m / 5) * 5 % 60 : 0);
  const [dur, setDur] = useState(existing?.dur ?? 45);
  const [days, setDays] = useState<number[]>(existing?.days.slice() ?? [1, 1, 1, 1, 1, 1, 1]);

  const h12 = (h % 12 || 12) - 1;
  const pm = h >= 12 ? 1 : 0;
  const setClock = (hi: number, ap: number) => setH(((hi + 1) % 12) + (ap ? 12 : 0));
  const draft = { h, m, dur, days };
  const clash = others.some(o => overlaps(draft, o));
  const noDays = !days.some(Boolean);

  const save = () => {
    if (noDays) { say('Choose at least one day'); return; }
    const lock: LockSched = { id: existing?.id ?? `lock-${Date.now().toString(36)}`, h, m, dur, days, on: true };
    set(s => ({ locks: existing ? s.locks.map(l => (l.id === lock.id ? lock : l)) : [...s.locks, lock] }));
    buzz([20, 40, 20]);
    const shielding = IbadahLock.isSupported() && IbadahLock.isPermissionGranted();
    say(`Ibadah Lock set · ${rangeLabel(lock)} · ${daysLabel(days)}${IbadahLock.isSupported() && !shielding ? ' · allow app shielding to enforce it' : ''}`);
    if (getState().notifs[4]) enableNotifications();
    back();
  };

  const remove = () => {
    const go = () => { set(s => ({ locks: s.locks.filter(l => l.id !== id) })); say('Lock time removed'); back(); };
    if (Platform.OS === 'web') { if (window.confirm('Remove this lock time?')) go(); return; }
    Alert.alert('Remove this lock time?', 'Apps will no longer lock at this time.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  return (
    <Page>
      <BackBar title={existing ? 'Edit lock time' : 'New lock time'} />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <H1 style={{ textAlign: 'center', marginTop: 8, marginHorizontal: 22 }}>When should apps lock?</H1>

        <Label style={{ marginTop: 20, marginHorizontal: 26 }}>STARTS AT</Label>
        <WheelSet inset={40} cols={[
          { values: HRS, idx: h12, onPick: i => setClock(i, pm) },
          { values: MINS, idx: m / 5, onPick: i => setM(i * 5) },
          { values: ['AM', 'PM'], idx: pm, onPick: a => setClock(h12, a) },
        ]} />

        <Label style={{ marginTop: 8, marginBottom: 10, marginHorizontal: 26 }}>FOR HOW LONG</Label>
        <View style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tap scale={0.9} accessibilityLabel="Shorter" onPress={() => { buzz(5); setDur(d => Math.max(DUR_MIN, d - 5)); }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 22, color: t.tx }}>−</Txt>
          </Tap>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt style={{ fontSize: 28, fontWeight: 800 }} accessibilityLabel={`Duration ${durLabel(dur)}`}>{durLabel(dur)}</Txt>
          </View>
          <Tap scale={0.9} accessibilityLabel="Longer" onPress={() => { buzz(5); setDur(d => Math.min(DUR_MAX, d + 5)); }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 22, color: t.tx }}>+</Txt>
          </Tap>
        </View>
        <Chips wrap labels={QUICK.map(durLabel)} isOn={i => dur === QUICK[i]} onPick={i => setDur(QUICK[i])} height={40} size={13} style={{ marginTop: 12, paddingHorizontal: 22, justifyContent: 'center' }} />

        <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>ON THESE DAYS</Label>
        <View style={{ paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {DAYS.map((d, i) => {
            const on = !!days[i];
            return (
              <Tap key={d} scale={0.9} accessibilityLabel={d} accessibilityState={{ selected: on }}
                onPress={() => { buzz(5); const x = days.slice(); x[i] = on ? 0 : 1; setDays(x); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? t.cta : t.opt, boxShadow: on ? undefined : t.edge, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: 14, fontWeight: 700, color: on ? t.ctaInk : t.t2 }}>{d[0]}</Txt>
              </Tap>
            );
          })}
        </View>
        <Chips flex labels={PRESETS.map(p => p[0])} isOn={i => PRESETS[i][1].every((v, k) => v === days[k])} onPick={i => setDays(PRESETS[i][1].slice())} height={38} size={12.5} style={{ marginTop: 10, paddingHorizontal: 22 }} />

        <View style={{ marginTop: 20, marginHorizontal: 22, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 18, flexDirection: 'row', gap: 12 }}>
          <Icon name="lock" color={t.acc} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 15.5, fontWeight: 700 }}>{noDays ? 'Pick the days' : `${clock12(h, m)} for ${durLabel(dur)} · ${daysLabel(days)}`}</Txt>
            <Txt style={{ fontSize: 13, lineHeight: 19.5, color: t.t2, marginTop: 6 }}>
              {Platform.OS === 'android'
                ? 'During this time, opening any app brings you to Ibtida instead. Calls, messages, emergency, your keyboard and clock alarms always work.'
                : 'During this time Ibtida reminds you and opens your worship. Locking other apps needs Android, or iOS Screen Time approval from Apple.'}
            </Txt>
            {clash && <Txt style={{ fontSize: 12.5, color: t.acc, marginTop: 8 }}>Overlaps another lock time — they’ll simply run together.</Txt>}
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, paddingTop: 10, gap: 10 }}>
        <Cta label={existing ? 'Save lock time' : 'Accept & schedule lock'} icon="lock" disabled={noDays} onPress={save} />
        {existing && <Cta label="Remove lock time" kind="danger" height={50} size={14.5} onPress={remove} />}
      </View>
    </Page>
  );
}
