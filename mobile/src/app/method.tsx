import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { MadhabSeg } from '../components/LocationSheet';
import { FadeIn } from '../components/motion';
import { BackTitle, Steps } from '../components/Onboarding';
import { Cta, Label, Option, Page } from '../components/ui';
import { METHODS } from '../data/content';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function Method() {
  const t = useT();
  const router = useRouter();
  const method = useApp(s => s.method);
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="method" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <BackTitle title="How should we calculate?" sub="Pick what your local masjid follows. Change it any time." subSize={15} />
          <View style={{ gap: 10, marginTop: 24 }}>
            {METHODS.map((m, i) => <Option key={m.k} title={m.name} sub={m.sub} on={method === i} onPress={() => set({ method: i })} />)}
          </View>
          <Label style={{ fontSize: 12, letterSpacing: 1.08, marginTop: 22, marginBottom: 10, marginHorizontal: 4 }}>ASR MADHAB</Label>
          <MadhabSeg bg={t.opt} />
        </ScrollView>
        <Cta label="Continue" onPress={() => router.push('/wake')} />
      </FadeIn>
    </Page>
  );
}
