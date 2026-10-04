import type { IconName } from '../../../components/Icon';
import { BackBar, ListCard, Screen, Statement, SwitchRow } from '../../../components/ui';
import { set, useApp } from '../../../state/store';

const ROWS: [string, string, IconName][] = [
  ['Prayer', 'Adhan at each prayer time', 'prayer'],
  ['Adhkar', '“Your evening adhkar are ready.”', 'moon'],
  ['Goals', 'One reminder at your set time', 'beads'],
  ['Quran', 'A gentle nudge after Fajr', 'book'],
  ['Focus', 'When Ibadah Lock starts and ends', 'lock'],
  ['Community', 'Circle milestones only', 'people'],
];

export default function Notifications() {
  const n = useApp(s => s.notifs);
  return (
    <Screen top={54}>
      <BackBar title="Notifications" />
      <Statement a="Gentle reminders." b="Never noise." style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <ListCard style={{ marginTop: 18 }}>
        {ROWS.map(([l, s, ic], i) => <SwitchRow key={l} label={l} sub={s} icon={ic} on={n[i]} onToggle={() => { const a = n.slice(); a[i] = !a[i]; set({ notifs: a }); }} />)}
      </ListCard>
    </Screen>
  );
}
