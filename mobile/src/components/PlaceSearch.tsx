import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import type { City } from '../data/content';
import { offlinePlaces, searchPlaces, type Place } from '../lib/places';
import { useT } from '../theme/ThemeProvider';
import { buzz, Txt } from './ui';

/** Type-ahead search over every city and town worldwide; falls back to built-in cities offline. */
export function PlaceSearch({ onPick, selected, big, autoFocus }: { onPick: (c: City) => void; selected?: string; big?: boolean; autoFocus?: boolean }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Place[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'offline' | 'done'>('idle');

  useEffect(() => {
    const s = q.trim();
    const ac = new AbortController();
    // Debounce so typing "Birmingham" sends one request, not ten.
    const id = setTimeout(async () => {
      if (!s) { setHits([]); setState('idle'); return; }
      setState('busy');
      try {
        const r = await searchPlaces(s, ac.signal);
        if (!ac.signal.aborted) { setHits(r); setState('done'); }
      } catch {
        if (!ac.signal.aborted) { setHits(offlinePlaces(s)); setState('offline'); }
      }
    }, 300);
    return () => { clearTimeout(id); ac.abort(); };
  }, [q]);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: big ? 60 : 52, borderRadius: 22, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 18 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search city or town" placeholderTextColor={t.t4} accessibilityLabel="City" selectionColor={t.acc}
          autoFocus={autoFocus} autoCorrect={false} returnKeyType="search"
          style={{ outlineWidth: 0, flex: 1, minWidth: 0, color: t.txw, fontSize: big ? 19 : 16, fontFamily: 'PlusJakartaSans_600SemiBold' }} />
        {state === 'busy' && <ActivityIndicator color={t.acc} />}
      </View>
      {hits.length > 0 && (
        <View style={{ marginTop: 10, borderRadius: 22, backgroundColor: t.sunk, boxShadow: t.edge, overflow: 'hidden' }}>
          {hits.map((c, i) => {
            const on = c.name === selected;
            return (
              <Pressable key={`${c.detail}-${i}`} onPress={() => { buzz(6); onPick({ name: c.name, lat: c.lat, lng: c.lng, ...(c.cc ? { cc: c.cc } : {}) }); setQ(''); setHits([]); setState('idle'); }}
                accessibilityRole="button" accessibilityLabel={c.detail} accessibilityState={{ selected: on }}
                style={{ paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
                <Txt style={{ fontSize: 16, fontWeight: 700, color: on ? t.acc : t.tx }}>{c.detail.split(', ')[0]}</Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 2 }}>{c.detail.split(', ').slice(1).join(', ') || ' '}</Txt>
              </Pressable>
            );
          })}
        </View>
      )}
      {state === 'done' && !hits.length && <Txt style={{ fontSize: 13, color: t.t2, textAlign: 'center', marginTop: 10 }}>No places found — check the spelling.</Txt>}
      {state === 'offline' && <Txt style={{ fontSize: 12.5, color: t.t4, textAlign: 'center', marginTop: 8 }}>Offline — showing built-in cities only.</Txt>}
    </View>
  );
}
