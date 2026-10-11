import { View } from 'react-native';
import type { IconName } from '../../../components/Icon';
import { BackBar, Label, ListCard, Screen, Seg, Statement, SwitchRow, Txt } from '../../../components/ui';
import { ayahFor, prayerNotice, type NotifLang } from '../../../data/reminders';
import { usePrayerNow } from '../../../lib/hooks';
import { enableNotifications } from '../../../lib/notifications';
import { fmtTime, jamaatAt } from '../../../lib/prayer';
import { set, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';

const ROWS: [string, string, IconName][] = [
  ['Prayer', 'Adhan at each prayer time', 'prayer'],
  ['Adhkar', '“Your evening adhkar are ready.”', 'moon'],
  ['Goals', 'One reminder at your set time', 'beads'],
  ['Quran', 'A gentle nudge after Fajr', 'book'],
  ['Focus', 'When Ibadah Lock starts and ends', 'lock'],
  ['Community', 'Circle milestones only', 'people'],
];
const LANGS: NotifLang[] = ['en', 'ur', 'both'];

/** How the next adhan notification will read, in the chosen language. */
function Preview() {
  const t = useT();
  const lang = useApp(s => s.notifLang);
  const { next } = usePrayerNow();
  const jamaat = useApp(s => s.jamaat);
  const masjid = useApp(s => s.masjid);
  const j = jamaatAt(jamaat, next.name, next.at);
  const n = prayerNotice(lang, next.name, fmtTime(next.at), ayahFor(next.at, next.idx), undefined, j ? { time: fmtTime(j.at), jumuah: j.jumuah, masjid: masjid || undefined } : undefined);
  const lines = n.body.split('\n');
  const isUr = (s: string) => /[؀-ۿ]/.test(s) && !/^[A-Za-z“]/.test(s);
  return (
    <View style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }} accessibilityLabel="Notification preview">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: t.acc }} />
        <Txt style={{ fontSize: 12, fontWeight: 700, color: t.t2 }}>IBTIDA · {fmtTime(next.at)}</Txt>
      </View>
      <Txt style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>{n.title}</Txt>
      {lines.map((l, i) => i === 0
        ? <Txt key={i} ar style={{ fontSize: 19, lineHeight: 36, color: t.t5, marginTop: 6, textAlign: 'right', writingDirection: 'rtl' }}>{l}</Txt>
        : <Txt key={i} ur={isUr(l)} style={{ fontSize: isUr(l) ? 14 : 13.5, lineHeight: isUr(l) ? 28 : 19.5, color: t.t2, marginTop: 4, textAlign: isUr(l) ? 'right' : 'left' }}>{l}</Txt>)}
    </View>
  );
}

export default function Notifications() {
  const n = useApp(s => s.notifs);
  const lang = useApp(s => s.notifLang);
  const quotes = useApp(s => s.notifQuotes);
  const launch = useApp(s => s.launchAyah);
  return (
    <Screen top={54}>
      <BackBar title="Notifications" />
      <Statement a="Gentle reminders." b="Never noise." style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <ListCard style={{ marginTop: 18 }}>
        {ROWS.map(([l, s, ic], i) => <SwitchRow key={l} label={l} sub={s} icon={ic} on={n[i]} onToggle={() => { const a = n.slice(); a[i] = !a[i]; set({ notifs: a }); if (a[i]) enableNotifications(); }} />)}
      </ListCard>
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>LANGUAGE · زبان</Label>
      <View style={{ paddingHorizontal: 16 }}>
        <Seg labels={['English', 'اردو', 'Both · دونوں']} value={Math.max(0, LANGS.indexOf(lang))} onChange={i => set({ notifLang: LANGS[i] })} height={44} size={14} />
      </View>
      <ListCard style={{ marginTop: 10 }}>
        <SwitchRow label="Daily hadith" sub="A short authentic hadith under adhkar, Quran and goal reminders · prayer times carry an ayah" icon="spark" on={quotes} onToggle={() => set({ notifQuotes: !quotes })} />
        <SwitchRow label="Verse on opening" sub="A short ayah on prayer, remembrance and hope each time you open Ibtida" icon="book" on={launch !== false} onToggle={() => set({ launchAyah: launch === false })} />
      </ListCard>
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>PREVIEW</Label>
      <Preview />
    </Screen>
  );
}
