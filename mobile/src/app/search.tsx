import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { FadeIn, Glow } from '../components/motion';
import { Chips, Label, Page, say, Tap, Txt, useBack } from '../components/ui';
import { RESULTS } from '../data/content';
import { useT } from '../theme/ThemeProvider';

/** Kalimat search across Quran, hadith and adhkar (transliteration + Arabic keys). */
export default function Search() {
  const t = useT();
  const router = useRouter();
  const back = useBack();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!q.trim()) { setLoading(false); return; }
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(id);
  }, [q]);
  const qq = q.trim().toLowerCase();
  const f = ['All', 'Quran', 'Hadith', 'Azkar'][filter];
  const res = qq ? RESULTS.filter(r => (f === 'All' || r.type === f) && `${r.title} ${r.sub} ${r.keys}`.toLowerCase().includes(qq)) : [];
  const tint: Record<string, [string, string, IconName]> = { Quran: [t.tMint, t.mint, 'book'], Hadith: [t.tBlue, t.peri, 'shield'], Azkar: [t.tAmb, t.acc, 'beads'] };
  return (
    <Page bottom={0}>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={t.tx} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 26, backgroundColor: t.card }}>
          <Icon name="search" color={t.t4} />
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Quran, hadith, azkar…" placeholderTextColor={t.t4} accessibilityLabel="Search" returnKeyType="search"
            style={{ flex: 1, minWidth: 0, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' }} />
          {!!q && (
            <Pressable onPress={() => setQ('')} accessibilityLabel="Clear" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.ctl4, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={14} color={t.txw} />
            </Pressable>
          )}
        </View>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16 }}>
        <Chips labels={['All', 'Quran', 'Hadith', 'Azkar']} isOn={i => filter === i} onPick={setFilter} height={40} />
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {!qq && (
          <>
            <Label style={{ marginTop: 4, marginHorizontal: 6, marginBottom: 10 }}>TRY</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['istighfar', 'morning', 'kursi', 'sleep', 'subhanallah', 'استغفار'].map(s => (
                <Tap key={s} scale={0.95} onPress={() => setQ(s)} style={{ height: 42, paddingHorizontal: 15, borderRadius: 21, backgroundColor: t.card, justifyContent: 'center' }}>
                  <Txt ar={/[؀-ۿ]/.test(s)} style={{ fontSize: 14, fontWeight: 600 }}>{s}</Txt>
                </Tap>
              ))}
            </View>
          </>
        )}
        {!!qq && loading && (
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map(k => <Glow key={k} dur={1200}><Animated.View style={{ height: 84, borderRadius: 24, backgroundColor: t.sunk }} /></Glow>)}
          </View>
        )}
        {!!qq && !loading && res.length > 0 && (
          <>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 2, marginHorizontal: 6, marginBottom: 10 }}>{res.length} semantic match{res.length === 1 ? '' : 'es'} via Kalimat</Txt>
            <View style={{ gap: 8 }}>
              {res.map(r => {
                const [bg, ink, ic] = tint[r.type];
                return (
                  <FadeIn key={r.title} dur={300}>
                    <Tap scale={0.985} onPress={() => {
                      if (r.type === 'Quran') router.push('/reader');
                      else if (r.type === 'Azkar') router.push({ pathname: '/session', params: { cat: r.title.split(' ')[0] === 'Morning' ? 'Morning' : r.title.startsWith('Before') ? 'Before Sleep' : 'Forgiveness' } });
                      else say(`Opening ${r.title}`);
                    }} style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} color={ink} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt style={{ fontSize: 15.5, fontWeight: 700 }}>{r.title}</Txt>
                        <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{r.sub}</Txt>
                      </View>
                      <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 11, backgroundColor: bg }}>
                        <Txt style={{ fontSize: 11.5, fontWeight: 700, color: ink }}>{r.tag}</Txt>
                      </View>
                    </Tap>
                  </FadeIn>
                );
              })}
            </View>
          </>
        )}
        {!!qq && !loading && res.length === 0 && (
          <View style={{ borderRadius: 26, backgroundColor: t.card, paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' }}>
            <Txt style={{ fontSize: 17, fontWeight: 700 }}>Nothing matched</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Try transliteration, like “istighfar”.</Txt>
          </View>
        )}
      </ScrollView>
    </Page>
  );
}
