import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useDetect } from '../components/LocationSheet';
import { FadeIn } from '../components/motion';
import { Steps } from '../components/Onboarding';
import { BackBar, Cta, H1, Page, Txt } from '../components/ui';
import { PlaceSearch } from '../components/PlaceSearch';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function Place() {
  const t = useT();
  const router = useRouter();
  const city = useApp(s => s.city);
  const picked = useApp(s => s.ob.place);
  const det = useDetect();
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="place" />
        <View style={{ marginHorizontal: -12 }}><BackBar /></View>
        <H1 style={{ textAlign: 'center', marginTop: 8 }}>Where do you pray?</H1>
        <Txt style={{ fontSize: 15, color: t.t3, textAlign: 'center', marginTop: 10 }}>Prayer times are calculated on your device</Txt>
        <Pressable onPress={det.run} accessibilityRole="button" style={{ marginTop: 28, height: 52, borderRadius: 26, backgroundColor: t.tAmb, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="pin" color={t.acc} />
          <Txt style={{ fontSize: 15, fontWeight: 700, color: t.acc }}>{det.label}</Txt>
        </Pressable>
        <Txt style={{ fontSize: 12.5, color: t.t4, textAlign: 'center', marginTop: 14, marginBottom: 10 }}>or search</Txt>
        <PlaceSearch big selected={picked ? city.name : undefined} onPick={c => set(s => ({ city: c, ob: { ...s.ob, place: true } }))} />
        <Txt style={{ fontSize: 14, fontWeight: 600, color: picked ? t.tx : t.t4, textAlign: 'center', marginTop: 18 }}>
          {picked ? `Selected: ${city.name}` : 'Choose your city to continue'}
        </Txt>
        <View style={{ flex: 1 }} />
        <Cta label="Continue" disabled={!picked} onPress={() => router.push('/method')} />
      </FadeIn>
    </Page>
  );
}
