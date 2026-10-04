import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { FadeIn } from '../components/motion';
import { BackBar, buzz, say, Seg, Sheet, Switch, Tap, Txt, UrduToggle } from '../components/ui';
import { useUrdu } from '../lib/hooks';
import { set, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';

const THEMES: [string, string][] = [['#16171D', '#22232A'], ['#0B0C10', '#16171C'], ['#211C15', '#2E2720']];

function Ayah({ n, card, pad }: { n: number; card: string; pad: number }) {
  const t = useT();
  const marked = useApp(s => !!s.marks[n]);
  const showTr = useApp(s => s.showTr);
  const [urOn, urFlip] = useUrdu('ayah' + n);
  return (
    <View style={{ borderRadius: 28, backgroundColor: card, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(242,166,90,0.12)' }}>
          <Txt style={{ fontSize: 12.5, fontWeight: 800, color: t.acc }}>2:{n}</Txt>
        </View>
        <UrduToggle on={urOn} onPress={urFlip} />
        <Tap scale={0.9} accessibilityLabel={marked ? `Remove bookmark 2:${n}` : `Bookmark 2:${n}`} accessibilityState={{ checked: marked }}
          onPress={() => { buzz(6); set(s => ({ marks: { ...s.marks, [n]: !s.marks[n] } })); say(marked ? 'Bookmark removed' : `Bookmarked 2:${n}`); }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={marked ? 'bookmarkF' : 'bookmark'} color={marked ? t.acc : t.t2} />
        </Tap>
      </View>
      <View style={{ marginTop: 12, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.14)', paddingVertical: pad, paddingHorizontal: 16, alignItems: 'center' }}>
        <Txt style={{ fontSize: 14, fontWeight: 600, color: '#D8D6D2' }}>Arabic loads from the licensed Mushaf</Txt>
        <Txt style={{ fontSize: 12, color: t.t4, marginTop: 5 }}>Scripture is never generated · §35</Txt>
      </View>
      {showTr && <Txt style={{ fontSize: 14.5, lineHeight: 23, color: t.t3, marginTop: 12 }}>Licensed translation loading…</Txt>}
      {urOn && <FadeIn dur={300}><Txt ur style={{ fontSize: 15, lineHeight: 32, color: t.t3, textAlign: 'right', marginTop: 10 }}>اردو ترجمہ لائسنس یافتہ ماخذ سے لوڈ ہو رہا ہے…</Txt></FadeIn>}
    </View>
  );
}

function Reader() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const rTheme = useApp(s => s.rTheme);
  const fontSize = useApp(s => s.fontSize);
  const showTr = useApp(s => s.showTr);
  const urduAll = useApp(s => s.urduAll);
  const [sheet, setSheet] = useState(false);
  const [bg, card] = THEMES[rTheme];
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: ins.top + 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <BackBar right={
          <Pressable onPress={() => { buzz(6); setSheet(true); }} accessibilityLabel="Reading settings" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 16, fontWeight: 800 }}>Aa</Txt>
          </Pressable>
        } />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ins.top + 6, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 16, fontWeight: 700 }}>Al-Baqarah</Txt>
          <Txt style={{ fontSize: 12, color: t.t2 }}>Juz 2 · Madinah</Txt>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 30, gap: 12 }}>
        {[183, 184, 185, 186].map(n => <Ayah key={n} n={n} card={card} pad={Math.round(fontSize * 0.9)} />)}
      </ScrollView>
      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Reading settings</Txt>
        <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Txt style={{ fontSize: 15, fontWeight: 700 }}>Arabic size</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{fontSize} pt</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[['Smaller', 14, -2], ['Larger', 20, 2]].map(([l, fs, d]) => (
              <Tap key={l as string} scale={0.9} accessibilityLabel={l as string} onPress={() => set(s => ({ fontSize: Math.max(22, Math.min(44, s.fontSize + (d as number))) }))}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: fs as number, fontWeight: 800, color: '#FFFFFF' }}>A</Txt>
              </Tap>
            ))}
          </View>
        </View>
        <View style={{ marginTop: 10, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt style={{ fontSize: 15, fontWeight: 700 }}>Show translation</Txt>
          <Switch on={showTr} label="Show translation" onToggle={() => set({ showTr: !showTr })} />
        </View>
        <View style={{ marginTop: 10, borderRadius: 24, backgroundColor: t.sheetc, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 15, fontWeight: 700 }}>Urdu translation</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>Show under every verse and hadith</Txt>
          </View>
          <Switch on={urduAll} label="Urdu translation for all" onToggle={() => { set({ urduAll: !urduAll, urdu: {} }); say(`Urdu translation ${urduAll ? 'hidden' : 'shown'} everywhere`); }} />
        </View>
        <View style={{ marginTop: 10 }}>
          <Seg labels={['Night', 'Midnight', 'Sepia']} value={rTheme} onChange={i => set({ rTheme: i })} height={44} radius={20} inner={16} bg={t.sheetc} size={14} />
        </View>
      </Sheet>
    </View>
  );
}

export default function ReaderScreen() {
  return <Immersive><Reader /></Immersive>;
}
