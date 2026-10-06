import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { Breathe, Stars } from '../components/motion';
import { buzz, Chips, Cta, Ring, say, Sheet, Tap, Txt } from '../components/ui';
import { adhkarCat, catMinutes } from '../data/adhkar';
import { clock } from '../lib/hooks';
import { activeLock, durLabel, rangeLabel } from '../lib/lockTimes';
import { DOW, fmtTime } from '../lib/prayer';
import { appName, IbadahLock } from '../lib/shield';
import { set, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G, bgImage } from '../theme/tokens';

const REASONS = ['Family emergency', 'Work call', 'Need directions', 'Other'];

/**
 * Where a scheduled Ibadah Lock sends you: opening any app during a lock time lands here.
 * Shows the time left and ways to spend it; the emergency unlock is logged privately.
 */
function ScheduledLock() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const locks = useApp(s => s.locks);
  const skip = useApp(s => s.lockSkip);
  const [now, setNow] = useState(() => new Date());
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState(0);
  const [blocked, setBlocked] = useState(() => IbadahLock.getActiveWindow()?.blocked ?? 0);
  const [lastApp, setLastApp] = useState<string | null>(null);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const sub = IbadahLock.onBlockedAttempt(e => { setBlocked(e.count); setLastApp(appName(e.packageName)); buzz([60]); });
    return () => sub.remove();
  }, []);
  const win = activeLock(locks, now, skip);

  const done = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };

  if (!win) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, ...bgImage(G.session), alignItems: 'center', justifyContent: 'center', padding: 30, paddingTop: ins.top + 30 }}>
        <StatusBar style="light" />
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(94,184,122,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={34} color={t.mint} />
        </View>
        <Txt style={{ fontSize: 24, fontWeight: 800, marginTop: 18, textAlign: 'center' }}>No lock running</Txt>
        <Txt style={{ fontSize: 14.5, lineHeight: 22, color: t.t3, marginTop: 8, textAlign: 'center' }}>Your apps are open. May Allah accept the time you gave.</Txt>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, alignSelf: 'stretch' }}>
          <Cta label="Lock times" kind="secondary" size={15} style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/focus-setup', params: { tab: '1' } })} />
          <Cta label="Done" size={15} style={{ flex: 1 }} onPress={done} />
        </View>
      </View>
    );
  }

  const total = win.end.getTime() - win.start.getTime();
  const left = Math.max(0, Math.round((win.end.getTime() - now.getTime()) / 1000));
  const cat = adhkarCat(now.getHours() >= 4 && now.getHours() < 15 ? 'Morning' : now.getHours() >= 15 && now.getHours() < 21 ? 'Evening' : 'Before Sleep');
  const ways: [string, string, IconName, () => void][] = [
    [`${cat.k} adhkar`, `${catMinutes(cat)} min · swipe & tap`, 'beads', () => router.push({ pathname: '/session', params: { cat: cat.k } })],
    ['Read Quran', 'Continue where you left off', 'book', () => router.push('/home/quran')],
    ['Tasbeeh', 'Count freely', 'spark', () => router.push('/tasbeeh')],
    ['Prayer times', 'Qibla and today’s salah', 'prayer', () => router.push('/prayer')],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#14151B', ...bgImage(G.tasbeeh) }}>
      <StatusBar style="light" />
      <Stars style={{ top: 90 }} />
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 18, paddingBottom: ins.bottom + 30, paddingHorizontal: 22 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(242,166,90,0.16)' }}>
          <Icon name="lock" size={15} color={t.acc} />
          <Txt style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 1, color: t.acc }}>IBADAH TIME · {rangeLabel(win.lock).toUpperCase()}</Txt>
        </View>
        <View style={{ alignItems: 'center', marginTop: 26 }}>
          <View style={{ width: 230, height: 230, alignItems: 'center', justifyContent: 'center' }}>
            <Breathe bg={G.glowAcc2} style={{ left: 30, top: 30, right: 30, bottom: 30 }} dur={7000} />
            <View style={{ position: 'absolute' }}>
              <Ring size={230} r={100} stroke={10} pct={1 - left / (total / 1000)} track="rgba(255,255,255,0.08)" gradient={['#F7BD5A', '#E07A4B']} />
            </View>
            <Txt style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.5 }} accessibilityLabel={`${Math.ceil(left / 60)} minutes left`}>{clock(left)}</Txt>
            <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 4 }}>until {fmtTime(win.end)}</Txt>
          </View>
        </View>
        <Txt style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginTop: 22 }}>Your apps are resting</Txt>
        <Txt style={{ fontSize: 14.5, lineHeight: 22, color: t.t3, textAlign: 'center', marginTop: 6 }}>
          {lastApp ? `${lastApp} is locked for now. ` : ''}You set aside {durLabel(win.lock.dur)} for Allah — spend it here.
          {blocked > 0 ? ` ${blocked} ${blocked === 1 ? 'app opening' : 'app openings'} turned back so far.` : ''}
        </Txt>
        <View style={{ marginTop: 22, gap: 8 }}>
          {ways.map(([title, sub, icon, go]) => (
            <Tap key={title} scale={0.985} onPress={() => { buzz(6); go(); }}
              style={{ borderRadius: 22, backgroundColor: 'rgba(40,41,50,0.75)', boxShadow: t.hair, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.tAmb, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={t.acc} /></View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 15.5, fontWeight: 700 }}>{title}</Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 2 }}>{sub}</Txt>
              </View>
              <Icon name="chev" color={t.t4} />
            </Tap>
          ))}
        </View>
        <Tap onPress={() => { buzz([30, 30, 30]); setSheet(true); }} accessibilityRole="button" accessibilityLabel="Emergency unlock"
          style={{ marginTop: 22, height: 48, alignSelf: 'center', paddingHorizontal: 18, justifyContent: 'center' }}>
          <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.t4 }}>Emergency unlock</Txt>
        </Tap>
      </ScrollView>
      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>End this lock early?</Txt>
        <Txt style={{ fontSize: 14.5, lineHeight: 22.5, color: t.t3, marginTop: 8 }}>Apps open normally until {fmtTime(win.end)}; your next lock time still runs. Note why — only you will see it.</Txt>
        <Chips wrap labels={REASONS} isOn={i => reason === i} onPick={setReason} style={{ marginTop: 16 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Cta label="Keep going" height={56} size={16} style={{ flex: 1 }} onPress={() => setSheet(false)} />
          <Cta label="Unlock" kind="secondary" color={t.rose} height={56} size={16} style={{ flex: 1 }} onPress={() => {
            const d = new Date();
            const day = DOW[d.getDay()];
            const mins = Math.max(1, Math.round((d.getTime() - win.start.getTime()) / 60000));
            const rec = { when: `${day[0]}${day.slice(1).toLowerCase()} ${d.getDate()} · ${fmtTime(d)}`, after: `after ${mins} min`, reason: REASONS[reason], blocked };
            set(s => ({ lockSkip: win.end.getTime(), emergencies: [rec].concat(s.emergencies) }));
            setSheet(false);
            say('Unlocked until the end of this lock time · logged privately');
            router.replace('/profile/emergency');
          }} />
        </View>
      </Sheet>
    </View>
  );
}

export default function LockScheduled() {
  return <Immersive><ScheduledLock /></Immersive>;
}
