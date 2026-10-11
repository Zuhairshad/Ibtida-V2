import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, TextInput, View } from 'react-native';
import type { InstalledApp } from '../../modules/ibadah-lock';
import { useT } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { buzz, Tap, Txt } from './ui';

/**
 * Choose apps to lock: this phone's installed apps with their icons (Android builds), or the
 * built-in shortlist elsewhere. Selected apps are listed first.
 */
export function AppPicker({ apps, loading, selected, onChange, fromDevice }: {
  apps: InstalledApp[]; loading: boolean; selected: string[]; onChange: (pkgs: string[]) => void; fromDevice: boolean;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const sel = useMemo(() => new Set(selected), [selected]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? apps.filter(a => a.label.toLowerCase().includes(needle) || a.packageName.includes(needle)) : apps;
    return [...list].sort((a, b) => Number(sel.has(b.packageName)) - Number(sel.has(a.packageName)));
  }, [apps, q, sel]);
  const toggle = (pkg: string) => {
    buzz(5);
    onChange(sel.has(pkg) ? selected.filter(p => p !== pkg) : [...selected, pkg]);
  };

  if (loading) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
        <ActivityIndicator color={t.acc} />
        <Txt style={{ fontSize: 13, color: t.t2 }}>Finding the apps on your phone…</Txt>
      </View>
    );
  }
  return (
    <View>
      {fromDevice && apps.length > 8 && (
        <View style={{ height: 46, borderRadius: 23, backgroundColor: t.sunk, boxShadow: t.edge, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 }}>
          <Icon name="search" size={18} color={t.t4} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search apps" placeholderTextColor={t.t4} accessibilityLabel="Search apps"
            style={{ flex: 1, outlineWidth: 0, color: t.txw, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' }} />
        </View>
      )}
      <Txt style={{ fontSize: 12.5, color: t.t2, marginBottom: 8 }}>
        {selected.length ? `${selected.length} ${selected.length === 1 ? 'app' : 'apps'} chosen` : 'Tap the apps to lock'}
        {fromDevice ? '' : ' · install the Ibtida app build to choose from every app on your phone'}
      </Txt>
      <View style={{ borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, overflow: 'hidden' }}>
        {shown.length === 0 && <Txt style={{ fontSize: 13.5, color: t.t2, padding: 16 }}>No apps match “{q}”.</Txt>}
        {shown.map((a, i) => {
          const on = sel.has(a.packageName);
          return (
            <Tap key={a.packageName} scale={0.99} onPress={() => toggle(a.packageName)}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={a.label}
              style={{ paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              {a.icon
                ? <Image source={{ uri: a.icon }} style={{ width: 36, height: 36, borderRadius: 9 }} accessibilityIgnoresInvertColors />
                : <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.ctl3, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontSize: 15, fontWeight: 800, color: t.t5 }}>{a.label[0]}</Txt>
                  </View>}
              <Txt style={{ flex: 1, fontSize: 15, fontWeight: 600 }} numberOfLines={1}>{a.label}</Txt>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? t.acc : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: t.ctl4, alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="check" size={15} color="#111217" />}
              </View>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
