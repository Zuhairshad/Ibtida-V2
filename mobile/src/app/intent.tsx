import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { FadeIn } from '../components/motion';
import { Steps } from '../components/Onboarding';
import { BackBar, Cta, H1, Option, Page, Txt } from '../components/ui';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const OPTS: [string, string][] = [
  ['Guard the five prayers', 'Log each salah and catch up on missed ones'],
  ['Build a morning adhkar habit', 'A short set, every day after Fajr'],
  ['Read Quran regularly', 'A few pages, most days'],
  ['Digital fasting & focus', 'Lock distracting apps during dhikr'],
];

export default function Intent() {
  const t = useT();
  const router = useRouter();
  const intents = useApp(s => s.intents);
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="intent" />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: -12 }}>
          <BackBar />
        </View>
        <H1>What would you like to guard?</H1>
        <Txt style={{ fontSize: 16, lineHeight: 24, color: t.t3, marginTop: 10 }}>We’ll shape Home around what you pick. Choose any.</Txt>
        <View style={{ gap: 12, marginTop: 28 }}>
          {OPTS.map(([title, sub], i) => (
            <Option key={title} title={title} sub={sub} on={intents[i]} pad={20} r={24} dot={34} titleSize={17}
              onPress={() => { const n = intents.slice(); n[i] = !n[i]; set({ intents: n }); }} />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Cta label="Continue" disabled={!intents.some(Boolean)} onPress={() => router.push('/place')} />
      </FadeIn>
    </Page>
  );
}
