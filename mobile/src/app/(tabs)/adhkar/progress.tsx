import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Icon, type IconName } from '../../../components/Icon';
import { BackBar, Label, Screen, Seg, SerifTitle, Txt } from '../../../components/ui';
import { fmt, PH } from '../../../data/content';
import { addDays, dayKey } from '../../../lib/prayer';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { G, bgImage } from '../../../theme/tokens';

type Day = { p: number; d: number; s: number; q: number };

export default function Progress() {
  const t = useT();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState(1);
  const logs = useApp(s => s.logs);
  const act = useApp(s => s.act);
  const days = [1, 7, 30, 365][range];
  // Everything here comes from the on-device logs: prayers marked, dhikr counted, adhkar sessions
  // finished and Quran ayahs newly reached.
  const dayAt = useMemo(() => (i: number): Day => {
    const k = dayKey(addDays(new Date(), -i));
    const l = logs[k] || {};
    const a = act[k];
    return { p: PH.filter(p => l[p] === 'prayed').length, d: a?.d ?? 0, s: a?.s ?? 0, q: a?.q ?? 0 };
  }, [logs, act]);
  const tot = useMemo(() => {
    const o = { p: 0, d: 0, s: 0, q: 0 };
    for (let i = 0; i < days; i++) { const x = dayAt(i); o.p += x.p; o.d += x.d; o.s += x.s; o.q += x.q; }
    return o;
  }, [dayAt, days]);
  const stats: [IconName, string, string, string][] = [
    ['prayer', t.peri, String(tot.p), 'Prayers logged'],
    ['beads', t.acc, fmt(tot.d), 'Dhikr counted'],
    ['book', t.mint, fmt(tot.q), 'Ayahs read'],
    ['moon', t.lav, String(tot.s), 'Adhkar sessions'],
  ];
  // 14 bars, oldest → today. Each bar covers 1, 1, 7 or 30 days depending on the range.
  const span = [1, 1, 7, 30][range];
  const score = (x: Day) => x.p * 20 + x.d + x.s * 30 + x.q * 2;
  const bars = useMemo(() => Array.from({ length: 14 }, (_, b) => {
    let v = 0;
    for (let k = 0; k < span; k++) v += score(dayAt((13 - b) * span + k));
    return v;
  }), [dayAt, span]);
  const maxBar = Math.max(1, ...bars);
  const heat = useMemo(() => Array.from({ length: 84 }, (_, i) => score(dayAt(83 - i))), [dayAt]);
  const maxHeat = Math.max(1, ...heat);
  const heatC = (v: number) => { const r = v / maxHeat; return v === 0 ? t.ctl2 : r > 0.66 ? t.acc : r > 0.33 ? '#B9743F' : '#6B4A2E'; };
  const cell = (width - 32 - 40 - 5 * 11) / 12;
  const empty = bars.every(b => b === 0);
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingHorizontal: 22 }}><SerifTitle a="Your" b="Growth" /></View>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Seg labels={['Today', 'Week', 'Month', 'Year']} value={range} onChange={setRange} height={42} size={13.5} />
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map(([ic, ink, v, l]) => (
          <View key={l} style={{ width: (width - 42) / 2, borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
            <Icon name={ic} color={ink} />
            <Txt style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.9, marginTop: 12 }}>{v}</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{l}</Txt>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 20 }}>
          <Label>DAILY ACTIVITY</Label>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, marginTop: 16 }}>
            {bars.map((h, i) => <View key={i} style={{ flex: 1, height: `${Math.max(3, (h / maxBar) * 100)}%`, borderRadius: 6, backgroundColor: i === 13 && h ? undefined : t.ctl4, opacity: h ? 1 : 0.5, ...bgImage(i === 13 && h ? G.brandV : undefined) }} />)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Txt style={{ fontSize: 12, color: t.t4 }}>{empty ? 'Your activity will appear here' : ['2 weeks ago', '2 weeks ago', '14 weeks ago', '14 months ago'][range]}</Txt>
            <Txt style={{ fontSize: 12, color: t.t4 }}>Today</Txt>
          </View>
        </View>
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 20 }}>
          <Label>LAST 84 DAYS</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 16 }}>
            {heat.map((v, i) => <View key={i} style={{ width: cell, height: cell, borderRadius: 5, backgroundColor: heatC(v) }} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <Txt style={{ fontSize: 12, color: t.t4 }}>Less</Txt>
            {[t.ctl2, '#6B4A2E', '#B9743F', t.acc].map(c => <View key={c} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} />)}
            <Txt style={{ fontSize: 12, color: t.t4 }}>More</Txt>
          </View>
        </View>
      </View>
    </Screen>
  );
}
