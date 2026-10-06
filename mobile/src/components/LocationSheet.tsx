import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { METHODS } from '../data/content';
import { detectCity } from '../lib/location';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { PlaceSearch } from './PlaceSearch';
import { IconChip, Cta, Label, Seg, say, Sheet, Tap, Txt } from './ui';

export function MadhabSeg({ bg }: { bg?: string }) {
  const hanafi = useApp(s => s.hanafi);
  return <Seg labels={['Hanafi', 'Shafi‘i, Maliki, Hanbali']} value={hanafi ? 0 : 1} onChange={i => set({ hanafi: i === 0 })} height={44} radius={20} inner={16} bg={bg} size={14} />;
}

export function useDetect() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const c = await detectCity();
      set(s => ({ city: c, ob: { ...s.ob, place: true } }));
      say('Location set · ' + c.name);
    } catch {
      say('Location unavailable — pick your city instead');
    } finally {
      setBusy(false);
    }
  };
  return { busy, label: busy ? 'Detecting location…' : 'Use my current location', run };
}

/** "Location & method" sheet from the Prayer header. */
export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const city = useApp(s => s.city);
  const method = useApp(s => s.method);
  const det = useDetect();
  return (
    <Sheet open={open} onClose={onClose}>
      <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Location &amp; method</Txt>
      <Tap onPress={det.run} style={{ marginTop: 16, borderRadius: 24, backgroundColor: t.sheetc, boxShadow: t.edge, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <IconChip name="pin" color={t.acc} bg={t.ctl3} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 16, fontWeight: 700 }}>{city.name}</Txt>
          <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 3 }}>{det.label}</Txt>
        </View>
      </Tap>
      <View style={{ marginTop: 10 }}>
        <PlaceSearch selected={city.name} onPick={c => { set({ city: c }); say('Location set · ' + c.name); }} />
      </View>
      <Label style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>CALCULATION METHOD</Label>
      <View style={{ borderRadius: 24, backgroundColor: t.sheetc, boxShadow: t.edge, overflow: 'hidden' }}>
        {METHODS.map((m, i) => (
          <Pressable key={m.k} onPress={() => set({ method: i })} accessibilityRole="radio" accessibilityState={{ checked: method === i }}
            style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: i < METHODS.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
            <Txt style={{ fontSize: 14.5, fontWeight: 600, flex: 1 }}>{m.name}</Txt>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.ctl4, alignItems: 'center', justifyContent: 'center' }}>
              {method === i && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: t.acc }} />}
            </View>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 12 }}><MadhabSeg bg={t.sheetc} /></View>
      <Cta label="Save & recalculate" height={58} size={17} style={{ marginTop: 18 }} onPress={() => { onClose(); say('Times recalculated · reminders rescheduled'); }} />
    </Sheet>
  );
}
