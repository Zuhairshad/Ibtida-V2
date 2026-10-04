import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { STARS } from '../data/content';

/** Mirrors `@media (prefers-reduced-motion: reduce)` from the prototype. */
export function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setRm).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setRm);
    return () => sub.remove();
  }, []);
  return rm;
}

function useLoop(duration: number, delay = 0, enabled = true) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm || !enabled) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [rm, enabled, duration, delay, v]);
  return { v, rm };
}

/** ibIn — rise + fade on mount. */
export function FadeIn({ children, delay = 0, style, dur = 500 }: { children?: ReactNode; delay?: number; style?: StyleProp<ViewStyle>; dur?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: rm ? 0 : dur, delay: rm ? 0 : delay, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [v, delay, rm, dur]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** ibBreathe — soft glow orb (scale 1→1.18, opacity .45→.8). */
export function Breathe({ style, bg, dur = 9000 }: { style: StyleProp<ViewStyle>; bg: string; dur?: number }) {
  const { v, rm } = useLoop(dur);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', borderRadius: 999, experimental_backgroundImage: bg },
        style,
        rm ? { opacity: 0.6 } : {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.8] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
        },
      ]}
    />
  );
}

/** ibGlow — opacity .55 ↔ 1. */
export function Glow({ children, dur = 3600, style }: { children: ReactNode; dur?: number; style?: StyleProp<ViewStyle> }) {
  const { v, rm } = useLoop(dur);
  return <Animated.View style={[style, rm ? null : { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}>{children}</Animated.View>;
}

function Star({ x, y, s, d, delay, color }: { x: number; y: number; s: number; d: number; delay: number; color: string }) {
  const { v, rm } = useLoop(d * 1000, delay * 1000);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: s, height: s, borderRadius: s, backgroundColor: color, opacity: rm ? 0.6 : v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }}
    />
  );
}

/** The 18 twinkling stars used on Home, Tasbeeh and Goal complete. */
export function Stars({ style, color = '#FFFFFF' }: { style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, style]}>
      {STARS.map((st, i) => <Star key={i} {...st} color={color} />)}
    </View>
  );
}

/** ibPulse — expanding halo around a dot / node. */
export function PulseDot({ size, color, ring = 'rgba(242,166,90,0.55)', style, borderColor }: { size: number; color: string; ring?: string; style?: StyleProp<ViewStyle>; borderColor?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [rm, v]);
  return (
    <View style={[{ width: size, height: size }, style]}>
      {!rm && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size, backgroundColor: ring,
            opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1 + 20 / size, 1 + 20 / size] }) }],
          }}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color, borderWidth: borderColor ? 2 : 0, borderColor }} />
    </View>
  );
}

/** ibOrbit — continuous rotation. */
export function Orbit({ children, dur, reverse, style }: { children: ReactNode; dur: number; reverse?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [rm, v, dur]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
  return <Animated.View style={[style, { transform: [{ rotate }] }]}>{children}</Animated.View>;
}

/** Animated number that eases toward `to` (count-up on Home / Community). */
export function useCountUp(to: number, dur = 1500, key?: unknown) {
  const [n, setN] = useState(to);
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) { setN(to); return; }
    const start = Date.now();
    setN(0);
    const id = setInterval(() => {
      const t = Math.min((Date.now() - start) / dur, 1);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [to, dur, rm, key]);
  return n;
}

/** A 1Hz clock shared by countdowns. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
