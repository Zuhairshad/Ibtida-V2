import { Stack } from 'expo-router';
import { useT } from '../../../theme/ThemeProvider';

export default function TabStack() {
  const t = useT();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }} />;
}
