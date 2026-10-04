import { View } from 'react-native';
import { useT } from '../theme/ThemeProvider';

const STEPS = ['intent', 'place', 'method', 'wake'];

/** Four-segment progress bar across the onboarding questions. */
export function Steps({ at }: { at: string }) {
  const t = useT();
  const i = STEPS.indexOf(at);
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 4, paddingBottom: 18 }} accessibilityLabel={`Step ${i + 1} of 4`}>
      {STEPS.map((s, k) => <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= i ? t.acc : t.ctl2 }} />)}
    </View>
  );
}
