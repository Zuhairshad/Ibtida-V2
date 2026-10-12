import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAUNCH_AYAT, type Ayah } from '../data/ayat';
import { ayahRef } from '../data/reminders';
import { getState } from '../state/store';
import { bgImage, G } from '../theme/tokens';
import { Immersive, useT } from '../theme/ThemeProvider';
import { Breathe, FadeIn, Stars, useReducedMotion } from './motion';
import { Cta, Txt } from './ui';

/** Long enough to read a verse slowly; any tap continues sooner. */
const AUTO_MS = 14_000;

function Verse({ ayah, onDone }: { ayah: Ayah; onDone: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const lang = getState().notifLang ?? 'both';
  const en = lang !== 'ur';
  const ur = lang !== 'en';
  return (
    <Pressable onPress={onDone} accessibilityLabel="Continue to Ibtida" style={{ flex: 1, ...bgImage(G.launch), backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <Stars style={{ bottom: '55%' }} />
      <Breathe bg={G.glowGoldSoft} style={{ left: '-20%', right: '-20%', top: '6%', aspectRatio: 1 }} dur={9000} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingTop: insets.top + 40, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <FadeIn dur={700}>
          <Txt style={{ fontSize: 11.5, letterSpacing: 3, color: t.gold, textAlign: 'center', fontWeight: 700 }}>A VERSE FOR YOUR HEART</Txt>
        </FadeIn>
        <FadeIn dur={900} delay={250}>
          <Txt ar accessibilityLanguage="ar" style={{ fontSize: 30, lineHeight: 58, color: t.txw, textAlign: 'center', writingDirection: 'rtl', marginTop: 28 }}>{ayah.ar}</Txt>
        </FadeIn>
        <FadeIn dur={800} delay={700}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginVertical: 24 }}>
            <View style={{ width: 36, height: StyleSheet.hairlineWidth, backgroundColor: t.gold, opacity: 0.6 }} />
            <View style={{ width: 6, height: 6, backgroundColor: t.gold, transform: [{ rotate: '45deg' }] }} />
            <View style={{ width: 36, height: StyleSheet.hairlineWidth, backgroundColor: t.gold, opacity: 0.6 }} />
          </View>
          {en && <Txt serif style={{ fontSize: 21, lineHeight: 30, color: t.t5, textAlign: 'center' }}>“{ayah.en}”</Txt>}
          {ur && <Txt ur style={{ fontSize: 17, lineHeight: 36, color: en ? t.t2 : t.t5, textAlign: 'center', writingDirection: 'rtl', marginTop: en ? 14 : 0 }}>{ayah.ur}</Txt>}
          <Txt style={{ fontSize: 13, letterSpacing: 1.2, color: t.gold, textAlign: 'center', marginTop: 20, fontWeight: 600 }}>
            {ayahRef(ayah).toUpperCase()}
          </Txt>
        </FadeIn>
      </ScrollView>
      <FadeIn dur={600} delay={1400} style={{ paddingHorizontal: 30, paddingBottom: insets.bottom + 24 }}>
        <Cta label="Bismillah" onPress={onDone} height={56} size={17} />
      </FadeIn>
    </Pressable>
  );
}

/**
 * A short Quranic verse on prayer, remembrance, hope or worship, shown over Home each time the app
 * starts. Skipped during onboarding, when opened from a notification, and when switched off.
 */
export function LaunchAyah({ skip }: { skip: boolean }) {
  const [show, setShow] = useState(() => {
    const s = getState();
    return !skip && s.onboarded && s.launchAyah !== false;
  });
  const [ayah] = useState(() => LAUNCH_AYAT[Math.floor(Math.random() * LAUNCH_AYAT.length)]);
  const [fade] = useState(() => new Animated.Value(1));
  const rm = useReducedMotion();
  const closing = useRef(false);

  const done = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(fade, { toValue: 0, duration: rm ? 0 : 450, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(() => setShow(false));
  };

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(done, AUTO_MS);
    return () => clearTimeout(id);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 10 }]} accessibilityViewIsModal>
      <Immersive><Verse ayah={ayah} onDone={done} /></Immersive>
    </Animated.View>
  );
}
