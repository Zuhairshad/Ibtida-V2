import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, PanResponder, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Glow, usePop } from '../components/motion';
import { buzz, Chips, Cta, Ring, say, Sheet, Txt } from '../components/ui';
import { APPS, mmss } from '../data/content';
import { DOW, fmtTime } from '../lib/prayer';
import { appName, IbadahLock, lockPackages } from '../lib/shield';
import { getState, set, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G, bgImage } from '../theme/tokens';

const REASONS = ['Family emergency', 'Work call', 'Need directions', 'Other'];
const DUR_SECS = [0, 15 * 60, 30 * 60, 60 * 60];

function Lock() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // `resume` is set by the shielding service's deep link: re-attach to the running native session.
  const { goal: gid, resume } = useLocalSearchParams<{ goal?: string; resume?: string }>();
  const goal = useApp(s => s.goals.find(g => g.id === Number(gid)) || s.goals[0]);
  const focus = useApp(s => s.focus);
  const [secs, setSecs] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState(0);
  const [scale, pop] = usePop(0.97);
  const ended = useRef(false);
  const limit = DUR_SECS[focus.dur];
  const [blocked, setBlocked] = useState(0);
  const [shielding, setShielding] = useState(() => IbadahLock.isSupported() && IbadahLock.isPermissionGranted());
  // Wall-clock based, so the timer stays right while Ibtida is in the background or was restarted.
  const startedAt = useRef(Date.now());
  // Native calls are chained so a quick unlock can't overtake a start() still in flight.
  const native = useRef<Promise<unknown>>(Promise.resolve());
  const stopShield = () => { native.current = native.current.then(() => IbadahLock.stop()).catch(() => {}); };

  useEffect(() => {
    const tick = () => setSecs(Math.floor((Date.now() - startedAt.current) / 1000));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Start shielding on mount (or re-attach after the service brought us back), and count blocked attempts.
  useEffect(() => {
    if (!goal) return;
    const running = resume ? IbadahLock.getSession() : null;
    if (running) {
      startedAt.current = running.startedAt;
      setSecs(Math.floor((Date.now() - running.startedAt) / 1000));
      setBlocked(running.blocked);
    } else {
      native.current = IbadahLock.start({
        packages: lockPackages(focus.apps),
        endsAt: limit ? startedAt.current + limit * 1000 : null,
        returnUrl: `ibtida://focus-active?goal=${goal.id}&resume=1`,
      }).then(r => setShielding(r.shielding)).catch(() => setShielding(false));
    }
    const sub = IbadahLock.onBlockedAttempt(e => {
      if (ended.current) return;
      setBlocked(e.count);
      buzz([60]);
      say(`${appName(e.packageName)} is locked · finish your dhikr first`);
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The lock is deliberately hard to leave: hardware back points to the emergency slider instead.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { say('Slide for emergency unlock'); return true; });
    return () => sub.remove();
  }, []);
  const finish = (msg: string) => {
    if (ended.current || !goal) return;
    ended.current = true;
    stopShield();
    buzz([30, 60, 30, 60, 90]);
    say(msg);
    router.replace({ pathname: '/goal-done', params: { name: goal.name, target: String(goal.target) } });
  };
  useEffect(() => { if (limit && secs >= limit) finish('Time complete · apps unlocked'); }, [secs, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const knob = 54;
  const maxX = width - 40 - 10 - knob;
  const x = useRef(new Animated.Value(0)).current;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(maxX, g.dx))),
    onPanResponderRelease: (_, g) => {
      const hit = g.dx > maxX * 0.9;
      Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      if (hit) { buzz([30, 30, 30]); setSheet(true); }
    },
    // A cancelled drag must not leave the knob stranded mid-track.
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start(),
  })).current;

  if (!goal) return null;
  const n = goal.prog;
  const apps = APPS.filter((_, i) => focus.apps[i]);
  const tap = () => {
    pop();
    const prog = getState().goals.find(g => g.id === goal.id)!.prog + 1;
    set(s => ({ goals: s.goals.map(g => (g.id === goal.id ? { ...g, prog } : g)) }));
    if (prog >= goal.target) finish('Target reached · apps unlocked'); else buzz(8);
  };
  const lit = n === 0 ? 0 : n % 33 === 0 ? 33 : n % 33;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1013', ...bgImage(G.focus) }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: ins.top + 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Glow dur={1600}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#5EB87A' }} /></Glow>
          <Txt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: t.mint }}>LOCK ACTIVE</Txt>
        </View>
        <Txt style={{ fontSize: 13, color: t.t2 }}>{limit ? `${mmss(Math.max(0, limit - secs))} left` : mmss(secs)}</Txt>
      </View>
      <Txt style={{ fontSize: 14, color: t.t2, textAlign: 'center', marginTop: 14, paddingHorizontal: 24 }}>
        {!apps.length ? 'Focus session' : shielding ? `${apps.join(' · ')} locked` : `${apps.join(' · ')} · shielding off`}
      </Txt>
      {blocked > 0 && (
        <Txt style={{ fontSize: 12.5, color: t.t4, textAlign: 'center', marginTop: 4 }}>{blocked} {blocked === 1 ? 'attempt' : 'attempts'} blocked</Txt>
      )}
      <Pressable onPress={tap} accessibilityLabel={`Count. ${n} of ${goal.target}`} accessibilityHint="Tap anywhere to count" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
          <View style={{ position: 'absolute' }}>
            <Ring size={260} r={116} stroke={6} pct={n / goal.target} track="#222529" color="#5EB87A" />
          </View>
          {Array.from({ length: 33 }, (_, i) => {
            const a = (i / 33) * Math.PI * 2 - Math.PI / 2;
            return <View key={i} style={{ position: 'absolute', left: Math.round(130 + 100 * Math.cos(a)) - 5, top: Math.round(130 + 100 * Math.sin(a)) - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: i < lit ? '#5EB87A' : '#33363B' }} />;
          })}
          <Txt style={{ fontSize: 66, fontWeight: 800, letterSpacing: -2.6, lineHeight: 70 }}>{n}</Txt>
          <Txt style={{ fontSize: 15, color: t.t2, marginTop: 6 }}>/ {goal.target} · {Math.max(0, goal.target - n)} left</Txt>
        </Animated.View>
        <Txt style={{ fontSize: 18, fontWeight: 700, marginTop: 26 }}>Stay focused.</Txt>
        <Txt style={{ fontSize: 13, color: t.t4, marginTop: 6 }}>Tap anywhere to count</Txt>
      </Pressable>
      <View style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 34 }}>
        <View style={{ height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.06)', boxShadow: t.hair, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14.5, color: t.t2, opacity: x.interpolate({ inputRange: [0, 160], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
            Slide for emergency unlock
          </Animated.Text>
          <Animated.View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Emergency unlock slider"
            accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => setSheet(true)}
            style={{ position: 'absolute', left: 5, top: 5, width: knob, height: knob, borderRadius: 27, backgroundColor: t.cta, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: x }] }}>
            <Icon name="lock" color={t.ctaInk} />
          </Animated.View>
        </View>
      </View>
      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>End the lock early?</Txt>
        <Txt style={{ fontSize: 14.5, lineHeight: 22.5, color: t.t3, marginTop: 8 }}>It’s okay. Note why — only you will see it, in your emergency history.</Txt>
        <Chips wrap labels={REASONS} isOn={i => reason === i} onPick={setReason} style={{ marginTop: 16 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Cta label="Keep going" height={56} size={16} style={{ flex: 1 }} onPress={() => setSheet(false)} />
          <Cta label="Unlock" kind="secondary" color={t.rose} height={56} size={16} style={{ flex: 1 }} onPress={() => {
            const d = new Date();
            const day = DOW[d.getDay()];
            const rec = { when: `${day[0]}${day.slice(1).toLowerCase()} ${d.getDate()} · ${fmtTime(d)}`, after: `after ${Math.max(1, Math.round(secs / 60))} min`, reason: REASONS[reason], blocked };
            ended.current = true;
            stopShield();
            set(s => ({ emergencies: [rec].concat(s.emergencies) }));
            setSheet(false);
            say('Unlocked · logged privately');
            router.replace('/profile/emergency');
          }} />
        </View>
      </Sheet>
    </View>
  );
}

export default function FocusActive() {
  return <Immersive><Lock /></Immersive>;
}
