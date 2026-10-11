import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { endsIn, useLive } from '../lib/live';
import { dailyOverview } from '../lib/overview';
import { useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Bar, buzz, Ring, Tap, Txt } from './ui';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today's contributions, goals and streak on Home — all from the app's own data. */
export function DailyOverview({ now }: { now: Date }) {
  const t = useT();
  const router = useRouter();
  const logs = useApp(s => s.logs);
  const act = useApp(s => s.act);
  const goals = useApp(s => s.goals);
  const streak = useApp(s => s.streak);
  const liveGoals = useLive(l => (l.on ? l.goals : null));
  const o = dailyOverview({ logs, act, goals, streak }, now, name => liveGoals?.[name]?.endsAt ?? null);

  const stats: [string, number, IconName, string, () => void][] = [
    ['Prayers', o.prayed, 'prayer', `${o.prayed}/5`, () => router.navigate('/prayer')],
    ['Dhikr', o.dhikr, 'beads', o.dhikr.toLocaleString('en-US'), () => router.push('/tasbeeh')],
    ['Adhkar', o.sessions, 'moon', String(o.sessions), () => router.navigate('/adhkar')],
    ['Ayahs', o.ayahs, 'book', String(o.ayahs), () => router.push('/home/quran')],
  ];

  return (
    <View style={{ borderRadius: 30, backgroundColor: t.card, boxShadow: t.edge, padding: 20 }} accessibilityLabel={`Today: ${o.pct} percent of today's targets met. ${o.message}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring size={72} r={30} stroke={7} pct={o.pct / 100} track={t.ctl3} color={o.pct >= 100 ? t.mint : t.acc}>
          <Txt style={{ fontSize: 16, fontWeight: 800 }}>{o.pct}%</Txt>
        </Ring>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.t2 }}>TODAY · {now.getDate()} {MON[now.getMonth()].toUpperCase()}</Txt>
          <Txt style={{ fontSize: 14.5, lineHeight: 21, color: t.t5, marginTop: 5 }}>{o.message}</Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {stats.map(([label, n, icon, shown, go]) => (
          <Tap key={label} scale={0.95} onPress={() => { buzz(5); go(); }} accessibilityRole="button" accessibilityLabel={`${label} today: ${shown}`}
            style={{ flex: 1, borderRadius: 18, backgroundColor: t.sunk2, boxShadow: t.edge, paddingVertical: 12, alignItems: 'center' }}>
            <Icon name={icon} size={18} color={n > 0 ? t.acc : t.t4} />
            <Txt style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>{shown}</Txt>
            <Txt style={{ fontSize: 11, color: t.t2, marginTop: 2 }}>{label}</Txt>
          </Tap>
        ))}
      </View>

      {o.goals.length > 0 && (
        <View style={{ marginTop: 16, gap: 12 }}>
          {o.goals.map(g => {
            const ends = g.community ? endsIn(g.endsAt, '') : '';
            return (
              <Tap key={g.id} scale={0.99} onPress={() => { buzz(5); router.push({ pathname: '/tasbeeh', params: { goal: String(g.id) } }); }}
                accessibilityRole="button" accessibilityLabel={`${g.name}, ${g.prog} of ${g.target}${g.done ? ', done' : ''}${g.community ? `, counts toward ${g.community}` : ''}`}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Txt style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }} numberOfLines={1}>{g.name}</Txt>
                  <Txt style={{ fontSize: 13, fontWeight: 700, color: g.done ? t.mint : t.t2 }}>{g.done ? 'Done' : `${g.prog.toLocaleString('en-US')}/${g.target.toLocaleString('en-US')}`}</Txt>
                </View>
                <Bar pct={g.pct} h={6} track={t.ctl2} fill={g.done ? t.mint : undefined} style={{ marginTop: 7 }} />
                <Txt style={{ fontSize: 11.5, color: t.t4, marginTop: 5 }} numberOfLines={1}>
                  {g.pct}% · daily target{g.streak > 0 ? ` · ${g.streak}-day streak` : ''}
                  {g.community ? ` · counts toward ${g.community}${ends === 'ended' ? ' (ended)' : ends ? `, ends in ${ends}` : ''}` : ''}
                </Txt>
              </Tap>
            );
          })}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.line }}>
        <Icon name="flame" size={18} color={o.streak > 0 ? t.acc : t.t4} />
        <Txt style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: t.t2 }}>
          {o.streak > 0 ? `${o.streak}-day streak` : 'No streak yet'} · {o.goalsDone}/{o.goals.length} goals met
        </Txt>
        <Tap onPress={() => router.push('/adhkar/goals')} accessibilityRole="button" hitSlop={8}>
          <Txt style={{ fontSize: 13, fontWeight: 700, color: t.acc }}>{o.goals.length ? 'All goals' : 'Add a goal'}</Txt>
        </Tap>
      </View>
    </View>
  );
}
