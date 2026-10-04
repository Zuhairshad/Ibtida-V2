import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { say } from '../components/ui';
import { handleAuthUrl } from '../lib/account';
import { enableNotifications } from '../lib/notifications';
import { set } from '../state/store';
import { useT } from '../theme/ThemeProvider';

/**
 * Target of ibtida://auth-callback (magic link, email confirmation, Google). Completes the
 * session from the URL, then continues into the app — or back to the sign-in screen.
 */
export default function AuthCallback() {
  const t = useT();
  const router = useRouter();
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url) return;
    let done = false;
    handleAuthUrl(url).then(r => {
      if (done) return;
      if (r.ok) {
        set({ onboarded: true, signedIn: true });
        say('Bismillah — welcome to Ibtida');
        router.replace('/home');
        enableNotifications();
      } else {
        if (r.message) say(r.message);
        router.replace({ pathname: '/auth', params: { mode: 'in' } });
      }
    });
    return () => { done = true; };
  }, [url, router]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={t.acc} />
    </View>
  );
}
