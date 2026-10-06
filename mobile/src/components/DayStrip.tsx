import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { addDays, DOW } from '../lib/prayer';
import { buzz } from '../lib/feedback';
import { useT } from '../theme/ThemeProvider';
import { FIXED } from '../theme/tokens';
import { Icon } from './Icon';
import { Txt } from './ui';

function Day({ d, on, onPress, sun }: { d: Date; on: boolean; onPress: () => void; sun: number }) {
  const t = useT();
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: on ? 1 : 0, duration: 300, useNativeDriver: true }).start(); }, [on, v]);
  const dow = DOW[d.getDay()];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${dow} ${d.getDate()}`}
      style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingBottom: 9, borderRadius: 24, alignItems: 'center', gap: 7, backgroundColor: on ? t.dayBg : 'transparent', boxShadow: on ? t.dayRing : undefined }}>
      <Txt style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.44, color: on ? t.acc : t.t2 }}>{dow}</Txt>
      <Animated.View style={{
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) }],
      }}>
        <Icon name="sunDay" size={sun} color={FIXED.sun} />
      </Animated.View>
      <Txt style={{ fontSize: sun > 22 ? 15 : 14, fontWeight: 700 }}>{d.getDate()}</Txt>
    </Pressable>
  );
}

/** Moonly-style date strip — a sun for each day; the selected one brightens and turns. */
export function DayStrip({ count, value, onChange, base }: { count: number; value: number; onChange: (i: number) => void; base: Date }) {
  const t = useT();
  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 6, borderRadius: 30, backgroundColor: t.sunk, boxShadow: t.edge }}>
      {Array.from({ length: count }, (_, i) => (
        <Day key={i} d={addDays(base, i)} on={value === i} sun={count > 5 ? 22 : 26} onPress={() => { buzz(5); onChange(i); }} />
      ))}
    </View>
  );
}
