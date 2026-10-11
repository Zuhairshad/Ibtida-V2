import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { BackBar, Cta, H1, Page, say, Tap, Txt } from '../components/ui';
import { changePassword } from '../lib/account';
import { useT } from '../theme/ThemeProvider';

/** Choose a new password: from Profile, or after opening a password-reset link (`?reset=1`). */
export default function Password() {
  const t = useT();
  const router = useRouter();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const short = pw.length > 0 && pw.length < 6;
  const mismatch = again.length > 0 && again !== pw;
  const ready = pw.length >= 6 && again === pw && !busy;
  const input = { outlineWidth: 0, height: 56, borderRadius: 20, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 18, color: t.txw, fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular' } as const;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const r = await changePassword(pw);
      if (!r.ok) { say(r.message); return; }
      say('Password changed', 'ok');
      if (reset) router.replace('/home'); else router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page style={{ paddingHorizontal: 22 }}>
      <View style={{ marginHorizontal: -22 }}><BackBar title={reset ? 'Reset password' : 'Change password'} /></View>
      <H1 style={{ marginTop: 8 }}>Choose a new password</H1>
      <Txt style={{ fontSize: 14.5, lineHeight: 21, color: t.t3, marginTop: 10 }}>At least 6 characters. You’ll use it to sign in on any phone.</Txt>
      <View style={{ gap: 10, marginTop: 24 }}>
        <View>
          <TextInput value={pw} onChangeText={setPw} secureTextEntry={!show} placeholder="New password" placeholderTextColor={t.t4} accessibilityLabel="New password"
            autoFocus autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword"
            style={[input, { paddingRight: 76 }, short && { borderColor: t.errTx }]} />
          <Tap onPress={() => setShow(x => !x)} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 6, top: 6, height: 44, minWidth: 64, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.acc }}>{show ? 'Hide' : 'Show'}</Txt>
          </Tap>
        </View>
        {short && <Txt style={{ fontSize: 12.5, color: t.errTx, paddingHorizontal: 6 }}>Use at least 6 characters</Txt>}
        <TextInput value={again} onChangeText={setAgain} secureTextEntry={!show} placeholder="Repeat new password" placeholderTextColor={t.t4} accessibilityLabel="Repeat new password"
          autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={save}
          style={[input, mismatch && { borderColor: t.errTx }]} />
        {mismatch && <Txt style={{ fontSize: 12.5, color: t.errTx, paddingHorizontal: 6 }}>The passwords don’t match</Txt>}
      </View>
      <View style={{ flex: 1 }} />
      <Cta label={busy ? 'One moment…' : 'Save password'} disabled={!ready} onPress={save} />
    </Page>
  );
}
