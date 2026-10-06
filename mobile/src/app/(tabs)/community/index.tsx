import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AvatarRow, circlePct, FeedRow, HourBars, joinGoal, useCommunityGoals, useFeed } from '../../../components/community';
import { Icon } from '../../../components/Icon';
import { Breathe, FadeIn, PulseDot, useCountUp } from '../../../components/motion';
import { Bar, Cta, IconBtn, Ring, Screen, SectionHead, Seg, SerifTitle, Tap, Txt } from '../../../components/ui';
import { fmt, joinedLabel, participantsLabel } from '../../../data/content';
import { useLive, useLiveRefresh } from '../../../lib/live';
import { todayKey, useApp } from '../../../state/store';
import { useT } from '../../../theme/ThemeProvider';
import { G, bgImage } from '../../../theme/tokens';

export default function Community() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  useLiveRefresh();
  const ummah = useLive(l => (l.on ? l.ummah : null));
  const hours = useLive(l => (l.on ? l.hours : null));
  const signedIn = useApp(s => s.signedIn);
  // Your dhikr over the last 7 days, from the on-device activity log.
  const act = useApp(s => s.act);
  const part = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return act[todayKey(d)]?.d ?? 0; }).reduce((a, b) => a + b, 0);
  // Weekly intention = your personal daily targets × 7 (none set → no intention to measure against).
  const intention = useApp(s => s.goals.reduce((a, g) => a + g.target, 0) * 7);
  const feed = useFeed();
  const impact = useCountUp(ummah ? ummah.today : 0);
  const cgs = useCommunityGoals();
  const circles = useApp(s => s.circles);
  const joinedCount = cgs.filter(c => c.joined).length;
  const live = ummah ? ummah.now : 0;
  const openGoal = (i: number) => router.push(`/community/goal/${i}`);
  const openCircle = (id: number) => router.push(`/community/circle/${id}`);

  return (
    <Screen>
      <FadeIn style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PulseDot size={7} color={t.acc} />
            <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.15, color: t.acc }}>{!ummah ? 'COUNTED, NEVER RANKED' : live > 0 ? `${fmt(live)} REMEMBERED THIS HOUR` : 'BE THE FIRST TO REMEMBER THIS HOUR'}</Txt>
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
              </View>
              {ummah ? (
                <>
                  <Txt style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.7, lineHeight: 52, marginTop: 18, color: '#FFFFFF' }}>{fmt(impact)}</Txt>
                  <Txt style={{ fontSize: 14, marginTop: 8, color: '#FFFFFF' }}>dhikr counted · <Txt style={{ fontSize: 14, fontWeight: 700, color: '#C8F0DC' }}>{ummah.hour > 0 ? `+${fmt(ummah.hour)} this hour` : 'be the first this hour'}</Txt></Txt>
                  {hours && <HourBars hours={hours} />}
                </>
              ) : (
                <>
                  <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 30, marginTop: 16, color: '#FFFFFF' }}>{signedIn ? 'Reconnect to see the Ummah’s count' : 'Count together with the Ummah'}</Txt>
                  <Txt style={{ fontSize: 14, lineHeight: 20, marginTop: 8, color: 'rgba(255,255,255,0.88)' }}>{signedIn ? 'Your dhikr is saved on this device and joins the total when you’re back online.' : 'Sign in to add your dhikr to the live total and join community goals.'}</Txt>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {ummah || signedIn
                  ? <Cta label="Add your dhikr" height={50} size={15} color="#111217" style={{ flex: 1.3, backgroundColor: '#FFFFFF' }} onPress={() => router.push('/tasbeeh')} />
                  : <Cta label="Sign in" height={50} size={15} color="#111217" style={{ flex: 1.3, backgroundColor: '#FFFFFF' }} onPress={() => router.push({ pathname: '/auth', params: { mode: 'in' } })} />}
                <Cta label="Goals" height={50} size={15} color="#FFFFFF" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} onPress={() => setTab(1)} />
              </View>
            </View>
          </FadeIn>
          <FadeIn delay={60} dur={450} style={{ paddingTop: 10, paddingHorizontal: 16 }}>
            <View style={{ borderRadius: 30, backgroundColor: t.card, boxShadow: t.edge, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Ring size={86} r={38} stroke={8} pct={intention ? Math.min(1, part / intention) : 0} track={t.ctl3} color={t.acc}>
                <View style={{ alignItems: 'center' }}>
                  {intention ? (
                    <>
                      <Txt style={{ fontSize: 17, fontWeight: 800 }}>{Math.min(100, Math.round((part / intention) * 100))}%</Txt>
                      <Txt style={{ fontSize: 10.5, color: t.t2 }}>of intention</Txt>
                    </>
                  ) : <Txt style={{ fontSize: 17, fontWeight: 800 }}>{fmt(part)}</Txt>}
                </View>
              </Ring>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.92, color: t.t2 }}>YOUR PART THIS WEEK</Txt>
                <Txt style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginTop: 6 }}>{fmt(part)} {!!intention && <Txt style={{ fontSize: 15, fontWeight: 600, color: t.t2 }}>of {fmt(intention)}</Txt>}</Txt>
                <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{joinedCount} {joinedCount === 1 ? 'goal' : 'goals'} · {circles.length} {circles.length === 1 ? 'circle' : 'circles'}{intention ? '' : ' · set a daily goal for an intention'}</Txt>
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
                      <Txt style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{c.live ? joinedLabel(c.people) : `Target ${fmt(c.total)}`}</Txt>
                    </View>
                    {c.live && !!c.ends && <Txt style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>{c.ends === 'ended' ? 'ended' : `ends in ${c.ends}`}</Txt>}
                  </View>
                  <Txt style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, lineHeight: 24, marginTop: 14, color: '#FFFFFF' }}>{c.name}</Txt>
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ring size={52} r={22} stroke={5} pct={pr} track="rgba(255,255,255,0.25)" color="#FFFFFF">
                      <Txt style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF' }}>{Math.round(pr * 100)}%</Txt>
                    </Ring>
                    <Txt style={{ flex: 1, fontSize: 12.5, lineHeight: 17, color: '#FFFFFF' }}>{c.live ? fmt(c.done) : 'Live total'}{'\n'}<Txt style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>{c.live ? `of ${fmt(c.total)}` : 'when signed in'}</Txt></Txt>
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
              <Tap key={c.id} scale={0.96} onPress={() => openCircle(c.id)} style={{ width: 172, borderRadius: 26, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }}>
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

          {feed.length > 0 && (
            <>
              <SectionHead title="Happening now" action="See all" onAction={() => setTab(3)} />
              <View style={{ paddingHorizontal: 16, gap: 8 }}>
                {feed.slice(0, 3).map((f, i) => <FadeIn key={f.k} delay={i * 50} dur={350}><FeedRow k={f.k} /></FadeIn>)}
              </View>
            </>
          )}
        </>
      )}

      {tab === 1 && (
        <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 10 }}>
          {cgs.map(c => {
            const pct = Math.round((c.done / c.total) * 1000) / 10;
            return (
              <FadeIn key={c.name} dur={350}>
                <Tap scale={0.985} onPress={() => openGoal(c.i)} style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Txt style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</Txt>
                      <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4 }}>{c.live ? `${participantsLabel(c.people)}${c.ends ? (c.ends === 'ended' ? ' · ended' : ` · ends in ${c.ends}`) : ''}` : 'Sign in to see live progress'}</Txt>
                    </View>
                    <Tap scale={0.94} onPress={() => joinGoal(c.i)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: c.joined ? t.ctl : t.cta, justifyContent: 'center' }}>
                      <Txt style={{ fontSize: 13.5, fontWeight: 700, color: c.joined ? t.mint : t.ctaInk }}>{c.joined ? 'Joined' : 'Join'}</Txt>
                    </Tap>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <Bar pct={pct} h={7} track={t.ctl} style={{ flex: 1 }} />
                    <Txt style={{ fontSize: 13, fontWeight: 700, color: t.acc }}>{pct}%</Txt>
                  </View>
                  <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 8 }}>{c.live ? `${fmt(c.done)} / ${fmt(c.total)}` : `Target ${fmt(c.total)}`}</Txt>
                </Tap>
              </FadeIn>
            );
          })}
        </View>
      )}

      {tab === 2 && (
        <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 10 }}>
          {circles.length === 0 && (
            <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 28, alignItems: 'center' }}>
              <Txt style={{ fontSize: 17, fontWeight: 700 }}>No circles yet</Txt>
              <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6 }}>Start one for family or friends.</Txt>
            </View>
          )}
          {circles.map(c => (
            <Tap key={c.id} scale={0.985} onPress={() => openCircle(c.id)} style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
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
          <Cta label="Join with an invite code" height={52} size={14.5} color={t.tx} style={{ backgroundColor: t.card, boxShadow: t.edge }} onPress={() => router.push('/community/circles')} />
        </View>
      )}

      {tab === 3 && (
        <>
          <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'rgba(94,184,122,0.12)' }}>
            <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.okTx }}>Encouragement only. No likes, no rankings — just “Ameen” for each other.</Txt>
          </View>
          <View style={{ paddingTop: 10, paddingHorizontal: 16, gap: 8 }}>
            {feed.length === 0 && (
              <View style={{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 28, alignItems: 'center' }}>
                <Txt style={{ fontSize: 17, fontWeight: 700 }}>{signedIn ? 'Nothing here yet' : 'Sign in to see the feed'}</Txt>
                <Txt style={{ fontSize: 13.5, color: t.t2, marginTop: 6, textAlign: 'center' }}>{signedIn ? 'Milestones from your circles and community goals appear here.' : 'Milestones from your circles and the Ummah appear here.'}</Txt>
              </View>
            )}
            {feed.map((f, i) => <FadeIn key={f.k} delay={i * 40} dur={350}><FeedRow k={f.k} /></FadeIn>)}
          </View>
        </>
      )}
    </Screen>
  );
}
