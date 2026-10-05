import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { FadeIn } from '../components/motion';
import { BackTitle, Steps } from '../components/Onboarding';
import { Cta, Option, Page } from '../components/ui';
import { set, useApp } from '../state/store';

const OPTS: [string, string][] = [
  ['Guard the five prayers', 'Log each salah and catch up on missed ones'],
  ['Build a morning adhkar habit', 'A short set, every day after Fajr'],
  ['Read Quran regularly', 'A few pages, most days'],
  ['Digital fasting & focus', 'Lock distracting apps during dhikr'],
];

export default function Intent() {
  const router = useRouter();
  const intents = useApp(s => s.intents);
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="intent" />
        <BackTitle title="What would you like to guard?" sub="We’ll shape Home around what you pick. Choose any." />
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
