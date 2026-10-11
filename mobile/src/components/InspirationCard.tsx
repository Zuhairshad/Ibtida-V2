import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { dayOf, kindLabel, useInspirationFeed } from '../lib/inspiration';
import { bgImage } from '../theme/tokens';
import { Icon } from './Icon';
import { useNow } from './motion';
import { buzz, Tap, Txt } from './ui';

/** Home: the newest inspiration post, opening the feed and Studio. */
export function InspirationCard() {
  const router = useRouter();
  const { posts, groups } = useInspirationFeed();
  const latest = groups[0]?.posts[0];
  const now = useNow(60_000).getTime();
  const todayCount = groups[0]?.day === dayOf(now) ? groups[0].posts.length : 0;
  const line = latest ? latest.en || latest.ur || latest.ar || '' : '';
  return (
    <Tap scale={0.985} onPress={() => { buzz(6); router.push('/inspiration'); }} accessibilityRole="button"
      accessibilityLabel={latest ? `Today’s inspiration: ${kindLabel(latest.kind)}. ${line}` : 'Inspiration studio'}
      style={{ borderRadius: 30, overflow: 'hidden', padding: 20, ...bgImage('linear-gradient(160deg, #2F5A45 0%, #1D3D2E 65%, #3A2F1E 100%)') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="spark" size={16} color="#D8B877" />
        <Txt style={{ flex: 1, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.9, color: 'rgba(251,247,238,0.85)' }}>
          {todayCount ? `TODAY’S INSPIRATION · ${todayCount}` : 'INSPIRATION STUDIO'}
        </Txt>
        <Icon name="chev" color="rgba(251,247,238,0.8)" />
      </View>
      {latest?.ar ? (
        <Txt ar style={{ fontSize: 22, lineHeight: 40, color: '#F2DFB8', textAlign: 'right', writingDirection: 'rtl', marginTop: 12 }} numberOfLines={2}>{latest.ar}</Txt>
      ) : null}
      <Txt style={{ fontSize: 15.5, lineHeight: 23, color: '#FBF7EE', marginTop: latest?.ar ? 6 : 12 }} numberOfLines={3}>
        {line || (posts.length ? 'Open the feed for the latest reminders.' : 'Daily Ayahs, hadith and reminders — designed beautifully for your Status and Stories.')}
      </Txt>
      {!!latest?.source && <Txt style={{ fontSize: 12.5, color: 'rgba(216,184,119,0.95)', marginTop: 8 }}>{latest.source}</Txt>}
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 14, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(251,247,238,0.14)' }}>
        <Icon name="share" size={15} color="#FBF7EE" />
        <Txt style={{ fontSize: 13, fontWeight: 700, color: '#FBF7EE' }}>Design & share</Txt>
      </View>
    </Tap>
  );
}
