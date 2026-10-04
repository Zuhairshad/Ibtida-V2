import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../components/TabBar';
import { useT } from '../../theme/ThemeProvider';

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs tabBar={p => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="prayer" />
      <Tabs.Screen name="adhkar" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
