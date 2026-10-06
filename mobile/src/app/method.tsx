import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { MadhabSeg } from '../components/LocationSheet';
import { FadeIn } from '../components/motion';
import { BackTitle, Steps } from '../components/Onboarding';
import { Cta, Label, Option, Page, Txt } from '../components/ui';
import { METHODS } from '../data/content';
import { suggestMethod } from '../lib/places';
import { getState, set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function Method() {
  const t = useT();
  const router = useRouter();
  const method = useApp(s => s.method);
  const city = useApp(s => s.city);
  const tip = suggestMethod(city.cc);
  const country = city.name.split(', ').slice(-1)[0];
  // Pre-select the usual method and Asr school for this country once per place; never override a later choice.
  useEffect(() => {
    const s = getState();
    if (!tip || s.ob.method === s.city.name) return;
    set(st => ({ method: tip.method, hanafi: tip.hanafi, ob: { ...st.ob, method: st.city.name } }));
  }, [tip?.method, tip?.hanafi]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="method" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <BackTitle title="How should we calculate?" sub="Pick what your local masjid follows. Change it any time." subSize={15} />
          <View style={{ gap: 10, marginTop: 24 }}>
            {METHODS.map((m, i) => <Option key={m.k} title={m.name} sub={tip?.method === i ? `${m.sub} · Common in ${country}` : m.sub} on={method === i} onPress={() => set({ method: i })} />)}
          </View>
          {tip && <Txt style={{ fontSize: 12.5, lineHeight: 18.5, color: t.t4, marginTop: 10, marginHorizontal: 4 }}>Pre-selected from what’s common in {country}. If your masjid uses another method or madhab, choose it here.</Txt>}
          <Label style={{ fontSize: 12, letterSpacing: 1.08, marginTop: 22, marginBottom: 10, marginHorizontal: 4 }}>ASR MADHAB</Label>
          <MadhabSeg bg={t.opt} />
        </ScrollView>
        <Cta label="Continue" onPress={() => router.push('/wake')} />
      </FadeIn>
    </Page>
  );
}
