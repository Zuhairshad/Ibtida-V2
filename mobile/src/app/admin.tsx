import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useNow } from '../components/motion';
import { BackBar, buzz, Cta, Label, Screen, Statement, Tap, Txt } from '../components/ui';
import { adminList, checkAdmin, DAILY_MAX, kindLabel, publishedOn, type Inspiration } from '../lib/inspiration';
import { fmtTime } from '../lib/prayer';
import { useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]} · ${fmtTime(d)}`; };

/**
 * Admin: publish the day's Islamic reminders. Only accounts listed in `app_admins` get past the
 * check, and the database refuses writes from anyone else regardless.
 */
export default function Admin() {
  const t = useT();
  const router = useRouter();
  const signedIn = useApp(s => s.signedIn);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<Inspiration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  // The minute clock can lag behind a post published seconds ago; the reload time can't.
  const nowMs = Math.max(useNow(60_000).getTime(), loadedAt);

  const load = useCallback(() => {
    let live = true;
    (async () => {
      const ok = await checkAdmin();
      if (!live) return;
      setAdmin(ok);
      if (!ok) return;
      try { const list = await adminList(); if (live) { setLoadedAt(Date.now()); setPosts(list); setError(null); } } catch (e) { if (live) setError(e instanceof Error ? e.message : 'Couldn’t load posts'); }
    })();
    return () => { live = false; };
  }, []);
  // Reload whenever the screen comes back into view (after saving a post).
  useFocusEffect(load);

  if (admin === null) return <Screen tabs={false} top={54}><BackBar title="Admin" /><ActivityIndicator color={t.acc} style={{ marginTop: 60 }} /></Screen>;

  if (!admin) {
    return (
      <Screen tabs={false} top={54}>
        <BackBar title="Admin" />
        <View style={{ marginTop: 30, marginHorizontal: 16, borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, padding: 24, alignItems: 'center' }}>
          <Icon name="shield" size={28} color={t.acc} />
          <Txt style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Admins only</Txt>
          <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.t2, marginTop: 6, textAlign: 'center' }}>
            {signedIn ? 'This account can’t publish. Ask the Ibtida team to add you as an admin.' : 'Sign in with an admin account to publish.'}
          </Txt>
          {!signedIn && <Cta label="Sign in" height={46} size={14} style={{ marginTop: 14, paddingHorizontal: 24 }} onPress={() => router.push({ pathname: '/auth', params: { mode: 'in' } })} />}
        </View>
      </Screen>
    );
  }

  const today = posts ? publishedOn(posts, nowMs) : 0;
  return (
    <Screen tabs={false} top={54}>
      <BackBar title="Admin" right={<Cta label="New post" icon="plus" height={40} size={13.5} style={{ paddingHorizontal: 14, marginRight: 8 }} onPress={() => router.push('/admin-post')} />} />
      <Statement a="Publish today’s light." b={`${today} of ${DAILY_MAX} published today.`} style={{ paddingTop: 10, paddingHorizontal: 22 }} />
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, marginHorizontal: 22 }}>
        {Array.from({ length: DAILY_MAX }, (_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < today ? t.mint : t.ctl3 }} />)}
      </View>
      {error && <Txt style={{ color: t.rose, fontSize: 13.5, marginTop: 14, marginHorizontal: 22 }}>{error}</Txt>}
      {!posts && !error && <ActivityIndicator color={t.acc} style={{ marginTop: 30 }} />}
      {posts && posts.length === 0 && <Txt style={{ fontSize: 14, color: t.t2, marginTop: 20, marginHorizontal: 22 }}>No posts yet. Tap New post to publish the first reminder.</Txt>}
      {posts && posts.length > 0 && <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>ALL POSTS</Label>}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {posts?.map(p => {
          const scheduled = p.status === 'published' && p.publishAt > nowMs;
          const state = scheduled ? 'Scheduled' : p.status === 'published' ? 'Live' : p.status === 'draft' ? 'Draft' : 'Archived';
          const ink = state === 'Live' ? t.mint : state === 'Scheduled' ? t.acc : t.t4;
          return (
            <Tap key={p.id} scale={0.99} onPress={() => { buzz(5); router.push({ pathname: '/admin-post', params: { id: p.id } }); }} accessibilityRole="button"
              accessibilityLabel={`${kindLabel(p.kind)}, ${state}, ${when(p.publishAt)}`}
              style={{ borderRadius: 22, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: t.t2 }}>{kindLabel(p.kind).toUpperCase()}</Txt>
                <View style={{ flex: 1 }} />
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ink }} />
                <Txt style={{ fontSize: 12.5, fontWeight: 700, color: ink }}>{state}</Txt>
              </View>
              <Txt style={{ fontSize: 15, lineHeight: 21, marginTop: 8 }} numberOfLines={2}>{p.title || p.en || p.ur || p.ar}</Txt>
              <Txt style={{ fontSize: 12.5, color: t.t4, marginTop: 6 }}>{when(p.publishAt)}{p.source ? ` · ${p.source}` : ''}</Txt>
            </Tap>
          );
        })}
      </View>
    </Screen>
  );
}
