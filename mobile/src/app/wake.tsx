import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { FadeIn } from '../components/motion';
import { Steps } from '../components/Onboarding';
import { BackBar, Cta, H1, Page, Txt, WheelSet } from '../components/ui';
import { usePrayerNow } from '../lib/hooks';
import { fmtTime } from '../lib/prayer';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const HRS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export default function Wake() {
  const t = useT();
  const router = useRouter();
  const w = useApp(s => s.wake);
  const { times } = usePrayerNow();
  const put = (p: Partial<typeof w>) => set(s => ({ wake: { ...s.wake, ...p } }));
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
        <View style={{ marginTop: 18, paddingVertical: 26, paddingHorizontal: 30, backgroundColor: t.sunk, alignItems: 'center' }}>
          <Txt style={{ fontSize: 19, fontWeight: 700, color: t.t2 }}>Why do we ask?</Txt>
          <Txt style={{ fontSize: 15, lineHeight: 23, color: t.t5, marginTop: 10, textAlign: 'center' }}>Fajr today is at {fmtTime(times.Fajr)}. Your wake alarm can ask you to scan your wudu station before it stops.</Txt>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 22 }}>
          <Cta label="Skip" kind="secondary" color={t.txw} style={{ flex: 1, backgroundColor: t.opt }} onPress={() => router.push('/loading')} />
          <Cta label="Next" style={{ flex: 1 }} onPress={() => router.push('/loading')} />
        </View>
      </FadeIn>
    </Page>
  );
}
