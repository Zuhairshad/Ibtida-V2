import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform, Pressable, Share, View } from 'react-native';
import { Icon } from '../../../../components/Icon';
import { Avatar, BackBar, Bar, buzz, Cta, H1, Label, ListCard, say, Screen, Tap, Txt } from '../../../../components/ui';
import { code8, fmt } from '../../../../data/content';
import { initialsOf } from '../../../../components/community';
import { contributeCircleLive, leaveCircleLive, loadMembers, regenerateCodeLive, useLive } from '../../../../lib/live';
import { addAct, set, useApp, type Circle } from '../../../../state/store';
import { useT } from '../../../../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../../../../theme/tokens';

export default function CircleDetail() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useApp(s => s.circles.find(x => x.id === Number(id)));
  const me = useApp(s => s.name);
  const remoteId = c?.remoteId;
  const liveMembers = useLive(l => (remoteId ? l.members[remoteId] : undefined));
  useEffect(() => { if (c?.remoteId) loadMembers(c); }, [remoteId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) {
    return (
      <Screen top={54}>
        <BackBar />
        <View style={{ padding: 28, alignItems: 'center' }}>
          <Txt style={{ fontSize: 17, fontWeight: 700 }}>This circle is no longer available</Txt>
        </View>
      </Screen>
    );
  }
  const owner = c.role === 'Owner';
  const upd = (fn: (x: Circle) => Circle) => set(s => ({ circles: s.circles.map(x => (x.id === c.id ? fn(x) : x)) }));
  // Signed in: the real member list. On-device circles only ever have you in them.
  const members: [string, string][] | null = liveMembers
    ? liveMembers.map(m => [m.name, m.role])
    : c.remoteId ? null : [[me || 'You', 'Owner']];
  const contribute = (gi: number, n: number) => {
    const g = c.goals[gi];
    if (!g || g.done >= g.total) { say('Target reached · Alhamdulillah'); return; }
    buzz(8);
    addAct('d', n);
    if (c.remoteId && g.id) { contributeCircleLive(c, g.id, n); return; }
    upd(x => ({ ...x, goals: x.goals.map((y, yi) => (yi === gi ? { ...y, done: Math.min(y.total, y.done + n) } : y)) }));
  };
  const leave = () => {
    const title = owner ? 'Delete this circle?' : 'Leave this circle?';
    const msg = owner ? 'Members lose access and the invite code stops working.' : 'You can rejoin with an invite code.';
    const done = () => {
      say((owner ? 'Deleted ' : 'Left ') + c.name);
      if (router.canGoBack()) router.back(); else router.replace('/community');
    };
    const go = () => {
      if (c.remoteId) { leaveCircleLive(c).then(done).catch((e: Error) => say(e.message)); return; }
      set(s => ({ circles: s.circles.filter(x => x.id !== c.id) }));
      done();
    };
    // Alert.alert is a no-op on react-native-web.
    if (Platform.OS === 'web') { if (window.confirm(`${title}\n${msg}`)) go(); return; }
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: owner ? 'Delete' : 'Leave', style: 'destructive', onPress: go },
    ]);
  };
  return (
    <Screen top={54}>
      <BackBar />
      <View style={{ paddingTop: 4, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <H1>{c.name}</H1>
        <View style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12, backgroundColor: t.ctl }}>
          <Txt style={{ fontSize: 12, fontWeight: 700, color: t.t5 }}>{c.priv}</Txt>
        </View>
      </View>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 28, padding: 20, ...bgImage(G.circleCode) }}>
          <Txt style={{ fontSize: 11.5, letterSpacing: 0.7, color: 'rgba(255,255,255,0.85)' }}>INVITE CODE</Txt>
          <Txt mono style={{ fontSize: 32, fontWeight: 800, letterSpacing: 7.7, marginTop: 8, color: '#FFFFFF' }}>{c.code}</Txt>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Tap onPress={() => { Clipboard.setStringAsync(c.code).catch(() => {}); say('Code copied'); }}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Icon name="copy" size={16} color="#FFFFFF" /><Txt style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>Copy</Txt>
            </Tap>
            <Tap onPress={() => Share.share({ message: `Join ${c.name} on Ibtida — invite code: ${c.code}` }).catch(() => {})}
              style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Icon name="share" size={16} color="#111217" /><Txt style={{ fontSize: 14, fontWeight: 700, color: '#111217' }}>Share</Txt>
            </Tap>
          </View>
          {owner && (
            <Pressable onPress={() => {
              if (c.remoteId) { regenerateCodeLive(c).then(() => say('New code · old one no longer works')).catch((e: Error) => say(e.message)); return; }
              upd(x => ({ ...x, code: code8() })); say('New code · old one no longer works');
            }} style={{ marginTop: 10, height: 36, alignSelf: 'center', justifyContent: 'center' }} accessibilityRole="button">
              <Txt style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Regenerate code</Txt>
            </Pressable>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>
        <Label>SHARED GOALS</Label>
        <Pressable onPress={() => router.push({ pathname: '/circle-goal', params: { id: String(c.id) } })} style={{ height: 36, justifyContent: 'center' }} accessibilityRole="button">
          <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.acc }}>+ Add target</Txt>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {c.goals.length === 0 && (
          <Pressable onPress={() => router.push({ pathname: '/circle-goal', params: { id: String(c.id) } })} style={{ borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 20, alignItems: 'center' }}>
            <Txt style={{ fontSize: 13.5, color: t.t2, textAlign: 'center' }}>No shared target yet — pick a community goal or make your own.</Txt>
          </Pressable>
        )}
        {c.goals.map((g, gi) => (
          <View key={gi} style={{ borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Txt style={{ flex: 1, fontSize: 15.5, fontWeight: 700 }}>{g.name}</Txt>
              <Cta label="+1" height={38} size={13} kind="secondary" color={t.tx} style={{ paddingHorizontal: 13, backgroundColor: t.ctl }} onPress={() => contribute(gi, 1)} />
              <Cta label="+33" height={38} size={13} style={{ paddingHorizontal: 13 }} onPress={() => contribute(gi, 33)} />
            </View>
            <Bar pct={(g.done / g.total) * 100} h={6} track={t.ctl} style={{ marginTop: 12 }} />
            <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 8 }}>{fmt(g.done)} / {fmt(g.total)}</Txt>
          </View>
        ))}
      </View>
      <Label style={{ marginTop: 20, marginBottom: 10, marginHorizontal: 26 }}>MEMBERS</Label>
      <ListCard>
        {!members && <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}><Txt style={{ fontSize: 13.5, color: t.t2 }}>Loading members…</Txt></View>}
        {members?.map(([name, role], k) => (
          <View key={name + k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <Avatar i={initialsOf(name)} bg={FIXED.avatars[k % FIXED.avatars.length]} size={38} fs={13} />
            <Txt style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{name}</Txt>
            <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 11, backgroundColor: role === 'Owner' ? 'rgba(242,166,90,0.16)' : t.ctl }}>
              <Txt style={{ fontSize: 12, fontWeight: 700, color: role === 'Owner' ? t.gold : t.t5 }}>{role}</Txt>
            </View>
          </View>
        ))}
      </ListCard>
      <View style={{ paddingTop: 14, paddingHorizontal: 16 }}>
        <Cta label={owner ? 'Delete circle' : 'Leave circle'} kind="danger" height={54} size={14.5} onPress={leave} />
      </View>
    </Screen>
  );
}
