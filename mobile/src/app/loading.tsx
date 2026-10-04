import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Breathe, FadeIn, Orbit } from '../components/motion';
import { Page, Txt } from '../components/ui';
import { HADITH } from '../data/content';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G } from '../theme/tokens';

function Loading() {
  const t = useT();
  const router = useRouter();
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setP(x => Math.min(300, x + 3)), 40);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (p < 300) return;
    const id = setTimeout(() => router.replace({ pathname: '/auth', params: { mode: 'up' } }), 500);
    return () => clearTimeout(id);
  }, [p, router]);
  const h = HADITH[0];
  return (
    <Page top={92} bottom={40} style={{ paddingHorizontal: 26 }}>
      <StatusBar style="light" />
      <FadeIn style={{ flex: 1 }}>
        <Txt accessibilityRole="header" style={{ fontSize: 32, fontWeight: 800, lineHeight: 37, letterSpacing: -0.8, textAlign: 'center' }}>Preparing your{'\n'}journey…</Txt>
        <View style={{ marginTop: 44, gap: 24 }}>
          {([['Calculating prayer times', 0], ['Preparing your adhkar', 100], ['Setting gentle reminders', 200]] as const).map(([label, off]) => {
            const pct = Math.max(0, Math.min(100, p - off));
            return (
              <View key={label} style={{ opacity: p >= off ? 1 : 0.35 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt style={{ fontSize: 18, fontWeight: 700, color: t.t5 }}>{label}</Txt>
                  <Txt style={{ fontSize: 18, fontWeight: 700, color: t.acc }}>{pct}%</Txt>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: t.sheetc, marginTop: 12, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, borderRadius: 2, experimental_backgroundImage: G.brandH }} />
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 250, height: 250 }}>
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 125, borderWidth: 1, borderColor: t.bord }} />
            <View style={{ position: 'absolute', left: 40, top: 40, right: 40, bottom: 40, borderRadius: 125, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }} />
            <Orbit dur={14000} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
              <View style={{ position: 'absolute', left: 114, top: -10, width: 22, height: 22, borderRadius: 11, experimental_backgroundImage: G.moonOrb }} />
            </Orbit>
            <Orbit dur={9000} reverse style={{ position: 'absolute', left: 40, top: 40, right: 40, bottom: 40 }}>
              <View style={{ position: 'absolute', left: -7, top: 78, width: 14, height: 14, borderRadius: 7, backgroundColor: '#6F87C9' }} />
            </Orbit>
            <Breathe bg={G.sunOrb} style={{ left: 77, top: 77, width: 96, height: 96, boxShadow: '0 0 80px 20px rgba(242,154,74,0.35)' }} dur={5000} />
          </View>
        </View>
        <View style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 18, paddingHorizontal: 20, boxShadow: t.hair }}>
          <Txt ar style={{ fontSize: 22, lineHeight: 37, textAlign: 'center', color: t.gold }}>{h.ar}</Txt>
          <Txt style={{ fontSize: 14, lineHeight: 21.7, color: t.t5, textAlign: 'center', marginTop: 8 }}>“{h.en}”</Txt>
          <Txt ur style={{ fontSize: 14.5, lineHeight: 30, textAlign: 'center', color: t.t3, marginTop: 6 }}>{h.ur}</Txt>
          <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center', marginTop: 8 }}>{h.src}</Txt>
        </View>
      </FadeIn>
    </Page>
  );
}

export default function LoadingScreen() {
  return <Immersive><Loading /></Immersive>;
}
