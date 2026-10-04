import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ScheherazadeNew_400Regular, ScheherazadeNew_600SemiBold, ScheherazadeNew_700Bold } from '@expo-google-fonts/scheherazade-new';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '../components/ui';
import { useNotifications } from '../lib/notifications';
import { hydrate, useApp } from '../state/store';
import { ThemeProvider, useT } from '../theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const t = useT();
  useNotifications();
  useEffect(() => { SystemUI.setBackgroundColorAsync(t.bg).catch(() => {}); }, [t.bg]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="splash" options={{ animation: 'fade' }} />
        <Stack.Screen name="loading" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="session" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="tasbeeh" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="goal-done" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="focus-active" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="wake-scan" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="goal-new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="circle-new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
      </Stack>
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  const hydrated = useApp(s => s.hydrated);
  const [fonts] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    DMSerifDisplay_400Regular, ScheherazadeNew_400Regular, ScheherazadeNew_600SemiBold, ScheherazadeNew_700Bold, NotoNastaliqUrdu_400Regular,
  });
  useEffect(() => { hydrate(); }, []);
  const ready = fonts && hydrated;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
