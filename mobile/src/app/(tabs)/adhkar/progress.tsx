import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Icon, type IconName } from '../../../components/Icon';
import { BackBar, Label, Screen, Seg, SerifTitle, Txt } from '../../../components/ui';
import { fmt, PH, rnd } from '../../../data/content';
import { addDays, dayKey } from '../../../lib/prayer';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { G, bgImage } from '../../../theme/tokens';

export default function Progress() {
  const t = useT();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState(1);
  const logs = useApp(s => s.logs);
  const mul = [0.14, 1, 4.3, 52][range];
  const days = [1, 7, 30, 365][range];
  // Prayers come from the real on-device log; other series use seeded sample history until sync lands.
  const prayed = useMemo(() => {
    let n = 0;
    for (let i = 0; i < days; i++) { const l = logs[dayKey(addDays(new Date(), -i))] || {}; n += PH.filter(p => l[p] === 'prayed').length; }
    return n;
  }, [logs, days]);
  const stats: [IconName, string, string, string][] = [
    ['prayer', t.peri, String(prayed), 'Prayers logged'],
    ['beads', t.acc, fmt(Math.round(2620 * mul)), 'Dhikr counted'],
    ['book', t.mint, String(Math.round(9 * mul)), 'Quran pages'],
    ['moon', t.lav, String(Math.round(6 * mul)), 'Adhkar sessions'],
  ];
  const bars = useMemo(() => { const r = rnd(range + 3); return Array.from({ length: 14 }, () => Math.round(28 + r() * 66)); }, [range]);
  const heat = useMemo(() => { const r = rnd(11); return Array.from({ length: 84 }, () => r()); }, []);
  const heatC = (v: number) => (v > 0.72 ? t.acc : v > 0.45 ? '#B9743F' : v > 0.2 ? '#6B4A2E' : t.ctl2);
  const cell = (width - 32 - 40 - 5 * 11) / 12;
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingHorizontal: 22 }}><SerifTitle a="Your" b="Growth" /></View>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Seg labels={['Today', 'Week', 'Month', 'Year']} value={range} onChange={setRange} height={42} size={13.5} />
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map(([ic, ink, v, l]) => (
          <View key={l} style={{ width: (width - 42) / 2, borderRadius: 26, backgroundColor: t.card, padding: 18 }}>
            <Icon name={ic} color={ink} />
            <Txt style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.9, marginTop: 12 }}>{v}</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{l}</Txt>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.card, padding: 20 }}>
          <Label>DAILY ACTIVITY</Label>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, marginTop: 16 }}>
            {bars.map((h, i) => <View key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 6, backgroundColor: i === 13 ? undefined : t.ctl4, ...bgImage(i === 13 ? G.brandV : undefined) }} />)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Txt style={{ fontSize: 12, color: t.t4 }}>{['Midnight', '2 weeks ago', '14 weeks ago', '14 months ago'][range]}</Txt>
            <Txt style={{ fontSize: 12, color: t.t4 }}>Today</Txt>
          </View>
        </View>
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.card, padding: 20 }}>
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
