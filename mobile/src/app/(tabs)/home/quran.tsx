import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { Breathe } from '../../../components/motion';
import { BackBar, Screen, Seg, SerifTitle, Tap, Txt } from '../../../components/ui';
import { arNum } from '../../../data/content';
import { JUZ_STARTS, juzOf, juzPct, searchSurahs, SURAHS, surahPct } from '../../../data/surahs';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { G, bgImage } from '../../../theme/tokens';

type Row = { key: string; n: number; name: string; meta: string; ar: string; bar: number | null; s: number; a: number; label: string };

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function when(at: number, now = Date.now()) {
  const d = new Date(at);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return DAYS[d.getDay()];
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Quran() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState(0);
  const last = useApp(s => s.qLast);
  const hist = useApp(s => s.qHist);
  const qMax = useApp(s => s.qMax);
  const open = (s: number, a = 1) => router.push({ pathname: '/reader', params: { surah: String(s), ayah: String(a) } });
  const resumeAt = (s: number) => hist.find(h => h.s === s)?.a ?? 1;

  const rows: Row[] = tab === 0
    ? searchSurahs(q).map(m => {
        const max = qMax[String(m.n)];
        return { key: `s${m.n}`, n: m.n, name: m.name, meta: `${m.ayahs} ayat · ${m.place}`, ar: m.ar, bar: max ? surahPct(m.n, max) : null, s: m.n, a: resumeAt(m.n), label: `Surah ${m.name}, ${m.ayahs} ayat` };
      })
    : tab === 1
      ? JUZ_STARTS.map(([s, a], i) => {
          const j = i + 1;
          const pct = last ? juzPct(j, last.s, last.a) : null;
          return { key: `j${j}`, n: j, name: `Juz ${j}`, meta: `${pct != null ? `${pct}% read · ` : ''}Starts ${SURAHS[s - 1].name} ${s}:${a}`, ar: `الجزء ${arNum(j)}`, bar: pct, s, a, label: `Juz ${j}, starts at ${SURAHS[s - 1].name} ${s}:${a}` };
        })
      : hist.map(h => {
          const m = SURAHS[h.s - 1];
          return { key: `h${h.s}`, n: h.s, name: `${m.name} ${h.s}:${h.a}`, meta: `${when(h.at)} · ${surahPct(h.s, h.a)}% read`, ar: m.ar, bar: null, s: h.s, a: h.a, label: `Resume ${m.name} at ayah ${h.a}` };
        });

  const cur = last ? SURAHS[last.s - 1] : SURAHS[0];
  const pct = last ? surahPct(last.s, last.a) : 0;
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingHorizontal: 22 }}><SerifTitle a="The" b="Quran" /></View>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Tap scale={0.985} onPress={() => open(last?.s ?? 1, last?.a ?? 1)}
          accessibilityLabel={last ? `Continue reading Surah ${cur.name}, ayah ${last.a}` : 'Start reading Surah Al-Fatihah'}
          style={{ borderRadius: 32, padding: 22, overflow: 'hidden', ...bgImage(G.quran) }}>
          <Breathe bg={G.glowGoldSoft} style={{ width: 200, height: 200, right: -50, top: -60 }} dur={10000} />
          <Txt style={{ fontSize: 11.5, letterSpacing: 0.7, color: 'rgba(255,255,255,0.8)' }}>{last ? 'CONTINUE READING' : 'START READING'}</Txt>
          <Txt style={{ fontSize: 26, fontWeight: 800, marginTop: 8, letterSpacing: -0.5, color: '#FFFFFF' }}>Surah {cur.name}</Txt>
          <Txt style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            {last ? `Ayah ${last.a} · Juz ${juzOf(last.s, last.a)}` : `${cur.ayahs} ayat · ${cur.place}`}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#FFFFFF', borderRadius: 3 }} />
            </View>
            <Txt style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{pct}%</Txt>
          </View>
        </Tap>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: t.card }}>
          <Icon name="search" color={t.t4} />
          <TextInput value={q} onChangeText={v => { setQ(v); if (v) setTab(0); }} placeholder="Search surah name or number" placeholderTextColor={t.t4} accessibilityLabel="Search surahs"
            style={{ outlineWidth: 0, flex: 1, color: t.txw, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' }} />
        </View>
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <Seg labels={['Surahs', 'Juz', 'History']} value={tab} onChange={setTab} height={42} size={13.5} />
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16, gap: 8 }}>
        {rows.map(r => (
          <Tap key={r.key} scale={0.985} onPress={() => open(r.s, r.a)} accessibilityLabel={r.label}
            style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.ctl, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 14, fontWeight: 800, color: t.acc }}>{r.n}</Txt>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={{ fontSize: 16, fontWeight: 700 }}>{r.name}</Txt>
              <Txt numberOfLines={1} style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{r.meta}</Txt>
            </View>
            {r.bar != null && (
              <View style={{ width: 52, height: 5, borderRadius: 3, backgroundColor: t.ctl3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${r.bar}%`, backgroundColor: t.acc }} />
              </View>
            )}
            <Txt ar style={{ fontSize: 21, color: t.gold }}>{r.ar}</Txt>
          </Tap>
        ))}
        {rows.length === 0 && (
          <View style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
            <Txt style={{ fontSize: 16, fontWeight: 700 }}>{tab === 2 ? 'Nothing read yet' : 'No matches'}</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>{tab === 2 ? 'Surahs you open will appear here.' : 'Try a surah number, like 18.'}</Txt>
          </View>
        )}
      </View>
    </Screen>
  );
}
