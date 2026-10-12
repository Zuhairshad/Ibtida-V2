import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LAUNCH_AYAT } from '../data/ayat';
import { HADITH } from '../data/content';
import { ayahRef, dayNum } from '../data/reminders';
import { useLang } from '../lib/i18n';
import { useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { bgImage } from '../theme/tokens';
import { useReducedMotion } from './motion';
import { Txt } from './ui';

type Item = { id: string; kind: 'ayah' | 'hadith'; ar: string; en: string; ur: string; src: string; srcUr: string };

const ADVANCE_MS = 9000;

const S = 'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const STAR = `<svg viewBox="0 0 100 100" fill="none"><rect x="20" y="20" width="60" height="60" stroke="currentColor" stroke-width="1.6"/><rect x="20" y="20" width="60" height="60" stroke="currentColor" stroke-width="1.6" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="22" stroke="currentColor" stroke-width="1.6"/><circle cx="50" cy="50" r="5" fill="currentColor"/></svg>`;
const BOOK = `<svg viewBox="0 0 24 24"><path d="M12 6.5C10 5 7.2 4.6 4 5v13c3.2-.4 6 0 8 1.5 2-1.5 4.8-1.9 8-1.5V5c-3.2-.4-6 0-8 1.5zM12 6.5v13" stroke-width="1.7" ${S}/></svg>`;
const QUOTE = `<svg viewBox="0 0 24 24"><path d="M10 7C7 8 5.5 10.2 5.5 13v4H10v-4.5H7.6C7.6 10.8 8.4 9.4 10 8.6zM18.5 7c-3 1-4.5 3.2-4.5 6v4h4.5v-4.5h-2.4c0-1.7.8-3.1 2.4-3.9z" stroke-width="1.5" ${S}/></svg>`;
const DIAMOND = '<svg viewBox="0 0 12 12"><path d="M6 1l5 5-5 5-5-5z" fill="currentColor"/></svg>';

/** Small ornaments drawn from the theme's accent: a mark beside the kicker, a star watermark, a diamond on the divider. */
function Mark({ xml, size, color, opacity = 1 }: { xml: string; size: number; color: string; opacity?: number }) {
  return <View style={{ opacity }}><SvgXml xml={xml} width={size} height={size} color={color} /></View>;
}

/** A short run of ayat and hadith for today, alternating, starting somewhere different each day. */
export function verseItems(day: Date): Item[] {
  const n = dayNum(day);
  const short = LAUNCH_AYAT.filter(a => a.ar.length <= 110 && a.en.length <= 170);
  const ayat = Array.from({ length: 3 }, (_, i) => short[(n + i) % short.length]);
  const hadith = Array.from({ length: HADITH.length }, (_, i) => HADITH[(n + i) % HADITH.length]);
  const out: Item[] = [];
  for (let i = 0; i < 3; i++) {
    const a = ayat[i];
    out.push({ id: `a${a.s}:${a.a}`, kind: 'ayah', ar: a.ar, en: a.en, ur: a.ur, src: ayahRef(a), srcUr: ayahRef(a, 'ur') });
    const h = hadith[i];
    out.push({ id: `h${h.src}`, kind: 'hadith', ar: h.ar, en: h.en, ur: h.ur, src: h.src, srcUr: h.src });
  }
  return out;
}

/**
 * Home's top strip: ayat and hadith with translations, one card at a time. A thin bar in the page
 * indicator shows when the next card arrives. It pauses while a finger is on it, and it does not
 * auto-advance for screen readers; with Reduce Motion on, cards change without sliding.
 */
export function VerseStrip({ day }: { day: Date }) {
  const { ur, t: tx } = useLang();
  const t = useT();
  const both = useApp(s => s.urduAll);
  const { width } = useWindowDimensions();
  const rm = useReducedMotion();
  const [sr, setSr] = useState(false);
  const cardW = Math.min(width - 49, 420);
  const step = cardW + 10;
  const n = dayNum(day);
  const items = useMemo(() => verseItems(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12)), [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const atRef = useRef(0);
  const ref = useRef<ScrollView>(null);
  const bar = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    // react-native-web reports a screen reader as always on, so only trust the check on a device.
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled().then(setSr).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setSr);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    bar.setValue(0);
    if (paused || sr || items.length < 2) return;
    const run = Animated.timing(bar, { toValue: 1, duration: ADVANCE_MS, easing: Easing.linear, useNativeDriver: true });
    run.start(({ finished }) => {
      if (finished) ref.current?.scrollTo({ x: ((atRef.current + 1) % items.length) * step, animated: !rm });
    });
    return () => run.stop();
  }, [at, paused, sr, rm, items.length, step, bar]);

  const resume = () => setPaused(false);

  return (
    <View>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast"
        contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 26 }}
        onTouchStart={() => setPaused(true)} onTouchEnd={resume} onTouchCancel={resume} onScrollEndDrag={resume}
        onScroll={e => { const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))); if (i !== atRef.current) { atRef.current = i; setAt(i); } }}
        scrollEventThrottle={32}>
        {items.map(v => {
          const line = ur ? v.ur : v.en;
          const kick = tx(v.kind === 'ayah' ? 'verseKick' : 'hadithKick');
          return (
            <View key={v.id} accessible accessibilityLabel={`${kick}. ${line}. ${ur ? v.srcUr : v.src}`}
              style={{ width: cardW, borderRadius: 34, borderCurve: 'continuous', padding: 22, overflow: 'hidden', backgroundColor: t.card, boxShadow: t.edge, ...bgImage(t.glass) }}>
              <View pointerEvents="none" style={{ position: 'absolute', bottom: -18, [ur ? 'left' : 'right']: -18 }}><Mark xml={STAR} size={104} color={t.acc} opacity={t.dark ? 0.1 : 0.08} /></View>
              <View style={{ flexDirection: ur ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: ur ? 'row-reverse' : 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.tabOn }}>
                    <Mark xml={v.kind === 'ayah' ? BOOK : QUOTE} size={15} color={t.acc} />
                  </View>
                  <Txt ur={ur} style={{ fontSize: ur ? 13 : 11, fontWeight: 700, letterSpacing: ur ? 0 : 1.1, color: t.acc }}>{kick}</Txt>
                </View>
                <Txt ur={ur} numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: t.t2 }}>{ur ? v.srcUr : v.src}</Txt>
              </View>
              <Txt ar numberOfLines={2} style={{ fontSize: 24, lineHeight: 44, color: t.tx, marginTop: 12, textAlign: 'right', writingDirection: 'rtl' }}>{v.ar}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
                <Mark xml={DIAMOND} size={7} color={t.acc} opacity={0.8} />
                <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
              </View>
              <Txt ur={ur} numberOfLines={ur || both ? 3 : 4} style={{ fontSize: ur ? 16 : 15.5, lineHeight: ur ? 31 : 22, color: t.t5, marginTop: 12, textAlign: ur ? 'right' : 'left' }}>{ur ? v.ur : `“${v.en}”`}</Txt>
              {!ur && both && <Txt ur numberOfLines={2} style={{ fontSize: 15, lineHeight: 29, color: t.t2, marginTop: 4, textAlign: 'right' }}>{v.ur}</Txt>}
            </View>
          );
        })}
      </ScrollView>
      <View accessibilityRole="progressbar" accessibilityLabel={tx('verseStrip')} aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={at + 1}
        style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: -12 }}>
        {items.map((_, i) => {
          const on = at === i;
          return (
            <View key={i} style={{ height: 5, width: on ? 26 : 5, borderRadius: 3, overflow: 'hidden', backgroundColor: on ? t.tabOn : t.t6 }}>
              {on && <Animated.View style={{ height: 5, width: 26, borderRadius: 3, backgroundColor: t.acc, transformOrigin: 'left', transform: [{ scaleX: paused || sr ? 1 : bar }] }} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}
