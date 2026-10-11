import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackBar, buzz, Chips, Cta, Label, ListCard, say, Screen, Statement, SwitchRow, Txt } from '../components/ui';
import { enableNotifications } from '../lib/notifications';
import {
  currentPosition, RADII_KM, requestTravelPermission, startTravelWatch, stopTravelWatch, travelDua, travelPermission, travelWatching,
  type TravelPermission,
} from '../lib/travel';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

/** Travel dua reminder: home area, radius, permission status and the dua itself. */
export default function Travel() {
  const t = useT();
  const router = useRouter();
  const on = useApp(s => s.travelOn);
  const home = useApp(s => s.home);
  const [perm, setPerm] = useState<TravelPermission | null>(null);
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const dua = travelDua();

  const refresh = useCallback(async () => {
    setPerm(await travelPermission());
    setWatching(await travelWatching());
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  // Keep the OS geofence in step with the settings.
  useEffect(() => {
    if (on && home && perm === 'granted') startTravelWatch(home).then(ok => setWatching(ok)).catch(() => setWatching(false));
    else if (!on) stopTravelWatch().then(() => setWatching(false));
  }, [on, home, perm]);

  const toggle = async () => {
    buzz(6);
    if (on) { set({ travelOn: false }); say('Travel reminder off'); return; }
    const p = await requestTravelPermission();
    setPerm(p);
    if (p === 'denied' || p === 'unsupported') { say(p === 'unsupported' ? 'Travel reminders need the mobile app' : 'Location is off for Ibtida'); return; }
    await enableNotifications();
    set({ travelOn: true });
    say(p === 'granted' ? 'Travel reminder on' : 'Almost there · allow location “all the time”');
  };

  const setHome = async () => {
    setBusy(true);
    try {
      const p = perm === 'granted' || perm === 'foreground-only' ? perm : await requestTravelPermission();
      setPerm(p);
      if (p === 'denied' || p === 'unsupported') { say('Allow location to save your home area'); return; }
      const pos = await currentPosition();
      set(s => ({ home: { ...pos, radiusKm: s.home?.radiusKm ?? 25 } }));
      buzz([10, 30, 16]);
      say('Home area saved on this phone');
    } catch {
      say('Couldn’t get your location — try again outdoors or with location on');
    } finally {
      setBusy(false);
    }
  };

  const status = !on ? { text: 'Off', ink: t.t4 }
    : !home ? { text: 'Save your home area to start', ink: t.acc }
      : perm !== 'granted' ? { text: 'Needs location “Allow all the time”', ink: t.acc }
        : watching ? { text: `Watching for departures beyond ${home.radiusKm} km`, ink: t.mint }
          : { text: 'Starting…', ink: t.t2 };

  return (
    <Screen tabs={false} top={54}>
      <BackBar title="Travel dua" />
      <Statement a="Safe travels." b="A gentle reminder as you set out." style={{ paddingTop: 10, paddingHorizontal: 22 }} />

      <ListCard style={{ marginTop: 18 }}>
        <SwitchRow label="Travel dua reminder" sub={status.text} icon="pin" on={on} onToggle={toggle} />
      </ListCard>

      <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>HOME AREA</Label>
      <View style={{ marginHorizontal: 16, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
        <Txt style={{ fontSize: 15.5, fontWeight: 700 }}>{home ? 'Home saved' : 'No home saved'}</Txt>
        <Txt style={{ fontSize: 12.5, lineHeight: 18.5, color: t.t2, marginTop: 4 }}>
          {home ? `A ${home.radiusKm} km circle around where you saved it. Moving around inside it never triggers anything.` : 'Save it while you are at home. Only this phone keeps it.'}
        </Txt>
        <Cta label={busy ? 'Finding you…' : home ? 'Update to my current location' : 'Use my current location'} icon="pin" kind={home ? 'secondary' : 'primary'} height={50} size={14.5} style={{ marginTop: 14 }} disabled={busy} onPress={setHome} />
        <Txt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.9, color: t.t4, marginTop: 16, marginBottom: 8 }}>REMIND ME BEYOND</Txt>
        <Chips flex labels={RADII_KM.map(k => `${k} km`)} isOn={i => (home?.radiusKm ?? 25) === RADII_KM[i]} onPick={i => set(s => ({ home: s.home ? { ...s.home, radiusKm: RADII_KM[i] } : s.home }))} height={40} size={13.5} />
      </View>

      {on && perm === 'foreground-only' && (
        <View style={{ marginTop: 12, marginHorizontal: 16, borderRadius: 22, backgroundColor: t.noteBg, padding: 16 }}>
          <Txt style={{ fontSize: 13.5, lineHeight: 20, color: t.noteTx }}>
            To notice when you leave while Ibtida is closed, {Platform.OS === 'android' ? 'set Location to “Allow all the time”' : 'set Location to “Always”'}. Ibtida doesn’t track your route: your phone only tells it when you cross the edge of your home area.
          </Txt>
          <Cta label="Open settings" kind="secondary" height={46} size={14} style={{ marginTop: 12 }} onPress={() => Linking.openSettings()} />
        </View>
      )}

      {dua && (
        <>
          <Label style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 26 }}>THE DUA FOR TRAVEL</Label>
          <View style={{ marginHorizontal: 16, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 18 }}>
            <Txt ar style={{ fontSize: 22, lineHeight: 42, color: t.gold, textAlign: 'right', writingDirection: 'rtl' }}>{dua.ar}</Txt>
            <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t5, marginTop: 12 }}>{dua.en}</Txt>
            <Txt style={{ fontSize: 12.5, color: t.t4, marginTop: 8 }}>{dua.src}</Txt>
            <Cta label="Open travel adhkar" icon="book" kind="secondary" height={46} size={14} style={{ marginTop: 14 }} onPress={() => router.push({ pathname: '/session', params: { cat: 'Travel' } })} />
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, marginHorizontal: 22, marginBottom: 10 }}>
        <Icon name="shield" size={18} color={t.mint} />
        <Txt style={{ flex: 1, fontSize: 12.5, lineHeight: 18.5, color: t.t4 }}>
          Your home location stays on this phone and is never uploaded. One reminder per journey; it re-arms when you come back home.
        </Txt>
      </View>
    </Screen>
  );
}
