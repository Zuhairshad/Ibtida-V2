import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Breathe, FadeIn, Stars } from '../components/motion';
import { Cta, Ring, Txt } from '../components/ui';
import { useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G } from '../theme/tokens';

function Done() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { name = 'Durood Sharif', target = '100' } = useLocalSearchParams<{ name?: string; target?: string }>();
  const streak = useApp(s => s.streak) + 1;
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: ins.top + 52, paddingHorizontal: 26, paddingBottom: ins.bottom + 36, experimental_backgroundImage: G.goalDone, backgroundColor: t.bg, overflow: 'hidden' }}>
      <StatusBar style="light" />
      <Stars style={{ top: 70 }} color="#FFE2B0" />
      <FadeIn dur={700} style={{ width: 210, height: 210, alignItems: 'center', justifyContent: 'center' }}>
        <Breathe bg={G.glowDone} style={{ left: -30, top: -30, right: -30, bottom: -30 }} dur={5000} />
        <View style={{ position: 'absolute' }}>
          <Ring size={210} r={94} stroke={12} pct={1} track="#3A2E22" gradient={['#FFD27A', '#E07A4B']} />
        </View>
        <View style={{ width: 96, height: 96, borderRadius: 32, experimental_backgroundImage: G.trophy, alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px -10px rgba(224,122,75,0.6)' }}>
          <Icon name="trophy" size={48} color="#2A1A08" />
        </View>
      </FadeIn>
      <Txt style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.56, color: t.acc, marginTop: 34 }}>GOAL COMPLETE</Txt>
      <Txt style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.2, marginTop: 8 }}>{target} / {target}</Txt>
      <Txt ar style={{ fontSize: 30, lineHeight: 50, color: t.gold, marginTop: 10 }}>اَلْحَمْدُ لِلَّهِ</Txt>
      <Txt style={{ fontSize: 16, lineHeight: 24.8, color: t.t5, textAlign: 'center', marginTop: 8, maxWidth: 290 }}>{name} complete. May Allah accept your worship.</Txt>
      <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(242,166,90,0.14)' }}>
        <Icon name="flame" size={16} color="#F7C58A" />
        <Txt style={{ fontSize: 14, fontWeight: 700, color: '#F7C58A' }}>{streak}-day streak · 2-Week Steadfast in {Math.max(0, 14 - streak)} days</Txt>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ width: '100%', flexDirection: 'row', gap: 10 }}>
        <Cta label="Share" icon="share" kind="secondary" size={17} style={{ flex: 1 }}
          onPress={() => Share.share({ message: `Alhamdulillah — I completed ${target} ${name} today on Ibtida.` }).catch(() => {})} />
        <Cta label="Back to Home" size={17} style={{ flex: 1.3 }} onPress={() => router.dismissTo('/home')} />
      </View>
    </View>
  );
}

export default function GoalDone() {
  return <Immersive><Done /></Immersive>;
}
