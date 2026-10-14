import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Breathe, Stars, usePop, useReducedMotion } from '../components/motion';
import { buzz, Chips, Cta, Label, Ring, say, Seg, Sheet, Tap, Txt, useBack } from '../components/ui';
import { cgForDhikr, GOAL_PRESETS, mmss } from '../data/content';
import { allDhikr, fmtCount, nextKey, parseTarget, TAS_AFTER, TARGET_MAX, TARGET_PRESETS, tap as tapRound, undo as undoRound } from '../lib/tasbeeh';
import { addAct, countGoal, getState, rollDay, set, todayKey, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G, bgImage } from '../theme/tokens';

/** 33 beads around the dial; lit beads glow orange, the current one is larger. */
function Beads({ count }: { count: number }) {
  const lit = count === 0 ? 0 : count % 33 === 0 ? 33 : count % 33;
  return (
    <>
      {Array.from({ length: 33 }, (_, i) => {
        const a = (i / 33) * Math.PI * 2 - Math.PI / 2;
        const on = i < lit;
        const cur = i === lit - 1;
        const s = cur ? 21 : 15;
        return (
          <View key={i} style={{
            position: 'absolute', left: Math.round(150 + 132 * Math.cos(a)) - s / 2, top: Math.round(150 + 132 * Math.sin(a)) - s / 2,
            width: s, height: s, borderRadius: s, ...bgImage(on ? G.beadOn : G.beadOff),
            boxShadow: cur ? '0 0 16px rgba(242,166,90,0.9)' : undefined,
          }} />
        );
      })}
    </>
  );
}

/** Arabic for a goal: from its preset, or from the user's own dhikr of the same name. */
function goalAr(name: string) {
  return GOAL_PRESETS.find(([n]) => n === name)?.[1] ?? getState().customDhikr.find(c => c.name === name && !c.archived)?.ar ?? '';
}

/** A soft ring that spreads from the dial on every counted tap. */
function Ripple({ n }: { n: number }) {
  const rm = useReducedMotion();
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!n || rm) return;
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [n, v, rm]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: 50, top: 50, width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(247,189,90,0.75)',
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.42] }) }],
    }} />
  );
}

/** One figure in the stats strip above the dial. */
function Stat({ k, v, a11y }: { k: string; v: string; a11y?: string }) {
  const t = useT();
  return (
    <View accessible accessibilityLabel={a11y ?? `${k} ${v}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' }}>
      <Txt style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>{v}</Txt>
      <Txt style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: t.t4, marginTop: 2 }}>{k}</Txt>
    </View>
  );
}

/** "33 completed" — a soft gold burst over the dial, then it fades. */
function Completed({ show, n, label, sub }: { show: number; n: number; label: string; sub: string }) {
  const t = useT();
  const rm = useReducedMotion();
  // 0 → appearing, 1 → shown, 2 → gone. Starts gone; the overlay never takes touches.
  const [v] = useState(() => new Animated.Value(2));
  useEffect(() => {
    if (!show) return;
    v.setValue(0);
    const a = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: rm ? 0 : 420, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(1300),
      Animated.timing(v, { toValue: 2, duration: rm ? 0 : 380, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [show, v, rm]);
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion={show ? 'assertive' : 'none'} accessibilityElementsHidden={!show} importantForAccessibility={show ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={show ? `${fmtCount(n)} completed` : undefined}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center',
        opacity: v.interpolate({ inputRange: [0, 0.4, 1, 2], outputRange: [0, 1, 1, 0] }) }}>
      <Animated.View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 2, borderColor: t.gold,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1.08, 1.25] }) }],
        opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.9, 0.5, 0] }) }} />
      <Animated.View style={{ width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(20,21,27,0.92)', boxShadow: '0 0 60px rgba(247,189,90,0.45)',
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.7, 1, 0.96] }) }] }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, ...bgImage(G.brand), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={28} color="#111217" />
        </View>
        <Txt style={{ fontSize: 30, fontWeight: 800, marginTop: 12 }}>{show ? `${fmtCount(n)} completed` : ''}</Txt>
        <Txt style={{ fontSize: 14, color: t.gold, marginTop: 4 }} numberOfLines={1}>{label}</Txt>
        <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 6 }}>{sub}</Txt>
      </Animated.View>
    </Animated.View>
  );
}

function Tasbeeh() {
  const t = useT();
  const router = useRouter();
  const back = useBack();
  const ins = useSafeAreaInsets();
  // `goal` counts a personal goal; `dhikr` opens the free counter on a dhikr (e.g. from a community goal).
  const params = useLocalSearchParams<{ goal?: string; dhikr?: string }>();
  const goalId = params.goal ? Number(params.goal) : null;
  const goal = useApp(s => (goalId ? s.goals.find(g => g.id === goalId) : undefined));
  const dhKey = useApp(s => s.dhKey);
  const tasN = useApp(s => s.tasN);
  const custom = useApp(s => s.customDhikr);
  const targets = useApp(s => s.tasTargets);
  const life = useApp(s => s.tasLife);
  const vib = useApp(s => s.vib);
  const joined = useApp(s => s.joined);
  const today = useApp(s => s.act[todayKey()]?.d ?? 0);
  const streak = useApp(s => s.streak);
  const [secs, setSecs] = useState(0);
  const [taps, setTaps] = useState(0);
  const [scale, pop] = usePop(0.97);
  const [burst, setBurst] = useState(0);
  const [burstInfo, setBurstInfo] = useState({ n: 0, label: '', sub: '' });
  const [sheet, setSheet] = useState(false);
  // A burst of taps can't complete twice or race the "Goal complete" screen.
  const quietUntil = useRef(0);
  const goalDone = useRef(false);
  useEffect(() => { const id = setInterval(() => setSecs(x => x + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { rollDay(); }, []);
  useEffect(() => {
    const want = params.dhikr;
    if (!want) return;
    const s = getState();
    if (s.dhKey !== want && allDhikr(s.customDhikr, s.tasTargets).some(d => d.key === want)) set({ dhKey: want, tasN: 0 });
  }, [params.dhikr]);

  const list = allDhikr(custom, targets);
  const dh = list.find(d => d.key === dhKey) ?? list[0];
  const count = goal ? Math.min(goal.prog, goal.target) : Math.min(tasN, dh.t);
  const target = goal ? goal.target : dh.t;
  const frac = Math.min(count / Math.max(1, target), 1);
  const lifeOf = life[dh.key] ?? { n: 0, rounds: 0 };
  // The community goal these taps add to: a goal's own link, or the joined goal for this dhikr.
  const toward = goal ? goal.cg : cgForDhikr(dh.key, joined);
  const left = Math.max(0, target - count);

  const celebrate = (n: number, label: string, sub: string) => {
    quietUntil.current = Date.now() + 700;
    setBurstInfo({ n, label, sub });
    setBurst(x => x + 1);
    buzz([30, 60, 30, 60, 90]);
  };

  const countOne = () => {
    if (Date.now() < quietUntil.current) return;
    if (goal) {
      if (goalDone.current || goal.prog >= goal.target) return;
      pop();
      setTaps(x => x + 1);
      const prog = countGoal(goal.id, 1)?.prog ?? goal.prog;
      if (prog >= goal.target) {
        goalDone.current = true;
        celebrate(goal.target, goal.name, 'Goal complete for today');
        setTimeout(() => router.replace({ pathname: '/goal-done', params: { name: goal.name, target: String(goal.target) } }), 1200);
      } else buzz(prog % 33 === 0 ? [20, 40, 20] : 8);
      return;
    }
    const s = getState();
    const cur = allDhikr(s.customDhikr, s.tasTargets).find(d => d.key === s.dhKey) ?? list[0];
    const r = tapRound({ count: s.tasN, target: cur.t }, s.tasAfter);
    if (!r.added) { buzz(5); say(`${cur.label} complete · tap Reset to count again`); return; }
    pop();
    setTaps(x => x + 1);
    const key = r.advance ? nextKey(list, cur.key) : cur.key;
    const was = s.tasLife[key] ?? { n: 0, rounds: 0 };
    set({
      dhKey: key,
      tasN: r.count,
      tasLife: { ...s.tasLife, [key]: { n: was.n + r.added, rounds: was.rounds + (r.completed ? 1 : 0) } },
    });
    addAct('d', r.added);
    const now = list.find(d => d.key === key) ?? cur;
    if (r.advance) say(`Next · ${now.label}`);
    if (r.completed) {
      celebrate(now.t, now.label, `Round ${was.rounds + 1} · ${fmtCount(was.n + r.added)} in total`);
      say(`${now.label} · ${fmtCount(now.t)} completed`);
    } else buzz(r.count % 33 === 0 ? [20, 40, 20] : 8);
  };

  const undo = () => {
    if (goal) {
      if (goal.prog > 0 && !goalDone.current) { countGoal(goal.id, -1); setTaps(x => Math.max(0, x - 1)); buzz([40]); say('Undid one count'); }
      return;
    }
    const s = getState();
    const r = undoRound({ count: s.tasN, target: dh.t });
    if (!r.removed) return;
    const was = s.tasLife[dh.key] ?? { n: 0, rounds: 0 };
    set({ tasN: r.count, tasLife: { ...s.tasLife, [dh.key]: { n: Math.max(0, was.n - 1), rounds: Math.max(0, was.rounds - (r.reopened ? 1 : 0)) } } });
    addAct('d', -1);
    setTaps(x => Math.max(0, x - 1));
    buzz([40]);
    say('Undid one count');
  };

  const pick = (key: string) => {
    buzz(5);
    // Each dhikr starts a fresh round; lifetime totals are kept per dhikr.
    set({ dhKey: key, tasN: 0 });
    if (goal) router.setParams({ goal: '' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#14151B', ...bgImage(G.tasbeeh), overflow: 'hidden' }}>
      <StatusBar style="light" />
      <Stars style={{ top: 130 }} />
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2 }}>
        <Tap onPress={() => { buzz(5); back(); }} accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={t.tx} />
        </Tap>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt style={{ fontSize: 16, fontWeight: 700 }} numberOfLines={1}>{goal ? goal.name : dh.label}</Txt>
          <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 2 }}>Session {mmss(secs)}</Txt>
        </View>
        <Tap onPress={() => { set({ vib: !vib }); say(`Vibration ${vib ? 'off' : 'on'}`); }} accessibilityLabel="Toggle vibration" accessibilityState={{ checked: vib }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: vib ? 'rgba(242,166,90,0.18)' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="vib" color={vib ? t.acc : t.t4} />
        </Tap>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 10 }}>
        {toward ? (
          <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(90,160,138,0.18)' }}>
            <Icon name="spark" size={12} color={t.mint} />
            <Txt style={{ fontSize: 12.5, fontWeight: 700, color: t.mint }}>Counting toward {toward}</Txt>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {goal ? (
            <>
              <Stat k="TO GO" v={fmtCount(left)} />
              <Stat k="STREAK" v={`${goal.streak}d`} a11y={`Streak ${goal.streak} days`} />
              <Stat k="THIS SESSION" v={fmtCount(taps)} />
            </>
          ) : (
            <>
              <Stat k="TODAY" v={fmtCount(today)} />
              <Stat k="STREAK" v={`${streak}d`} a11y={`Streak ${streak} days`} />
              <Stat k="THIS SESSION" v={fmtCount(taps)} />
            </>
          )}
        </View>
      </View>
      <Pressable onPress={countOne} onLongPress={undo} delayLongPress={550}
        accessibilityLabel={`Count. ${count} of ${target}`} accessibilityHint="Tap to count, hold to undo"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ width: 300, height: 300, transform: [{ scale }] }}>
          <Breathe bg={G.glowAcc2} style={{ left: -10, top: -10, right: -10, bottom: -10 }} dur={7000} />
          {/* Glass disc: a raised centre the count sits on. */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 46, top: 46, width: 208, height: 208, borderRadius: 104, ...bgImage(G.tasbeehDisc), boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.06), 0 24px 50px -18px rgba(0,0,0,0.85)' }} />
          <Ripple n={taps} />
          <View style={{ position: 'absolute', left: 0, top: 0 }}>
            <Ring size={300} r={113} stroke={6} pct={frac} track="rgba(255,255,255,0.07)" gradient={['#FFD27A', '#E07A4B']} />
          </View>
          <Beads count={count} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Txt ar style={{ fontSize: 24, lineHeight: 40, color: t.gold, maxWidth: 180, textAlign: 'center' }} numberOfLines={2}>{goal ? goalAr(goal.name) : dh.ar}</Txt>
            <Txt style={{ fontSize: count >= 1000 ? 54 : 72, fontWeight: 800, letterSpacing: -3, lineHeight: 76 }}>{fmtCount(count)}</Txt>
            {goal
              ? <Txt style={{ fontSize: 14, color: t.t2, marginTop: 2 }}>of {fmtCount(target)}</Txt>
              : <Tap onPress={() => { buzz(5); setSheet(true); }} accessibilityRole="button" accessibilityLabel={`Target ${target}, change`} hitSlop={10}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <Txt style={{ fontSize: 13.5, fontWeight: 600, color: t.t2 }}>of {fmtCount(target)}</Txt>
                  <Icon name="chev" size={12} color={t.t4} />
                </Tap>}
          </View>
          <Completed show={burst} n={burstInfo.n} label={burstInfo.label} sub={burstInfo.sub} />
        </Animated.View>
      </Pressable>
      <Txt style={{ fontSize: 14, fontWeight: 700, color: t.gold, textAlign: 'center' }}>
        {left === 0 ? (goal ? 'Goal complete · Alhamdulillah' : 'Round complete · Alhamdulillah') : `${fmtCount(left)} more to ${goal ? 'reach your goal' : 'complete the round'}`}
      </Txt>
      <Txt style={{ fontSize: 12.5, color: t.t4, textAlign: 'center', marginTop: 4 }}>Tap to count · hold to undo</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 14, paddingHorizontal: 16 }}>
        {list.map(d => {
          const on = !goal && dh.key === d.key;
          return (
            <Tap key={d.key} scale={0.95} accessibilityRole="button" accessibilityLabel={d.label} accessibilityState={{ selected: on }}
              onPress={() => pick(d.key)} onLongPress={d.custom ? () => router.push({ pathname: '/dhikr-edit', params: { id: d.key.slice(2) } }) : undefined}
              style={{ height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: on ? '#F2A65A' : 'rgba(40,41,50,0.7)', ...bgImage(on ? G.brand : undefined), boxShadow: on ? '0 8px 20px -8px rgba(242,166,90,0.8)' : 'inset 0 0 0 1px rgba(255,255,255,0.08)', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 13.5, fontWeight: 700, color: on ? '#111217' : t.tx }}>{d.label}</Txt>
            </Tap>
          );
        })}
        <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Add custom dhikr" onPress={() => router.push('/dhikr-edit')}
          style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(242,166,90,0.5)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={16} color={t.acc} />
          <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.acc }}>Add</Txt>
        </Tap>
      </ScrollView>
      <View style={{ marginTop: 12, marginHorizontal: 16, marginBottom: ins.bottom + 24, borderRadius: 22, backgroundColor: 'rgba(40,41,50,0.7)', ...bgImage('linear-gradient(135deg, rgba(247,189,90,0.10), rgba(40,41,50,0.55))'), boxShadow: t.hair, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 13, lineHeight: 19.5, color: '#D8D6D2' }}>
            {goal ? (goal.prog >= goal.target ? 'Goal complete for today' : `${goal.target - goal.prog} remaining toward your goal · counts sync to your circle and community`) : dh.note}
          </Txt>
          {!goal && <Txt style={{ fontSize: 12, color: t.t4, marginTop: 4 }} accessibilityLabel={`Lifetime ${lifeOf.n}, ${lifeOf.rounds} rounds`}>Lifetime {fmtCount(lifeOf.n)} · {fmtCount(lifeOf.rounds)} {lifeOf.rounds === 1 ? 'round' : 'rounds'}</Txt>}
        </View>
        {!goal && (
          <Tap onPress={() => { set({ tasN: 0 }); setSecs(0); say('Counter reset · lifetime total kept'); }} accessibilityRole="button" accessibilityLabel="Reset"
            style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.ctl3, justifyContent: 'center' }}>
            <Txt style={{ fontSize: 13, fontWeight: 700 }}>Reset</Txt>
          </Tap>
        )}
      </View>
      <TargetSheet open={sheet} onClose={() => setSheet(false)} dhKey={dh.key} label={dh.label} current={dh.t} />
    </View>
  );
}

/** Target (presets or any whole number) and what happens when a round completes. */
function TargetSheet({ open, onClose, dhKey, label, current }: { open: boolean; onClose: () => void; dhKey: string; label: string; current: number }) {
  const t = useT();
  const after = useApp(s => s.tasAfter);
  const [text, setText] = useState('');
  const [shownFor, setShownFor] = useState('');
  if (open && shownFor !== dhKey) { setShownFor(dhKey); setText(String(current)); }
  const parsed = parseTarget(text);
  const error = text.trim() === '' ? 'Enter a target' : parsed === null ? `A whole number from 1 to ${fmtCount(TARGET_MAX)}` : null;
  const save = (n: number | null) => {
    if (n === null) return;
    set(s => ({
      tasTargets: { ...s.tasTargets, [dhKey]: n },
      // Your own dhikr keeps its target with it.
      customDhikr: s.customDhikr.map(c => (`c:${c.id}` === dhKey ? { ...c, target: n } : c)),
      tasN: s.dhKey === dhKey ? Math.min(s.tasN, n) : s.tasN,
    }));
    buzz(8);
    say(`${label} · target ${fmtCount(n)}`);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Target</Txt>
      <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 4 }}>{label}</Txt>
      <Chips wrap labels={TARGET_PRESETS.map(fmtCount)} isOn={i => parsed === TARGET_PRESETS[i]} onPick={i => setText(String(TARGET_PRESETS[i]))} height={40} size={14} style={{ marginTop: 14 }} />
      <TextInput value={text} onChangeText={v => setText(v.replace(/[^0-9,]/g, ''))} keyboardType="number-pad" inputMode="numeric" maxLength={7}
        accessibilityLabel="Custom target" placeholder="Any number, e.g. 70" placeholderTextColor={t.t4} returnKeyType="done" onSubmitEditing={() => save(parsed)}
        style={{ outlineWidth: 0, marginTop: 12, height: 56, borderRadius: 20, backgroundColor: t.sheetc, boxShadow: error ? 'inset 0 0 0 1.5px rgba(240,138,122,0.6)' : t.edge, paddingHorizontal: 18, color: t.txw, fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold' }} />
      {error && <Txt style={{ fontSize: 12.5, color: t.rose, marginTop: 6, marginLeft: 4 }}>{error}</Txt>}
      <Label style={{ marginTop: 18, marginBottom: 10 }}>WHEN A ROUND COMPLETES</Label>
      <Seg labels={TAS_AFTER.map(a => a.label)} value={Math.max(0, TAS_AFTER.findIndex(a => a.key === after))} onChange={i => set({ tasAfter: TAS_AFTER[i].key })} height={42} size={13} bg={t.sheetc} />
      <Txt style={{ fontSize: 12, lineHeight: 17, color: t.t4, marginTop: 8 }}>
        {after === 'next' ? 'The next tap moves on to the next dhikr, e.g. SubhanAllah → Alhamdulillah → Allahu Akbar.' : after === 'stop' ? 'The counter waits at the target until you tap Reset.' : 'The next tap starts the same dhikr again from 1.'}
      </Txt>
      <Cta label="Save target" height={54} size={15} style={{ marginTop: 16 }} disabled={!!error} onPress={() => save(parsed)} />
    </Sheet>
  );
}

export default function TasbeehScreen() {
  return <Immersive><Tasbeeh /></Immersive>;
}
