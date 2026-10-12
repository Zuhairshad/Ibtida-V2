import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { tr, useLang } from '../lib/i18n';
import { dayOf, kindLabel, useInspirationFeed } from '../lib/inspiration';
import { bgImage, G } from '../theme/tokens';
import { Icon } from './Icon';
import { Breathe, Stars, useNow } from './motion';
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
      style={{ borderRadius: 30, overflow: 'hidden', padding: 20, ...bgImage(G.sky.Isha) }}>
      <Breathe bg={G.glowWarm} style={{ width: 170, height: 170, right: -50, top: -30 }} dur={9000} />
      <Breathe bg={G.glowViolet} style={{ width: 200, height: 200, left: -70, bottom: -60 }} dur={14000} />
      <Stars />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="spark" size={16} color="#F7BD5A" />
        <Txt ur={ur} style={{ flex: 1, fontSize: ur ? 12.5 : 11.5, fontWeight: 700, letterSpacing: ur ? 0 : 0.9, color: 'rgba(255,255,255,0.8)', textAlign: ur ? 'right' : undefined }}>
          {todayCount ? tr(lang, 'insToday', { n: String(todayCount) }) : tr(lang, 'insStudio')}
        </Txt>
        <Icon name="chev" color="rgba(255,255,255,0.8)" />
      </View>
      {latest?.ar ? (
        <Txt ar style={{ fontSize: 22, lineHeight: 40, color: '#FFFFFF', textAlign: 'right', writingDirection: 'rtl', marginTop: 12 }} numberOfLines={2}>{latest.ar}</Txt>
      ) : null}
      <Txt ur={ur} style={{ fontSize: 15.5, lineHeight: ur ? 32 : 23, color: '#FFFFFF', marginTop: latest?.ar ? 6 : 12, textAlign: ur ? 'right' : undefined }} numberOfLines={3}>
        {line || tr(lang, posts.length ? 'insOpenFeed' : 'insBlurb')}
      </Txt>
      {!!latest?.source && <Txt style={{ fontSize: 12.5, color: 'rgba(247,189,90,0.95)', marginTop: 8, textAlign: ur ? 'right' : undefined }}>{latest.source}</Txt>}
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 14, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)' }}>
        <Icon name="share" size={15} color="#FFFFFF" />
        <Txt ur={ur} style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{tr(lang, 'insShare')}</Txt>
      </View>
    </Tap>
  );
}
