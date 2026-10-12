import { useMemo } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '../../../components/Icon';
import { BackBar, Label, ListCard, Screen, Seg, Statement, SwitchRow, Txt } from '../../../components/ui';
import { ayahFor, compose, prayerNotice, quoteFor, type NotifLang } from '../../../data/reminders';
import { journeyOf, planCare, type CareItem } from '../../../lib/care';
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

const isUr = (s: string) => (s.match(/[؀-ۿ]/g)?.length ?? 0) > (s.match(/[A-Za-z]/g)?.length ?? 0);

/** A notification as it will arrive. `arabic`: the first body line is an ayah. */
function NoticeCard({ when, title, body, arabic, label }: { when: string; title: string; body: string; arabic?: boolean; label: string }) {
  const t = useT();
  const lines = body.split('\n');
  return (
    <View style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: t.acc }} />
        <Txt style={{ fontSize: 12, fontWeight: 700, color: t.t2 }}>IBTIDA · {when}</Txt>
      </View>
      <Txt style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }} ur={isUr(title)}>{title}</Txt>
      {lines.map((l, i) => arabic && i === 0
        ? <Txt key={i} ar style={{ fontSize: 19, lineHeight: 36, color: t.t5, marginTop: 6, textAlign: 'right', writingDirection: 'rtl' }}>{l}</Txt>
        : <Txt key={i} ur={isUr(l)} style={{ fontSize: isUr(l) ? 14 : 13.5, lineHeight: isUr(l) ? 28 : 19.5, color: t.t2, marginTop: 4, textAlign: isUr(l) ? 'right' : 'left' }}>{l}</Txt>)}
    </View>
  );
}

/** How the next adhan notification will read, in the chosen language. */
function Preview() {
  const lang = useApp(s => s.notifLang);
  const { next } = usePrayerNow();
  const jamaat = useApp(s => s.jamaat);
  const masjid = useApp(s => s.masjid);
  const j = jamaatAt(jamaat, next.name, next.at);
  const n = prayerNotice(lang, next.name, fmtTime(next.at), ayahFor(next.at, next.idx), undefined, j ? { time: fmtTime(j.at), jumuah: j.jumuah, masjid: masjid || undefined } : undefined);
  return <NoticeCard when={fmtTime(next.at)} title={n.title} body={n.body} arabic label="Notification preview" />;
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function whenLabel(at: Date, now: Date) {
  const days = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : at.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${fmtTime(at)}`;
}

/** The person's own progress, in plain words: where they are, and what a good next step looks like. */
function Journey() {
  const t = useT();
  const act = useApp(s => s.act);
  const logs = useApp(s => s.logs);
  const tasLife = useApp(s => s.tasLife);
  const since = useApp(s => s.since);
  const now = new Date();
  const j = useMemo(() => journeyOf({ act, logs, tasLife, since }, new Date()), [act, logs, tasLife, since]);
  const line = j.streak > 0 && j.activeToday ? 'You showed up today. Alhamdulillah.'
    : j.streak > 0 ? `Your ${j.streak}-day streak is open until tonight. One small act keeps it.`
    : j.ago !== null ? 'A new streak can begin today: one dhikr is enough.'
    : 'Your journey starts with one small step.';
  const stats: [number, string][] = [[j.weekPrayers, 'prayers'], [j.weekDhikr, 'dhikr'], [j.weekAyahs, 'ayahs']];
  return (
    <View style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}
      accessibilityLabel={`Your journey. ${j.streak} day streak, best ${j.best}. Active on ${j.week.filter(Boolean).length} of the last 7 days.`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="spark" color={j.streak > 0 ? t.acc : t.t4} />
          <Txt style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5, lineHeight: 44 }}>{j.streak}</Txt>
          <Txt style={{ fontSize: 14, color: t.t2, marginBottom: 6 }}>day streak</Txt>
        </View>
        <Txt style={{ fontSize: 12.5, color: t.t3, marginBottom: 8 }}>Best {j.best}</Txt>
      </View>
      <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t2, marginTop: 8 }}>{line}</Txt>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }} accessible={false} importantForAccessibility="no-hide-descendants">
        {j.week.map((on, i) => {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i), 12);
          return (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: on ? t.acc : t.ctl3, alignItems: 'center', justifyContent: 'center', borderWidth: i === 6 ? 2 : 0, borderColor: t.t3 }}>
                {on && <Icon name="check" color={t.ctaInk} size={14} />}
              </View>
              <Txt style={{ fontSize: 11, fontWeight: i === 6 ? 800 : 500, color: i === 6 ? t.txw : t.t3 }}>{WEEKDAY[d.getDay()]}</Txt>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.ctl3 }}>
        {stats.map(([n, l]) => (
          <View key={l} style={{ flex: 1 }}>
            <Txt style={{ fontSize: 20, fontWeight: 800 }}>{n.toLocaleString('en-US')}</Txt>
            <Txt style={{ fontSize: 11.5, color: t.t3 }}>{l} this week</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The next encouragement, exactly as it will arrive; or why there is none. */
function NextCheckIn() {
  const t = useT();
  const care = useApp(s => s.notifCare);
  const lang = useApp(s => s.notifLang);
  const quotes = useApp(s => s.notifQuotes);
  const act = useApp(s => s.act);
  const logs = useApp(s => s.logs);
  const tasLife = useApp(s => s.tasLife);
  const since = useApp(s => s.since);
  const name = useApp(s => s.name);
  const city = useApp(s => s.city);
  const method = useApp(s => s.method);
  const hanafi = useApp(s => s.hanafi);
  const adj = useApp(s => s.adj);
  const now = new Date();
  const next: CareItem | undefined = useMemo(() => planCare({ act, logs, tasLife, since, name, notifCare: care, city, method, hanafi, adj }, new Date())[0], [act, logs, tasLife, since, name, care, city, method, hanafi, adj]);
  if (!care || !next) {
    return (
      <View style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }} accessibilityLabel="Next check-in">
        <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t2 }}>{care ? 'Nothing is planned. You are on track.' : 'Encouragement is off. You will only get the reminders you chose above.'}</Txt>
      </View>
    );
  }
  const n = compose(lang, next.title, next.body, quotes === false || !next.quote ? null : quoteFor(next.quote, next.at, next.at.getDate()));
  return <NoticeCard when={whenLabel(next.at, now)} title={n.title} body={n.body} label="Next check-in" />;
}

export default function Notifications() {
  const n = useApp(s => s.notifs);
  const lang = useApp(s => s.notifLang);
  const quotes = useApp(s => s.notifQuotes);
  const launch = useApp(s => s.launchAyah);
  const care = useApp(s => s.notifCare);
  return (
    <Screen top={54}>
      <BackBar title="Notifications" />
      <Statement a="Gentle reminders." b="Never noise." style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <Label style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 26 }}>YOUR JOURNEY</Label>
      <Journey />
      <ListCard style={{ marginTop: 14 }}>
        <SwitchRow label="Encouragement" sub="Warm check-ins from your own progress · at most one a day · never guilt, and they stop after a month away" icon="spark" on={care} onToggle={() => { set({ notifCare: !care }); if (!care) enableNotifications(); }} />
      </ListCard>
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>NEXT CHECK-IN</Label>
      <NextCheckIn />
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>REMINDERS</Label>
      <ListCard>
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
      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>PRAYER PREVIEW</Label>
      <Preview />
    </Screen>
  );
}
