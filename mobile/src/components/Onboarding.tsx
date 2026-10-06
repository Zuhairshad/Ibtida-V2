import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { buzz, H1, Txt, useBack } from './ui';
import { useT } from '../theme/ThemeProvider';

const STEPS = ['name', 'intent', 'place', 'method', 'wake'];

/** Progress bar across the onboarding questions. */
export function Steps({ at }: { at: string }) {
  const t = useT();
  const i = STEPS.indexOf(at);
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 4, paddingBottom: 18 }} accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}>
      {STEPS.map((s, k) => <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= i ? t.acc : t.ctl2 }} />)}
    </View>
  );
}

/** v7 onboarding header: back chevron beside the title, subtitle under the title. */
export function BackTitle({ title, sub, subSize = 16 }: { title: string; sub: string; subSize?: number }) {
  const t = useT();
  const back = useBack();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      <Pressable onPress={() => { buzz(5); back(); }} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}
        style={{ width: 36, height: 44, marginTop: 2, justifyContent: 'center' }}>
        <Icon name="back" color={t.t4} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <H1>{title}</H1>
        <Txt style={{ fontSize: subSize, lineHeight: subSize * 1.5, color: t.t3, marginTop: 10 }}>{sub}</Txt>
      </View>
    </View>
  );
}
