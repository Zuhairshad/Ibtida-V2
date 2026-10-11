import { useRouter } from 'expo-router';
import { ActivityIndicator, Share, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useNow } from '../components/motion';
import { BackBar, buzz, Cta, Label, say, Screen, Statement, Tap, Txt } from '../components/ui';
import { dayOf, kindLabel, useInspirationFeed, type Inspiration } from '../lib/inspiration';
import { useT } from '../theme/ThemeProvider';

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayLabel(day: string) {
  const today = dayOf(Date.now());
  const yesterday = dayOf(Date.now() - 86_400_000);
  if (day === today) return 'TODAY';
  if (day === yesterday) return 'YESTERDAY';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DOW[date.getDay()]} ${d} ${MON[m - 1]}`.toUpperCase();
}

const KIND_INK: Record<Inspiration['kind'], 'mint' | 'gold' | 'peri' | 'lav'> = { ayah: 'mint', hadith: 'gold', reminder: 'peri', quote: 'lav' };

function PostCard({ p }: { p: Inspiration }) {
  const t = useT();
  const router = useRouter();
  const ink = t[KIND_INK[p.kind]];
  const text = [p.title, p.ar, p.en, p.ur, p.source ? `— ${p.source}` : null, 'Shared from Ibtida'].filter(Boolean).join('\n\n');
  return (
    <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: t.ctl }}>
          <Txt style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.8, color: ink }}>{kindLabel(p.kind).toUpperCase()}</Txt>
        </View>
        {!!p.title && <Txt style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: t.t2 }} numberOfLines={1}>{p.title}</Txt>}
      </View>
      {!!p.ar && <Txt ar style={{ fontSize: 24, lineHeight: 44, color: t.gold, textAlign: 'right', writingDirection: 'rtl', marginTop: 14 }}>{p.ar}</Txt>}
      {!!p.en && <Txt style={{ fontSize: 15.5, lineHeight: 24, color: t.t5, marginTop: 10 }}>{p.en}</Txt>}
      {!!p.ur && <Txt ur style={{ fontSize: 16, lineHeight: 34, color: t.t5, textAlign: 'right', writingDirection: 'rtl', marginTop: 8 }}>{p.ur}</Txt>}
      {!!p.source && <Txt style={{ fontSize: 12.5, fontWeight: 600, color: t.t4, marginTop: 10 }}>{p.source}</Txt>}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Cta label="Design & share" icon="spark" height={46} size={14} style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/studio', params: { id: p.id } })} />
        <Tap onPress={() => { buzz(5); Share.share({ message: text }).catch(() => {}); }} accessibilityRole="button" accessibilityLabel="Share as text"
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.ctl2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="share" size={18} color={t.tx} />
        </Tap>
      </View>
    </View>
  );
}

/** The Islamic Inspiration feed: posts published by Ibtida's editors, newest first. */
export default function InspirationFeed() {
  const t = useT();
  const router = useRouter();
  const { groups, loading, error, live, refresh } = useInspirationFeed();
  const now = useNow(60_000).getTime();
  const today = groups[0]?.day === dayOf(now) ? groups[0] : null;
  // "Live" only when the feed itself loaded and updates are connected.
  const isLive = live && !error;

  return (
    <Screen tabs={false} top={54}>
      <BackBar title="Inspiration" right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 14 }} accessibilityLabel={isLive ? 'Live: new posts appear here' : 'Updates when you open this screen'}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isLive ? t.mint : t.t4 }} />
          <Txt style={{ fontSize: 12, fontWeight: 700, color: isLive ? t.mint : t.t4 }}>{isLive ? 'LIVE' : 'OFFLINE'}</Txt>
        </View>
      } />
      <Statement a="Today’s light." b="Reflect, then share." style={{ paddingTop: 10, paddingHorizontal: 22 }} />

      <Tap scale={0.985} onPress={() => router.push('/studio')} accessibilityRole="button" accessibilityLabel="Design your own post"
        style={{ marginTop: 16, marginHorizontal: 16, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(216,184,119,0.55)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="plus" color={t.gold} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 15, fontWeight: 700 }}>Design your own</Txt>
          <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 2 }}>Write a reminder and style it for Status, Stories or a post</Txt>
        </View>
        <Icon name="chev" color={t.t4} />
      </Tap>

      {loading && !groups.length && <ActivityIndicator color={t.acc} style={{ marginTop: 40 }} />}

      {!loading && !groups.length && (
        <View style={{ marginTop: 18, marginHorizontal: 16, borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, padding: 24, alignItems: 'center' }}>
          <Icon name="spark" size={26} color={t.gold} />
          <Txt style={{ fontSize: 17, fontWeight: 700, marginTop: 10 }}>{error === 'offline-build' ? 'The feed needs the online app' : 'No posts yet'}</Txt>
          <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.t2, marginTop: 6, textAlign: 'center' }}>
            {error === 'offline-build' ? 'This copy of Ibtida runs on this device only.' : error ? 'Couldn’t reach the feed. Check your connection.' : 'Each day’s reminders appear here the moment they are published.'}
          </Txt>
          {!!error && error !== 'offline-build' && <Cta label="Try again" kind="secondary" height={44} size={14} style={{ marginTop: 14, paddingHorizontal: 22 }} onPress={() => { say('Refreshing'); refresh(); }} />}
        </View>
      )}

      {!loading && groups.length > 0 && !today && (
        <Txt style={{ fontSize: 13, color: t.t2, marginTop: 18, marginHorizontal: 26 }}>Today’s posts haven’t been published yet — here are the latest.</Txt>
      )}

      {groups.map(g => (
        <View key={g.day}>
          <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>{dayLabel(g.day)}</Label>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {g.posts.map(p => <PostCard key={p.id} p={p} />)}
          </View>
        </View>
      ))}
    </Screen>
  );
}
