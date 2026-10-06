import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { FadeIn } from '../components/motion';
import { Steps } from '../components/Onboarding';
import { BackBar, Cta, H1, Page, Txt, WheelSet } from '../components/ui';
import { usePrayerNow } from '../lib/hooks';
import { fmtTime, timesFor } from '../lib/prayer';
import { getState, set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const HRS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export default function Wake() {
  const t = useT();
  const router = useRouter();
  const w = useApp(s => s.wake);
  const { times } = usePrayerNow();
  const put = (p: Partial<typeof w>) => set(s => ({ wake: { ...s.wake, ...p }, ob: { ...s.ob, wake: true } }));
  // Start from 15 minutes before tomorrow's real Fajr (rounded down to 5 min), unless already chosen.
  useEffect(() => {
    const s = getState();
    if (s.ob.wake) return;
    const d = new Date(); d.setDate(d.getDate() + 1);
    const at = new Date(timesFor(s.city, d, s.method, s.hanafi).Fajr.getTime() - 15 * 60000);
    const h = at.getHours();
    set({ wake: { h: (h % 12 || 12) - 1, m: Math.floor(at.getMinutes() / 5), a: h >= 12 ? 1 : 0 } });
  }, []);
  const wakeAt = `${HRS[w.h]}:${MINS[w.m]} ${w.a ? 'pm' : 'am'}`;
  // Next turns the Fajr wake alarm on at this time; Skip leaves it off (it can be turned on later in Prayer).
  const finish = (on: boolean) => {
    set(s => { const v = s.wakeVerify.slice(); v[0] = on; return { wakeVerify: v, ob: { ...s.ob, wake: true } }; });
    router.push('/loading');
  };
  return (
    <Page top={56}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 22 }}>
          <Steps at="wake" />
          <View style={{ marginHorizontal: -12 }}><BackBar /></View>
          <H1 style={{ textAlign: 'center', marginTop: 8 }}>When do you want{'\n'}to wake for Fajr?</H1>
        </View>
        <View style={{ marginTop: 40 }}>
          <WheelSet cols={[
            { values: HRS, idx: w.h, onPick: h => put({ h }) },
            { values: MINS, idx: w.m, onPick: m => put({ m }) },
            { values: ['AM', 'PM'], idx: w.a, onPick: a => put({ a }) },
          ]} />
        </View>
        <View style={{ marginTop: 18, paddingVertical: 26, paddingHorizontal: 30, backgroundColor: t.sunk, boxShadow: t.edge, alignItems: 'center' }}>
          <Txt style={{ fontSize: 19, fontWeight: 700, color: t.t2 }}>Why do we ask?</Txt>
          <Txt style={{ fontSize: 15, lineHeight: 23, color: t.t5, marginTop: 10, textAlign: 'center' }}>Fajr today is at {fmtTime(times.Fajr)}. Your alarm rings at {wakeAt} and stops only after you scan your wudu station, then your prayer mat.</Txt>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 22 }}>
          <Cta label="No alarm" kind="secondary" color={t.txw} style={{ flex: 1, backgroundColor: t.opt, boxShadow: t.edge }} onPress={() => finish(false)} />
          <Cta label={`Wake me at ${wakeAt}`} size={15} style={{ flex: 1.4 }} onPress={() => finish(true)} />
        </View>
      </FadeIn>
    </Page>
  );
}
