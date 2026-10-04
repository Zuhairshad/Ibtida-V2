import { View } from 'react-native';
import { BackBar, Screen, Txt } from '../../../components/ui';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

export default function Emergency() {
  const t = useT();
  const list = useApp(s => s.emergencies);
  return (
    <Screen top={54}>
      <BackBar title="Emergency unlocks" />
      <Txt style={{ paddingTop: 10, paddingHorizontal: 22, fontSize: 15, lineHeight: 23, color: t.t3 }}>A private record for your own reflection. No one else can see it.</Txt>
      <View style={{ paddingTop: 16, paddingHorizontal: 16, gap: 8 }}>
        {list.length === 0 && (
          <View style={{ borderRadius: 24, backgroundColor: t.card, padding: 28, alignItems: 'center' }}>
            <Txt style={{ fontSize: 16, fontWeight: 700 }}>No early unlocks</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Every lock so far ran to the end.</Txt>
          </View>
        )}
        {list.map((e, i) => (
          <View key={i} style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 16, paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Txt style={{ fontSize: 14.5, fontWeight: 700 }}>{e.when}</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t2 }}>{e.after}</Txt>
            </View>
            <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t5, marginTop: 8 }}>“{e.reason}”</Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}
