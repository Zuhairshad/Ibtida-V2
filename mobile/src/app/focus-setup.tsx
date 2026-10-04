import { useRouter } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackBar, buzz, Chips, Cta, H1, Label, Option, Page, say, Txt } from '../components/ui';
import { APPS } from '../data/content';
import { IbadahLock, useShieldPermission } from '../lib/shield';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function FocusSetup() {
  const t = useT();
  const router = useRouter();
  const focus = useApp(s => s.focus);
  const goals = useApp(s => s.goals).filter(g => g.prog < g.target);
  const put = (p: Partial<typeof focus>) => set(s => ({ focus: { ...s.focus, ...p } }));
  const shield = useShieldPermission();
  return (
    <Page>
      <BackBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 4, paddingHorizontal: 22 }}>
          <H1>Ibadah Lock</H1>
          <Txt style={{ fontSize: 15, lineHeight: 22.5, color: t.t3, marginTop: 8 }}>Distractions stay locked until your dhikr is done.</Txt>
        </View>
        <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>DURATION</Label>
        <View style={{ paddingHorizontal: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Until goal completed', '15 min', '30 min', '1 hour'].map((l, i) => (
            <View key={l} style={{ width: '48.5%' }}>
              <Chips flex labels={[l]} isOn={() => focus.dur === i} onPick={() => put({ dur: i })} height={52} size={14} />
            </View>
          ))}
        </View>
        <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>WORSHIP GOAL</Label>
        <View style={{ paddingHorizontal: 22, gap: 8 }}>
          {goals.length === 0 && <Txt style={{ fontSize: 13.5, color: t.t2 }}>All goals are complete today. Create a new one from Adhkar.</Txt>}
          {goals.map((g, i) => <Option key={g.id} title={g.name} sub={`${g.target - g.prog} repetitions left`} on={focus.goal === i} onPress={() => put({ goal: i })} pad={14} titleSize={15} dot={26} />)}
        </View>
        <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>APPS TO LOCK</Label>
        <View style={{ paddingHorizontal: 22 }}>
          <Chips wrap labels={APPS} isOn={i => focus.apps[i]} onPick={i => { const a = focus.apps.slice(); a[i] = !a[i]; put({ apps: a }); }} />
        </View>
        <ShieldNote {...shield} />
      </ScrollView>
      <View style={{ paddingHorizontal: 22 }}>
        <Cta label="Activate Ibadah Lock" icon="lock" disabled={goals.length === 0} onPress={() => {
          if (!goals.length) return;
          buzz([20, 40, 20]);
          const n = focus.apps.filter(Boolean).length;
          say(!n ? 'Ibadah Lock on' : shield.supported && shield.granted ? `Ibadah Lock on · ${n} apps shielded` : 'Ibadah Lock on · in-app only');
          router.replace({ pathname: '/focus-active', params: { goal: String(goals[Math.min(focus.goal, goals.length - 1)].id) } });
        }} />
      </View>
    </Page>
  );
}

/** Platform note under the app picker: the Android permission step, or the honest iOS / Expo Go note. */
function ShieldNote({ supported, granted }: { supported: boolean; granted: boolean }) {
  const t = useT();
  const note = { marginTop: 16, marginHorizontal: 22, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16 } as const;

  if (Platform.OS === 'android' && supported && !granted) {
    return (
      <View style={[note, { backgroundColor: t.card, boxShadow: t.hair, paddingVertical: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tAmb, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={20} color={t.acc} />
          </View>
          <View style={{ flex: 1 }}>
            <Label color={t.acc}>ONE-TIME SETUP</Label>
            <Txt style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>Allow Ibtida to shield apps</Txt>
          </View>
        </View>
        <Txt style={{ fontSize: 13.5, lineHeight: 20.5, color: t.t3, marginTop: 12 }}>
          Android shields apps through an Accessibility service. During a lock it only checks which app just opened. If it is one you chose, you come straight back here. It never reads your screen or sends data, and calls, emergency and SMS always stay available.
        </Txt>
        <Txt style={{ fontSize: 13, lineHeight: 20, color: t.t2, marginTop: 10 }}>
          In settings: <Txt style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>Installed apps → Ibtida Ibadah Lock → On</Txt>
        </Txt>
        <Cta label="Open settings" icon="shield" kind="secondary" height={50} size={15} style={{ marginTop: 14 }}
          onPress={() => { buzz(8); IbadahLock.openPermissionSettings().catch(() => say('Open Settings → Accessibility')); }} />
        <Txt style={{ fontSize: 12, lineHeight: 18, color: t.t4, marginTop: 10 }}>
          Switch greyed out? Open Ibtida’s App info → ⋮ → Allow restricted settings, then try again. Without it, the lock still runs inside Ibtida.
        </Txt>
      </View>
    );
  }
  if (Platform.OS === 'android' && supported) {
    return (
      <View style={[note, { backgroundColor: t.tMint, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
        <Icon name="check" size={18} color={t.mint} />
        <Txt style={{ flex: 1, fontSize: 13, lineHeight: 20, color: t.mintTx }}>App shielding is on. Calls, emergency and SMS always stay available.</Txt>
      </View>
    );
  }
  if (Platform.OS === 'android') {
    return (
      <View style={[note, { backgroundColor: t.noteBg }]}>
        <Txt style={{ fontSize: 13, lineHeight: 20, color: t.noteTx }}>App shielding needs the installed Ibtida build (it is not available in Expo Go). The lock still runs inside Ibtida.</Txt>
      </View>
    );
  }
  return (
    <View style={[note, { backgroundColor: t.iosBg, boxShadow: 'inset 0 0 0 1px rgba(111,135,201,0.3)' }]}>
      <Txt style={{ fontSize: 13, lineHeight: 20, color: t.iosTx }}>
        <Txt style={{ fontSize: 13, fontWeight: 700, color: t.iosB }}>iOS</Txt> uses Screen Time (FamilyControls) to shield apps. <Txt style={{ fontSize: 13, fontWeight: 700, color: t.iosB }}>Android</Txt> uses an Accessibility service. Calls and emergency services always stay available.
      </Txt>
    </View>
  );
}
