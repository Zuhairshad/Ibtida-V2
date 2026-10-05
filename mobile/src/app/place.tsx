import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useDetect } from '../components/LocationSheet';
import { FadeIn } from '../components/motion';
import { Steps } from '../components/Onboarding';
import { BackBar, buzz, Cta, H1, Page, Txt } from '../components/ui';
import { CITIES } from '../data/content';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function Place() {
  const t = useT();
  const router = useRouter();
  const city = useApp(s => s.city);
  const [q, setQ] = useState(city.name.split(',')[0]);
  const det = useDetect();
  const hits = q.trim() ? CITIES.filter(c => c.name.toLowerCase().startsWith(q.trim().toLowerCase())).slice(0, 4) : [];
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="place" />
        <View style={{ marginHorizontal: -12 }}><BackBar /></View>
        <H1 style={{ textAlign: 'center', marginTop: 8 }}>Where do you pray?</H1>
        <Txt style={{ fontSize: 15, color: t.t3, textAlign: 'center', marginTop: 10 }}>Prayer times are calculated on your device</Txt>
        <TextInput value={q} onChangeText={setQ} placeholder="City" placeholderTextColor={t.t4} accessibilityLabel="City" selectionColor={t.acc}
          style={{ outlineWidth: 0, marginTop: 56, textAlign: 'center', color: t.txw, fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold' }} />
        <View style={{ marginTop: 18, borderRadius: 24, backgroundColor: t.sunk, overflow: 'hidden' }}>
          {hits.map(c => (
            <Pressable key={c.name} onPress={() => { buzz(6); set({ city: c }); setQ(c.name.split(',')[0]); }} accessibilityRole="button" accessibilityState={{ selected: c.name === city.name }}
              style={{ padding: 16, alignItems: 'center' }}>
              <Txt style={{ fontSize: 17, fontWeight: 600, color: c.name === city.name ? t.acc : t.tx }}>{c.name}</Txt>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={det.run} accessibilityRole="button" style={{ marginTop: 18, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Icon name="pin" color={t.acc} />
          <Txt style={{ fontSize: 14.5, fontWeight: 700, color: t.acc }}>{det.label}</Txt>
        </Pressable>
        <Txt style={{ fontSize: 13, color: t.t2, textAlign: 'center' }}>Selected: {city.name}</Txt>
        <View style={{ flex: 1 }} />
        <Cta label="Continue" onPress={() => router.push('/method')} />
      </FadeIn>
    </Page>
  );
}
