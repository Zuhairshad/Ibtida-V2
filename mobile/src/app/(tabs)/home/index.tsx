import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, useWindowDimensions, View } from 'react-native';
import { DailyOverview } from '../../../components/DailyOverview';
import { InspirationCard } from '../../../components/InspirationCard';
import { VerseStrip } from '../../../components/VerseStrip';
import { QuickTile3D, type TileArt } from '../../../components/QuickTile3D';
import { DayStrip } from '../../../components/DayStrip';
import { Icon, MosqueLogo, type IconName } from '../../../components/Icon';
import { InsightSheet } from '../../../components/InsightSheet';
import { Breathe, FadeIn, PulseDot, Stars, useCountUp } from '../../../components/motion';
import { buzz, IconBtn, PillShortcut, say, SerifTitle, Tap, Txt } from '../../../components/ui';
import { HourBars } from '../../../components/community';
import { adhkarCat, catMinutes } from '../../../data/adhkar';
import { fmt, PH, type PrayerName } from '../../../data/content';
import { useLive } from '../../../lib/live';
import { SURAHS, surahPct } from '../../../data/surahs';
import { fmtCountdown, usePrayerNow } from '../../../lib/hooks';
import { adhkarCatName, countdownText, dirUr, dowWord, hijriText, iso, monLabel, prayerName, streakNote, useFirstName, useLang } from '../../../lib/i18n';
import { ltr } from '../../../data/reminders';
import { fmtTime, jamaatAt, qibla } from '../../../lib/prayer';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SkyLayer({ bg, on }: { bg: string; on: boolean }) {
  const v = useState(() => new Animated.Value(on ? 1 : 0))[0];
  useEffect(() => { Animated.timing(v, { toValue: on ? 1 : 0, duration: 1400, useNativeDriver: true }).start(); }, [on, v]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, ...bgImage(bg), opacity: v }} />;
}

export default function Home() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 49, 420);
  const { now, next, times } = usePrayerNow();
  const city = useApp(s => s.city);
  const streak = useApp(s => s.streak);
  const qLast = useApp(s => s.qLast);
  const intents = useApp(s => s.intents);
  const jamaat = useApp(s => s.jamaat);
  const name = useFirstName();
  const { lang, ur, t: tx } = useLang();
  const nextJ = jamaatAt(jamaat, next.name, next.at);
  const [day, setDay] = useState(0);
  const [phase, setPhase] = useState<PrayerName | null>(null);
  const [car, setCar] = useState(0);
  const [insight, setInsight] = useState(false);
  const ummah = useLive(l => (l.on ? l.ummah : null));
  const hours = useLive(l => (l.on ? l.hours : null));
  const impact = useCountUp(ummah ? ummah.today : 0);
  const nowCat = adhkarCat(now >= times.Isha || now < times.Fajr ? 'Before Sleep' : now >= times.Asr ? 'Evening' : 'Morning');
  const q = qibla(city);
  const start = ur ? 'right' : 'left';
  const sa = ur ? 'right' : undefined;

  const shownPhase = phase ?? next.phase;
  const frac = 1 - next.secs / next.span;
  const tPct = Math.max(0, Math.min(100, ((next.idx - 1 + frac) / 4) * 100));

  const quick: { title: string; sub: string; icon: IconName; art: TileArt; tint: string; ink: string; go: () => void }[] = [
    { title: tx('prayerTimes'), sub: `${prayerName(lang, next.name)} · ${ur ? ltr(fmtTime(next.at)) : fmtTime(next.at)}`, icon: 'prayer', art: 'mat', tint: t.tBlue, ink: t.peri, go: () => router.navigate('/prayer') },
    { title: tx('dailyAdhkar'), sub: `${adhkarCatName(lang, nowCat.k)} · ${tx('minutes', { n: String(catMinutes(nowCat)) })}`, icon: 'beads', art: 'beads', tint: t.tAmb, ink: t.acc, go: () => router.push({ pathname: '/session', params: { cat: nowCat.k } }) },
    { title: tx('quran'), sub: qLast ? `${SURAHS[qLast.s - 1].name} · ${surahPct(qLast.s, qLast.a)}%` : tx('startReading'), icon: 'book', art: 'quran', tint: t.tMint, ink: t.mint, go: () => router.push('/home/quran') },
    { title: tx('ibadahLock'), sub: tx('focusSub'), icon: 'lock', art: 'lock', tint: t.tLav, ink: t.lav, go: () => router.push('/focus-setup') },
  ];
  // Same order as the onboarding intents (prayer, adhkar, Quran, focus): picked ones come first.
  const ordered = quick.map((q, i) => ({ q, i })).sort((a, b) => Number(!!intents[b.i]) - Number(!!intents[a.i]) || a.i - b.i).map(x => x.q);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {!!t.wash && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420, ...bgImage(t.wash) }} />}
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 10, paddingBottom: 120 + ins.bottom }} showsVerticalScrollIndicator={false}>
        <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ marginLeft: 12 }}><MosqueLogo size={28} /></View>
            {ur ? (
              <View accessibilityRole="header" accessibilityLabel={`${tx('greet')} ${name}`} style={{ flexDirection: 'row-reverse', justifyContent: 'flex-end', alignItems: 'baseline', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                <Txt ur style={{ fontSize: 26, lineHeight: 54 }}>{tx('greet')}</Txt>
                <Txt serif style={{ fontSize: 38, lineHeight: 46, color: t.t6 }} numberOfLines={1}>{iso(name)}</Txt>
              </View>
            ) : <SerifTitle a={tx('greet')} b={name} style={{ marginTop: 2 }} />}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }}>
            <IconBtn name="search" label={tx('search')} onPress={() => router.push('/search')} />
            <IconBtn name="bell" label={tx('notifications')} dot onPress={() => router.push('/profile/notifications')} />
          </View>
        </FadeIn>
        <FadeIn delay={40} style={{ paddingTop: 10, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="spark" size={12} color={t.acc} />
          <Txt ur={ur} style={{ fontSize: 13.5, color: t.t2, flexShrink: 1 }} numberOfLines={1}>
            {hijriText(lang, now)} <Txt ur={ur} style={{ color: t.t4 }}>·</Txt> {ur ? iso(city.name) : city.name}
          </Txt>
        </FadeIn>

        <FadeIn delay={60} style={{ paddingTop: 14 }}>
          <VerseStrip day={now} />
        </FadeIn>

        <FadeIn delay={80} style={{ paddingTop: 18, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>
          <DayStrip count={5} value={day} base={now} onChange={i => {
            setDay(i);
            if (i !== 0) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); say(tx('showingTimes', { d: `${dowWord(lang, d.getDay())} ${d.getDate()}` })); }
          }} />
          <Tap onPress={() => router.push('/adhkar/progress')} accessibilityLabel={tx('calendarProgress')}
            style={{ width: 64, flex: 1, maxWidth: 64, borderRadius: 30, backgroundColor: t.sunk, boxShadow: t.edge, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="cal" color={t.tx} />
            <Txt ur={ur} numberOfLines={1} style={{ fontSize: 11.5, fontWeight: 600, color: t.t2 }}>{monLabel(lang, now.getMonth())}</Txt>
          </Tap>
        </FadeIn>

        <FadeIn delay={120} style={{ paddingTop: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          <PillShortcut icon="compass" kicker={tx('qibla')} title={ur ? `${q.deg}° ${dirUr(q.dir)}` : `${q.deg}° ${q.dir}`} onPress={() => router.navigate({ pathname: '/prayer', params: { qibla: '1' } })} />
          <PillShortcut icon="book" kicker={tx('kalimat')} title={tx('search')} onPress={() => router.push('/search')} />
        </FadeIn>

        <FadeIn delay={160} dur={550}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + 10} decelerationRate="fast"
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, marginTop: 14 }}
            onScroll={e => { const i = Math.round(e.nativeEvent.contentOffset.x / (cardW + 10)); if (i !== car) setCar(i); }}
            scrollEventThrottle={32}>
            {/* Prayer timeline card */}
            <Tap scale={0.985} onPress={() => router.navigate('/prayer')} accessibilityLabel={tx('nextPrayerA11y', { p: prayerName(lang, next.name), c: countdownText(lang, next.secs) })}
              style={{ width: cardW, height: 402, borderRadius: 36, overflow: 'hidden' }}>
              {PH.map(p => <SkyLayer key={p} bg={G.sky[p]} on={shownPhase === p} />)}
              <Breathe bg={G.glowWarm} style={{ width: 220, height: 220, right: -60, top: 40 }} dur={9000} />
              <Breathe bg={G.glowViolet} style={{ width: 260, height: 260, left: -90, bottom: -40 }} dur={14000} />
              <Stars />
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', ...bgImage(G.skyFade) }} />
              <View style={{ position: 'absolute', left: 24, right: 24, top: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name="pin" color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Txt ur={ur} style={{ fontSize: 11.5, letterSpacing: ur ? 0 : 0.7, color: 'rgba(255,255,255,0.8)', textAlign: start }}>{tx('basedOnLocation')}</Txt>
                  <Txt ur={ur} style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: '#FFFFFF', textAlign: start }}>{tx('timeline')}</Txt>
                </View>
                <Icon name="chev" color="#FFFFFF" />
              </View>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 108 }}>
                <Txt ur={ur} style={{ fontSize: 12, fontWeight: 700, letterSpacing: ur ? 0 : 0.96, color: '#FFFFFF', textAlign: start }}>{tx('nextPrayer')}</Txt>
                {ur ? (
                  <>
                    <Txt ur style={{ fontSize: 26, lineHeight: 52, marginTop: 4, color: '#FFFFFF', textAlign: start }}>{tx('beginsIn', { p: prayerName(lang, next.name) })}</Txt>
                    <Txt ur style={{ fontSize: 30, lineHeight: 56, color: '#FFFFFF', textAlign: start }}>{countdownText(lang, next.secs)}</Txt>
                  </>
                ) : (
                  <Txt style={{ fontSize: 34, fontWeight: 800, lineHeight: 37, letterSpacing: -0.7, marginTop: 8, color: '#FFFFFF' }}>
                    {tx('beginsIn', { p: next.name })}{'\n'}{fmtCountdown(next.secs)}
                  </Txt>
                )}
                {nextJ && (
                  <Txt ur={ur} style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 8, textAlign: start }}>
                    {nextJ.jumuah ? tx('jumuah') : tx('jamaat')} · {ltr(fmtTime(nextJ.at))}
                  </Txt>
                )}
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
                      <Tap key={p} scale={0.85} hitSlop={14} accessibilityLabel={tx('showSky', { p: prayerName(lang, p) })} onPress={() => { buzz(5); setPhase(p); }}>
                        {cur ? <PulseDot size={16} color="#FFFFFF" borderColor="#F2A65A" /> : node}
                      </Tap>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
                  {PH.map(p => <Txt key={p} ur={ur} style={{ fontSize: 11.5, fontWeight: 600, color: shownPhase === p ? '#FFFFFF' : 'rgba(255,255,255,0.72)' }}>{prayerName(lang, p)}</Txt>)}
                </View>
              </View>
            </Tap>

            {/* Daily insight card */}
            <Tap scale={0.985} onPress={() => { buzz(6); setInsight(true); }} accessibilityLabel={tx('openDailyInsight')}
              style={{ width: cardW, height: 402, borderRadius: 36, overflow: 'hidden', padding: 24, ...bgImage(G.insight) }}>
              <Breathe bg={G.glowGold} style={{ width: 240, height: 240, right: -70, bottom: -60 }} dur={11000} />
              <Txt ur={ur} style={{ fontSize: 11.5, letterSpacing: ur ? 0 : 0.7, color: 'rgba(255,255,255,0.8)', textAlign: sa }}>{tx('yourConsistency')}</Txt>
              <Txt ur={ur} style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: '#FFFFFF', textAlign: sa }}>{tx('dailyInsight')}</Txt>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 28 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="flame" size={34} color={FIXED.orangeA} />
                  <Txt style={{ fontSize: 54, fontWeight: 800, letterSpacing: -1.6, lineHeight: 58, color: '#FFFFFF' }}>{streak}</Txt>
                  <Txt ur={ur} style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: ur ? 6 : 14 }}>{tx('dayStreak')}</Txt>
                </View>
                <Txt ur={ur} style={{ fontSize: 15, lineHeight: ur ? 32 : 22.5, color: 'rgba(255,255,255,0.88)', marginTop: 12, textAlign: sa }}>
                  {streakNote(lang, streak)}
                </Txt>
                <View style={{ alignSelf: 'flex-start', marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <Txt ur={ur} style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{tx('openInsight')}</Txt>
                </View>
              </View>
            </Tap>

            {/* Community impact card */}
            <Tap scale={0.985} onPress={() => router.navigate('/community')} accessibilityLabel={tx('communityImpact')}
              style={{ width: cardW, height: 402, borderRadius: 36, overflow: 'hidden', padding: 24, ...bgImage(G.ummah) }}>
              <Txt ur={ur} style={{ fontSize: 11.5, letterSpacing: ur ? 0 : 0.7, color: 'rgba(255,255,255,0.8)', textAlign: sa }}>{tx('ummahToday')}</Txt>
              <Txt ur={ur} style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: '#FFFFFF', textAlign: sa }}>{tx('communityImpact')}</Txt>
              <View style={{ position: 'absolute', left: 24, right: 24, bottom: 28 }}>
                {ummah ? (
                  <>
                    <Txt style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.4, lineHeight: 50, color: '#FFFFFF' }}>{fmt(impact)}</Txt>
                    <Txt ur={ur} style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 10, textAlign: sa }}>{tx('dhikrToday')} · {ummah.hour > 0 ? (ur ? tx('plusHour', { n: ltr(fmt(ummah.hour)) }) : tx('plusHour', { n: fmt(ummah.hour) })) : tx('firstHour')}</Txt>
                    {hours && <HourBars hours={hours} />}
                  </>
                ) : (
                  <>
                    <Txt ur={ur} style={{ fontSize: 26, fontWeight: ur ? 400 : 800, letterSpacing: ur ? 0 : -0.6, lineHeight: ur ? 52 : 32, color: '#FFFFFF', textAlign: sa }}>{tx('countTogether')}</Txt>
                    <Txt ur={ur} style={{ fontSize: 15, lineHeight: ur ? 30 : 22, color: 'rgba(255,255,255,0.88)', marginTop: 10, textAlign: sa }}>{tx('signInLive')}</Txt>
                  </>
                )}
              </View>
            </Tap>
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {[0, 1, 2].map(i => <View key={i} style={{ height: 6, width: car === i ? 20 : 6, borderRadius: 3, backgroundColor: car === i ? t.acc : t.ctl4 }} />)}
          </View>
        </FadeIn>

        <FadeIn delay={200} style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <DailyOverview now={now} />
        </FadeIn>

        <FadeIn delay={210} style={{ paddingTop: 12, paddingHorizontal: 16 }}>
          <InspirationCard />
        </FadeIn>

        <FadeIn delay={220} style={{ paddingTop: 12, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ordered.map(qk => (
            <QuickTile3D key={qk.title} art={qk.art} title={qk.title} sub={qk.sub} onPress={qk.go} style={{ width: (width - 42) / 2 }} />
          ))}
        </FadeIn>

      </ScrollView>
      <InsightSheet open={insight} onClose={() => setInsight(false)} impact={impact} />
    </View>
  );
}
