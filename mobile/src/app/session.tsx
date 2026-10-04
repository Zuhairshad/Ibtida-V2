import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { FadeIn, usePop } from '../components/motion';
import { buzz, Ring, say, Tap, Txt, UrduToggle, useBack } from '../components/ui';
import { SESS } from '../data/content';
import { useUrdu } from '../lib/hooks';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G } from '../theme/tokens';

function Session() {
  const t = useT();
  const router = useRouter();
  const back = useBack();
  const ins = useSafeAreaInsets();
  const { cat = 'Evening' } = useLocalSearchParams<{ cat?: string }>();
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [scale, pop] = usePop(0.94);
  const s = SESS[i];
  const [urOn, urFlip] = useUrdu('sess' + i);
  const pct = ((i + Math.min(n, s.n) / s.n) / SESS.length) * 100;

  const tap = () => {
    // Taps during the hand-off to the next dhikr must not re-trigger it (or finish the session twice).
    if (n >= s.n) return;
    pop();
    const nn = n + 1;
    if (nn >= s.n) {
      setN(nn);
      if (i + 1 >= SESS.length) {
        buzz([30, 60, 30, 60, 90]);
        setTimeout(() => { say(`${cat} adhkar complete · May Allah accept`); router.dismissTo('/home'); }, 350);
      } else {
        buzz([16, 30, 16]);
        setTimeout(() => { setI(i + 1); setN(0); }, 320);
      }
    } else { buzz(8); setN(nn); }
  };

  return (
    <Pressable onPress={tap} accessibilityLabel={`Count. ${n} of ${s.n}`} accessibilityHint="Tap anywhere to count"
      style={{ flex: 1, experimental_backgroundImage: G.session, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Tap onPress={() => { buzz(5); back(); }} accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={t.tx} />
        </Tap>
        <Txt style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{cat} Adhkar</Txt>
        <Txt style={{ fontSize: 13, fontWeight: 700, color: t.t2, paddingRight: 12 }}>{i + 1} / {SESS.length}</Txt>
      </View>
      <FadeIn key={i} dur={450} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 26 }}>
        <Txt ar style={{ fontWeight: 600, fontSize: 40, lineHeight: 72, textAlign: 'center', color: t.txw }}>{s.ar}</Txt>
        <Txt style={{ fontSize: 15, color: t.t3, textAlign: 'center', marginTop: 18, fontStyle: 'italic' }}>{s.tr}</Txt>
        <Txt style={{ fontSize: 18, lineHeight: 28, color: t.tx, textAlign: 'center', marginTop: 10 }}>{s.en}</Txt>
        <View style={{ alignItems: 'center', marginTop: 18 }}>
          <View style={{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 14, backgroundColor: 'rgba(94,184,122,0.14)' }}>
            <Txt style={{ fontSize: 12.5, fontWeight: 700, color: '#A9E0BA' }}>Verified · {s.src}</Txt>
          </View>
        </View>
        {urOn && <FadeIn dur={300}><Txt ur style={{ fontSize: 18, lineHeight: 38, color: t.t5, textAlign: 'center', marginTop: 10 }}>{s.ur}</Txt></FadeIn>}
        <View style={{ alignItems: 'center', marginTop: 12 }}><UrduToggle on={urOn} onPress={urFlip} /></View>
      </FadeIn>
      <View style={{ alignItems: 'center', paddingBottom: 22 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ring size={128} r={56} stroke={8} pct={Math.min(n, s.n) / s.n} track={t.ctl2} color={t.acc}>
            <View style={{ alignItems: 'center' }}>
              <Txt style={{ fontSize: 36, fontWeight: 800 }}>{n}</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t2 }}>of {s.n}</Txt>
            </View>
          </Ring>
        </Animated.View>
        <Txt style={{ fontSize: 13, color: t.t4, marginTop: 14 }}>Tap anywhere to count</Txt>
      </View>
      <View style={{ height: 4, backgroundColor: t.sheetc, marginHorizontal: 26, marginBottom: ins.bottom + 34, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, experimental_backgroundImage: G.brandH }} />
      </View>
    </Pressable>
  );
}

export default function SessionScreen() {
  return <Immersive><Session /></Immersive>;
}
