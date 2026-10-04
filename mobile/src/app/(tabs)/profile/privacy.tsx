import { BackBar, ListCard, Screen, Statement, SwitchRow } from '../../../components/ui';
import { set, useApp } from '../../../state/store';

const ROWS: [string, string][] = [
  ['Profile visibility', 'Only your circles see your name'],
  ['Activity visibility', 'Prayer and dhikr logs'],
  ['Community participation', 'Add your counts to Ummah totals, anonymously'],
  ['Goal visibility', 'Show goals inside circles'],
  ['Location', 'Used on-device for prayer times'],
  ['Analytics', 'Crash reports only, never content'],
];

export default function Privacy() {
  const p = useApp(s => s.privacy);
  return (
    <Screen top={54}>
      <BackBar title="Privacy" />
      <Statement a="Private by default." b="You decide what’s shared." style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <ListCard style={{ marginTop: 18 }}>
        {ROWS.map(([l, s], i) => <SwitchRow key={l} label={l} sub={s} on={p[i]} onToggle={() => { const a = p.slice(); a[i] = !a[i]; set({ privacy: a }); }} />)}
      </ListCard>
    </Screen>
  );
}
