import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { DayStrip } from '../../../components/DayStrip';
import { Icon } from '../../../components/Icon';
import { LocationSheet } from '../../../components/LocationSheet';
import { Breathe, FadeIn } from '../../../components/motion';
import { buzz, Chips, Cta, IconBtn, IconChip, Label, Ring, say, Screen, SerifTitle, Sheet, Tap, Txt } from '../../../components/ui';
import { METHODS, PRAYER_META, type PrayerName } from '../../../data/content';
import { clock, setLog, usePrayerNow } from '../../../lib/hooks';
import { watchHeading } from '../../../lib/location';
import { addDays, dayKey, fmtTime, qibla, timesFor } from '../../../lib/prayer';
import { set, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { G } from '../../../theme/tokens';

const ORDER: (PrayerName | 'Sunrise')[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function QiblaCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useT();
  const city = useApp(s => s.city);
  const q = qibla(city);
  const [heading, setHeading] = useState<number | null>(null);
  const rot = useRef(new Animated.Value(q.deg)).current;
  useEffect(() => {
    if (!open) return;
    let stop: (() => void) | undefined;
    watchHeading(h => setHeading(h)).then(s => { stop = s; }).catch(() => setHeading(null));
    return () => stop?.();
  }, [open]);
  const target = heading == null ? q.deg : q.deg - heading;
  useEffect(() => {
    Animated.timing(rot, { toValue: target, duration: heading == null ? 1200 : 250, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [target, heading, rot]);
  const aligned = heading != null && Math.abs(((target % 360) + 540) % 360 - 180) < 5;
  return (
    <View style={{ borderRadius: 26, backgroundColor: t.card, overflow: 'hidden' }}>
      <Tap onPress={() => { buzz(6); onToggle(); }} scale={0.99} accessibilityState={{ expanded: open }}
        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <IconChip name="compass" color={t.acc} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 16.5, fontWeight: 700 }}>Qibla direction</Txt>
          <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{q.deg}° {q.long} of true north</Txt>
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Icon name="chev" color={t.t2} /></View>
      </Tap>
      {open && (
        <FadeIn dur={350} style={{ paddingTop: 6, paddingHorizontal: 16, paddingBottom: 22, alignItems: 'center' }}>
          <View style={{ width: 200, height: 200, borderRadius: 100, experimental_backgroundImage: `radial-gradient(circle, ${t.dark ? '#2A2B34' : '#F4F4F7'}, ${t.dark ? '#1C1D23' : '#F4F4F7'})`, boxShadow: aligned ? 'inset 0 0 0 2px #5EB87A' : t.hair }}>
            <View style={{ position: 'absolute', left: 14, right: 14, top: 14, bottom: 14, borderRadius: 100, borderWidth: 1, borderStyle: 'dashed', borderColor: t.dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,16,20,0.12)' }} />
            <Txt style={{ position: 'absolute', top: 10, alignSelf: 'center', fontSize: 12, fontWeight: 700, color: t.t2 }}>N</Txt>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate: rot.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] }) }] }}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Path d="M100 30l14 70h-28z" fill={t.acc} />
                <Path d="M100 170l-10-70h20z" fill={t.ctl4b} />
                <Circle cx={100} cy={100} r={7} fill={t.tx} />
              </Svg>
            </Animated.View>
          </View>
          <Txt style={{ fontSize: 12.5, lineHeight: 19, color: aligned ? t.mint : t.t2, textAlign: 'center', marginTop: 14, maxWidth: 280 }}>
            {heading == null
              ? 'Hold your phone flat. Showing the calculated bearing — allow location to use the live compass.'
              : aligned ? 'You are facing the Qibla.' : 'Hold your phone flat and turn until the needle points up.'}
          </Txt>
        </FadeIn>
      )}
    </View>
  );
}

export default function Prayer() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ qibla?: string }>();
  const { now, next, city, method, hanafi } = usePrayerNow();
  const adhan = useApp(s => s.adhan);
  const sound = useApp(s => s.sound);
  const allLogs = useApp(s => s.logs);
  const [day, setDay] = useState(0);
  const [qOpen, setQOpen] = useState(params.qibla === '1');
  const [detail, setDetail] = useState<PrayerName | null>(null);
  const [loc, setLoc] = useState(false);
  useEffect(() => { if (params.qibla === '1') setQOpen(true); }, [params.qibla]);

  const date = addDays(now, day);
  const key = dayKey(date);
  const logs = allLogs[key] || {};
  const times = useMemo(() => timesFor(city, date, method, hanafi), [city, key, method, hanafi]); // eslint-disable-line react-hooks/exhaustive-deps
  const frac = Math.max(0, Math.min(1, 1 - next.secs / next.span));

  const rows = ORDER.map(n => {
    const at = times[n];
    if (n === 'Sunrise') return { n, at, sun: true as const };
    const st = logs[n];
    const done = st === 'prayed';
    const past = day === 0 && at.getTime() < now.getTime();
    const missed = !done && past;
    const isNext = day === 0 && n === next.name && !done;
    return { n, at, sun: false as const, done, missed, isNext, canLog: day === 0 };
  });

  const pd = detail ? (() => {
    const i = ORDER.indexOf(detail);
    const nxt = detail === 'Isha' ? 'Fajr' : detail === 'Fajr' ? null : ORDER[i + 1];
    const win = detail === 'Isha' ? 'until Fajr' : detail === 'Fajr' ? `until ${fmtTime(times.Sunrise)}` : `until ${fmtTime(times[nxt as PrayerName])}`;
    const r = rows.find(x => x.n === detail);
    const done = r && !r.sun && r.done;
    const missed = r && !r.sun && r.missed;
    const isNext = r && !r.sun && r.isNext;
    return {
      time: fmtTime(times[detail]), win,
      badge: done ? 'Prayed' : missed ? 'Missed' : isNext ? 'Next' : 'Upcoming',
      badgeBg: done ? 'rgba(94,184,122,0.16)' : missed ? 'rgba(240,138,122,0.16)' : 'rgba(242,166,90,0.16)',
      badgeInk: done ? t.mint : missed ? t.rose : t.acc,
    };
  })() : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <SerifTitle a="Prayer" b="Times" style={{ flexShrink: 1 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconBtn name="pin" label="Location and method" onPress={() => { buzz(6); setLoc(true); }} />
            <IconBtn name="alarm" label="Wake alarm" onPress={() => router.push('/prayer/wake-alarm')} />
          </View>
        </FadeIn>
        <Txt style={{ paddingTop: 10, paddingHorizontal: 22, fontSize: 13.5, color: t.t2 }} numberOfLines={1}>
          {city.name} · {METHODS[method].k} · {hanafi ? 'Hanafi' : 'Standard'} Asr
        </Txt>
        <View style={{ paddingTop: 16, paddingHorizontal: 16, flexDirection: 'row' }}>
          <DayStrip count={7} value={day} base={now} onChange={setDay} />
        </View>

        <View style={{ paddingTop: 22, paddingHorizontal: 16, alignItems: 'center' }}>
          <View style={{ width: 236, height: 236, alignItems: 'center', justifyContent: 'center' }}>
            <Breathe bg={G.glowAcc} style={{ left: 18, top: 18, right: 18, bottom: 18 }} dur={6000} />
            <Ring size={236} r={106} stroke={10} pct={frac} track={t.sheetc} gradient={['#F7BD5A', '#E07A4B']} animate={false}>
              <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${next.name} at ${fmtTime(next.at)}, ${clock(next.secs)} until adhan`}>
                <Txt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: t.acc }}>{next.name.toUpperCase()} · {fmtTime(next.at).toUpperCase()}</Txt>
                <Txt style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1.5, marginTop: 6 }}>{clock(next.secs)}</Txt>
                <Txt style={{ fontSize: 13, color: t.t2, marginTop: 4 }}>until adhan</Txt>
              </View>
            </Ring>
          </View>
        </View>

        <View style={{ paddingTop: 20, paddingHorizontal: 16, gap: 8 }}>
          {rows.map((r, i) => {
            if (r.sun) {
              return (
                <FadeIn key={r.n} delay={i * 40} style={{ borderRadius: 26, backgroundColor: t.sunk2, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <IconChip name="sun" color="#F7BD5A" />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontSize: 16.5, fontWeight: 700 }}>Sunrise</Txt>
                    <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>Not a prayer time</Txt>
                  </View>
                  <Txt style={{ fontSize: 15.5, fontWeight: 600, color: t.t5 }}>{fmtTime(r.at)}</Txt>
                </FadeIn>
              );
            }
            const n = r.n as PrayerName;
            const note = r.done ? 'Prayed · logged' : r.missed ? 'Missed · tap to make up' : r.isNext ? `Next · in ${Math.ceil(next.secs / 60)} min` : adhan[n] ? 'Adhan on' : 'Adhan off';
            const noteInk = r.done ? t.mint : r.missed ? t.rose : r.isNext ? t.acc : t.t2;
            return (
              <FadeIn key={n} delay={i * 40}>
                <Tap scale={0.985} onPress={() => { buzz(6); setDetail(n); }} accessibilityLabel={`${n} ${fmtTime(r.at)}, ${note}`}
                  style={{ borderRadius: 26, backgroundColor: r.isNext ? undefined : t.card, experimental_backgroundImage: r.isNext ? G.nextRow : undefined, boxShadow: r.isNext ? 'inset 0 0 0 1.5px rgba(242,166,90,0.5)' : undefined, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <IconChip name={PRAYER_META[n].ic} color={r.done ? t.mint : r.isNext ? t.acc : t.t5} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt style={{ fontSize: 16.5, fontWeight: 700 }}>{n}</Txt>
                    <Txt style={{ fontSize: 12.5, color: noteInk, marginTop: 3 }}>{note}</Txt>
                  </View>
                  <Txt style={{ fontSize: 15.5, fontWeight: 600, color: t.t5 }}>{fmtTime(r.at)}</Txt>
                  <Tap scale={0.9} accessibilityLabel={`Adhan for ${n}`} accessibilityState={{ checked: adhan[n] }}
                    onPress={() => { buzz(5); set(s => ({ adhan: { ...s.adhan, [n]: !s.adhan[n] } })); say(`Adhan ${adhan[n] ? 'off' : 'on'} for ${n}`); }}
                    style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="bell" color={adhan[n] ? t.acc : t.t4} />
                  </Tap>
                  {r.canLog && (
                    <Tap scale={0.88} accessibilityLabel={r.done ? `Unmark ${n}` : `Mark ${n} as prayed`} accessibilityState={{ checked: r.done }}
                      onPress={() => {
                        buzz(r.done ? 5 : [10, 30, 16]);
                        setLog(key, n, r.done ? null : 'prayed');
                        if (!r.done) say(`${n} logged · May Allah accept it`);
                      }}
                      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.done ? undefined : t.ctl3, experimental_backgroundImage: r.done ? G.brand : undefined, alignItems: 'center', justifyContent: 'center' }}>
                      {r.done && <Icon name="check" color="#111217" />}
                    </Tap>
                  )}
                </Tap>
              </FadeIn>
            );
          })}
        </View>
        <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
          <QiblaCard open={qOpen} onToggle={() => setQOpen(o => !o)} />
        </View>
      </Screen>

      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && pd && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View>
                <Txt style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{detail}</Txt>
                <Txt style={{ fontSize: 14, color: t.t2, marginTop: 6 }}>{pd.time} · {pd.win}</Txt>
              </View>
              <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: pd.badgeBg }}>
                <Txt style={{ fontSize: 12, fontWeight: 700, color: pd.badgeInk }}>{pd.badge}</Txt>
              </View>
            </View>
            <View style={{ marginTop: 18, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18 }}>
              <Label>RAK’AH · COMMON HANAFI PRACTICE</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                {(PRAYER_META[detail].rak || []).map((r, i) => {
                  const fard = r.includes('Fard');
                  return (
                    <View key={i} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: fard ? 'rgba(242,166,90,0.18)' : t.ctl3 }}>
                      <Txt style={{ fontSize: 13, fontWeight: 600, color: fard ? t.gold : t.t5 }}>{r}</Txt>
                    </View>
                  );
                })}
              </View>
            </View>
            <Label style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>ADHAN SOUND</Label>
            <Chips labels={['Makkah', 'Madinah', 'Soft chime', 'Silent']} isOn={i => sound === i} onPick={i => set({ sound: i })} />
            {day === 0 && <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Cta label="Missed" kind="secondary" height={56} size={16} style={{ flex: 1 }}
                onPress={() => { setLog(key, detail, 'missed'); setDetail(null); say(`${detail} added to Qada`); }} />
              <Cta label="Prayed on time" height={56} size={16} style={{ flex: 1.4 }}
                onPress={() => { buzz([10, 30, 16]); setLog(key, detail, 'prayed'); setDetail(null); say(`${detail} logged · May Allah accept it`); }} />
            </View>}
            <Tap onPress={() => { setDetail(null); router.push('/mat-tag'); }}
              style={{ marginTop: 12, height: 54, borderRadius: 22, boxShadow: t.hair, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="qr" color={t.acc} />
              <Txt style={{ fontSize: 14.5, fontWeight: 700, color: t.acc }}>Set up wake verification</Txt>
            </Tap>
          </>
        )}
      </Sheet>
      <LocationSheet open={loc} onClose={() => setLoc(false)} />
    </View>
  );
}

