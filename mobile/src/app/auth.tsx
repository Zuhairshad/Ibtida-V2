import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { GoogleG } from '../components/Icon';
import { FadeIn } from '../components/motion';
import { BackBar, buzz, Cta, H1, Page, say, Seg, Tap, Txt } from '../components/ui';
import { enableNotifications } from '../lib/notifications';
import { set } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const EMAIL = /^\S+@\S+\.\S+$/;

/**
 * Account screen. The app is fully usable on-device; until the backend is wired this
 * stores the email locally and continues, so nothing blocks the user.
 */
export default function Auth() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState(params.mode === 'in' ? 1 : 0);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [magic, setMagic] = useState(false);
  const bad = touched && email.length > 0 && !EMAIL.test(email);
  const inputStyle = { height: 56, borderRadius: 20, borderWidth: 1, backgroundColor: t.sunk, paddingHorizontal: 18, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' } as const;
  // Clear the onboarding screens underneath so Back on Home can't return to them.
  const home = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/home');
  };
  const enter = () => {
    buzz([10, 30, 10]);
    set({ onboarded: true, signedIn: true, email: email.trim() });
    say('Bismillah — welcome to Ibtida');
    home();
    // Entering the app is when reminders start to matter, so ask now rather than at launch.
    enableNotifications();
  };
  return (
    <Page top={60}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <FadeIn dur={400}>
          <View style={{ marginHorizontal: -12 }}><BackBar /></View>
          <H1 style={{ marginTop: 6 }}>{mode === 0 ? 'Save your journey' : 'Welcome back'}</H1>
          <Txt style={{ fontSize: 15, color: t.t3, marginTop: 10 }}>Your logs, goals and circles stay with your account.</Txt>
          <View style={{ marginTop: 24 }}>
            <Seg labels={['Sign up', 'Sign in']} value={mode} onChange={i => { setMode(i); setMagic(false); }} height={44} radius={20} inner={16} bg={t.opt} />
          </View>
          <View style={{ gap: 10, marginTop: 16 }}>
            <TextInput value={email} onChangeText={v => { setEmail(v); setTouched(true); }} placeholder="Email" placeholderTextColor={t.t4} accessibilityLabel="Email"
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={[inputStyle, { borderColor: bad ? t.errTx : t.bord }]} />
            {bad && <Txt style={{ fontSize: 12.5, color: t.errTx, paddingHorizontal: 6 }}>Enter a valid email address</Txt>}
            <TextInput secureTextEntry placeholder="Password" placeholderTextColor={t.t4} accessibilityLabel="Password" autoComplete="password" style={[inputStyle, { borderColor: t.bord }]} />
          </View>
          <Cta label={mode === 0 ? 'Create account' : 'Sign in'} height={58} size={17} style={{ marginTop: 16 }} onPress={() => {
            if (email && !EMAIL.test(email)) { setTouched(true); return; }
            enter();
          }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
            <Txt style={{ fontSize: 12.5, color: t.t4 }}>or</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: t.line }} />
          </View>
          <Tap onPress={enter} style={{ height: 56, borderRadius: 28, backgroundColor: t.opt, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <GoogleG />
            <Txt style={{ fontSize: 15.5, fontWeight: 700, color: t.txw }}>Continue with Google</Txt>
          </Tap>
          <Cta label="Email me a magic link" kind="secondary" color={t.txw} height={56} size={15.5} style={{ marginTop: 10, backgroundColor: t.opt }}
            onPress={() => { if (!EMAIL.test(email)) { setTouched(true); if (!email) setEmail(' '); return; } setMagic(true); }} />
          {magic && (
            <FadeIn dur={300} style={{ marginTop: 14, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: 'rgba(94,184,122,0.12)', boxShadow: 'inset 0 0 0 1px rgba(94,184,122,0.3)' }}>
              <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.okTx }}>Check your inbox — we sent a sign-in link to {email}.</Txt>
            </FadeIn>
          )}
          <Tap onPress={() => { set({ onboarded: true }); home(); enableNotifications(); }} style={{ height: 44, marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 14, fontWeight: 600, color: t.t3 }}>Continue without an account</Txt>
          </Tap>
        </FadeIn>
      </ScrollView>
    </Page>
  );
}
