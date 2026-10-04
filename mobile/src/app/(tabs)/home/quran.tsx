import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { Breathe } from '../../../components/motion';
import { BackBar, Screen, Seg, SerifTitle, Tap, Txt } from '../../../components/ui';
import { arNum, SURAHS } from '../../../data/content';
import { useT } from '../../../theme/ThemeProvider';
import { G } from '../../../theme/tokens';

export default function Quran() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState(0);
  const open = () => router.push('/reader');
  const rows = tab === 0
    ? SURAHS.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || String(s.n) === q.trim()).map(s => ({ ...s, bar: s.n === 2 ? 72 : null }))
    : tab === 1
      ? Array.from({ length: 8 }, (_, i) => ({ n: i + 1, name: `Juz ${i + 1}`, meta: i < 2 ? (i === 0 ? 'Completed' : '46% read') : 'Not started', ar: `الجزء ${arNum(i + 1)}`, bar: i < 2 ? (i === 0 ? 100 : 46) : null }))
      : [
          { n: 2, name: 'Al-Baqarah 2:183', meta: 'Today · 12 min', ar: 'البقرة', bar: null },
          { n: 18, name: 'Al-Kahf 18:1', meta: 'Friday · 24 min', ar: 'الكهف', bar: null },
          { n: 36, name: 'Ya-Sin 36:1', meta: 'Tuesday · 9 min', ar: 'يس', bar: null },
        ];
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingHorizontal: 22 }}><SerifTitle a="The" b="Quran" /></View>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Tap scale={0.985} onPress={open} accessibilityLabel="Continue reading Surah Al-Baqarah, ayah 183"
          style={{ borderRadius: 32, padding: 22, overflow: 'hidden', experimental_backgroundImage: G.quran }}>
          <Breathe bg={G.glowGoldSoft} style={{ width: 200, height: 200, right: -50, top: -60 }} dur={10000} />
          <Txt style={{ fontSize: 11.5, letterSpacing: 0.7, color: 'rgba(255,255,255,0.8)' }}>CONTINUE READING</Txt>
          <Txt style={{ fontSize: 26, fontWeight: 800, marginTop: 8, letterSpacing: -0.5, color: '#FFFFFF' }}>Surah Al-Baqarah</Txt>
          <Txt style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Ayah 183 · Juz 2</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: '72%', backgroundColor: '#FFFFFF', borderRadius: 3 }} />
            </View>
            <Txt style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>72%</Txt>
          </View>
        </Tap>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: t.card }}>
          <Icon name="search" color={t.t4} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search surah name or number" placeholderTextColor={t.t4} accessibilityLabel="Search surahs"
            style={{ flex: 1, color: t.txw, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' }} />
        </View>
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <Seg labels={['Surahs', 'Juz', 'History']} value={tab} onChange={setTab} height={42} size={13.5} />
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16, gap: 8 }}>
        {rows.map(s => (
          <Tap key={s.name} scale={0.985} onPress={open} style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.ctl, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 14, fontWeight: 800, color: t.acc }}>{s.n}</Txt>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{s.meta}</Txt>
            </View>
            {s.bar != null && (
              <View style={{ width: 52, height: 5, borderRadius: 3, backgroundColor: t.ctl3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${s.bar}%`, backgroundColor: t.acc }} />
              </View>
            )}
            <Txt ar style={{ fontSize: 21, color: t.gold }}>{s.ar}</Txt>
          </Tap>
        ))}
        {rows.length === 0 && (
          <View style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
            <Txt style={{ fontSize: 16, fontWeight: 700 }}>No matches</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Try a surah number, like 18.</Txt>
          </View>
        )}
      </View>
    </Screen>
  );
}
