import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { FadeIn, Glow } from '../components/motion';
import { Chips, Label, Page, say, Tap, Txt, useBack } from '../components/ui';
import { ADHKAR, catMinutes } from '../data/adhkar';
import { RESULTS } from '../data/content';
import { parseRef, searchSurahs, SURAHS } from '../data/surahs';
import { useT } from '../theme/ThemeProvider';

type Result = { type: 'Quran' | 'Hadith' | 'Azkar'; title: string; sub: string; tag: string; cat?: string; i?: number };

/** Arabic without harakat and with plain alef, so "استغفار" matches "أَسْتَغْفِرُ". */
const plainAr = (s: string) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[ٱآأإ]/g, 'ا');
const plain = (s: string) => plainAr(s.toLowerCase()).replace(/[ʿʾ'’\-]/g, '');

/** Transliterated and everyday words people search a category by. */
const CAT_KEYS: Record<string, string> = {
  Morning: 'sabah subh fajr dawn', Evening: 'masa maghrib asr night', 'After Salah': 'prayer salat namaz tasbih fard',
  Protection: 'ruqyah evil eye safety hifz', Forgiveness: 'istighfar tawbah repentance maghfirah sins', Gratitude: 'shukr thanks hamd praise',
  'Before Sleep': 'sleep night nawm bed', Travel: 'safar journey trip car',
};

/** Every category and every dhikr in the adhkar collection, as searchable rows. */
const AZKAR_INDEX = ADHKAR.flatMap(c => [
  { r: { type: 'Azkar' as const, title: `${c.k} adhkar`, sub: `${c.items.length} adhkar · ${catMinutes(c)} min`, tag: 'Category', cat: c.k }, keys: plain(`${c.k} ${c.ar} ${CAT_KEYS[c.k] ?? ''}`) },
  ...c.items.map((d, i) => ({
    r: { type: (d.q ? 'Quran' : 'Hadith') as Result['type'], title: d.title || d.tr?.split(/[,.]/)[0] || c.k, sub: `${c.k} adhkar · ${d.src}`, tag: d.q ? 'Quran' : 'Sahih', cat: c.k, i },
    keys: plain(`${d.title ?? ''} ${d.tr ?? ''} ${d.en ?? ''} ${d.ar ?? ''} ${d.src} ${d.note ?? ''}`),
  })),
]);

/** Kalimat search across Quran, hadith and adhkar (transliteration + Arabic keys). */
export default function Search() {
  const t = useT();
  const router = useRouter();
  const back = useBack();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(0);
  const loading = false;
  const qq = q.trim().toLowerCase();
  const f = ['All', 'Quran', 'Hadith', 'Azkar'][filter];
  // Quran results carry a surah:ayah reference ("2:255") that opens the reader there.
  const ref = parseRef(qq);
  const quran: Result[] = !qq || (f !== 'All' && f !== 'Quran') ? [] : [
    ...(ref ? [{ type: 'Quran' as const, title: `${SURAHS[ref.s - 1].name} · ${ref.s}:${ref.a}`, sub: 'Open in the reader', tag: 'Ayah' }] : []),
    ...(qq.length >= 2 && !ref ? searchSurahs(qq).slice(0, 4).map(m => ({ type: 'Quran' as const, title: `Surah ${m.name} · ${m.n}:1`, sub: `${m.ayahs} ayat · ${m.place}`, tag: 'Surah' })) : []),
  ];
  const pq = plain(qq);
  const seen = new Set<string>();
  const azkar = !pq ? [] : AZKAR_INDEX.filter(x => (f === 'All' || x.r.type === f) && x.keys.includes(pq)).map(x => x.r)
    .filter(r => { const k = `${r.title}|${r.sub}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30);
  const res: Result[] = qq ? [...quran, ...RESULTS.filter(r => (f === 'All' || r.type === f) && plain(`${r.title} ${r.sub} ${r.keys}`).includes(pq)), ...azkar] : [];
  const tint: Record<string, [string, string, IconName]> = { Quran: [t.tMint, t.mint, 'book'], Hadith: [t.tBlue, t.peri, 'shield'], Azkar: [t.tAmb, t.acc, 'beads'] };
  return (
    <Page bottom={0}>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={t.tx} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge }}>
          <Icon name="search" color={t.t4} />
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Quran, hadith, azkar…" placeholderTextColor={t.t4} accessibilityLabel="Search" returnKeyType="search"
            style={{ outlineWidth: 0, flex: 1, minWidth: 0, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' }} />
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
                <Tap key={s} scale={0.95} onPress={() => setQ(s)} style={{ height: 42, paddingHorizontal: 15, borderRadius: 21, backgroundColor: t.card, boxShadow: t.edge, justifyContent: 'center' }}>
                  <Txt ar={/[؀-ۿ]/.test(s)} style={{ fontSize: 14, fontWeight: 600 }}>{s}</Txt>
                </Tap>
              ))}
            </View>
          </>
        )}
        {!!qq && loading && (
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map(k => <Glow key={k} dur={1200}><Animated.View style={{ height: 84, borderRadius: 24, backgroundColor: t.sunk, boxShadow: t.edge }} /></Glow>)}
          </View>
        )}
        {!!qq && !loading && res.length > 0 && (
          <>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 2, marginHorizontal: 6, marginBottom: 10 }}>{res.length} match{res.length === 1 ? '' : 'es'}</Txt>
            <View style={{ gap: 8 }}>
              {res.map((r, ri) => {
                const [bg, ink, ic] = tint[r.type];
                return (
                  <FadeIn key={`${r.title}-${ri}`} dur={300}>
                    <Tap scale={0.985} onPress={() => {
                      if (r.cat) { router.push({ pathname: '/session', params: { cat: r.cat, ...(r.i != null ? { i: String(r.i) } : {}) } }); return; }
                      const m = r.type === 'Quran' ? /(\d{1,3}):(\d{1,3})\s*$/.exec(r.title) : null;
                      if (m) router.push({ pathname: '/reader', params: { surah: m[1], ayah: m[2] } });
                      else if (r.type === 'Quran') router.push('/home/quran');
                      else say(`Opening ${r.title}`);
                    }} style={{ borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
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
          <View style={{ borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' }}>
            <Txt style={{ fontSize: 17, fontWeight: 700 }}>Nothing matched</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Try transliteration, like “istighfar”.</Txt>
          </View>
        )}
      </ScrollView>
    </Page>
  );
}
