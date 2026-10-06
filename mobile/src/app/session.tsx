import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { FadeIn, usePop } from '../components/motion';
import { buzz, Cta, Label, Ring, say, Sheet, Tap, Txt, UrduToggle, useBack } from '../components/ui';
import { adhkarCat, type Dhikr } from '../data/adhkar';
import { arNum } from '../data/content';
import { useUrdu } from '../lib/hooks';
import { attributionFor, useSurah } from '../lib/quran';
import { addAct, getState, rollDay, set, useApp } from '../state/store';
import { PaletteProvider, useT } from '../theme/ThemeProvider';
import { DARK, G, LIGHT, bgImage } from '../theme/tokens';

const NO_COUNTS: number[] = [];

/** Text size steps for adhkar (applied to Arabic, transliteration, translation and Urdu). */
export const AZ_SIZES = [0.8, 1, 1.2, 1.4, 1.65, 1.9];
const SIZE_NAMES = ['Small', 'Normal', 'Large', 'Larger', 'Huge', 'Largest'];
/** Session backgrounds: dark ones keep the dark palette, light ones switch text to dark ink. */
export const AZ_BGS: { k: string; base: string; grad?: string; dark: boolean }[] = [
  { k: 'Night', base: '#16171D', grad: G.session, dark: true },
  { k: 'Black', base: '#000000', dark: true },
  { k: 'Midnight', base: '#0E1424', grad: 'radial-gradient(120% 70% at 50% 0%, #22325A 0%, #0E1424 62%)', dark: true },
  { k: 'Forest', base: '#0E1C18', grad: 'radial-gradient(120% 70% at 50% 0%, #1F4136 0%, #0E1C18 62%)', dark: true },
  { k: 'Sepia', base: '#F5EDDC', dark: false },
  { k: 'White', base: '#FFFFFF', dark: false },
];
const Scale = createContext(1);

/** Arabic size steps down for longer adhkar so a page stays readable without endless scrolling. */
const arSize = (len: number) => (len < 40 ? 38 : len < 120 ? 31 : len < 300 ? 26 : 23);

function Verified({ src }: { src: string }) {
  const t = useT();
  return (
    <View style={{ alignItems: 'center', marginTop: 18 }}>
      <View style={{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 14, backgroundColor: 'rgba(94,184,122,0.14)' }}>
        <Txt style={{ fontSize: 12.5, fontWeight: 700, color: t.okTx, textAlign: 'center' }}>Verified · {src}</Txt>
      </View>
    </View>
  );
}

/** Quranic adhkar: text comes verbatim from Tanzil via the Quran cache, never from this file. */
function QuranBody({ d }: { d: Dhikr }) {
  const t = useT();
  const k = useContext(Scale);
  const q = d.q!;
  const { surah, error, loading, retry } = useSurah(q.s);
  const [urOn, urFlip] = useUrdu('az:' + d.id);
  if (!surah) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
        {loading && !error ? <ActivityIndicator color={t.acc} /> : (
          <>
            <Txt style={{ fontSize: 15, color: t.t3, textAlign: 'center' }}>Connect once to load this passage — it is saved for offline use after that.</Txt>
            <Cta label="Try again" height={44} size={14} kind="secondary" style={{ paddingHorizontal: 20 }} onPress={retry} />
          </>
        )}
      </View>
    );
  }
  const ayahs = surah.ayahs.filter(a => a.n >= q.a && a.n <= (q.b ?? q.a));
  const ar = ayahs.map(a => `${a.ar} ﴿${arNum(a.n)}﴾`).join(' ');
  const en = ayahs.map(a => a.en).filter(Boolean).join(' ');
  const ur = ayahs.map(a => a.ur).filter(Boolean).join(' ');
  const ref = `Quran ${q.s}:${q.a}${q.b && q.b !== q.a ? `–${q.b}` : ''}`;
  return (
    <>
      {q.a === 1 && surah.bismillah && <Txt ar style={{ fontSize: 24 * k, lineHeight: 44 * k, textAlign: 'center', color: t.gold }}>{surah.bismillah}</Txt>}
      <Txt ar style={{ fontWeight: 600, fontSize: arSize(ar.length) * k, lineHeight: arSize(ar.length) * k * 1.85, textAlign: 'center', color: t.txw, marginTop: 6 }}>{ar}</Txt>
      {!!en && <Txt style={{ fontSize: 16 * k, lineHeight: 25 * k, color: t.tx, textAlign: 'center', marginTop: 14 }}>{en}</Txt>}
      <Verified src={`${ref} · ${d.src}`} />
      {urOn && !!ur && <FadeIn dur={300}><Txt ur style={{ fontSize: 17 * k, lineHeight: 36 * k, color: t.t5, textAlign: 'center', marginTop: 10 }}>{ur}</Txt></FadeIn>}
      {!!ur && <View style={{ alignItems: 'center', marginTop: 12 }}><UrduToggle on={urOn} onPress={urFlip} /></View>}
      <Txt style={{ fontSize: 11, color: t.t4, textAlign: 'center', marginTop: 10 }}>{attributionFor(surah)}</Txt>
    </>
  );
}

function TextBody({ d }: { d: Dhikr }) {
  const t = useT();
  const k = useContext(Scale);
  const [urOn, urFlip] = useUrdu('az:' + d.id);
  const ar = d.ar ?? '';
  return (
    <>
      <Txt ar style={{ fontWeight: 600, fontSize: arSize(ar.length) * k, lineHeight: arSize(ar.length) * k * 1.85, textAlign: 'center', color: t.txw }}>{ar}</Txt>
      {!!d.tr && <Txt style={{ fontSize: 14.5 * k, lineHeight: 22 * k, color: t.t3, textAlign: 'center', marginTop: 16, fontStyle: 'italic' }}>{d.tr}</Txt>}
      {!!d.en && <Txt style={{ fontSize: 16.5 * k, lineHeight: 26 * k, color: t.tx, textAlign: 'center', marginTop: 10 }}>{d.en}</Txt>}
      <Verified src={d.src} />
      {urOn && !!d.ur && <FadeIn dur={300}><Txt ur style={{ fontSize: 17 * k, lineHeight: 36 * k, color: t.t5, textAlign: 'center', marginTop: 10 }}>{d.ur}</Txt></FadeIn>}
      {!!d.ur && <View style={{ alignItems: 'center', marginTop: 12 }}><UrduToggle on={urOn} onPress={urFlip} /></View>}
    </>
  );
}

function Page({ d, width, onTap, onHold }: { d: Dhikr; width: number; onTap: () => void; onHold: () => void }) {
  const t = useT();
  const k = useContext(Scale);
  return (
    <ScrollView style={{ width }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onTap} onLongPress={onHold} delayLongPress={550} accessibilityHint="Tap to count, hold to undo"
        style={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        {!!d.title && <Txt style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: t.acc, textAlign: 'center', marginBottom: 14 }}>{d.title.toUpperCase()}</Txt>}
        {d.q ? <QuranBody d={d} /> : <TextBody d={d} />}
        {!!d.note && <Txt style={{ fontSize: 13 * Math.min(k, 1.3), lineHeight: 19.5 * Math.min(k, 1.3), color: t.t4, textAlign: 'center', marginTop: 14 }}>{d.note}</Txt>}
      </Pressable>
    </ScrollView>
  );
}

/** Text size and background for adhkar, saved for every session. */
function ReadingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const size = useApp(s => s.azSize);
  const bg = useApp(s => s.azBg);
  const step = (dir: number) => { const n = Math.max(0, Math.min(AZ_SIZES.length - 1, size + dir)); buzz(5); set({ azSize: n }); };
  return (
    <Sheet open={open} onClose={onClose}>
      <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Reading settings</Txt>
      <Label style={{ marginTop: 20, marginBottom: 10 }}>TEXT SIZE</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Tap scale={0.9} onPress={() => step(-1)} accessibilityLabel="Smaller text" accessibilityState={{ disabled: size === 0 }}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center', opacity: size === 0 ? 0.4 : 1 }}>
          <Txt style={{ fontSize: 15, fontWeight: 800 }}>A</Txt>
        </Tap>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt ar style={{ fontSize: 26 * AZ_SIZES[size], lineHeight: 26 * AZ_SIZES[size] * 1.7, color: t.txw }}>سُبْحَانَ اللَّهِ</Txt>
          <Txt style={{ fontSize: 12.5, color: t.t2 }} accessibilityLabel={`Text size ${SIZE_NAMES[size]}`}>{SIZE_NAMES[size]}</Txt>
        </View>
        <Tap scale={0.9} onPress={() => step(1)} accessibilityLabel="Larger text" accessibilityState={{ disabled: size === AZ_SIZES.length - 1 }}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center', opacity: size === AZ_SIZES.length - 1 ? 0.4 : 1 }}>
          <Txt style={{ fontSize: 24, fontWeight: 800 }}>A</Txt>
        </Tap>
      </View>
      <Label style={{ marginTop: 22, marginBottom: 10 }}>BACKGROUND</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {AZ_BGS.map((b, i) => {
          const on = bg === i;
          return (
            <Tap key={b.k} scale={0.94} onPress={() => { buzz(5); set({ azBg: i }); }} accessibilityRole="radio" accessibilityLabel={`${b.k} background`} accessibilityState={{ checked: on }}
              style={{ alignItems: 'center', gap: 6, width: 72 }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: b.base, ...bgImage(b.grad), alignItems: 'center', justifyContent: 'center',
                boxShadow: on ? `0 0 0 2.5px ${t.acc}` : 'inset 0 0 0 1px rgba(127,127,140,0.35)' }}>
                <Txt ar style={{ fontSize: 18, color: b.dark ? '#FFFFFF' : '#0F1014' }}>ذِكْر</Txt>
              </View>
              <Txt style={{ fontSize: 12, fontWeight: 700, color: on ? t.acc : t.t2 }}>{b.k}</Txt>
            </Tap>
          );
        })}
      </View>
      <Cta label="Done" height={52} size={15} style={{ marginTop: 22 }} onPress={onClose} />
    </Sheet>
  );
}

function Session() {
  const t = useT();
  const k = AZ_SIZES[useApp(s => s.azSize)] ?? 1;
  const bgOpt = AZ_BGS[useApp(s => s.azBg)] ?? AZ_BGS[0];
  const [settings, setSettings] = useState(false);
  const back = useBack();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { cat: catKey = 'Morning', i: startAt } = useLocalSearchParams<{ cat?: string; i?: string }>();
  const cat = adhkarCat(catKey);
  const items = cat.items;
  const counts = useApp(s => s.az.c[cat.k] || NO_COUNTS);
  const firstOpen = () => {
    const want = Number(startAt);
    if (startAt != null && want >= 0 && want < items.length) return want;
    const k = items.findIndex((d, j) => (counts[j] || 0) < d.n);
    return k < 0 ? 0 : k;
  };
  const [i, setI] = useState(firstOpen);
  const [scale, pop] = usePop(0.94);
  const scroller = useRef<ScrollView>(null);
  const iRef = useRef(i);
  const advancing = useRef(false);
  /** Page a programmatic scroll is heading to; scroll events in between must not move the counter. */
  const heading = useRef<number | null>(null);

  useEffect(() => { rollDay(); }, []);
  useEffect(() => { requestAnimationFrame(() => scroller.current?.scrollTo({ x: iRef.current * width, animated: false })); }, [width]);

  const go = (k: number, animated = true) => {
    const n = Math.max(0, Math.min(items.length - 1, k));
    iRef.current = n; setI(n);
    heading.current = animated ? n : null;
    scroller.current?.scrollTo({ x: n * width, animated });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (heading.current != null) {
      if (Math.abs(x - heading.current * width) > 2) return;
      heading.current = null;
    }
    const k = Math.round(x / width);
    if (k !== iRef.current && k >= 0 && k < items.length) { iRef.current = k; setI(k); }
  };

  const setCount = (k: number, v: number) => set(s => {
    const c = (s.az.c[cat.k] || []).slice();
    while (c.length < items.length) c.push(0);
    c[k] = v;
    return { az: { ...s.az, c: { ...s.az.c, [cat.k]: c } } };
  });

  const tap = () => {
    const k = iRef.current;
    const d = items[k];
    const cur = (getState().az.c[cat.k] || [])[k] || 0;
    if (cur >= d.n || advancing.current) { if (cur >= d.n) say('Already complete · swipe to continue'); return; }
    pop();
    const nn = cur + 1;
    setCount(k, nn);
    addAct('d', 1);
    if (nn < d.n) { buzz(nn % 33 === 0 ? [20, 40, 20] : 8); return; }
    const all = getState().az.c[cat.k] || [];
    const nextOpen = items.findIndex((x, j) => j !== k && (all[j] || 0) < x.n);
    if (nextOpen < 0) {
      buzz([30, 60, 30, 60, 90]);
      addAct('s', 1);
      say(`${cat.k} adhkar complete · May Allah accept`);
      return;
    }
    buzz([16, 30, 16]);
    advancing.current = true;
    const target = items.findIndex((x, j) => j > k && (all[j] || 0) < x.n);
    setTimeout(() => { advancing.current = false; go(target >= 0 ? target : nextOpen); }, 380);
  };

  const undo = () => {
    const k = iRef.current;
    const cur = (getState().az.c[cat.k] || [])[k] || 0;
    if (!cur) return;
    setCount(k, cur - 1);
    addAct('d', -1);
    buzz([40]);
    say('Undid one count');
  };

  const d = items[i];
  const n = counts[i] || 0;
  const doneItems = items.filter((x, k) => (counts[k] || 0) >= x.n).length;
  const allDone = doneItems === items.length;
  const pct = (items.reduce((a, x, k) => a + Math.min(counts[k] || 0, x.n) / x.n, 0) / items.length) * 100;

  return (
    <Scale.Provider value={k}>
    <View style={{ flex: 1, ...bgImage(bgOpt.grad), backgroundColor: bgOpt.base }}>
      <StatusBar style={bgOpt.dark ? 'light' : 'dark'} />
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Tap onPress={() => { buzz(5); back(); }} accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={t.tx} />
        </Tap>
        <Txt style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{cat.k} Adhkar</Txt>
        <Txt style={{ fontSize: 13, fontWeight: 700, color: t.t2, paddingRight: 4 }}>{i + 1} / {items.length}</Txt>
        <Tap onPress={() => { buzz(5); setSettings(true); }} accessibilityLabel="Reading settings"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.ctl, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
          <Txt style={{ fontSize: 16, fontWeight: 800 }}>Aa</Txt>
        </Tap>
      </View>

      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} onScrollBeginDrag={() => { heading.current = null; }} scrollEventThrottle={32}
        style={{ flex: 1 }} contentOffset={{ x: i * width, y: 0 }}>
        {items.map((x, k) => <Page key={x.id + k} d={x} width={width} onTap={tap} onHold={undo} />)}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 6 }}>
        <Tap onPress={() => { buzz(5); go(i - 1); }} accessibilityLabel="Previous dhikr" accessibilityState={{ disabled: i === 0 }}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.ctl, alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 0.35 : 1 }}>
          <Icon name="back" color={t.tx} />
        </Tap>
        <Pressable onPress={tap} onLongPress={undo} delayLongPress={550} accessibilityRole="button" accessibilityLabel={`Count. ${n} of ${d.n}`} accessibilityHint="Tap to count, hold to undo">
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ring size={124} r={54} stroke={8} pct={Math.min(n, d.n) / d.n} track={t.ctl2} color={n >= d.n ? '#5EB87A' : t.acc}>
              <View style={{ alignItems: 'center' }}>
                {n >= d.n ? <Icon name="check" size={34} color="#5EB87A" /> : <Txt style={{ fontSize: 34, fontWeight: 800 }}>{n}</Txt>}
                <Txt style={{ fontSize: 12.5, color: t.t2 }}>{n >= d.n ? `${d.n} of ${d.n}` : `of ${d.n}`}</Txt>
              </View>
            </Ring>
          </Animated.View>
        </Pressable>
        <Tap onPress={() => { buzz(5); go(i + 1); }} accessibilityLabel="Next dhikr" accessibilityState={{ disabled: i === items.length - 1 }}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.ctl, alignItems: 'center', justifyContent: 'center', opacity: i === items.length - 1 ? 0.35 : 1 }}>
          <Icon name="chev" color={t.tx} />
        </Tap>
      </View>
      <Txt style={{ fontSize: 12.5, color: allDone ? t.okTx : t.t4, marginTop: 10, textAlign: 'center' }}>
        {allDone ? 'All complete today · May Allah accept' : 'Tap to count · hold to undo · swipe for next'}
      </Txt>
      <View style={{ marginTop: 12, marginHorizontal: 26, marginBottom: ins.bottom + 28 }}>
        <View style={{ height: 4, backgroundColor: t.sheetc, boxShadow: t.edge, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%`, ...bgImage(G.brandH) }} />
        </View>
        <Txt style={{ fontSize: 11.5, color: t.t4, marginTop: 6, textAlign: 'center' }}>{doneItems} of {items.length} complete today</Txt>
      </View>
      <ReadingSheet open={settings} onClose={() => setSettings(false)} />
    </View>
    </Scale.Provider>
  );
}

/** Dark palette for dark backgrounds, light palette (dark ink) for Sepia and White. */
export default function SessionScreen() {
  const dark = (AZ_BGS[useApp(s => s.azBg)] ?? AZ_BGS[0]).dark;
  return <PaletteProvider value={dark ? DARK : LIGHT}><Session /></PaletteProvider>;
}
