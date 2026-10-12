import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, useWindowDimensions, View } from 'react-native';
import { LAUNCH_AYAT } from '../data/ayat';
import { HADITH } from '../data/content';
import { ayahRef, dayNum } from '../data/reminders';
import { useLang } from '../lib/i18n';
import { useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { useReducedMotion } from './motion';
import { Txt } from './ui';

type Item = { id: string; kind: 'ayah' | 'hadith'; ar: string; en: string; ur: string; src: string; srcUr: string };

const ADVANCE_MS = 9000;
const PAUSE_MS = 30_000;

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
 * Home's top strip: ayat and hadith with translations, one card at a time. It drifts to the next card
 * slowly, but never for someone who has turned off motion or uses a screen reader, and it stays put for
 * a while after the person touches it.
 */
export function VerseStrip({ day }: { day: Date }) {
  const t = useT();
  const { ur, t: tx } = useLang();
  const both = useApp(s => s.urduAll);
  const { width } = useWindowDimensions();
  const rm = useReducedMotion();
  const [sr, setSr] = useState(false);
  const cardW = Math.min(width - 49, 420);
  const step = cardW + 10;
  const n = dayNum(day);
  const items = useMemo(() => verseItems(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12)), [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [at, setAt] = useState(0);
  const atRef = useRef(0);
  const hold = useRef(0);
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setSr).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setSr);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (rm || sr) return;
    const id = setInterval(() => {
      if (Date.now() < hold.current) return;
      ref.current?.scrollTo({ x: ((atRef.current + 1) % items.length) * step, animated: true });
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [rm, sr, items.length, step]);

  return (
    <View accessibilityRole="summary" accessibilityLabel={tx('verseStrip')}>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast"
        contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
        onScrollBeginDrag={() => { hold.current = Date.now() + PAUSE_MS; }}
        onScroll={e => { const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))); if (i !== atRef.current) { atRef.current = i; setAt(i); } }}
        scrollEventThrottle={32}>
        {items.map(v => {
          const line = ur ? v.ur : v.en;
          return (
            <View key={v.id} accessible accessibilityLabel={`${tx(v.kind === 'ayah' ? 'verseKick' : 'hadithKick')}. ${line}. ${ur ? v.srcUr : v.src}`}
              style={{ width: cardW, borderRadius: 30, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
              <View style={{ flexDirection: ur ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Txt ur={ur} style={{ fontSize: ur ? 13 : 11, fontWeight: 700, letterSpacing: ur ? 0 : 0.9, color: t.acc }}>{tx(v.kind === 'ayah' ? 'verseKick' : 'hadithKick')}</Txt>
                <Txt ur={ur} numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: t.t3 }}>{ur ? v.srcUr : v.src}</Txt>
              </View>
              <Txt ar numberOfLines={2} style={{ fontSize: 22, lineHeight: 40, color: t.gold, marginTop: 8, textAlign: 'right', writingDirection: 'rtl' }}>{v.ar}</Txt>
              <Txt ur={ur} numberOfLines={ur || both ? 3 : 4} style={{ fontSize: ur ? 15.5 : 14.5, lineHeight: ur ? 30 : 21, color: t.t5, marginTop: 6, textAlign: ur ? 'right' : 'left' }}>{ur ? `“${v.ur}”` : `“${v.en}”`}</Txt>
              {!ur && both && <Txt ur numberOfLines={2} style={{ fontSize: 14.5, lineHeight: 28, color: t.t3, marginTop: 4, textAlign: 'right' }}>{v.ur}</Txt>}
            </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {items.map((_, i) => <View key={i} style={{ height: 5, width: at === i ? 16 : 5, borderRadius: 3, backgroundColor: at === i ? t.acc : t.ctl4 }} />)}
      </View>
    </View>
  );
}
