import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Breathe, FadeIn, Orbit } from '../components/motion';
import { Page, Txt } from '../components/ui';
import { HADITH } from '../data/content';
import { planNotifications } from '../lib/notifications';
import { fmtTime, timesFor } from '../lib/prayer';
import { loadSurah } from '../lib/quran';
import { getState } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { G, bgImage } from '../theme/tokens';

/** Quran passages recited in the adhkar (Ayat al-Kursi, al-Baqarah 285–286, al-Kafirun, the three Quls). */
const ADHKAR_SURAHS = [2, 109, 112, 113, 114];

type Step = { pct: number; note: string };

/**
 * The last onboarding screen does the real setup and shows what it found: today's prayer times
 * for the chosen place, the Quran passages used in adhkar saved for offline, and the reminders
 * that will be scheduled.
 */
function Loading() {
  const t = useT();
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([{ pct: 0, note: '' }, { pct: 0, note: '' }, { pct: 0, note: '' }]);
  const put = (i: number, st: Step) => setSteps(x => x.map((y, k) => (k === i ? st : y)));

  useEffect(() => {
    let alive = true;
    const started = Date.now();
    (async () => {
      const s = getState();
      // 1. Prayer times for today, from the chosen city and method.
      const tt = timesFor(s.city, new Date(), s.method, s.hanafi);
      put(0, { pct: 100, note: `Fajr ${fmtTime(tt.Fajr)} · Maghrib ${fmtTime(tt.Maghrib)} · ${s.city.name.split(',')[0]}` });

      // 2. Save the Quran passages used in adhkar for offline use.
      let ok = 0;
      for (let i = 0; i < ADHKAR_SURAHS.length && alive; i++) {
        const got = await new Promise<boolean>(res => {
          let done = false;
          loadSurah(ADHKAR_SURAHS[i], r => { if (!done && (r.surah || r.error)) { done = true; res(!!r.surah); } }, { timeoutMs: 8000 })
            .then(() => { if (!done) { done = true; res(false); } }, () => { if (!done) { done = true; res(false); } });
        });
        if (got) ok++;
        if (alive) put(1, { pct: Math.round(((i + 1) / ADHKAR_SURAHS.length) * 100), note: '' });
      }
      if (!alive) return;
      put(1, { pct: 100, note: ok === ADHKAR_SURAHS.length ? '8 categories ready · Quran passages saved for offline' : 'Ready · Quran passages will download when you’re online' });

      // 3. The reminders that will be scheduled (permission is asked when you enter the app).
      const n = planNotifications(getState()).length;
      put(2, { pct: 100, note: n ? `${n} reminders planned for the coming days` : 'No reminders — turn them on any time in Profile' });

      // Give people a moment to read the results before moving on.
      await new Promise(r => setTimeout(r, Math.max(1200, 2400 - (Date.now() - started))));
      if (alive) router.replace({ pathname: '/auth', params: { mode: 'up' } });
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const h = HADITH[0];
  return (
    <Page top={92} bottom={40} style={{ paddingHorizontal: 26 }}>
      <StatusBar style="light" />
      <FadeIn style={{ flex: 1 }}>
        <Txt accessibilityRole="header" style={{ fontSize: 32, fontWeight: 800, lineHeight: 37, letterSpacing: -0.8, textAlign: 'center' }}>Preparing your{'\n'}journey…</Txt>
        <View style={{ marginTop: 44, gap: 24 }}>
          {(['Calculating prayer times', 'Preparing your adhkar', 'Planning gentle reminders'] as const).map((label, i) => {
            const { pct, note } = steps[i];
            return (
              <View key={label} style={{ opacity: i === 0 || steps[i - 1].pct === 100 ? 1 : 0.35 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt style={{ fontSize: 18, fontWeight: 700, color: t.t5 }}>{label}</Txt>
                  <Txt style={{ fontSize: 18, fontWeight: 700, color: t.acc }}>{pct}%</Txt>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: t.sheetc, boxShadow: t.edge, marginTop: 12, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, borderRadius: 2, ...bgImage(G.brandH) }} />
                </View>
                {!!note && <Txt style={{ fontSize: 13, color: t.t2, marginTop: 8 }}>{note}</Txt>}
              </View>
            );
          })}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 250, height: 250 }}>
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 125, borderWidth: 1, borderColor: t.bord }} />
            <View style={{ position: 'absolute', left: 40, top: 40, right: 40, bottom: 40, borderRadius: 125, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }} />
            <Orbit dur={14000} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
              <View style={{ position: 'absolute', left: 114, top: -10, width: 22, height: 22, borderRadius: 11, ...bgImage(G.moonOrb) }} />
            </Orbit>
            <Orbit dur={9000} reverse style={{ position: 'absolute', left: 40, top: 40, right: 40, bottom: 40 }}>
              <View style={{ position: 'absolute', left: -7, top: 78, width: 14, height: 14, borderRadius: 7, backgroundColor: '#6F87C9' }} />
            </Orbit>
            <Breathe bg={G.sunOrb} style={{ left: 77, top: 77, width: 96, height: 96, boxShadow: '0 0 80px 20px rgba(242,154,74,0.35)' }} dur={5000} />
          </View>
        </View>
        <View style={{ borderRadius: 24, backgroundColor: t.card, paddingVertical: 18, paddingHorizontal: 20, boxShadow: t.hair }}>
          <Txt ar style={{ fontSize: 22, lineHeight: 37, textAlign: 'center', color: t.gold }}>{h.ar}</Txt>
          <Txt style={{ fontSize: 14, lineHeight: 21.7, color: t.t5, textAlign: 'center', marginTop: 8 }}>“{h.en}”</Txt>
          <Txt ur style={{ fontSize: 14.5, lineHeight: 30, textAlign: 'center', color: t.t3, marginTop: 6 }}>{h.ur}</Txt>
          <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center', marginTop: 8 }}>{h.src}</Txt>
        </View>
      </FadeIn>
    </Page>
  );
}

export default function LoadingScreen() {
  return <Immersive><Loading /></Immersive>;
}
