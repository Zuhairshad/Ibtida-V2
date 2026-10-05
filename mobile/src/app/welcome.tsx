import { useRouter } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { FadeIn } from '../components/motion';
import { Cta, Page, Txt } from '../components/ui';
import { useT } from '../theme/ThemeProvider';
import { G, bgImage } from '../theme/tokens';

const TILES: [string, IconName][] = [['Prayer times', 'moon'], ['Daily dhikr', 'beads'], ['Quran', 'book'], ['Ibadah Lock', 'lock']];

export default function Welcome() {
  const t = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const w = (width - 44 - 14) / 2;
  return (
    <Page top={78} style={{ paddingHorizontal: 22 }}>
      <FadeIn style={{ flex: 1 }}>
        <Txt accessibilityRole="header" style={{ fontSize: 32, fontWeight: 800, lineHeight: 36, letterSpacing: -0.8, textAlign: 'center' }}>Small steps.{'\n'}Consistent worship.</Txt>
        <Txt style={{ fontSize: 16, lineHeight: 24, color: t.t3, textAlign: 'center', marginTop: 12 }}>Prayer, dhikr and Quran — with fewer distractions</Txt>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 28, alignContent: 'stretch' }}>
          {TILES.map(([label, ic], i) => (
            <View key={label} style={{ width: w, height: '47%', minHeight: 140, borderRadius: 30, overflow: 'hidden', ...bgImage(G.welcome[i]), boxShadow: t.hair }}>
              <View style={{ position: 'absolute', left: '50%', top: '44%', marginLeft: -37, marginTop: -37, width: 74, height: 74, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ic} size={34} color="#FFFFFF" />
              </View>
              <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 18, backgroundColor: 'rgba(40,41,50,0.78)', alignItems: 'center' }}>
                <Txt style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{label}</Txt>
              </View>
            </View>
          ))}
        </View>
        <Cta label="Begin with Bismillah" style={{ marginTop: 26 }} onPress={() => router.push('/intent')} />
        <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'in' } })} accessibilityRole="button" style={{ height: 44, marginTop: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 14.5, fontWeight: 600, color: t.t3 }}>I already have an account</Txt>
        </Pressable>
      </FadeIn>
    </Page>
  );
}
