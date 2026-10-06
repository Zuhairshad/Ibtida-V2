import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { FadeIn } from '../components/motion';
import { BackTitle, Steps } from '../components/Onboarding';
import { BackBar, Cta, H1, Page, say, Txt } from '../components/ui';
import { getState, set } from '../state/store';
import { useT } from '../theme/ThemeProvider';

/** "What should we call you?" — the first onboarding step, and the profile's name editor (`?edit=1`). */
export default function Name() {
  const t = useT();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [name, setName] = useState(() => getState().name);
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  const save = () => {
    if (!clean) return;
    set({ name: clean });
    if (edit) { say('Name saved'); router.back(); } else router.push('/intent');
  };
  const input = (
    <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={t.t4} accessibilityLabel="Your name"
      autoFocus autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="done" onSubmitEditing={save} maxLength={40}
      style={{ outlineWidth: 0, marginTop: 40, height: 64, borderRadius: 22, borderWidth: 1, borderColor: t.bord, backgroundColor: t.sunk, paddingHorizontal: 20, color: t.txw, fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' }} />
  );
  if (edit) {
    return (
      <Page style={{ paddingHorizontal: 22 }}>
        <View style={{ marginHorizontal: -22 }}><BackBar title="Your name" /></View>
        <H1 style={{ marginTop: 8 }}>What should we call you?</H1>
        {input}
        <View style={{ flex: 1 }} />
        <Cta label="Save" disabled={!clean} onPress={save} />
      </Page>
    );
  }
  return (
    <Page top={56} style={{ paddingHorizontal: 22 }}>
      <FadeIn dur={400} style={{ flex: 1 }}>
        <Steps at="name" />
        <BackTitle title="What should we call you?" sub="Used to greet you, and shown to circles you join. You can change it any time." />
        {input}
        <Txt style={{ fontSize: 13, color: t.t4, textAlign: 'center', marginTop: 12 }}>A first name is fine.</Txt>
        <View style={{ flex: 1 }} />
        <Cta label="Continue" disabled={!clean} onPress={save} />
      </FadeIn>
    </Page>
  );
}
