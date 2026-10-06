import { View } from 'react-native';
import type { IconName } from '../../../components/Icon';
import { BackBar, Label, ListCard, Screen, Seg, Statement, SwitchRow, Txt } from '../../../components/ui';
import { compose, ltr, PRAYER_UR, quoteFor, type NotifLang } from '../../../data/reminders';
import { usePrayerNow } from '../../../lib/hooks';
import { enableNotifications } from '../../../lib/notifications';
import { fmtTime } from '../../../lib/prayer';
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
  const quotes = useApp(s => s.notifQuotes);
  const { next, city } = usePrayerNow();
  const p = next.name;
  const short = city.name.split(',')[0];
  const n = compose(lang, { en: `Time for ${p}`, ur: `${PRAYER_UR[p]} کا وقت` },
    { en: `${p} · ${fmtTime(next.at)} · ${short}`, ur: `${PRAYER_UR[p]} · ${ltr(fmtTime(next.at))} · ${ltr(short)}` },
    quotes ? quoteFor(p === 'Fajr' ? 'fajr' : 'prayer', next.at, next.idx) : null);
  const lines = n.body.split('\n');
  const isUr = (s: string) => /[؀-ۿ]/.test(s) && !/^[A-Za-z]/.test(s);
  return (
    <View style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }} accessibilityLabel="Notification preview">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: t.acc }} />
        <Txt style={{ fontSize: 12, fontWeight: 700, color: t.t2 }}>IBTIDA · {fmtTime(next.at)}</Txt>
      </View>
      <Txt style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>{n.title}</Txt>
      {lines.map((l, i) => (
        <Txt key={i} ur={isUr(l)} style={{ fontSize: isUr(l) ? 14 : 13.5, lineHeight: isUr(l) ? 28 : 19.5, color: i === 0 ? t.t5 : t.t2, marginTop: 4, textAlign: isUr(l) ? 'right' : 'left' }}>{l}</Txt>
      ))}
    </View>
  );
}

export default function Notifications() {
  const n = useApp(s => s.notifs);
  const lang = useApp(s => s.notifLang);
  const quotes = useApp(s => s.notifQuotes);
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
        <SwitchRow label="Daily hadith" sub="A short authentic hadith under each reminder, different every day" icon="spark" on={quotes} onToggle={() => set({ notifQuotes: !quotes })} />
      </ListCard>
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>PREVIEW</Label>
      <Preview />
    </Screen>
  );
}
