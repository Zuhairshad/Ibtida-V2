import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Breathe, Stars, usePop } from '../components/motion';
import { buzz, Ring, say, Tap, Txt } from '../components/ui';
import { DHIKR, mmss } from '../data/content';
import { getState, set, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G } from '../theme/tokens';

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
            width: s, height: s, borderRadius: s, experimental_backgroundImage: on ? G.beadOn : G.beadOff,
            boxShadow: cur ? '0 0 16px rgba(242,166,90,0.9)' : undefined,
          }} />
        );
      })}
    </>
  );
}

function Tasbeeh() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const params = useLocalSearchParams<{ goal?: string }>();
  const goalId = params.goal ? Number(params.goal) : null;
  const goal = useApp(s => (goalId ? s.goals.find(g => g.id === goalId) : undefined));
  const dhIdx = useApp(s => s.dh);
  const tasN = useApp(s => s.tasN);
  const vib = useApp(s => s.vib);
  const [secs, setSecs] = useState(0);
  const [scale, pop] = usePop(0.97);
  useEffect(() => { const id = setInterval(() => setSecs(x => x + 1), 1000); return () => clearInterval(id); }, []);

  const dh = DHIKR[dhIdx];
  const count = goal ? goal.prog : tasN;
  const target = goal ? goal.target : dh.t;
  const frac = goal ? Math.min(goal.prog / goal.target, 1) : (tasN % dh.t) / dh.t;

  const countOne = () => {
    pop();
    if (goal) {
      const prog = goal.prog + 1;
      set(s => ({ goals: s.goals.map(x => (x.id === goal.id ? { ...x, prog } : x)) }));
      if (prog >= goal.target) {
        buzz([30, 60, 30, 60, 90]);
        router.replace({ pathname: '/goal-done', params: { name: goal.name, target: String(goal.target) } });
      } else buzz(prog % 33 === 0 ? [20, 40, 20] : 8);
      return;
    }
    const n = getState().tasN + 1;
    set({ tasN: n });
    if (n % dh.t === 0) { buzz([20, 40, 20, 40, 60]); say(`${dh.label} · round of ${dh.t} complete`); } else buzz(8);
  };
  const undo = () => {
    if (goal) set(s => ({ goals: s.goals.map(x => (x.id === goal.id ? { ...x, prog: Math.max(0, x.prog - 1) } : x)) }));
    else set(s => ({ tasN: Math.max(0, s.tasN - 1) }));
    buzz([40]);
    say('Undid one count');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#14151B', experimental_backgroundImage: G.tasbeeh, overflow: 'hidden' }}>
      <StatusBar style="light" />
      <Stars style={{ top: 130 }} />
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2 }}>
        <Tap onPress={() => { buzz(5); router.back(); }} accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
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
      {goal?.cg && (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <View style={{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 14, backgroundColor: 'rgba(90,160,138,0.18)' }}>
            <Txt style={{ fontSize: 12.5, fontWeight: 700, color: t.mint }}>Counting toward {goal.cg}</Txt>
          </View>
        </View>
      )}
      <Pressable onPress={countOne} onLongPress={undo} delayLongPress={550}
        accessibilityLabel={`Count. ${count} of ${target}`} accessibilityHint="Tap to count, hold to undo"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ width: 300, height: 300, transform: [{ scale }] }}>
          <Breathe bg={G.glowAcc2} style={{ left: 40, top: 40, right: 40, bottom: 40 }} dur={7000} />
          <View style={{ position: 'absolute', left: 0, top: 0 }}>
            <Ring size={300} r={104} stroke={5} pct={frac} track={t.ctl2} color={t.acc} />
          </View>
          <Beads count={count} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Txt ar style={{ fontSize: 26, lineHeight: 44, color: t.gold }}>{goal ? 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ' : dh.ar}</Txt>
            <Txt style={{ fontSize: 78, fontWeight: 800, letterSpacing: -3, lineHeight: 82, marginTop: 2 }}>{count}</Txt>
            <Txt style={{ fontSize: 15, color: t.t2, marginTop: 4 }}>/ {target}</Txt>
          </View>
        </Animated.View>
      </Pressable>
      <Txt style={{ fontSize: 12.5, color: t.t4, textAlign: 'center' }}>Tap to count · hold to undo</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 14, paddingHorizontal: 16 }}>
        {DHIKR.map((d, i) => {
          const on = !goal && dhIdx === i;
          return (
            <Tap key={d.label} scale={0.95} accessibilityState={{ selected: on }}
              onPress={() => { buzz(5); set({ dh: i, tasN: 0 }); if (goal) router.setParams({ goal: '' }); }}
              style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: on ? 'rgba(242,166,90,0.22)' : 'rgba(40,41,50,0.7)', boxShadow: on ? `inset 0 0 0 1.5px ${t.acc}` : 'inset 0 0 0 1px rgba(255,255,255,0.08)', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 13.5, fontWeight: 700 }}>{d.label}</Txt>
            </Tap>
          );
        })}
      </ScrollView>
      <View style={{ marginTop: 12, marginHorizontal: 16, marginBottom: ins.bottom + 30, borderRadius: 22, backgroundColor: 'rgba(40,41,50,0.7)', boxShadow: t.hair, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt style={{ flex: 1, fontSize: 13, lineHeight: 19.5, color: '#D8D6D2' }}>
          {goal ? `${goal.target - goal.prog} remaining toward your goal · counts sync to your circle and community` : dh.note}
        </Txt>
        {!goal && (
          <Tap onPress={() => { set({ tasN: 0 }); setSecs(0); say('Counter reset'); }} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.ctl3, justifyContent: 'center' }}>
            <Txt style={{ fontSize: 13, fontWeight: 700 }}>Reset</Txt>
          </Tap>
        )}
      </View>
    </View>
  );
}

export default function TasbeehScreen() {
  return <Immersive><Tasbeeh /></Immersive>;
}
