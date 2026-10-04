import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { MosqueLogo } from '../components/Icon';
import { FadeIn, Glow } from '../components/motion';
import { Txt } from '../components/ui';
import { Immersive, useT } from '../theme/ThemeProvider';

function Splash() {
  const t = useT();
  const router = useRouter();
  useEffect(() => { const id = setTimeout(() => router.replace('/welcome'), 1900); return () => clearTimeout(id); }, [router]);
  return (
    <Pressable onPress={() => router.replace('/welcome')} accessibilityLabel="Continue" style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <FadeIn dur={600} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Glow dur={3600} style={{ boxShadow: '0 0 40px rgba(247,176,74,0.45)', borderRadius: 75 }}>
          <MosqueLogo size={150} />
        </Glow>
        <View style={{ marginTop: 120, alignItems: 'center' }}>
          <Txt style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.3, color: '#FFFFFF' }}>ibtida</Txt>
          <Txt style={{ fontSize: 12.5, letterSpacing: 2.5, color: t.t4, marginTop: 12 }}>EVERY JOURNEY BEGINS HERE</Txt>
        </View>
      </FadeIn>
    </Pressable>
  );
}

export default function SplashScreen() {
  return <Immersive><Splash /></Immersive>;
}
