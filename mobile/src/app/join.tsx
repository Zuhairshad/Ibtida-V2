import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackBar, buzz, Cta, Page, say, Txt } from '../components/ui';
import { cleanCode, clearInvite, holdInvite, previewInvite, type InvitePreview } from '../lib/invite';
import { joinCircleLive, liveOn } from '../lib/live';
import { backendEnabled } from '../lib/supabase';
import { getState, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

/**
 * Target of ibtida://join?code=CODE (from a shared invitation link). Shows which circle it is,
 * keeps the invite through sign-in or sign-up, and joins once the person confirms.
 */
export default function Join() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const pending = useApp(s => s.pendingInvite);
  const signedIn = useApp(s => s.signedIn);
  const onboarded = useApp(s => s.onboarded);
  const code = cleanCode(params.code) ?? cleanCode(pending);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    // Remember it, so signing in or creating an account comes back here.
    if (!signedIn || !liveOn()) holdInvite(code);
    let live = true;
    previewInvite(code).then(p => { if (live) setPreview(p); });
    return () => { live = false; };
  }, [code, signedIn]);

  const openCircle = (localId: number) => {
    clearInvite();
    router.replace({ pathname: '/community/circle/[id]', params: { id: String(localId) } });
  };

  const join = async () => {
    if (!code || busy) return;
    setBusy(true);
    setError(null);
    try {
      const c = await joinCircleLive(code);
      buzz([10, 30, 16]);
      say(`Joined ${c.name}`);
      openCircle(c.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t join that circle');
      buzz([40, 40]);
    } finally {
      setBusy(false);
    }
  };

  const signIn = (mode: 'in' | 'up') => {
    if (code) holdInvite(code);
    router.push({ pathname: '/auth', params: { mode } });
  };

  const dismiss = () => {
    clearInvite();
    if (router.canGoBack()) router.back(); else router.replace(onboarded ? '/community' : '/splash');
  };

  // An existing member opening their own link goes straight to the circle.
  const already = preview?.status === 'ok' && preview.joined ? getState().circles.find(c => c.code === code) : undefined;

  const state = !code ? 'bad' : !backendEnabled ? 'offline-build' : preview === null ? 'loading' : preview.status;
  const title = state === 'bad' || state === 'invalid' ? 'This link isn’t valid'
    : state === 'expired' ? 'This invitation has expired'
      : state === 'revoked' ? 'This invitation was turned off'
        : state === 'offline-build' ? 'Invitations need an account'
          : preview?.status === 'ok' ? `Join ${preview.circleName}` : 'Join a circle';
  const body = state === 'bad' || state === 'invalid' ? 'Check the link, or ask the person who sent it for a new one.'
    : state === 'expired' ? `Ask ${preview && 'circleName' in preview && preview.circleName ? `the owner of ${preview.circleName}` : 'the circle owner'} for a new link.`
      : state === 'revoked' ? 'The circle owner made a new invitation. Ask them for the new link.'
        : state === 'offline-build' ? 'This copy of Ibtida runs on this device only, so it can’t join circles.'
          : preview?.status === 'ok'
            ? `${preview.members} ${preview.members === 1 ? 'member' : 'members'} · keep your worship goals together. Members see each other’s shared progress, never your private logs.`
            : `Invite code ${code}. We’ll check it when you join.`;
  const usable = state === 'ok' || state === 'unknown';

  return (
    <Page style={{ paddingHorizontal: 22 }}>
      <View style={{ marginHorizontal: -22 }}><BackBar onBack={dismiss} /></View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
        <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: usable ? t.tLav : 'rgba(240,138,122,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          {state === 'loading' ? <ActivityIndicator color={t.lav} /> : <Icon name={usable ? 'people' : 'x'} size={34} color={usable ? t.lav : t.rose} />}
        </View>
        <Txt style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginTop: 20, textAlign: 'center' }} accessibilityRole="header">{state === 'loading' ? 'Checking invitation…' : title}</Txt>
        {state !== 'loading' && <Txt style={{ fontSize: 15, lineHeight: 22.5, color: t.t3, marginTop: 10, textAlign: 'center' }}>{body}</Txt>}
        {error && <Txt style={{ fontSize: 14, lineHeight: 20, color: t.rose, marginTop: 14, textAlign: 'center' }}>{error}</Txt>}
      </View>
      <View style={{ gap: 10 }}>
        {usable && (already
          ? <Cta label={`Open ${already.name}`} onPress={() => openCircle(already.id)} />
          : signedIn && liveOn()
            ? <Cta label={busy ? 'Joining…' : 'Join circle'} disabled={busy} onPress={join} />
            : <>
                <Cta label="Sign in to join" onPress={() => signIn('in')} />
                <Cta label="Create an account" kind="secondary" onPress={() => signIn('up')} />
              </>)}
        <Cta label={usable ? 'Not now' : 'Close'} kind="ghost" height={50} size={15} onPress={dismiss} />
      </View>
    </Page>
  );
}
