import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { FadeIn, Glow } from '../components/motion';
import { BackBar, buzz, Cta, say, Seg, Sheet, Switch, Tap, Txt, UrduToggle } from '../components/ui';
import { juzOf, SURAHS } from '../data/surahs';
import { useUrdu } from '../lib/hooks';
import { ATTRIBUTION, useSurah, type Ayah as AyahT, type Surah } from '../lib/quran';
import { getState, markKey, recordReading, set, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';

const THEMES: [string, string][] = [['#16171D', '#22232A'], ['#0B0C10', '#16171C'], ['#211C15', '#2E2720']];

const int = (v: string | string[] | undefined) => {
  const x = parseInt(Array.isArray(v) ? v[0] : v ?? '', 10);
  return Number.isFinite(x) ? x : NaN;
};

const AyahCard = memo(function AyahCard({ s, ayah, card }: { s: number; ayah: AyahT; card: string }) {
  const t = useT();
  const ref = markKey(s, ayah.n);
  const marked = useApp(st => !!st.marks[ref]);
  const showTr = useApp(st => st.showTr);
  const fontSize = useApp(st => st.fontSize);
  const [urOn, urFlip] = useUrdu(`q:${ref}`);
  return (
    <View style={{ borderRadius: 28, backgroundColor: card, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(242,166,90,0.12)' }}>
          <Txt style={{ fontSize: 12.5, fontWeight: 800, color: t.acc }}>{ref}</Txt>
        </View>
        {!!ayah.ur && <UrduToggle on={urOn} onPress={urFlip} />}
        <Tap scale={0.9} accessibilityLabel={marked ? `Remove bookmark ${ref}` : `Bookmark ${ref}`} accessibilityState={{ checked: marked }}
          onPress={() => {
            buzz(6);
            set(st => {
              const marks = { ...st.marks };
              if (marks[ref]) delete marks[ref]; else marks[ref] = true;
              return { marks };
            });
            say(marked ? 'Bookmark removed' : `Bookmarked ${ref}`);
          }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={marked ? 'bookmarkF' : 'bookmark'} color={marked ? t.acc : t.t2} />
        </Tap>
      </View>
      <Txt ar selectable accessibilityLanguage="ar" style={{ marginTop: 14, fontSize, lineHeight: Math.round(fontSize * 1.85), color: '#F4F1EA', textAlign: 'right' }}>
        {ayah.ar}
      </Txt>
      {showTr && !!ayah.en && <Txt selectable style={{ fontSize: 14.5, lineHeight: 23, color: t.t3, marginTop: 12 }}>{ayah.en}</Txt>}
      {urOn && !!ayah.ur && (
        <FadeIn dur={300}>
          <Txt ur selectable accessibilityLanguage="ur" style={{ fontSize: 16, lineHeight: 40, color: t.t3, textAlign: 'right', marginTop: 10 }}>{ayah.ur}</Txt>
        </FadeIn>
      )}
    </View>
  );
});

function SurahHead({ surah, card }: { surah: Surah; card: string }) {
  const t = useT();
  const fontSize = useApp(st => st.fontSize);
  return (
    <View style={{ borderRadius: 28, backgroundColor: card, paddingVertical: 20, paddingHorizontal: 18, alignItems: 'center' }}>
      <Txt ar style={{ fontSize: 30, lineHeight: 52, color: t.gold }}>{surah.arName}</Txt>
      <Txt style={{ fontSize: 13, color: t.t2, marginTop: 2 }}>{surah.count} ayat · {surah.place}</Txt>
      {surah.bismillah && (
        <Txt ar accessibilityLanguage="ar" style={{ fontSize: Math.round(fontSize * 0.9), lineHeight: Math.round(fontSize * 1.7), color: '#F4F1EA', marginTop: 12, textAlign: 'center' }}>
          {surah.bismillah}
        </Txt>
      )}
    </View>
  );
}

const Gap = () => <View style={{ height: 12 }} />;

function Skeleton({ card }: { card: string }) {
  const t = useT();
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading surah">
      {[0, 1, 2].map(k => (
        <Glow key={k} dur={1200}>
          <Animated.View style={{ borderRadius: 28, backgroundColor: card, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: 54, height: 28, borderRadius: 12, backgroundColor: t.sunk }} />
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.sunk }} />
            </View>
            <View style={{ height: 22, borderRadius: 8, backgroundColor: t.sunk, marginLeft: 30 }} />
            <View style={{ height: 22, borderRadius: 8, backgroundColor: t.sunk, marginLeft: 90 }} />
            <View style={{ height: 12, borderRadius: 6, backgroundColor: t.sunk, marginRight: 40, marginTop: 6 }} />
          </Animated.View>
        </Glow>
      ))}
    </View>
  );
}

function Reader() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const fallback = getState().qLast;
  const pS = int(params.surah);
  const s = pS >= 1 && pS <= 114 ? pS : fallback?.s ?? 1;
  const meta = SURAHS[s - 1];
  const pA = int(params.ayah);
  const startAyah = pA >= 1 && pA <= meta.ayahs ? pA : !Number.isFinite(pS) && fallback?.s === s ? fallback.a : 1;

  const rTheme = useApp(st => st.rTheme);
  const fontSize = useApp(st => st.fontSize);
  const showTr = useApp(st => st.showTr);
  const urduAll = useApp(st => st.urduAll);
  const [sheet, setSheet] = useState(false);
  const [bg, card] = THEMES[rTheme] ?? THEMES[0];
  const { surah, loading, error, offline, retry } = useSurah(s);
  const [current, setCurrent] = useState(startAyah);

  const listRef = useRef<FlatList<AyahT>>(null);
  const ready = useRef(startAyah <= 1);
  const tries = useRef(0);
  const saveT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sRef = useRef(s);
  sRef.current = s;

  // Jump to the requested ayah once the text is on screen.
  useEffect(() => {
    if (!surah || ready.current) return;
    const id = setTimeout(() => {
      tries.current = 0;
      listRef.current?.scrollToIndex({ index: startAyah - 1, animated: false, viewPosition: 0 });
      setTimeout(() => { ready.current = true; }, 1500);
    }, 120);
    return () => clearTimeout(id);
  }, [surah, startAyah]);

  useEffect(() => { recordReading(s, startAyah); }, [s, startAyah]);
  useEffect(() => () => clearTimeout(saveT.current), []);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken<AyahT>[] }) => {
    if (!ready.current || viewableItems.length === 0) return;
    const items = viewableItems.map(v => v.item).filter(Boolean);
    if (!items.length) return;
    const sur = sRef.current;
    const total = SURAHS[sur - 1].ayahs;
    const a = items.some(i => i.n === total) ? total : items[0].n;
    setCurrent(a);
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => recordReading(sur, a), 600);
  }).current;

  // The target row isn't rendered yet: jump near it using the measured average height, then retry.
  // Before any row has been measured the average is 0, so just wait for layout instead of giving up.
  const onScrollFail = useCallback((info: { index: number; averageItemLength: number }) => {
    if (tries.current++ > 24) { ready.current = true; return; }
    if (info.averageItemLength > 0) listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
    setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0 }), 150);
  }, []);

  const juz = surah?.ayahs[current - 1]?.juz || juzOf(s, current);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: ins.top + 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <BackBar right={
          <Pressable onPress={() => { buzz(6); setSheet(true); }} accessibilityLabel="Reading settings" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 16, fontWeight: 800 }}>Aa</Txt>
          </Pressable>
        } />
        <View pointerEvents="none" style={{ position: 'absolute', left: 60, right: 60, top: ins.top + 6, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Txt numberOfLines={1} style={{ fontSize: 16, fontWeight: 700 }}>{meta.name}</Txt>
          <Txt style={{ fontSize: 12, color: t.t2 }}>Juz {juz} · {surah?.place ?? meta.place}{offline && surah ? ' · offline' : ''}</Txt>
        </View>
      </View>

      {surah ? (
        <FlatList
          ref={listRef}
          data={surah.ayahs}
          keyExtractor={a => String(a.n)}
          renderItem={({ item }) => <AyahCard s={s} ayah={item} card={card} />}
          extraData={card}
          contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 30 }}
          ItemSeparatorComponent={Gap}
          ListHeaderComponent={<View style={{ marginBottom: 12 }}><SurahHead surah={surah} card={card} /></View>}
          ListFooterComponent={
            <Txt style={{ fontSize: 11.5, lineHeight: 17, color: t.t4, textAlign: 'center', marginTop: 10, paddingHorizontal: 12 }}>{ATTRIBUTION}</Txt>
          }
          initialNumToRender={Math.min(Math.max(8, startAyah + 2), 30)}
          maxToRenderPerBatch={8}
          windowSize={9}
          onScrollToIndexFailed={onScrollFail}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          {loading || !error ? <Skeleton card={card} /> : (
            <FadeIn>
              <View accessibilityRole="alert" style={{ borderRadius: 28, backgroundColor: card, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
                <Icon name="book" color={t.acc} />
                <Txt style={{ fontSize: 17, fontWeight: 700, marginTop: 10, textAlign: 'center' }}>Couldn’t load Surah {meta.name}</Txt>
                <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.t2, marginTop: 6, textAlign: 'center' }}>
                  {error?.kind === 'timeout' ? 'The connection timed out.' : 'Check your connection and try again.'} Surahs you’ve opened before still work offline.
                </Txt>
                <Cta label="Try again" height={50} size={16} style={{ alignSelf: 'stretch', marginTop: 18 }} onPress={() => { buzz(6); retry(); }} />
              </View>
            </FadeIn>
          )}
        </View>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Reading settings</Txt>
        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Txt style={{ fontSize: 15, fontWeight: 700 }}>Arabic size</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{fontSize} pt</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {([['Smaller', 14, -2], ['Larger', 20, 2]] as const).map(([l, fs, d]) => (
              <Tap key={l} scale={0.9} accessibilityLabel={l} onPress={() => set(st => ({ fontSize: Math.max(22, Math.min(44, st.fontSize + d)) }))}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: fs, fontWeight: 800, color: '#FFFFFF' }}>A</Txt>
              </Tap>
            ))}
          </View>
        </View>
        <View style={{ marginTop: 10, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt style={{ fontSize: 15, fontWeight: 700 }}>Show translation</Txt>
          <Switch on={showTr} label="Show translation" onToggle={() => set({ showTr: !showTr })} />
        </View>
        <View style={{ marginTop: 10, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 15, fontWeight: 700 }}>Urdu translation</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>Show under every verse and hadith</Txt>
          </View>
          <Switch on={urduAll} label="Urdu translation for all" onToggle={() => { set({ urduAll: !urduAll, urdu: {} }); say(`Urdu translation ${urduAll ? 'hidden' : 'shown'} everywhere`); }} />
        </View>
        <View style={{ marginTop: 10 }}>
          <Seg labels={['Night', 'Midnight', 'Sepia']} value={rTheme} onChange={i => set({ rTheme: i })} height={44} radius={20} inner={16} bg={t.sheetc} size={14} />
        </View>
        <Txt style={{ fontSize: 11.5, lineHeight: 17, color: t.t4, marginTop: 14, textAlign: 'center' }}>{ATTRIBUTION}</Txt>
      </Sheet>
    </View>
  );
}

export default function ReaderScreen() {
  return <Immersive><Reader /></Immersive>;
}
