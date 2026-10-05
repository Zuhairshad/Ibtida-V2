import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AvatarRow, circlePct, FeedRow, joinGoal, Sparkline, useCommunityGoals, useFeed } from '../../../components/community';
import { Icon } from '../../../components/Icon';
import { Breathe, FadeIn, PulseDot, useCountUp, useNow } from '../../../components/motion';
import { Avatar, Bar, Cta, IconBtn, Ring, Screen, SectionHead, Seg, SerifTitle, Tap, Txt } from '../../../components/ui';
import { fmt, IMPACT_TARGET, joinedLabel, participantsLabel } from '../../../data/content';
import { useLive, useLiveRefresh } from '../../../lib/live';
import { useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../../../theme/tokens';

export default function Community() {
  const t = useT();
  const router = useRouter();
  const now = useNow();
  const [tab, setTab] = useState(0);
  useLiveRefresh();
  const ummah = useLive(l => (l.on ? l.ummah : null));
  // Live: the user's real contributions across community goals; sample mode keeps the design's figures.
  const myTotal = useLive(l => (l.on ? Object.values(l.goals).reduce((a, g) => a + g.mine, 0) : null));
  const part = myTotal ?? 1240;
  const INTENTION = 2000;
  const feed = useFeed();
  const impact = useCountUp(ummah ? ummah.today : IMPACT_TARGET);
  const cgs = useCommunityGoals();
  const circles = useApp(s => s.circles);
  const joinedCount = cgs.filter(c => c.joined).length;
  const live = ummah ? ummah.now : 12408 + (now.getSeconds() % 9) * 7;
  const openGoal = (i: number) => router.push(`/community/goal/${i}`);
  const openCircle = (id: number) => router.push(`/community/circle/${id}`);

  return (
    <Screen>
      <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PulseDot size={7} color={t.acc} />
            <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.15, color: t.acc }}>{live > 0 ? `${fmt(live)} REMEMBERING NOW` : 'BE THE FIRST TO REMEMBER TODAY'}</Txt>
          </View>
          <SerifTitle a="The" b="Ummah" style={{ marginTop: 8 }} />
        </View>
        <IconBtn name="plus" label="New circle" bg={t.cta} color={t.ctaInk} onPress={() => router.push('/circle-new')} />
      </FadeIn>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Seg labels={['Overview', 'Goals', 'Circles', 'Feed']} value={tab} onChange={setTab} height={42} size={13} gap={3} />
      </View>

      {tab === 0 && (
        <>
          <FadeIn dur={450} style={{ paddingTop: 14, paddingHorizontal: 16 }}>
            <View style={{ borderRadius: 36, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 20, overflow: 'hidden', ...bgImage(G.ummah) }}>
              <Breathe bg={G.glowWhite} style={{ width: 240, height: 240, right: -70, top: -80 }} dur={12000} />
              <Breathe bg={G.glowGoldSoft} style={{ width: 200, height: 200, left: -60, bottom: -70 }} dur={9000} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: '#FFFFFF' }}>TODAY ACROSS THE UMMAH</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Sample avatars only when showing sample data; live mode never implies people who aren't there. */}
                  {!ummah && ['AR', 'SK', 'MA', 'HN'].map((i, k) => <Avatar key={i} i={i} bg={FIXED.avatars[k]} size={28} fs={10.5} border="#1E5A68" style={{ marginLeft: -8 }} />)}
                  {!ummah && <Txt style={{ fontSize: 12, fontWeight: 700, marginLeft: 6, color: '#FFFFFF' }}>+41k</Txt>}
                </View>
              </View>
              <Txt style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.7, lineHeight: 52, marginTop: 18, color: '#FFFFFF' }}>{fmt(impact)}</Txt>
              <Txt style={{ fontSize: 14, marginTop: 8, color: '#FFFFFF' }}>dhikr counted · <Txt style={{ fontSize: 14, fontWeight: 700, color: '#C8F0DC' }}>{(ummah ? ummah.hour : 18421) > 0 ? `+${fmt(ummah ? ummah.hour : 18421)} this hour` : 'be the first this hour'}</Txt></Txt>
              <Sparkline />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Cta label="Add your dhikr" height={50} size={15} color="#111217" style={{ flex: 1.3, backgroundColor: '#FFFFFF' }} onPress={() => router.push({ pathname: '/tasbeeh', params: { goal: '1' } })} />
                <Cta label="Goals" height={50} size={15} color="#FFFFFF" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} onPress={() => setTab(1)} />
              </View>
            </View>
          </FadeIn>
          <FadeIn delay={60} dur={450} style={{ paddingTop: 10, paddingHorizontal: 16 }}>
            <View style={{ borderRadius: 30, backgroundColor: t.card, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Ring size={86} r={38} stroke={8} pct={Math.min(1, part / INTENTION)} track={t.ctl3} color={t.acc}>
                <View style={{ alignItems: 'center' }}>
                  <Txt style={{ fontSize: 17, fontWeight: 800 }}>{Math.min(100, Math.round((part / INTENTION) * 100))}%</Txt>
                  <Txt style={{ fontSize: 10.5, color: t.t2 }}>of intention</Txt>
                </View>
              </Ring>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.t2 }}>{myTotal == null ? 'YOUR PART THIS WEEK' : 'YOUR CONTRIBUTION'}</Txt>
                <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginTop: 6 }}>{fmt(part)} <Txt style={{ fontSize: 15, fontWeight: 600, color: t.t2 }}>of {fmt(INTENTION)}</Txt></Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{joinedCount} {joinedCount === 1 ? 'goal' : 'goals'} · {circles.length} {circles.length === 1 ? 'circle' : 'circles'}{myTotal == null ? ' · 6 days active' : ''}</Txt>
                <View style={{ alignSelf: 'flex-start', marginTop: 9, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(94,184,122,0.16)' }}>
                  <Txt style={{ fontSize: 11.5, fontWeight: 700, color: t.mint }}>Counted, never ranked</Txt>
                </View>
              </View>
            </View>
          </FadeIn>

          <SectionHead title="Featured goals" action="See all" onAction={() => setTab(1)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={272} decelerationRate="fast" contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {cgs.map(c => {
              const pr = c.done / c.total;
              return (
                <Tap key={c.name} scale={0.97} onPress={() => openGoal(c.i)} style={{ width: 262, height: 206, borderRadius: 30, padding: 18, overflow: 'hidden', ...bgImage(G.featured[c.i]) }}>
                  <View pointerEvents="none" style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -60, bottom: -60, ...bgImage(G.glowWhiteSoft) }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.22)' }}>
                      <Txt style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{joinedLabel(c.people)}</Txt>
                    </View>
                    <Txt style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>ends in {c.ends}</Txt>
                  </View>
                  <Txt style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, lineHeight: 24, marginTop: 14, color: '#FFFFFF' }}>{c.name}</Txt>
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ring size={52} r={22} stroke={5} pct={pr} track="rgba(255,255,255,0.25)" color="#FFFFFF">
                      <Txt style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF' }}>{Math.round(pr * 100)}%</Txt>
                    </Ring>
                    <Txt style={{ flex: 1, fontSize: 12.5, lineHeight: 17, color: '#FFFFFF' }}>{fmt(c.done)}{'\n'}<Txt style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>of {fmt(c.total)}</Txt></Txt>
                    <Tap scale={0.94} onPress={() => joinGoal(c.i)} accessibilityLabel={c.joined ? `Joined ${c.name}` : `Join ${c.name}`}
                      style={{ height: 40, paddingHorizontal: 15, borderRadius: 20, backgroundColor: c.joined ? 'rgba(255,255,255,0.2)' : '#FFFFFF', justifyContent: 'center' }}>
                      <Txt style={{ fontSize: 13, fontWeight: 700, color: c.joined ? '#FFFFFF' : '#111217' }}>{c.joined ? 'Joined' : 'Join'}</Txt>
                    </Tap>
                  </View>
                </Tap>
              );
            })}
          </ScrollView>

          <SectionHead title="Your circles" action="Manage" onAction={() => setTab(2)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {circles.map(c => (
              <Tap key={c.id} scale={0.96} onPress={() => openCircle(c.id)} style={{ width: 172, borderRadius: 26, backgroundColor: t.card, padding: 16 }}>
                <AvatarRow c={c} />
                <Txt numberOfLines={1} style={{ fontSize: 15.5, fontWeight: 700, marginTop: 12 }}>{c.name}</Txt>
                <Txt style={{ fontSize: 12, color: t.t2, marginTop: 3 }}>{c.members} members · {c.priv}</Txt>
                <Bar pct={circlePct(c)} track={t.ctl3} style={{ marginTop: 12 }} />
              </Tap>
            ))}
            <Tap scale={0.96} onPress={() => router.push('/circle-new')}
              style={{ width: 130, minHeight: 120, borderRadius: 26, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.ctl4, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="plus" color={t.acc} />
              <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.t2 }}>New circle</Txt>
            </Tap>
          </ScrollView>

          <SectionHead title="Happening now" action="See all" onAction={() => setTab(3)} />
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {feed.slice(0, 3).map((f, i) => <FadeIn key={f.k} delay={i * 50} dur={350}><FeedRow k={f.k} /></FadeIn>)}
          </View>
        </>
      )}

      {tab === 1 && (
        <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 10 }}>
          {cgs.map(c => {
            const pct = Math.round((c.done / c.total) * 1000) / 10;
            return (
              <FadeIn key={c.name} dur={350}>
                <Tap scale={0.985} onPress={() => openGoal(c.i)} style={{ borderRadius: 28, backgroundColor: t.card, padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Txt style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</Txt>
                      <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{participantsLabel(c.people)} · ends in {c.ends}</Txt>
                    </View>
                    <Tap scale={0.94} onPress={() => joinGoal(c.i)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: c.joined ? t.ctl : t.cta, justifyContent: 'center' }}>
                      <Txt style={{ fontSize: 13.5, fontWeight: 700, color: c.joined ? t.mint : t.ctaInk }}>{c.joined ? 'Joined' : 'Join'}</Txt>
                    </Tap>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <Bar pct={pct} h={7} track={t.ctl} style={{ flex: 1 }} />
                    <Txt style={{ fontSize: 13, fontWeight: 700, color: t.acc }}>{pct}%</Txt>
                  </View>
                  <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 8 }}>{fmt(c.done)} / {fmt(c.total)}</Txt>
                </Tap>
              </FadeIn>
            );
          })}
        </View>
      )}

      {tab === 2 && (
        <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 10 }}>
          {circles.length === 0 && (
            <View style={{ borderRadius: 28, backgroundColor: t.card, padding: 28, alignItems: 'center' }}>
              <Txt style={{ fontSize: 17, fontWeight: 700 }}>No circles yet</Txt>
              <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Start one for family or friends.</Txt>
            </View>
          )}
          {circles.map(c => (
            <Tap key={c.id} scale={0.985} onPress={() => openCircle(c.id)} style={{ borderRadius: 28, backgroundColor: t.card, padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</Txt>
                  <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{c.members} members · {c.priv}</Txt>
                </View>
                <AvatarRow c={c} />
              </View>
              <Txt style={{ marginTop: 12, fontSize: 13, color: t.t5 }}>{(c.goals[0] || { name: 'No goal yet' }).name} · {circlePct(c)}%</Txt>
            </Tap>
          ))}
          <Cta label="Join with an invite code" height={52} size={14.5} color={t.tx} style={{ backgroundColor: t.card }} onPress={() => router.push('/community/circles')} />
        </View>
      )}

      {tab === 3 && (
        <>
          <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'rgba(94,184,122,0.12)' }}>
            <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.okTx }}>Encouragement only. No likes, no rankings — just “Ameen” for each other.</Txt>
          </View>
          <View style={{ paddingTop: 10, paddingHorizontal: 16, gap: 8 }}>
            {feed.map((f, i) => <FadeIn key={f.k} delay={i * 40} dur={350}><FeedRow k={f.k} /></FadeIn>)}
          </View>
        </>
      )}
    </Screen>
  );
}
