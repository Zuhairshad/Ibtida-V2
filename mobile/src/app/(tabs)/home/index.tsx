import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, useWindowDimensions, View } from 'react-native';
import { DayStrip } from '../../../components/DayStrip';
import { Icon, MosqueLogo, type IconName } from '../../../components/Icon';
import { InsightSheet } from '../../../components/InsightSheet';
import { Breathe, FadeIn, PulseDot, Stars, useCountUp } from '../../../components/motion';
import { buzz, IconBtn, PillShortcut, say, SerifTitle, Tap, Txt, UrduToggle } from '../../../components/ui';
import { fmt, HADITH, IMPACT_TARGET, PH, type PrayerName } from '../../../data/content';
import { SURAHS, surahPct } from '../../../data/surahs';
import { firstName, fmtCountdown, usePrayerNow, useUrdu } from '../../../lib/hooks';
import { DOW, fmtTime, hijri, MON, qibla } from '../../../lib/prayer';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SkyLayer({ bg, on }: { bg: string; on: boolean }) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: on ? 1 : 0, duration: 1400, useNativeDriver: true }).start(); }, [on, v]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, ...bgImage(bg), opacity: v }} />;
}

export default function Home() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 49, 420);
  const { now, next } = usePrayerNow();
  const city = useApp(s => s.city);
  const streak = useApp(s => s.streak);
  const qLast = useApp(s => s.qLast);
  const [day, setDay] = useState(0);
  const [phase, setPhase] = useState<PrayerName | null>(null);
  const [car, setCar] = useState(0);
  const [had, setHad] = useState(0);
  const [insight, setInsight] = useState(false);
  const impact = useCountUp(IMPACT_TARGET);
  const [urOn, urFlip] = useUrdu('had' + had);
  const q = qibla(city);

  useEffect(() => {
    const id = setInterval(() => setHad(h => (h + 1) % HADITH.length), 7000);
    return () => clearInterval(id);
  }, []);

  const shownPhase = phase ?? next.phase;
  const frac = 1 - next.secs / next.span;
  const tPct = Math.max(0, Math.min(100, ((next.idx - 1 + frac) / 4) * 100));
  const h = HADITH[had];

  const quick: { title: string; sub: string; icon: IconName; tint: string; ink: string; go: () => void }[] = [
    { title: 'Prayer times', sub: `${next.name} at ${fmtTime(next.at)}`, icon: 'prayer', tint: t.tBlue, ink: t.peri, go: () => router.navigate('/prayer') },
    { title: 'Daily adhkar', sub: 'Evening · 8 min', icon: 'beads', tint: t.tAmb, ink: t.acc, go: () => router.push({ pathname: '/session', params: { cat: 'Evening' } }) },
    { title: 'Quran', sub: qLast ? `${SURAHS[qLast.s - 1].name} · ${surahPct(qLast.s, qLast.a)}%` : 'Start reading', icon: 'book', tint: t.tMint, ink: t.mint, go: () => router.push('/home/quran') },
    { title: 'Ibadah Lock', sub: 'Focus while you recite', icon: 'lock', tint: t.tLav, ink: t.lav, go: () => router.push('/focus-setup') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 10, paddingBottom: 120 + ins.bottom }} showsVerticalScrollIndicator={false}>
        <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ marginLeft: 12 }}><MosqueLogo size={28} /></View>
            <SerifTitle a="Salam," b={firstName()} style={{ marginTop: 2 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }}>
            <IconBtn name="search" label="Search" onPress={() => router.push('/search')} />
            <IconBtn name="bell" label="Notifications" dot onPress={() => router.push('/profile/notifications')} />
          </View>
        </FadeIn>
        <FadeIn delay={40} style={{ paddingTop: 10, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="spark" size={12} color={t.acc} />
          <Txt style={{ fontSize: 13.5, color: t.t2, flexShrink: 1 }} numberOfLines={1}>
            {hijri(now)} <Txt style={{ color: t.t4 }}>·</Txt> {city.name}
          </Txt>
        </FadeIn>

        <FadeIn delay={80} style={{ paddingTop: 18, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>
          <DayStrip count={5} value={day} base={now} onChange={i => {
            setDay(i);
            if (i !== 0) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); say(`Showing times for ${DOW[d.getDay()][0]}${DOW[d.getDay()].slice(1).toLowerCase()} ${d.getDate()}`); }
          }} />
          <Tap onPress={() => router.push('/adhkar/progress')} accessibilityLabel="Calendar and progress"
            style={{ width: 64, flex: 1, maxWidth: 64, borderRadius: 30, backgroundColor: t.sunk, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="cal" color={t.tx} />
            <Txt style={{ fontSize: 11.5, fontWeight: 600, color: t.t2 }}>{MON[now.getMonth()]}</Txt>
          </Tap>
        </FadeIn>

        <FadeIn delay={120} style={{ paddingTop: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          <PillShortcut icon="compass" kicker="QIBLA" title={`${q.deg}° ${q.dir}`} onPress={() => router.navigate({ pathname: '/prayer', params: { qibla: '1' } })} />
          <PillShortcut icon="book" kicker="KALIMAT" title="Search" onPress={() => router.push('/search')} />
        </FadeIn>

        <FadeIn delay={160} dur={550}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + 10} decelerationRate="fast"
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, marginTop: 14 }}
            onScroll={e => { const i = Math.round(e.nativeEvent.contentOffset.x / (cardW + 10)); if (i !== car) setCar(i); }}
            scrollEventThrottle={32}>
            {/* Prayer timeline card */}
            <Tap scale={0.985} onPress={() => router.navigate('/prayer')} accessibilityLabel={`Next prayer ${next.name} in ${fmtCountdown(next.secs)}`}
              style={{ width: cardW, height: 402, borderRadius: 36, overflow: 'hidden' }}>
              {PH.map(p => <SkyLayer key={p} bg={G.sky[p]} on={shownPhase === p} />)}
              <Breathe bg={G.glowWarm} style={{ width: 220, height: 220, right: -60, top: 40 }} dur={9000} />
              <Breathe bg={G.glowViolet} style={{ width: 260, height: 260, left: -90, bottom: -40 }} dur={14000} />
              <Stars />
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', ...bgImage(G.skyFade) }} />
              <View style={{ position: 'absolute', left: 24, right: 24, top: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name="pin" color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 11.5, letterSpacing: 0.7, color: 'rgba(255,255,255,0.8)' }}>BASED ON YOUR LOCATION</Txt>
                  <Txt style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: '#FFFFFF' }}>Prayer timeline</Txt>
                </View>
                <Icon name="chev" color="#FFFFFF" />
              </View>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 108 }}>
                <Txt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.96, color: '#FFFFFF' }}>NEXT PRAYER</Txt>
                <Txt style={{ fontSize: 34, fontWeight: 800, lineHeight: 37, letterSpacing: -0.7, marginTop: 8, color: '#FFFFFF' }}>
                  {next.name} begins in{'\n'}{fmtCountdown(next.secs)}
                </Txt>
              </View>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 28 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 16 }}>
                  <View style={{ position: 'absolute', left: 6, right: 6, top: 7, height: 2, backgroundColor: 'rgba(255,255,255,0.22)' }} />
                  <View style={{ position: 'absolute', left: 6, top: 7, height: 2, width: `${tPct}%`, backgroundColor: t.dark ? t.acc : '#F2A65A' }} />
                  {PH.map((p, i) => {
                    const cur = i === next.idx;
                    const size = cur ? 16 : 12;
                    const node = (
                      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: i < next.idx ? '#F2A65A' : cur ? '#FFFFFF' : 'rgba(255,255,255,0.3)', borderWidth: 2, borderColor: i <= next.idx ? '#F2A65A' : 'transparent' }} />
                    );
                    return (
                      <Tap key={p} scale={0.85} hitSlop={14} accessibilityLabel={`Show ${p} sky`} onPress={() => { buzz(5); setPhase(p); }}>
                        {cur ? <PulseDot size={16} color="#FFFFFF" borderColor="#F2A65A" /> : node}
                      </Tap>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
                  {PH.map(p => <Txt key={p} style={{ fontSize: 11.5, fontWeight: 600, color: shownPhase === p ? '#FFFFFF' : 'rgba(255,255,255,0.72)' }}>{p}</Txt>)}
                </View>
              </View>
            </Tap>

            {/* Daily insight card */}
            <Tap scale={0.985} onPress={() => { buzz(6); setInsight(true); }} accessibilityLabel="Open daily insight"
              style={{ width: cardW, height: 402, borderRadius: 36, overflow: 'hidden', padding: 24, ...bgImage(G.insight) }}>
              <Breathe bg={G.glowGold} style={{ width: 240, height: 240, right: -70, bottom: -60 }} dur={11000} />
              <Txt style={{ fontSize: 11.5, letterSpacing: 0.7, color: 'rgba(255,255,255,0.8)' }}>YOUR CONSISTENCY</Txt>
              <Txt style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: '#FFFFFF' }}>Daily insight</Txt>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 28 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="flame" size={34} color={FIXED.orangeA} />
                  <Txt style={{ fontSize: 54, fontWeight: 800, letterSpacing: -1.6, lineHeight: 58, color: '#FFFFFF' }}>{streak}</Txt>
                  <Txt style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 14 }}>day streak</Txt>
                </View>
                <Txt style={{ fontSize: 15, lineHeight: 22.5, color: 'rgba(255,255,255,0.88)', marginTop: 12 }}>7-Day Warrior earned. {Math.max(0, 14 - streak)} more days to reach 2-Week Steadfast.</Txt>
                <View style={{ alignSelf: 'flex-start', marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <Txt style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>Open insight</Txt>
                </View>
              </View>
            </Tap>

            {/* Community impact card */}
            <Tap scale={0.985} onPress={() => router.navigate('/community')} accessibilityLabel="Community impact"
              style={{ width: cardW, height: 402, borderRadius: 36, overflow: 'hidden', padding: 24, ...bgImage(G.ummah) }}>
              <Txt style={{ fontSize: 11.5, letterSpacing: 0.7, color: 'rgba(255,255,255,0.8)' }}>THE UMMAH TODAY</Txt>
              <Txt style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: '#FFFFFF' }}>Community impact</Txt>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 28 }}>
                <Txt style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.4, lineHeight: 50, color: '#FFFFFF' }}>{fmt(impact)}</Txt>
                <Txt style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 10 }}>dhikr counted today · +18,421 this hour</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 56, marginTop: 18 }}>
                  {[30, 42, 38, 55, 48, 62, 58, 70, 66, 80, 76, 94].map((hh, i) => (
                    <View key={i} style={{ flex: 1, borderRadius: 4, height: `${hh}%`, backgroundColor: `rgba(255,255,255,${(0.3 + i * 0.05).toFixed(2)})` }} />
                  ))}
                </View>
              </View>
            </Tap>
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[0, 1, 2].map(i => <View key={i} style={{ height: 6, width: car === i ? 20 : 6, borderRadius: 3, backgroundColor: car === i ? t.acc : t.ctl4 }} />)}
          </View>
        </FadeIn>

        <FadeIn delay={220} style={{ paddingTop: 22, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {quick.map(qk => (
            <Tap key={qk.title} scale={0.96} onPress={() => { buzz(6); qk.go(); }}
              style={{ width: (width - 42) / 2, borderRadius: 28, backgroundColor: t.card, padding: 18 }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: qk.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={qk.icon} color={qk.ink} />
              </View>
              <Txt style={{ fontSize: 16, fontWeight: 700, marginTop: 14 }}>{qk.title}</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{qk.sub}</Txt>
            </Tap>
          ))}
        </FadeIn>

        <FadeIn delay={260} style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <View style={{ borderRadius: 30, backgroundColor: t.card, padding: 22, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.t2 }}>HADITH OF THE MOMENT</Txt>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {HADITH.map((_, i) => <View key={i} style={{ width: had === i ? 16 : 5, height: 5, borderRadius: 3, backgroundColor: had === i ? t.acc : t.ctl4 }} />)}
              </View>
            </View>
            <FadeIn key={had} dur={600} style={{ minHeight: 190 }}>
              <Txt ar style={{ fontSize: 25, lineHeight: 44, color: t.gold, marginTop: 16, textAlign: 'right' }}>{h.ar}</Txt>
              <Txt style={{ fontSize: 15.5, lineHeight: 24, color: t.t5, marginTop: 10 }}>“{h.en}”</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t4, marginTop: 10 }}>{h.src}</Txt>
              {urOn && (
                <FadeIn dur={300} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.line }}>
                  <Txt ur style={{ fontSize: 16, lineHeight: 34, color: t.t5, textAlign: 'right' }}>{h.ur}</Txt>
                </FadeIn>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <UrduToggle on={urOn} onPress={urFlip} />
              </View>
            </FadeIn>
          </View>
        </FadeIn>
      </ScrollView>
      <InsightSheet open={insight} onClose={() => setInsight(false)} impact={impact} />
    </View>
  );
}
