import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { FadeIn } from '../components/motion';
import { BackTitle, Steps } from '../components/Onboarding';
import { Cta, Option, Page } from '../components/ui';
import { getState, set, useApp } from '../state/store';

const OPTS: [string, string][] = [
  ['Guard the five prayers', 'Adhan reminders and a log for each salah'],
  ['Build a morning adhkar habit', 'Morning and evening adhkar reminders'],
  ['Read Quran regularly', 'A gentle nudge after Fajr'],
  ['Digital fasting & focus', 'Ibadah Lock keeps distracting apps closed'],
];

/** Which notification switch (Profile → Notifications) each intent turns on. */
const NOTIF_FOR = [0, 1, 3, 4];

export default function Intent() {
  const router = useRouter();
  const intents = useApp(s => s.intents);
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="intent" />
        <BackTitle title="What would you like to guard?" sub="We’ll set your reminders and put these first on Home. Choose any." />
        <View style={{ gap: 12, marginTop: 28 }}>
          {OPTS.map(([title, sub], i) => (
            <Option key={title} title={title} sub={sub} on={intents[i]} pad={20} r={24} dot={34} titleSize={17}
              onPress={() => { const n = intents.slice(); n[i] = !n[i]; set({ intents: n }); }} />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Cta label="Continue" disabled={!intents.some(Boolean)} onPress={() => {
          // Reminders follow what was picked; each can still be changed in Profile → Notifications.
          const notifs = getState().notifs.slice();
          NOTIF_FOR.forEach((n, i) => { notifs[n] = intents[i]; });
          set({ notifs });
          router.push('/place');
        }} />
      </FadeIn>
    </Page>
  );
}
