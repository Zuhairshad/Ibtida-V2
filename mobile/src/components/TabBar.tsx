import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buzz } from '../lib/feedback';
import { useT } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Txt } from './ui';

const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  prayer: { label: 'Prayer', icon: 'prayer' },
  adhkar: { label: 'Adhkar', icon: 'beads' },
  community: { label: 'Ummah', icon: 'people' },
  profile: { label: 'You', icon: 'user' },
};

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const t = useT();
  const s = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: focused ? 1.1 : 1, useNativeDriver: true, speed: 16, bounciness: 12 }).start();
  }, [focused, s]);
  const meta = TABS[name];
  if (!meta) return null;
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={meta.label} accessibilityState={{ selected: focused }}
      style={({ pressed }) => ({
        flex: 1, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: focused ? t.tabOn : 'transparent', boxShadow: focused ? t.tabRing : undefined,
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}>
      <Animated.View style={{ transform: [{ scale: s }] }}>
        <Icon name={meta.icon} color={focused ? t.acc : t.tabInk} />
      </Animated.View>
      <Txt style={{ fontSize: 11, fontWeight: 600, color: focused ? t.txw : t.tabInk }}>{meta.label}</Txt>
    </Pressable>
  );
}

/** Floating frosted tab bar — 74px pill, 14px side gutters (v7 `showTabs` block). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const ios = Platform.OS === 'ios';
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(ins.bottom, 8) + 10 }}>
      <View style={{ height: 74, borderRadius: 37, overflow: 'hidden', boxShadow: t.tabShadow }}>
        {ios ? (
          <BlurView intensity={60} tint={t.dark ? 'dark' : 'light'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: t.tabbar }} />
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: t.dark ? 'rgba(46,47,56,0.97)' : 'rgba(255,255,255,0.97)' }} />
        )}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 6, gap: 2 }} accessibilityRole="tablist">
          {state.routes.map((r, i) => (
            <TabItem key={r.key} name={r.name} focused={state.index === i} onPress={() => {
              buzz(6);
              const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (ev.defaultPrevented) return;
              // Tapping a tab always lands on its root, matching the prototype's tab() reset.
              navigation.navigate(r.name, { screen: 'index' });
            }} />
          ))}
        </View>
      </View>
    </View>
  );
}
