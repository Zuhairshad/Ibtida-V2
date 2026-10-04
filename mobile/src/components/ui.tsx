import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buzz, say, useToast } from '../lib/feedback';
import { useT } from '../theme/ThemeProvider';
import { FIXED, FONTS, G } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { useReducedMotion } from './motion';

/* ---------------------------------------------------------------- Text */

type Weight = 400 | 500 | 600 | 700 | 800;
type TxtProps = TextProps & {
  style?: StyleProp<TextStyle>;
  /** Arabic (Scheherazade New, RTL). */
  ar?: boolean;
  /** Urdu (Noto Nastaliq Urdu, RTL). */
  ur?: boolean;
  /** Display serif (DM Serif Display). */
  serif?: boolean;
  mono?: boolean;
  children?: ReactNode;
};

/**
 * Text that maps CSS-style `fontWeight` onto the right font file, the way the
 * prototype's `font-weight` worked on Plus Jakarta Sans. Defaults to theme ink.
 */
export function Txt({ style, ar, ur, serif, mono, ...rest }: TxtProps) {
  const t = useT();
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const w = Number(flat.fontWeight || 400) as Weight;
  let fontFamily: string = FONTS.sans[w] || FONTS.sans[400];
  if (serif) fontFamily = FONTS.serif;
  if (ar) fontFamily = FONTS.arabic[w >= 700 ? 700 : w >= 600 ? 600 : 400];
  if (ur) fontFamily = FONTS.urdu;
  if (mono) fontFamily = FONTS.mono;
  return (
    <Text
      {...rest}
      style={[
        { color: t.tx },
        (ar || ur) && { writingDirection: 'rtl' },
        flat,
        { fontFamily, fontWeight: mono ? flat.fontWeight : undefined },
        flat.fontVariant ? null : { fontVariant: ['tabular-nums'] },
      ]}
    />
  );
}

/* ------------------------------------------------------------ Pressables */

type TapProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number; children?: ReactNode };

/** Pressable with the prototype's `:active { transform: scale(.97) }` feedback. */
export function Tap({ style, scale = 0.97, children, onPressIn, onPressOut, ...rest }: TapProps) {
  const v = useRef(new Animated.Value(1)).current;
  const rm = useReducedMotion();
  const to = (x: number) => { if (!rm) Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 6 }).start(); };
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPressIn={e => { to(scale); onPressIn?.(e); }}
      onPressOut={e => { to(1); onPressOut?.(e); }}
    >
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Full-width pill CTA — white on dark, ink on light (var(--cta)). */
export function Cta({ label, onPress, style, kind = 'primary', height = 60, size = 18, icon, disabled, color }: {
  label: string; onPress?: () => void; style?: StyleProp<ViewStyle>; kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  height?: number; size?: number; icon?: IconName; disabled?: boolean; color?: string;
}) {
  const t = useT();
  const bg = disabled ? t.opt : kind === 'primary' ? t.cta : kind === 'secondary' ? t.ctl2 : 'transparent';
  const ink = color || (disabled ? t.t4 : kind === 'primary' ? t.ctaInk : kind === 'danger' ? t.rose : kind === 'ghost' ? t.acc : t.txw);
  return (
    <Tap
      onPress={onPress}
      accessibilityState={{ disabled }}
      style={[
        { height, borderRadius: height / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
        kind === 'danger' && { boxShadow: 'inset 0 0 0 1px rgba(240,138,122,0.4)' },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={ink} />}
      <Txt style={{ fontSize: size, fontWeight: 700, color: ink }}>{label}</Txt>
    </Tap>
  );
}

/** 44px round icon button (header actions). */
export function IconBtn({ name, onPress, label, bg, color, size = 44, dot }: {
  name: IconName; onPress?: () => void; label: string; bg?: string; color?: string; size?: number; dot?: boolean;
}) {
  const t = useT();
  return (
    <Tap onPress={onPress} accessibilityLabel={label} scale={0.92}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? t.card, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} color={color ?? t.tx} />
      {dot && <View style={{ position: 'absolute', top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: t.acc, borderWidth: 2, borderColor: bg ?? t.card }} />}
    </Tap>
  );
}

/* --------------------------------------------------------------- Headers */

/** "Salam, *Yusuf*" — DM Serif Display two-tone title. */
export function SerifTitle({ a, b, style }: { a: string; b: string; style?: StyleProp<TextStyle> }) {
  const t = useT();
  return (
    <Txt serif style={[{ fontSize: 44, lineHeight: 48 }, style]} numberOfLines={1} adjustsFontSizeToFit>
      {a} <Txt serif style={{ fontSize: 44, color: t.t6 }}>{b}</Txt>
    </Txt>
  );
}

/** "Three active. / *Keep them small.*" — 30px statement title. */
export function Statement({ a, b, style }: { a: string; b?: string; style?: StyleProp<TextStyle> }) {
  const t = useT();
  return (
    <Txt style={[{ fontSize: 30, fontWeight: 800, letterSpacing: -0.75, lineHeight: 34.5 }, style]}>
      {a}{b ? '\n' : ''}{b ? <Txt style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.75, color: t.t6 }}>{b}</Txt> : null}
    </Txt>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Txt accessibilityRole="header" style={[{ fontSize: 30, fontWeight: 800, lineHeight: 34, letterSpacing: -0.75 }, style]}>{children}</Txt>;
}

export function BackBar({ title, right, onBack, close }: { title?: string; right?: ReactNode; onBack?: () => void; close?: boolean }) {
  const t = useT();
  const router = useRouter();
  const back = onBack ?? (() => { buzz(5); if (router.canGoBack()) router.back(); else router.replace('/(tabs)/home'); });
  return (
    <View style={{ paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
      <Tap onPress={back} accessibilityLabel={close ? 'Close' : 'Back'} scale={0.9}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={close ? 'x' : 'back'} color={t.tx} />
      </Tap>
      {title ? <Txt style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{title}</Txt> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function Label({ children, style, color }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  const t = useT();
  return <Txt style={[{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: color ?? t.t2 }, style]}>{children}</Txt>;
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12, marginHorizontal: 22 }}>
      <Txt style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{title}</Txt>
      {action && (
        <Pressable onPress={onAction} hitSlop={8} style={{ height: 36, justifyContent: 'center' }} accessibilityRole="button">
          <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.acc }}>{action}</Txt>
        </Pressable>
      )}
    </View>
  );
}

/* ---------------------------------------------------------- Containers */

/** Scrollable screen body with the v7 top/bottom rhythm. `tabs` reserves room for the floating bar. */
export function Screen({ children, tabs = true, top = 58, style, bg }: { children: ReactNode; tabs?: boolean; top?: number; style?: StyleProp<ViewStyle>; bg?: string }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg ?? t.bg }}
      contentContainerStyle={[{ paddingTop: ins.top + top - 48, paddingBottom: tabs ? 120 + ins.bottom : 34 + ins.bottom }, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** Fixed (non-scrolling) full-height screen with the same insets. */
export function Page({ children, top = 54, bottom = 34, style, bg }: { children: ReactNode; top?: number; bottom?: number; style?: StyleProp<ViewStyle>; bg?: string }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: bg ?? t.bg, paddingTop: ins.top + top - 48, paddingBottom: ins.bottom + bottom }, style]}>
      {children}
    </View>
  );
}

export function Card({ children, style, r = 28, pad = 18 }: { children: ReactNode; style?: StyleProp<ViewStyle>; r?: number; pad?: number }) {
  const t = useT();
  return <View style={[{ borderRadius: r, backgroundColor: t.card, padding: pad }, style]}>{children}</View>;
}

/** List card with hairline separators between rows (Privacy, Notifications, Profile menu). */
export function ListCard({ children, style }: { children: ReactNode[]; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  return (
    <View style={[{ marginHorizontal: 16, borderRadius: 28, backgroundColor: t.card, overflow: 'hidden' }, style]}>
      {children.map((c, i) => (
        <View key={i} style={i < children.length - 1 ? { borderBottomWidth: 1, borderBottomColor: t.line } : undefined}>{c}</View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------ Controls */

/** Segmented pill control (Categories / Personal goals, Surahs / Juz / History …). */
export function Seg({ labels, value, onChange, height = 46, radius = 22, inner = 18, bg, size = 14.5, gap = 4 }: {
  labels: string[]; value: number; onChange: (i: number) => void; height?: number; radius?: number; inner?: number; bg?: string; size?: number; gap?: number;
}) {
  const t = useT();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap, padding: 4, borderRadius: radius, backgroundColor: bg ?? t.sunk }}>
      {labels.map((l, i) => {
        const on = i === value;
        return (
          <Pressable key={l} accessibilityRole="tab" accessibilityState={{ selected: on }}
            onPress={() => { buzz(5); onChange(i); }}
            style={{ flex: 1, height, borderRadius: inner, backgroundColor: on ? t.seg : 'transparent', alignItems: 'center', justifyContent: 'center', boxShadow: on && !t.dark ? '0 1px 3px rgba(15,16,20,0.08)' : undefined }}>
            <Txt numberOfLines={1} style={{ fontSize: size, fontWeight: 700, color: on ? t.txw : t.t2 }}>{l}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Chip row — selected chips invert to the CTA colour. */
export function Chips({ labels, isOn, onPick, wrap, height = 44, size = 13.5, style, flex }: {
  labels: string[]; isOn: (i: number) => boolean; onPick: (i: number) => void; wrap?: boolean; height?: number; size?: number; style?: StyleProp<ViewStyle>; flex?: boolean;
}) {
  const t = useT();
  const items = labels.map((l, i) => {
    const on = isOn(i);
    return (
      <Tap key={l} onPress={() => { buzz(5); onPick(i); }} accessibilityState={{ selected: on }} scale={0.95}
        style={[{ height, paddingHorizontal: 15, borderRadius: height / 2, backgroundColor: on ? t.cta : t.opt, alignItems: 'center', justifyContent: 'center' }, flex && { flex: 1 }]}>
        <Txt numberOfLines={1} style={{ fontSize: size, fontWeight: 700, color: on ? t.ctaInk : t.t5 }}>{l}</Txt>
      </Tap>
    );
  });
  if (wrap || flex) return <View style={[{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8 }, style]}>{items}</View>;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8 }, style]}>{items}</ScrollView>;
}

/** Orange radio dot (springs in with the prototype's overshoot curve). */
export function RadioDot({ on, size = 30 }: { on: boolean; size?: number }) {
  const t = useT();
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: on ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 10 }).start();
  }, [on, v]);
  const inner = Math.round(size / 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.seg, alignItems: 'center', justifyContent: 'center', boxShadow: t.dark ? undefined : 'inset 0 0 0 1px rgba(15,16,20,0.1)' }}>
      <Animated.View style={{ width: inner, height: inner, borderRadius: inner, experimental_backgroundImage: G.brand, transform: [{ scale: v }] }} />
    </View>
  );
}

/** Option row (onboarding intents, methods, presets, circle privacy). */
export function Option({ title, sub, on, onPress, ar, pad = 16, r = 22, dot = 30, titleSize = 16 }: {
  title: string; sub?: string; on: boolean; onPress: () => void; ar?: string; pad?: number; r?: number; dot?: number; titleSize?: number;
}) {
  const t = useT();
  return (
    <Tap onPress={() => { buzz(6); onPress(); }} scale={0.985} accessibilityRole="radio" accessibilityState={{ checked: on }}
      style={{ backgroundColor: t.opt, borderRadius: r, paddingVertical: pad, paddingHorizontal: pad + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: on ? FIXED.sel : undefined }}>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: titleSize, fontWeight: 700 }}>{title}</Txt>
        {ar ? <Txt ar style={{ fontSize: 19, color: t.gold, marginTop: 2, textAlign: 'left' }}>{ar}</Txt> : null}
        {sub ? <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{sub}</Txt> : null}
      </View>
      <RadioDot on={on} size={dot} />
    </Tap>
  );
}

/** iOS-style switch with the prototype's overshoot thumb. */
export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  const t = useT();
  const v = useRef(new Animated.Value(on ? 20 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: on ? 20 : 0, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }, [on, v]);
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      onPress={() => { buzz(5); onToggle(); }} hitSlop={6}
      style={{ width: 52, height: 32, borderRadius: 16, backgroundColor: on ? t.acc : t.ctl4 }}>
      <Animated.View style={{ position: 'absolute', top: 3, left: 3, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', transform: [{ translateX: v }], boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </Pressable>
  );
}

export function SwitchRow({ label, sub, on, onToggle, icon, iconColor }: { label: string; sub: string; on: boolean; onToggle: () => void; icon?: IconName; iconColor?: string }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16 }}>
      {icon && <IconChip name={icon} color={iconColor ?? t.acc} size={40} r={13} />}
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 15, fontWeight: 600 }}>{label}</Txt>
        <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{sub}</Txt>
      </View>
      <Switch on={on} onToggle={onToggle} label={label} />
    </View>
  );
}

/** Rounded-square icon tile used at the start of rows. */
export function IconChip({ name, color, bg, size = 44, r = 15, icon = 22 }: { name: IconName; color: string; bg?: string; size?: number; r?: number; icon?: number }) {
  const t = useT();
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg ?? t.ctl, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} color={color} size={icon} />
    </View>
  );
}

/** The "72px pill" shortcut button (QIBLA / KALIMAT / COUNTER / HISTORY). */
export function PillShortcut({ icon, kicker, title, onPress }: { icon: IconName; kicker: string; title: string; onPress: () => void }) {
  const t = useT();
  return (
    <Tap onPress={onPress} style={{ flex: 1, height: 72, borderRadius: 36, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.ctl, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={t.acc} />
      </View>
      <View>
        <Txt style={{ fontSize: 11, letterSpacing: 0.66, color: t.t2 }}>{kicker}</Txt>
        <Txt style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{title}</Txt>
      </View>
    </Tap>
  );
}

/* --------------------------------------------------------------- Rings */

/** SVG progress ring — used for countdown, goals, tasbeeh, community, insight. */
export function Ring({ size, r, stroke, pct, track, color, gradient, children, animate = true }: {
  size: number; r: number; stroke: number; pct: number; track: string; color?: string; gradient?: [string, string]; children?: ReactNode; animate?: boolean;
}) {
  const c = 2 * Math.PI * r;
  const v = useRef(new Animated.Value(pct)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (!animate || rm) { v.setValue(pct); return; }
    Animated.timing(v, { toValue: pct, duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start();
  }, [pct, v, animate, rm]);
  const off = v.interpolate({ inputRange: [0, 1], outputRange: [c, 0], extrapolate: 'clamp' });
  const gid = `rg${size}${r}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {gradient && (
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        )}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={gradient ? `url(#${gid})` : color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={off} />
      </Svg>
      {children}
    </View>
  );
}
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Linear progress bar. */
export function Bar({ pct, h = 5, track, fill, style }: { pct: number; h?: number; track: string; fill?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ height: h, borderRadius: h, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, borderRadius: h, experimental_backgroundImage: fill ? undefined : G.brandH, backgroundColor: fill }} />
    </View>
  );
}

/* --------------------------------------------------------------- Wheel */

/** Five-row wheel picker column from the Fajr / reminder screens. */
export function Wheel({ values, idx, onPick }: { values: string[]; idx: number; onPick: (i: number) => void }) {
  const t = useT();
  return (
    <View style={{ width: 62, alignItems: 'center' }}>
      {[-2, -1, 0, 1, 2].map(o => {
        const j = idx + o;
        const d = Math.abs(o);
        const ok = j >= 0 && j < values.length;
        return (
          <Pressable key={o} disabled={!ok} onPress={() => { buzz(4); onPick(j); }} accessibilityLabel={ok ? values[j] : undefined}
            style={{ height: 50, width: 62, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ color: t.txw, opacity: ok ? (d === 0 ? 1 : d === 1 ? 0.5 : 0.22) : 0, fontSize: d === 0 ? 32 : d === 1 ? 25 : 19, fontWeight: 500 }}>{ok ? values[j] : ''}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function WheelSet({ cols, inset = 18 }: { cols: { values: string[]; idx: number; onPick: (i: number) => void }[]; inset?: number }) {
  const t = useT();
  return (
    <View style={{ height: 250, flexDirection: 'row', justifyContent: 'center', gap: 34 }}>
      <View style={{ position: 'absolute', left: inset, right: inset, top: 103, height: 46, borderRadius: 23, backgroundColor: t.opt }} />
      {cols.map((c, i) => <Wheel key={i} {...c} />)}
    </View>
  );
}

/* ------------------------------------------------------------- Urdu */

export function UrduToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  const t = useT();
  return (
    <Tap onPress={() => { buzz(5); onPress(); }} scale={0.94} accessibilityLabel="Toggle Urdu translation" accessibilityState={{ checked: on }}
      style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: on ? 'rgba(242,166,90,0.18)' : t.ctl, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Txt style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.44, color: on ? t.acc : t.t2 }}>UR</Txt>
      <Txt ur style={{ fontSize: 13, lineHeight: 30, color: on ? t.acc : t.t2 }}>اردو</Txt>
    </Tap>
  );
}

/* ------------------------------------------------------------ Avatars */

export function Avatar({ i, bg, size = 32, border, fs = 12, style }: { i: string; bg: string; size?: number; border?: string; fs?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: border ? 2 : 0, borderColor: border }, style]}>
      <Txt style={{ fontSize: fs, fontWeight: 800, color: FIXED.ink }}>{i}</Txt>
    </View>
  );
}

/* --------------------------------------------------------------- Sheet */

/** Bottom sheet: dimmed scrim, drag handle, swipe-down to dismiss, ibSheet slide-in. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const y = useRef(new Animated.Value(800)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) {
      y.setValue(800);
      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else fade.setValue(0);
  }, [open, y, fade]);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 1) onCloseRef.current();
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    },
  })).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,7,10,0.6)', opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: t.sheet, boxShadow: `inset 0 1px 0 ${t.dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,16,20,0.04)'}, 0 -20px 50px -20px rgba(0,0,0,0.35)`, transform: [{ translateY: y }] }}>
        <View {...pan.panHandlers} style={{ paddingTop: 12, paddingBottom: 10 }}>
          <Pressable onPress={onClose} accessibilityLabel="Close" style={{ alignSelf: 'center', width: 80, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.ctl4b }} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34 + ins.bottom }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </Animated.View>
      <ToastHost />
    </Modal>
  );
}

/* --------------------------------------------------------------- Toast */

export function ToastHost() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const toast = useToast();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: toast.on ? 1 : 0, duration: 350, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [toast.on, toast.key, v]);
  if (!toast.msg) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert"
      style={{
        position: 'absolute', left: 20, right: 20, top: ins.top + 10, zIndex: 70, borderRadius: 22, backgroundColor: t.toast,
        boxShadow: `inset 0 0 0 1px ${t.dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,16,20,0.06)'}, 0 16px 30px -10px rgba(0,0,0,0.4)`,
        paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
      }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, experimental_backgroundImage: G.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={15} color={FIXED.ink} />
      </View>
      <Txt style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{toast.msg}</Txt>
    </Animated.View>
  );
}

export { buzz, say };
