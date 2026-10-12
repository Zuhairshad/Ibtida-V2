import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Cap } from '../components/Cap';
import { Icon } from '../components/Icon';
import { BackBar, buzz, Cta, ListCard, say, Screen, Seg, Sheet, Statement, Tap, Txt, WheelSet } from '../components/ui';
import { PH, type PrayerName } from '../data/content';
import { ltr } from '../data/reminders';
import { usePrayerNow } from '../lib/hooks';
import { prayerName, useLang } from '../lib/i18n';
import { fmtMin, fmtTime } from '../lib/prayer';
import { set, useApp, type JamaatSlot } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const SLOTS: JamaatSlot[] = [...PH, 'Jumuah'];
const HRS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const ADJ_MAX = 60;

/** Minutes after midnight for a time of day. */
const minOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Wheels for one jamaat time: hour, 5-minute steps and AM/PM, with ±1 minute for exact timetables. */
function TimeSheet({ slot, start, onClose }: { slot: JamaatSlot | null; start: number; onClose: () => void }) {
  const t = useT();
  const { lang, ur, t: tx } = useLang();
  const L = (x: string) => (ur ? ltr(x) : x);
  const label = (sl: JamaatSlot) => (sl === 'Jumuah' ? tx('jumuah') : prayerName(lang, sl));
  const jamaat = useApp(s => s.jamaat);
  const saved = slot ? jamaat[slot] : undefined;
  // The wheels open on the saved time, or on the prayer's start as a place to begin turning from.
  // Nothing is stored until Save.
  const [min, setMin] = useState(saved ?? Math.ceil(start / 5) * 5 % 1440);
  const [shown, setShown] = useState<JamaatSlot | null>(slot);
  if (slot !== shown) { setShown(slot); setMin(saved ?? Math.ceil(start / 5) * 5 % 1440); }

  const h = Math.floor(min / 60);
  const m = min % 60;
  const put = (hh: number, mm: number) => setMin((((hh * 60 + mm) % 1440) + 1440) % 1440);
  const h12 = (h % 12 || 12) - 1;
  const pm = h >= 12 ? 1 : 0;
  const setClock = (hi: number, ap: number) => put(((hi + 1) % 12) + (ap ? 12 : 0), m);
  const early = slot && slot !== 'Jumuah' && min < start;

  const save = () => {
    if (!slot) return;
    set(s => ({ jamaat: { ...s.jamaat, [slot]: min } }));
    say(tx('savedJamaat', { l: label(slot), t: L(fmtMin(min)) }));
    onClose();
  };
  const clear = () => {
    if (!slot) return;
    set(s => { const j = { ...s.jamaat }; delete j[slot]; return { jamaat: j }; });
    say(tx('clearedJamaat', { l: label(slot) }));
    onClose();
  };

  return (
    <Sheet open={!!slot} onClose={onClose}>
      {slot && (
        <>
          <Txt ur={ur} style={{ fontSize: 24, fontWeight: 800, letterSpacing: ur ? 0 : -0.4 }}>{tx('slotJamaat', { l: label(slot) })}</Txt>
          <Txt ur={ur} style={{ fontSize: 13.5, color: t.t2, marginTop: ur ? 0 : 6 }}>{tx('enterTime')}</Txt>
          <View style={{ marginTop: 14 }}>
            <WheelSet inset={30} cols={[
              { values: HRS, idx: h12, onPick: i => setClock(i, pm) },
              { values: MINS, idx: Math.floor(m / 5), onPick: i => put(h, i * 5 + (m % 5)) },
              { values: ['AM', 'PM'], idx: pm, onPick: a => setClock(h12, a) },
            ]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <Tap onPress={() => { buzz(4); put(h, m - 1); }} accessibilityLabel={tx('minEarlier')} style={{ width: 52, height: 40, borderRadius: 20, backgroundColor: t.ctl2, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 14, fontWeight: 700 }}>−1</Txt>
            </Tap>
            <Txt style={{ fontSize: 20, fontWeight: 800, minWidth: 110, textAlign: 'center' }} accessibilityLiveRegion="polite">{fmtMin(min)}</Txt>
            <Tap onPress={() => { buzz(4); put(h, m + 1); }} accessibilityLabel={tx('minLater')} style={{ width: 52, height: 40, borderRadius: 20, backgroundColor: t.ctl2, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 14, fontWeight: 700 }}>+1</Txt>
            </Tap>
          </View>
          {early && (
            <Txt ur={ur} style={{ fontSize: 12.5, lineHeight: ur ? 26 : 18, color: t.acc, textAlign: 'center', marginTop: 10 }}>
              {tx('earlyWarn', { l: label(slot), t: L(fmtMin(start)) })}
            </Txt>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {saved !== undefined && <Cta label={tx('clear')} kind="secondary" height={54} size={15} style={{ flex: 1 }} onPress={clear} />}
            <Cta label={tx('save')} height={54} size={15} style={{ flex: 1.4 }} onPress={save} />
          </View>
        </>
      )}
    </Sheet>
  );
}

/**
 * Masjid & timings: the user's masjid, its jamaat times (only ever entered by the user — never
 * calculated or estimated), the Asr school their community follows, and per-prayer corrections to
 * the calculated start times.
 */
export default function JamaatScreen() {
  const t = useT();
  const { times } = usePrayerNow();
  const masjid = useApp(s => s.masjid);
  const jamaat = useApp(s => s.jamaat);
  const hanafi = useApp(s => s.hanafi);
  const adj = useApp(s => s.adj);
  const { lang, ur, t: tx } = useLang();
  const L = (x: string) => (ur ? ltr(x) : x);
  const label = (sl: JamaatSlot) => (sl === 'Jumuah' ? tx('jumuah') : prayerName(lang, sl));
  const sa = ur ? 'right' : undefined;
  const [name, setName] = useState(masjid);
  const [edit, setEdit] = useState<JamaatSlot | null>(null);

  const startOf = (slot: JamaatSlot) => minOf(times[slot === 'Jumuah' ? 'Dhuhr' : slot]);
  const nudge = (p: PrayerName, d: number) => {
    buzz(4);
    set(s => {
      const v = Math.max(-ADJ_MAX, Math.min(ADJ_MAX, (s.adj[p] ?? 0) + d));
      const a = { ...s.adj };
      if (v) a[p] = v; else delete a[p];
      return { adj: a };
    });
  };
  const anyAdj = Object.values(adj).some(Boolean);

  return (
    <Screen tabs={false} top={54}>
      <BackBar title={tx('jTitle')} />
      {ur ? (
        <Txt ur accessibilityRole="header" style={{ fontSize: 28, lineHeight: 56, paddingTop: 10, paddingHorizontal: 22, textAlign: 'right' }}>
          {tx('jStmA')}{'\n'}<Txt ur style={{ fontSize: 28, color: t.t6 }}>{tx('jStmB')}</Txt>
        </Txt>
      ) : <Statement a="Your masjid’s times." b="Entered by you, never guessed." style={{ paddingTop: 10, paddingHorizontal: 22 }} />}

      <Cap ur={ur} style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26, textAlign: sa }}>{tx('masjidCap')}</Cap>
      <View style={{ marginHorizontal: 16 }}>
        <TextInput value={name} onChangeText={setName} onEndEditing={() => set({ masjid: name.trim().slice(0, 60) })} onBlur={() => set({ masjid: name.trim().slice(0, 60) })}
          placeholder={tx('masjidPlaceholder')} placeholderTextColor={t.t4} accessibilityLabel={tx('masjidName')} maxLength={60} returnKeyType="done"
          style={{ outlineWidth: 0, height: 56, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, paddingHorizontal: 18, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }} />
      </View>

      <Cap ur={ur} style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26, textAlign: sa }}>{tx('jamaatTimesCap')}</Cap>
      <ListCard>
        {SLOTS.map(slot => {
          const v = jamaat[slot];
          const sub = slot === 'Jumuah' ? tx('jumuahSub') : tx('beginsToday', { t: L(fmtTime(times[slot])) });
          return (
            <Tap key={slot} scale={0.99} onPress={() => { buzz(6); setEdit(slot); }} accessibilityRole="button"
              accessibilityLabel={`${tx('slotJamaat', { l: label(slot) })}${ur ? '،' : ','} ${v !== undefined ? L(fmtMin(v)) : tx('notSetLower')}`}
              style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Txt ur={ur} style={{ fontSize: 15.5, fontWeight: 700, textAlign: sa }}>{label(slot)}</Txt>
                <Txt ur={ur} style={{ fontSize: 12.5, color: t.t2, marginTop: ur ? 0 : 3, textAlign: sa }}>{sub}</Txt>
              </View>
              <View style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: v !== undefined ? 'rgba(242,196,138,0.14)' : t.ctl }}>
                <Txt ur={ur && v === undefined} style={{ fontSize: 13.5, fontWeight: 700, color: v !== undefined ? t.gold : t.t4 }}>{v !== undefined ? fmtMin(v) : tx('notSet')}</Txt>
              </View>
              <Icon name="chev" color={t.t4} />
            </Tap>
          );
        })}
      </ListCard>
      <Txt ur={ur} style={{ fontSize: 12.5, lineHeight: ur ? 26 : 18.5, color: t.t4, marginTop: 10, marginHorizontal: 26, textAlign: sa }}>{tx('neverCalculated')}</Txt>

      <Cap ur={ur} style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26, textAlign: sa }}>{tx('schoolCap')}</Cap>
      <View style={{ marginHorizontal: 16 }}>
        <Seg labels={[tx('schoolSunnat'), tx('schoolHadith')]} value={hanafi ? 0 : 1} onChange={i => set({ hanafi: i === 0 })} height={44} radius={20} inner={16} size={14} />
      </View>
      <Txt ur={ur} style={{ fontSize: 12.5, lineHeight: ur ? 26 : 18.5, color: t.t4, marginTop: 10, marginHorizontal: 26, textAlign: sa }}>
        {tx(hanafi ? 'hanafiExplain' : 'standardExplain')}
        {' '}{tx('asrToday', { t: L(fmtTime(times.Asr)) })}
      </Txt>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>
        <Cap ur={ur} style={{ flex: 1, textAlign: sa }}>{tx('adjustCap')}</Cap>
        {anyAdj && (
          <Tap onPress={() => { buzz(5); set({ adj: {} }); say(tx('resetToast')); }} accessibilityRole="button" hitSlop={8}>
            <Txt ur={ur} style={{ fontSize: 12.5, fontWeight: 700, color: t.acc }}>{tx('reset')}</Txt>
          </Tap>
        )}
      </View>
      <ListCard>
        {PH.map(p => {
          const v = adj[p] ?? 0;
          return (
            <View key={p} style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt ur={ur} style={{ fontSize: 15.5, fontWeight: 700, textAlign: sa }}>{prayerName(lang, p)}</Txt>
                <Txt ur={ur} style={{ fontSize: 12.5, color: t.t2, marginTop: ur ? 0 : 3, textAlign: sa }}>
                  {ur
                    ? `${tx('begins')} ${L(fmtTime(times[p]))}${v ? ` · ${tx('minutes', { n: `${v > 0 ? '+' : ''}${v}` })}` : ` · ${tx('calculated')}`}`
                    : `Begins ${fmtTime(times[p])}${v ? ` · ${v > 0 ? '+' : ''}${v} min` : ' · calculated'}`}
                </Txt>
              </View>
              <Tap onPress={() => nudge(p, -1)} disabled={v <= -ADJ_MAX} accessibilityLabel={tx('oneEarlier', { p: prayerName(lang, p) })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.ctl2, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: 18, fontWeight: 700 }}>−</Txt>
              </Tap>
              <Txt style={{ width: 40, textAlign: 'center', fontSize: 14, fontWeight: 700, color: v ? t.acc : t.t4 }} accessibilityLabel={tx('adjustmentA11y', { p: prayerName(lang, p), v: String(v) })}>{v > 0 ? `+${v}` : v}</Txt>
              <Tap onPress={() => nudge(p, 1)} disabled={v >= ADJ_MAX} accessibilityLabel={tx('oneLater', { p: prayerName(lang, p) })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.ctl2, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: 18, fontWeight: 700 }}>+</Txt>
              </Tap>
            </View>
          );
        })}
      </ListCard>
      <Txt ur={ur} style={{ fontSize: 12.5, lineHeight: ur ? 26 : 18.5, color: t.t4, marginTop: 10, marginHorizontal: 26, marginBottom: 10, textAlign: sa }}>{tx('adjustHelp')}</Txt>

      <TimeSheet slot={edit} start={edit ? startOf(edit) : 0} onClose={() => setEdit(null)} />
    </Screen>
  );
}
