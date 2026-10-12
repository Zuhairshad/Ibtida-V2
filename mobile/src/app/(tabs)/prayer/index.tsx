import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { DayStrip } from '../../../components/DayStrip';
import { Icon } from '../../../components/Icon';
import { LocationSheet } from '../../../components/LocationSheet';
import { Cap } from '../../../components/Cap';
import { Breathe, FadeIn } from '../../../components/motion';
import { buzz, Chips, Cta, IconBtn, IconChip, Ring, say, Screen, SerifTitle, Sheet, Switch, Tap, Txt } from '../../../components/ui';
import { METHODS, PRAYER_META, type PrayerName } from '../../../data/content';
import { clock, setLog, usePrayerNow } from '../../../lib/hooks';
import { useCompass } from '../../../lib/compass';
import { delta, unwrap } from '../../../lib/compassMath';
import { enableNotifications, previewAdhan } from '../../../lib/notifications';
import { ADHAN_CHOICES, adhanFile, hasSound, TAKBIR } from '../../../lib/sounds';
import { addDays, dayKey, fmtTime, jamaatAt, qibla, timesFor } from '../../../lib/prayer';
import { dirUr, iso, leftText, prayerName, tr, useLang } from '../../../lib/i18n';
import { ltr } from '../../../data/reminders';
import { set, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../../../theme/tokens';

/** What the chosen adhan sound actually plays in this build, said plainly. */
function soundNote(sound: number, short: boolean) {
  const c = ADHAN_CHOICES[sound] ?? ADHAN_CHOICES[0];
  if (c.key === 'silent') return 'A silent notification at each prayer time.';
  const f = adhanFile(sound, short);
  if (f === 'default') return `The ${c.label} recording isn’t in this build yet, so your phone’s notification sound plays.`;
  if (short && c.key !== 'chime' && !hasSound(TAKBIR)) return 'The short opening isn’t in this build yet, so the full recording plays.';
  return '';
}

const ORDER: (PrayerName | 'Sunrise')[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const DIAL = 220;
const C = DIAL / 2;
/** Point on the dial at `deg` (clockwise from the top) and radius `r`. */
const at = (deg: number, r: number) => ({ x: C + r * Math.sin((deg * Math.PI) / 180), y: C - r * Math.cos((deg * Math.PI) / 180) });

function QiblaCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useT();
  const { lang, ur, t: tx } = useLang();
  const city = useApp(s => s.city);
  const q = qibla(city);
  const cmp = useCompass(open, city);
  const live = cmp.heading != null;
  // The dial turns with the phone (-heading) so N points to true north and the Kaaba needle, drawn
  // at the Qibla bearing on the dial, points to Makkah. Unwrapped so it never spins the long way.
  const target = live ? -cmp.heading! : 0;
  const unwrapped = useRef(0);
  const rot = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    unwrapped.current = unwrap(unwrapped.current, target);
    Animated.timing(rot, { toValue: unwrapped.current, duration: live ? 180 : 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [target, live, rot]);
  const off = live ? delta(cmp.heading!, q.deg) : null;
  const aligned = off != null && Math.abs(off) <= 5;
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) buzz([20, 40, 20]);
    wasAligned.current = aligned;
  }, [aligned]);
  const needle = at(q.deg, 78);
  const kaaba = at(q.deg, 94);
  const status = !live
    ? cmp.problem === 'needs-tap' ? tx('tapCompass')
      : cmp.problem === 'denied' ? tx('compassDenied')
        : cmp.problem === 'unsupported' ? tx('compassNone')
          : tx('compassStarting')
    : aligned ? tx('facingQibla')
      : tx(off! > 0 ? 'turnRight' : 'turnLeft', { n: String(Math.abs(Math.round(off!))) });
  return (
    <View style={{ borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, overflow: 'hidden' }}>
      <Tap onPress={() => { buzz(6); onToggle(); }} scale={0.99} accessibilityState={{ expanded: open }}
        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <IconChip name="compass" color={t.acc} />
        <View style={{ flex: 1 }}>
          <Txt ur={ur} style={{ fontSize: 16.5, fontWeight: 700, textAlign: ur ? 'right' : undefined }}>{tx('qiblaDirection')}</Txt>
          <Txt ur={ur} style={{ fontSize: 12.5, color: t.t2, marginTop: ur ? 0 : 3, textAlign: ur ? 'right' : undefined }}>{tx('qiblaBearing', { deg: String(q.deg), dir: ur ? dirUr(q.dir) : q.long })}</Txt>
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Icon name="chev" color={t.t2} /></View>
      </Tap>
      {open && (
        <FadeIn dur={350} style={{ paddingTop: 6, paddingHorizontal: 16, paddingBottom: 22, alignItems: 'center' }}>
          {/* Fixed marker: the direction the top of the phone is pointing. */}
          <Svg width={18} height={12} viewBox="0 0 18 12"><Path d="M9 12L0 0h18z" fill={aligned ? FIXED.ok : t.tx} /></Svg>
          <View accessibilityLabel={live ? (aligned ? tx('compassAhead') : tx('compassSide', { n: String(Math.abs(Math.round(off!))), s: tx(off! > 0 ? 'sideRight' : 'sideLeft') })) : tx('compassBearing', { deg: String(q.deg) })}
            style={{ width: DIAL, height: DIAL, borderRadius: C, marginTop: 4, backgroundColor: t.dark ? '#22232A' : '#FFFFFF', boxShadow: aligned ? `inset 0 0 0 3px ${FIXED.ok}` : t.edge }}>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate: rot.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] }) }] }}>
              <Svg width={DIAL} height={DIAL} viewBox={`0 0 ${DIAL} ${DIAL}`}>
                {Array.from({ length: 72 }, (_, k) => {
                  const d = k * 5; const major = d % 90 === 0; const mid = d % 30 === 0;
                  const a = at(d, C - 6); const b = at(d, C - (major ? 20 : mid ? 15 : 11));
                  return <Line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d === 0 ? t.rose : t.t4} strokeWidth={major ? 2.5 : 1} strokeOpacity={major || mid ? 0.9 : 0.45} />;
                })}
                {(['N', 'E', 'S', 'W'] as const).map((l, k) => {
                  const p = at(k * 90, C - 34);
                  return <SvgText key={l} x={p.x} y={p.y + 5} fontSize={15} fontWeight="700" textAnchor="middle" fill={l === 'N' ? t.rose : t.t2}>{l}</SvgText>;
                })}
                <Line x1={C} y1={C} x2={needle.x} y2={needle.y} stroke={aligned ? FIXED.ok : t.acc} strokeWidth={5} strokeLinecap="round" />
                <Rect x={kaaba.x - 9} y={kaaba.y - 9} width={18} height={18} rx={3} fill="#111217" stroke={aligned ? FIXED.ok : t.acc} strokeWidth={2} rotation={q.deg} origin={`${kaaba.x}, ${kaaba.y}`} />
                <Line x1={kaaba.x - 9} y1={kaaba.y - 3} x2={kaaba.x + 9} y2={kaaba.y - 3} stroke="#D4AF37" strokeWidth={2} rotation={q.deg} origin={`${kaaba.x}, ${kaaba.y}`} />
                <Circle cx={C} cy={C} r={7} fill={t.tx} />
              </Svg>
            </Animated.View>
          </View>
          <Txt ur={ur} style={{ fontSize: 15, fontWeight: 700, color: aligned ? t.mint : t.tx, textAlign: 'center', marginTop: 14 }}>{status}</Txt>
          {cmp.problem === 'needs-tap' && <Cta label={tx('useCompass')} icon="compass" height={44} size={14} style={{ marginTop: 10, paddingHorizontal: 20 }} onPress={cmp.enable} />}
          {live && cmp.accuracy != null && cmp.accuracy <= 1 && (
            <Txt ur={ur} style={{ fontSize: 12.5, lineHeight: ur ? 26 : 18, color: t.acc, textAlign: 'center', marginTop: 8, maxWidth: 290 }}>{tx('calibrate')}</Txt>
          )}
          <Txt ur={ur} style={{ fontSize: 11.5, lineHeight: ur ? 24 : 17, color: t.t4, textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
            {ur ? tx('holdFlat', { c: iso(city.name.split(',')[0]) }) : `Hold your phone flat. ${city.name.split(',')[0]} → Makkah, great-circle bearing.`}
            {live && cmp.source === 'magnetic' ? tr(lang, 'magCorrected', { d: `${cmp.declination >= 0 ? '+' : ''}${cmp.declination.toFixed(1)}` }) : live ? tx('trueNorthPhone') : ''}
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
  const { now, next, city, method, hanafi, adj } = usePrayerNow();
  const jamaat = useApp(s => s.jamaat);
  const masjid = useApp(s => s.masjid);
  const { lang, ur, t: tx } = useLang();
  const L = (x: string) => (ur ? ltr(x) : x);
  const adhan = useApp(s => s.adhan);
  const sound = useApp(s => s.sound);
  const adhanShort = useApp(s => s.adhanShort);
  const allLogs = useApp(s => s.logs);
  const [day, setDay] = useState(0);
  const [qOpen, setQOpen] = useState(params.qibla === '1');
  const [detail, setDetail] = useState<PrayerName | null>(null);
  const [loc, setLoc] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync from an external value
  useEffect(() => { if (params.qibla === '1') setQOpen(true); }, [params.qibla]);

  const date = addDays(now, day);
  const key = dayKey(date);
  const logs = allLogs[key] || {};
  const times = useMemo(() => timesFor(city, date, method, hanafi, adj), [city, key, method, hanafi, adj]); // eslint-disable-line react-hooks/exhaustive-deps
  const anyJamaat = Object.keys(jamaat).length > 0;
  const nextJ = jamaatAt(jamaat, next.name, next.at);
  const frac = Math.max(0, Math.min(1, 1 - next.secs / next.span));

  const rows = ORDER.map(n => {
    const at = times[n];
    if (n === 'Sunrise') return { n, at, sun: true as const };
    const st = logs[n];
    const done = st === 'prayed';
    const past = day === 0 && at.getTime() < now.getTime();
    const missed = !done && past;
    const isNext = day === 0 && n === next.name && !done;
    return { n, at, sun: false as const, done, missed, isNext, canLog: day === 0, jam: jamaatAt(jamaat, n, date) };
  });

  const pd = detail ? (() => {
    const i = ORDER.indexOf(detail);
    const nxt = detail === 'Isha' ? 'Fajr' : detail === 'Fajr' ? null : ORDER[i + 1];
    const win = detail === 'Isha' ? tx('until', { x: prayerName(lang, 'Fajr') }) : detail === 'Fajr' ? tx('until', { x: L(fmtTime(times.Sunrise)) }) : tx('until', { x: L(fmtTime(times[nxt as PrayerName])) });
    const r = rows.find(x => x.n === detail);
    const done = r && !r.sun && r.done;
    const missed = r && !r.sun && r.missed;
    const isNext = r && !r.sun && r.isNext;
    return {
      time: fmtTime(times[detail]), win, jam: jamaatAt(jamaat, detail, date),
      badge: done ? tx('statusPrayed') : missed ? tx('statusMissed') : isNext ? tx('next') : tx('statusUpcoming'),
      badgeBg: done ? 'rgba(94,184,122,0.16)' : missed ? 'rgba(240,138,122,0.16)' : 'rgba(242,166,90,0.16)',
      badgeInk: done ? t.mint : missed ? t.rose : t.acc,
    };
  })() : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {ur
            ? <Txt ur accessibilityRole="header" style={{ fontSize: 32, lineHeight: 64, flexShrink: 1 }}>{tx('titleA')} <Txt ur style={{ fontSize: 32, color: t.t6 }}>{tx('titleB')}</Txt></Txt>
            : <SerifTitle a="Prayer" b="Times" style={{ flexShrink: 1 }} />}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconBtn name="pin" label={tx('locationMethod')} onPress={() => { buzz(6); setLoc(true); }} />
            <IconBtn name="alarm" label={tx('wakeAlarm')} onPress={() => router.push('/prayer/wake-alarm')} />
          </View>
        </FadeIn>
        <Txt ur={ur} style={{ paddingTop: 10, paddingHorizontal: 22, fontSize: 13.5, color: t.t2, textAlign: ur ? 'right' : undefined }} numberOfLines={1}>
          {ur
            ? `${iso(city.name)} · ${iso(METHODS[method].k)} · ${tx(hanafi ? 'hanafiAsr' : 'standardAsr')}${Object.values(adj).some(Boolean) ? ` · ${tx('adjusted')}` : ''}`
            : `${city.name} · ${METHODS[method].k} · ${hanafi ? 'Hanafi' : 'Standard'} Asr${Object.values(adj).some(Boolean) ? ' · adjusted' : ''}`}
        </Txt>
        <View style={{ paddingTop: 16, paddingHorizontal: 16, flexDirection: 'row' }}>
          <DayStrip count={7} value={day} base={now} onChange={setDay} />
        </View>

        <View style={{ paddingTop: 22, paddingHorizontal: 16, alignItems: 'center' }}>
          <View style={{ width: 236, height: 236, alignItems: 'center', justifyContent: 'center' }}>
            <Breathe bg={G.glowAcc} style={{ left: 18, top: 18, right: 18, bottom: 18 }} dur={6000} />
            <Ring size={236} r={106} stroke={10} pct={frac} track={t.sheetc} gradient={['#F7BD5A', '#E07A4B']} animate={false}>
              <View style={{ alignItems: 'center' }} accessible accessibilityLabel={ur ? `${prayerName(lang, next.name)}، ${fmtTime(next.at)}، ${tx('untilAdhan')} ${clock(next.secs)}` : `${next.name} at ${fmtTime(next.at)}, ${clock(next.secs)} until adhan`}>
                {ur
                  ? <Txt ur style={{ fontSize: 14, color: t.acc }}>{prayerName(lang, next.name)} · {ltr(fmtTime(next.at))}</Txt>
                  : <Txt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: t.acc }}>{next.name.toUpperCase()} · {fmtTime(next.at).toUpperCase()}</Txt>}
                <Txt style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1.5, marginTop: 6 }}>{clock(next.secs)}</Txt>
                <Txt ur={ur} style={{ fontSize: 13, color: t.t2, marginTop: 4 }}>{tx('untilAdhan')}</Txt>
                {nextJ && <Txt ur={ur} style={{ fontSize: 12.5, fontWeight: 700, color: t.gold, marginTop: 6 }}>{tx(nextJ.jumuah ? 'jumuah' : 'jamaat')} · {ltr(fmtTime(nextJ.at))}</Txt>}
              </View>
            </Ring>
          </View>
        </View>

        <View style={{ paddingTop: 20, paddingHorizontal: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Cap ur={ur} style={{ flex: 1 }}>{masjid ? (ur ? iso(masjid) : masjid.toUpperCase()) : tx('prayerCap')}</Cap>
            {ur ? (
              <Txt ur style={{ fontSize: 12, color: t.t5 }}>{tx('begins')}{anyJamaat ? <Txt ur style={{ fontSize: 12, color: t.gold }}> · {tx('jamaat')}</Txt> : null}</Txt>
            ) : (
              <>
                <Cap ur={false} color={t.t5}>BEGINS</Cap>
                {anyJamaat && <Cap ur={false} color={t.gold} style={{ marginLeft: 6 }}>· JAMAAT</Cap>}
              </>
            )}
          </View>
          {rows.map((r, i) => {
            if (r.sun) {
              return (
                <FadeIn key={r.n} delay={i * 40} style={{ borderRadius: 26, backgroundColor: t.sunk2, boxShadow: t.edge, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <IconChip name="sun" color="#F7BD5A" />
                  <View style={{ flex: 1 }}>
                    <Txt ur={ur} style={{ fontSize: 16.5, fontWeight: 700, textAlign: ur ? 'right' : 'left' }}>{tx('sunrise')}</Txt>
                    <Txt ur={ur} style={{ fontSize: 12.5, color: t.t2, marginTop: ur ? 0 : 3, textAlign: ur ? 'right' : 'left' }}>{tx('notPrayer')}</Txt>
                  </View>
                  <Txt style={{ fontSize: 15.5, fontWeight: 600, color: t.t5 }}>{fmtTime(r.at)}</Txt>
                </FadeIn>
              );
            }
            const n = r.n as PrayerName;
            // Shorter notes when the row also carries a jamaat time, so it stays on one or two lines.
            const left = leftText(lang, next.secs);
            const note = r.done ? tx('prayed') : r.missed ? tx(r.jam ? 'missedShort' : 'missed') : r.isNext ? `${tx('next')} · ${r.jam || ur ? '' : 'in '}${left}` : tx(adhan[n] ? 'adhanOn' : 'adhanOff');
            const noteInk = r.done ? t.mint : r.missed ? t.rose : r.isNext ? t.acc : t.t2;
            return (
              <FadeIn key={n} delay={i * 40}>
                <Tap scale={0.985} onPress={() => { buzz(6); setDetail(n); }} accessibilityLabel={ur ? `${prayerName(lang, n)}، ${tx('begins')} ${fmtTime(r.at)}${r.jam ? `، ${tx(r.jam.jumuah ? 'jumuah' : 'jamaat')} ${fmtTime(r.jam.at)}` : ''}، ${note}` : `${n}, begins ${fmtTime(r.at)}${r.jam ? `, ${r.jam.jumuah ? 'Jumu‘ah' : 'jamaat'} ${fmtTime(r.jam.at)}` : ''}, ${note}`}
                  style={{ borderRadius: 26, backgroundColor: r.isNext ? undefined : t.card, ...bgImage(r.isNext ? G.nextRow : undefined), boxShadow: r.isNext ? 'inset 0 0 0 1.5px rgba(242,166,90,0.5)' : t.edge, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <IconChip name={PRAYER_META[n].ic} color={r.done ? t.mint : r.isNext ? t.acc : t.t5} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt ur={ur} style={{ fontSize: 16.5, fontWeight: 700, textAlign: ur ? 'right' : 'left' }}>{prayerName(lang, n)}</Txt>
                    <Txt ur={ur} style={{ fontSize: 12.5, color: noteInk, marginTop: ur ? 0 : 3, textAlign: ur ? 'right' : 'left' }}>{note}</Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt style={{ fontSize: 15.5, fontWeight: 600, color: t.t5 }}>{fmtTime(r.at)}</Txt>
                    {r.jam && <Txt ur={ur} style={{ fontSize: 11.5, fontWeight: 700, color: t.gold, marginTop: ur ? 0 : 3 }}>{tx(r.jam.jumuah ? 'jumuah' : 'jamaat')} {ltr(fmtTime(r.jam.at))}</Txt>}
                  </View>
                  <Tap scale={0.9} accessibilityLabel={tx('adhanFor', { p: prayerName(lang, n) })} accessibilityState={{ checked: adhan[n] }}
                    onPress={() => { buzz(5); set(s => ({ adhan: { ...s.adhan, [n]: !s.adhan[n] } })); say(tx(adhan[n] ? 'adhanOffFor' : 'adhanOnFor', { p: prayerName(lang, n) })); if (!adhan[n]) enableNotifications(); }}
                    style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="bell" color={adhan[n] ? t.acc : t.t4} />
                  </Tap>
                  {r.canLog && (
                    <Tap scale={0.88} accessibilityLabel={tx(r.done ? 'unmark' : 'markPrayed', { p: prayerName(lang, n) })} accessibilityState={{ checked: r.done }}
                      onPress={() => {
                        buzz(r.done ? 5 : [10, 30, 16]);
                        setLog(key, n, r.done ? null : 'prayed');
                        if (!r.done) say(tx('logged', { p: prayerName(lang, n) }));
                      }}
                      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.done ? undefined : t.ctl3, ...bgImage(r.done ? G.brand : undefined), alignItems: 'center', justifyContent: 'center' }}>
                      {r.done && <Icon name="check" color="#111217" />}
                    </Tap>
                  )}
                </Tap>
              </FadeIn>
            );
          })}
        </View>
        <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
          <Tap scale={0.99} onPress={() => { buzz(6); router.push('/jamaat'); }} accessibilityRole="button" accessibilityLabel={tx('masjidTimesA11y')}
            style={{ borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <IconChip name="people" color={t.gold} />
            <View style={{ flex: 1 }}>
              <Txt ur={ur} style={{ fontSize: 16.5, fontWeight: 700 }}>{tx('masjidTimes')}</Txt>
              <Txt ur={ur} style={{ fontSize: 12.5, color: t.t2, marginTop: ur ? 0 : 3 }} numberOfLines={1}>
                {anyJamaat ? (ur ? `${masjid ? iso(masjid) : tx('yourMasjid')} · ${tx('setByYou', { n: String(Object.keys(jamaat).length) })}` : `${masjid || 'Your masjid'} · ${Object.keys(jamaat).length} set by you`) : tx('addMasjid')}
              </Txt>
            </View>
            <Icon name="chev" color={t.t2} />
          </Tap>
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
                <Txt ur={ur} style={{ fontSize: 26, fontWeight: 800, letterSpacing: ur ? 0 : -0.5 }}>{prayerName(lang, detail)}</Txt>
                <Txt ur={ur} style={{ fontSize: 14, color: t.t2, marginTop: ur ? 0 : 6 }}>{L(pd.time)} · {pd.win}</Txt>
              </View>
              <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: pd.badgeBg }}>
                <Txt ur={ur} style={{ fontSize: 12, fontWeight: 700, color: pd.badgeInk }}>{pd.badge}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <View style={{ flex: 1, borderRadius: 22, backgroundColor: t.sheetc, boxShadow: t.edge, padding: 14 }}>
                <Cap ur={ur}>{tx('beginsCap')}</Cap>
                <Txt style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{pd.time}</Txt>
                <Txt ur={ur} style={{ fontSize: 11.5, color: t.t4, marginTop: 4 }}>{adj[detail] ? tx('calcAdjusted', { n: `${adj[detail]! > 0 ? '+' : ''}${adj[detail]}` }) : tx('calcLocation')}</Txt>
              </View>
              <Tap scale={0.98} onPress={() => { setDetail(null); router.push('/jamaat'); }} accessibilityRole="button" accessibilityLabel={pd.jam ? tx('jamaatEdit', { t: L(fmtTime(pd.jam.at)) }) : tx('setJamaat')}
                style={{ flex: 1, borderRadius: 22, backgroundColor: t.sheetc, boxShadow: pd.jam ? 'inset 0 0 0 1px rgba(242,196,138,0.35)' : t.edge, padding: 14 }}>
                <Cap ur={ur} color={t.gold}>{tx(pd.jam?.jumuah ? 'jumuahCap' : 'jamaatCap')}</Cap>
                <Txt ur={ur && !pd.jam} style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: pd.jam ? t.tx : t.t4 }}>{pd.jam ? fmtTime(pd.jam.at) : tx('notSet')}</Txt>
                <Txt ur={ur} style={{ fontSize: 11.5, color: pd.jam ? t.t4 : t.acc, marginTop: 4 }} numberOfLines={1}>{pd.jam ? (masjid ? (ur ? iso(masjid) : masjid) : tx('setByYouShort')) : tx('addMasjidTime')}</Txt>
              </Tap>
            </View>
            <View style={{ marginTop: 10, borderRadius: 24, backgroundColor: t.sheetc, boxShadow: t.edge, paddingVertical: 16, paddingHorizontal: 18 }}>
              <Cap ur={ur}>{tx('rakahCap')}</Cap>
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
            <Cap ur={ur} style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>{tx('adhanSound')}</Cap>
            <Chips labels={ADHAN_CHOICES.map(c => c.label)} isOn={i => sound === i} onPick={i => set({ sound: i })} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginHorizontal: 4 }}>
              <View style={{ flex: 1 }}>
                <Txt ur={ur} style={{ fontSize: 14.5, fontWeight: 700 }}>{tx('shortOpening')}</Txt>
                <Txt ur={ur} style={{ fontSize: 12, lineHeight: ur ? 24 : 17, color: t.t2, marginTop: ur ? 0 : 2 }}>{tx('shortOpeningSub')}</Txt>
              </View>
              <Switch on={adhanShort} onToggle={() => set({ adhanShort: !adhanShort })} label={tx('shortOpening')} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginHorizontal: 4 }}>
              <Txt ur={ur} style={{ flex: 1, fontSize: 12, lineHeight: ur ? 24 : 17, color: t.t4 }}>
                {soundNote(sound, adhanShort)} {tx('playsAtVolume')}
              </Txt>
              <Tap onPress={() => { buzz(5); previewAdhan().catch(() => {}); }} accessibilityRole="button" accessibilityLabel={tx('hearAdhan')}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: t.ctl3 }}>
                <Txt ur={ur} style={{ fontSize: 13, fontWeight: 700 }}>{tx('hearIt')}</Txt>
              </Tap>
            </View>
            {day === 0 && <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Cta label={tx('missedBtn')} kind="secondary" height={56} size={16} style={{ flex: 1 }}
                onPress={() => { setLog(key, detail, 'missed'); setDetail(null); say(tx('addedQada', { p: prayerName(lang, detail) })); }} />
              <Cta label={tx('prayedOnTime')} height={56} size={16} style={{ flex: 1.4 }}
                onPress={() => { buzz([10, 30, 16]); setLog(key, detail, 'prayed'); setDetail(null); say(tx('logged', { p: prayerName(lang, detail) })); }} />
            </View>}
            {detail === 'Fajr' && <Tap onPress={() => { setDetail(null); router.push('/prayer/wake-alarm'); }}
              style={{ marginTop: 12, height: 54, borderRadius: 22, boxShadow: t.hair, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="qr" color={t.acc} />
              <Txt ur={ur} style={{ fontSize: 14.5, fontWeight: 700, color: t.acc }}>{tx('wakeVerify')}</Txt>
            </Tap>}
          </>
        )}
      </Sheet>
      <LocationSheet open={loc} onClose={() => setLoc(false)} />
    </View>
  );
}

