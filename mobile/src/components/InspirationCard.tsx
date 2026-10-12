import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { tr, useLang } from '../lib/i18n';
import { dayOf, kindLabel, useInspirationFeed } from '../lib/inspiration';
import { bgImage } from '../theme/tokens';
import { Icon } from './Icon';
import { useNow } from './motion';
import { buzz, Tap, Txt } from './ui';

/** Home: the newest inspiration post, opening the feed and Studio. */
export function InspirationCard() {
  const router = useRouter();
  const { lang, ur } = useLang();
  const { posts, groups } = useInspirationFeed();
  const latest = groups[0]?.posts[0];
  const now = useNow(60_000).getTime();
  const todayCount = groups[0]?.day === dayOf(now) ? groups[0].posts.length : 0;
  const line = latest ? (ur ? latest.ur || latest.en : latest.en || latest.ur) || latest.ar || '' : '';
  return (
    <Tap scale={0.985} onPress={() => { buzz(6); router.push('/inspiration'); }} accessibilityRole="button"
      accessibilityLabel={latest ? tr(lang, 'insA11y', { k: kindLabel(latest.kind), l: line }) : tr(lang, 'insStudioA11y')}
      style={{ borderRadius: 30, overflow: 'hidden', padding: 20, ...bgImage('linear-gradient(160deg, #2F5A45 0%, #1D3D2E 65%, #3A2F1E 100%)') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="spark" size={16} color="#D8B877" />
        <Txt ur={ur} style={{ flex: 1, fontSize: ur ? 12.5 : 11.5, fontWeight: 700, letterSpacing: ur ? 0 : 0.9, color: 'rgba(251,247,238,0.85)', textAlign: ur ? 'right' : undefined }}>
          {todayCount ? tr(lang, 'insToday', { n: String(todayCount) }) : tr(lang, 'insStudio')}
        </Txt>
        <Icon name="chev" color="rgba(251,247,238,0.8)" />
      </View>
      {latest?.ar ? (
        <Txt ar style={{ fontSize: 22, lineHeight: 40, color: '#F2DFB8', textAlign: 'right', writingDirection: 'rtl', marginTop: 12 }} numberOfLines={2}>{latest.ar}</Txt>
      ) : null}
      <Txt ur={ur} style={{ fontSize: 15.5, lineHeight: ur ? 32 : 23, color: '#FBF7EE', marginTop: latest?.ar ? 6 : 12, textAlign: ur ? 'right' : undefined }} numberOfLines={3}>
        {line || tr(lang, posts.length ? 'insOpenFeed' : 'insBlurb')}
      </Txt>
      {!!latest?.source && <Txt style={{ fontSize: 12.5, color: 'rgba(216,184,119,0.95)', marginTop: 8, textAlign: ur ? 'right' : undefined }}>{latest.source}</Txt>}
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 14, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(251,247,238,0.14)' }}>
        <Icon name="share" size={15} color="#FBF7EE" />
        <Txt ur={ur} style={{ fontSize: 13, fontWeight: 700, color: '#FBF7EE' }}>{tr(lang, 'insShare')}</Txt>
      </View>
    </Tap>
  );
}
