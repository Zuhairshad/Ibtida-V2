import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/motion';
import { buzz, Cta, say, Tap, Txt } from '../components/ui';
import { usePrayerNow } from '../lib/hooks';
import { fmtTime } from '../lib/prayer';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G } from '../theme/tokens';

function ScanLine({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [v, rm]);
  return (
    <Animated.View style={{ position: 'absolute', left: 14, right: 14, height: 2, top: 0, experimental_backgroundImage: `linear-gradient(90deg, rgba(242,166,90,0), ${color}, rgba(242,166,90,0))`, boxShadow: `0 0 14px ${color}`, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [30, 210] }) }] }} />
  );
}

function Corner({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const top = pos[0] === 't'; const left = pos[1] === 'l';
  return <View style={{
    position: 'absolute', width: 44, height: 44, borderColor: color,
    [top ? 'top' : 'bottom']: 0, [left ? 'left' : 'right']: 0,
    [top ? 'borderTopWidth' : 'borderBottomWidth']: 4, [left ? 'borderLeftWidth' : 'borderRightWidth']: 4,
    [`border${top ? 'Top' : 'Bottom'}${left ? 'Left' : 'Right'}Radius`]: 20,
  }} />;
}

function Scan() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { times } = usePrayerNow();
  const [stage, setStage] = useState(1);
  const [torch, setTorch] = useState(false);
  const ink = stage === 3 ? '#5EB87A' : t.acc;
  const title = stage === 1 ? 'Scan your wudu station' : stage === 2 ? 'Now scan your prayer mat' : 'You’re up. Alhamdulillah.';
  const sub = stage === 1 ? 'Point the camera at the QR tag by your sink.' : stage === 2 ? 'You have 10 minutes. The alarm keeps ringing until then.' : `Alarm stopped. Fajr ends at ${fmtTime(times.Sunrise)}.`;
  return (
    <View style={{ flex: 1, backgroundColor: '#07080A', experimental_backgroundImage: G.scan }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: ins.top + 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tap onPress={() => router.back()} accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" color="#FFFFFF" />
        </Tap>
        <View style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Txt style={{ fontSize: 13, fontWeight: 700 }}>Fajr · {stage === 3 ? 'Verified' : `Stage ${stage} of 2`}</Txt>
        </View>
        <Tap onPress={() => setTorch(x => !x)} accessibilityLabel="Torch" accessibilityState={{ checked: torch }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: torch ? t.cta : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="torch" color={torch ? t.ctaInk : t.cta} />
        </Tap>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 250, height: 250 }}>
          {(['tl', 'tr', 'bl', 'br'] as const).map(p => <Corner key={p} pos={p} color={ink} />)}
          {stage < 3 && <ScanLine color={t.acc} />}
          {stage === 3 && (
            <View style={{ position: 'absolute', left: 60, top: 60, right: 60, bottom: 60, borderRadius: 100, backgroundColor: '#5EB87A', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={56} color="#FFFFFF" />
            </View>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {[1, 2].map(i => <View key={i} style={{ height: 6, width: stage === i ? 26 : 8, borderRadius: 3, backgroundColor: stage > i || stage === 3 ? '#5EB87A' : stage === i ? t.acc : t.ctl4 }} />)}
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 30, alignItems: 'center' }}>
        <Txt style={{ fontSize: 22, fontWeight: 800 }}>{title}</Txt>
        <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t3, marginTop: 6, textAlign: 'center' }}>{sub}</Txt>
      </View>
      <View style={{ paddingTop: 22, paddingHorizontal: 22, paddingBottom: ins.bottom + 36 }}>
        <Cta label={stage === 3 ? 'Done' : 'Simulate scan'} size={17} onPress={() => {
          if (stage === 3) { router.back(); return; }
          buzz([30, 40, 30]);
          setStage(stage + 1);
          say(stage === 1 ? 'Wudu scan verified · 10 min to reach the mat' : 'Wake verified · alarm stopped');
        }} />
        <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center', marginTop: 10 }}>Camera scanning arrives with the native camera module — this simulates a matching scan</Txt>
      </View>
    </View>
  );
}

export default function WakeScan() {
  return <Immersive><Scan /></Immersive>;
}
