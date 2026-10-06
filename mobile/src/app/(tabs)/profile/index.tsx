import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Icon, type IconName } from '../../../components/Icon';
import { FadeIn } from '../../../components/motion';
import { Cta, IconChip, ListCard, Ring, say, Screen, Seg, SerifTitle, Tap, Txt } from '../../../components/ui';
import { METHODS, PH } from '../../../data/content';
import { signOut } from '../../../lib/account';
import { initials } from '../../../lib/hooks';
import { backendEnabled } from '../../../lib/supabase';
import { addDays, dayKey } from '../../../lib/prayer';
import { set, useApp, type ThemePref } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../../../theme/tokens';

const THEMES: ThemePref[] = ['dark', 'light', 'system'];

export default function Profile() {
  const t = useT();
  const router = useRouter();
  const s = useApp(x => x);
  // Consistency over the last 7 days from the on-device prayer log.
  let prayed = 0;
  for (let i = 0; i < 7; i++) { const l = s.logs[dayKey(addDays(new Date(), -i))] || {}; prayed += PH.filter(p => l[p] === 'prayed').length; }
  const pct = Math.round((prayed / 35) * 100);
  const marks = Object.values(s.marks).filter(Boolean).length;
  const menu: [string, IconName, string, string, string][] = [
    ['Goals', 'beads', t.acc, '/adhkar/goals', `${s.goals.length} active`],
    ['Quran bookmarks', 'bookmark', t.mint, '/home/quran', marks ? String(marks) : ''],
    ['Wake alarm', 'alarm', t.peri, '/prayer/wake-alarm', `${s.wakeVerify.filter(Boolean).length} on`],
    ['Emergency history', 'lock', t.lav, '/profile/emergency', String(s.emergencies.length)],
    ['Notifications', 'bell', t.acc, '/profile/notifications', ''],
    ['Privacy', 'shield', t.mint, '/profile/privacy', s.privacy.some(Boolean) ? 'Custom' : 'Private'],
    ['Offline & sync', 'wifiOff', t.peri, '/offline', backendEnabled && s.signedIn ? 'Synced' : 'On device'],
  ];
  return (
    <Screen>
      <FadeIn style={{ paddingHorizontal: 22 }}><SerifTitle a="Your" b="Path" /></FadeIn>
      <FadeIn delay={40} style={{ paddingTop: 18, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 32, backgroundColor: t.card, boxShadow: t.edge, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ring size={84} r={38} stroke={5} pct={pct / 100} track={t.ctl3} color={t.acc}>
            <View style={{ width: 64, height: 64, borderRadius: 32, ...bgImage(G.brand), alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 22, fontWeight: 800, color: FIXED.ink }}>{initials(s.name)}</Txt>
            </View>
          </Ring>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Tap onPress={() => router.push({ pathname: '/name', params: { edit: '1' } })} accessibilityRole="button" accessibilityLabel={s.name ? `Edit name, ${s.name}` : 'Add your name'}>
              <Txt style={{ fontSize: 21, fontWeight: 800, color: s.name ? t.tx : t.acc }}>{s.name || 'Add your name'}</Txt>
            </Tap>
            <Txt style={{ fontSize: 13, color: t.t2, marginTop: 4 }}>{pct}% prayer consistency · 7 days</Txt>
            <View style={{ alignSelf: 'flex-start', marginTop: 9, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 11, backgroundColor: t.ctl }}>
              <Txt style={{ fontSize: 12, fontWeight: 700, color: t.t5 }}>{METHODS[s.method].k} · {s.hanafi ? 'Hanafi' : 'Standard'}</Txt>
            </View>
          </View>
        </View>
      </FadeIn>
      <View style={{ paddingTop: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>
        {[[s.goals.length, 'Goals'], [marks, 'Bookmarks'], [s.circles.length, 'Circles'], [s.streak, 'Streak']].map(([v, l]) => (
          <View key={l} style={{ flex: 1, borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' }}>
            <Txt style={{ fontSize: 22, fontWeight: 800 }}>{v}</Txt>
            <Txt style={{ fontSize: 11.5, color: t.t2, marginTop: 4 }}>{l}</Txt>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 16 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, paddingVertical: 12, paddingRight: 12, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Txt style={{ fontSize: 15.5, fontWeight: 600 }}>Appearance</Txt>
          <View style={{ width: 210 }}>
            <Seg labels={['Dark', 'Light', 'Auto']} value={THEMES.indexOf(s.theme)} onChange={i => set({ theme: THEMES[i] })} height={36} radius={18} inner={14} size={13} gap={3} />
          </View>
        </View>
      </View>
      <ListCard style={{ marginTop: 10 }}>
        {menu.map(([label, icon, ink, href, v]) => (
          <Tap key={label} scale={0.99} onPress={() => router.push(href as never)}
            style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <IconChip name={icon} color={ink} size={40} r={13} />
            <Txt style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>{label}</Txt>
            <Txt style={{ fontSize: 13, color: t.t2 }}>{v}</Txt>
            <Icon name="chev" color={t.t4} />
          </Tap>
        ))}
      </ListCard>
      <View style={{ paddingTop: 14, paddingHorizontal: 16 }}>
        <Cta label="Sign out" kind="danger" height={54} size={14.5} onPress={async () => { await signOut(); say('Signed out safely'); router.replace({ pathname: '/auth', params: { mode: 'in' } }); }} />
      </View>
    </Screen>
  );
}
