import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/motion';
import { buzz, buzzError, Cta, say, Tap, Txt } from '../components/ui';
import { usePrayerNow } from '../lib/hooks';
import { dayKey, fmtTime } from '../lib/prayer';
import { fmtCountdown, readWakeTag, WAKE_WINDOW_MS, wakeTagUrl } from '../lib/wakeTag';
import { getState, set } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { FIXED, G } from '../theme/tokens';

/** A tag that stays in view only fires once; it can fire again after this long out of view. */
const SAME_TAG_QUIET_MS = 3000;
/** Minimum gap between any two reactions, so two tags in frame don't stack toasts. */
const ANY_TAG_QUIET_MS = 1200;

function ScanLine({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const rm = useReducedMotion();
  useEffect(() => {
    if (rm) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [v, rm]);
  return (
    <Animated.View style={{ position: 'absolute', left: 14, right: 14, height: 2, top: 0, experimental_backgroundImage: `linear-gradient(90deg, rgba(242,166,90,0), ${color}, rgba(242,166,90,0))`, boxShadow: `0 0 14px ${color}`, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [30, 210] }) }] }} />
  );
}

function Corner({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const top = pos[0] === 't'; const left = pos[1] === 'l';
  return <View style={{
    position: 'absolute', width: 44, height: 44, borderColor: color,
    [top ? 'top' : 'bottom']: 0, [left ? 'left' : 'right']: 0,
    [top ? 'borderTopWidth' : 'borderBottomWidth']: 4, [left ? 'borderLeftWidth' : 'borderRightWidth']: 4,
    [`border${top ? 'Top' : 'Bottom'}${left ? 'Left' : 'Right'}Radius`]: 20,
  }} />;
}

/** Calm in-design card shown in the viewfinder until the camera is allowed. */
function PermissionCard({ blocked, error, onAllow }: { blocked: boolean; error: string | null; onAllow: () => void }) {
  const t = useT();
  const title = error ? 'Camera unavailable' : blocked ? 'Camera is turned off' : 'Allow the camera';
  const body = error
    ? 'The camera couldn’t start. Close other apps using it and try again.'
    : blocked
      ? 'Ibtida needs the camera to read your wudu and prayer-mat tags. Turn it on in Settings — nothing is recorded or uploaded.'
      : 'Ibtida uses the camera only to read your wudu and prayer-mat tags. Nothing is recorded or uploaded.';
  return (
    <View style={{ marginHorizontal: 26, borderRadius: 28, backgroundColor: FIXED.glassCard, boxShadow: t.hair, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' }}>
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: t.tAmb, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="qr" size={26} color={t.acc} />
      </View>
      <Txt style={{ fontSize: 18, fontWeight: 800, marginTop: 14 }}>{title}</Txt>
      <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t3, marginTop: 6, textAlign: 'center' }}>{body}</Txt>
      {!error && (
        <Cta label={blocked ? 'Open settings' : 'Allow camera'} size={16} height={52} style={{ alignSelf: 'stretch', marginTop: 18 }}
          onPress={blocked ? () => { Linking.openSettings().catch(() => {}); } : onAllow} />
      )}
    </View>
  );
}

function Scan() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { times } = usePrayerNow();
  const [perm, requestPerm, getPerm] = useCameraPermissions();
  const [stage, setStage] = useState(1);
  const [torch, setTorch] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [wuduAt, setWuduAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Refs mirror state so bursts of barcode frames between renders see the latest stage.
  const stageRef = useRef(1);
  const wuduAtRef = useRef<number | null>(null);
  const lastTag = useRef<{ data: string; at: number }>({ data: '', at: 0 });
  const lastAct = useRef(0);

  // Opened cold from `ibtida://wake-scan` there is no history to go back to.
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) return false;
      router.replace('/home');
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // Coming back from Settings: re-read the permission so the camera appears without a restart.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') getPerm().catch(() => {}); });
    return () => sub.remove();
  }, [getPerm]);

  const goStage = useCallback((s: number, at: number | null) => {
    stageRef.current = s; wuduAtRef.current = at;
    setStage(s); setWuduAt(at);
    if (s === 3) setTorch(false);
  }, []);

  // Live countdown for stage 2; expiry sends the user back to the wudu station.
  useEffect(() => {
    if (stage !== 2 || wuduAt == null) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n - wuduAt >= WAKE_WINDOW_MS && stageRef.current === 2) {
        goStage(1, null);
        buzzError();
        say('10 minutes passed · scan your wudu station again');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stage, wuduAt, goStage]);

  const onData = useCallback((data: string) => {
    const n = Date.now();
    const prev = lastTag.current;
    lastTag.current = { data, at: n };
    // Same tag still in frame (or briefly lost): ignore. Refreshing `at` keeps a held tag quiet.
    if (data === prev.data && n - prev.at < SAME_TAG_QUIET_MS) return;
    if (n - lastAct.current < ANY_TAG_QUIET_MS) return;
    const s = stageRef.current;
    if (s === 3) return;
    lastAct.current = n;

    const tag = readWakeTag(data, getState().token);
    if (s === 1) {
      if (tag?.current && tag.kind === 'W') {
        buzz([30, 40, 30]);
        goStage(2, n);
        say('Wudu scan verified · 10 min to reach the mat');
      } else if (tag?.current && tag.kind === 'M') {
        buzzError();
        say('That’s your prayer mat tag — scan the wudu station first');
      } else {
        buzzError();
        say('That’s not your wudu tag — reprint it from Prayer mat tag');
      }
      return;
    }
    // Stage 2
    const started = wuduAtRef.current ?? 0;
    if (n - started >= WAKE_WINDOW_MS) return; // the countdown effect handles the reset
    if (tag?.current && tag.kind === 'M') {
      buzz([30, 40, 30]);
      goStage(3, null);
      const d = new Date(n);
      set(st => ({ wakeLog: [...st.wakeLog, { date: dayKey(d), at: n }].slice(-90) }));
      say('Wake verified · alarm stopped');
    } else if (tag?.current && tag.kind === 'W') {
      say('Wudu already scanned · now your prayer mat');
    } else {
      buzzError();
      say('That’s not your prayer mat tag — reprint it from Prayer mat tag');
    }
  }, [goStage]);

  const onScanned = useCallback((r: BarcodeScanningResult) => onData(r.data), [onData]);

  const granted = !!perm?.granted;
  const blocked = !!perm && !perm.granted && !perm.canAskAgain;
  const live = granted && !camErr;
  const left = wuduAt == null ? WAKE_WINDOW_MS : WAKE_WINDOW_MS - (now - wuduAt);

  const ink = stage === 3 ? FIXED.ok : t.acc;
  const title = stage === 1 ? 'Scan your wudu station' : stage === 2 ? 'Now scan your prayer mat' : 'You’re up. Alhamdulillah.';
  const sub = stage === 1
    ? 'Point the camera at the QR tag by your sink.'
    : stage === 2
      ? `${fmtCountdown(left)} left to reach the mat. The alarm keeps ringing until then.`
      : `Alarm stopped. Fajr ends at ${fmtTime(times.Sunrise)}.`;

  return (
    <View style={{ flex: 1, backgroundColor: FIXED.scanBg, experimental_backgroundImage: live ? undefined : G.scan }}>
      <StatusBar style="light" />
      {live && (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            active={stage !== 3}
            enableTorch={torch && stage !== 3}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={stage === 3 ? undefined : onScanned}
            onMountError={e => setCamErr(e.message || 'Camera unavailable')}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FIXED.scanScrim }]} />
        </>
      )}
      <View style={{ paddingTop: ins.top + 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tap onPress={close} accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: FIXED.glass, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" color={FIXED.white} />
        </Tap>
        <View style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: FIXED.glass }}>
          <Txt style={{ fontSize: 13, fontWeight: 700 }}>Fajr · {stage === 3 ? 'Verified' : `Stage ${stage} of 2`}</Txt>
        </View>
        <Tap onPress={() => { if (live) { buzz(5); setTorch(x => !x); } }} accessibilityLabel="Torch" accessibilityState={{ checked: torch, disabled: !live || stage === 3 }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: torch ? t.cta : FIXED.glass, alignItems: 'center', justifyContent: 'center', opacity: live && stage !== 3 ? 1 : 0.5 }}>
          <Icon name="torch" color={torch ? t.ctaInk : t.cta} />
        </Tap>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {perm && !live && stage !== 3 ? (
          <PermissionCard blocked={blocked} error={camErr} onAllow={() => { requestPerm().catch(() => {}); }} />
        ) : (
          <View style={{ width: 250, height: 250 }}>
            {(['tl', 'tr', 'bl', 'br'] as const).map(p => <Corner key={p} pos={p} color={ink} />)}
            {stage < 3 && <ScanLine color={t.acc} />}
            {stage === 3 && (
              <View style={{ position: 'absolute', left: 60, top: 60, right: 60, bottom: 60, borderRadius: 100, backgroundColor: FIXED.ok, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={56} color={FIXED.white} />
              </View>
            )}
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {[1, 2].map(i => <View key={i} style={{ height: 6, width: stage === i ? 26 : 8, borderRadius: 3, backgroundColor: stage > i || stage === 3 ? FIXED.ok : stage === i ? t.acc : t.ctl4 }} />)}
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 30, alignItems: 'center' }}>
        <Txt style={{ fontSize: 22, fontWeight: 800 }}>{title}</Txt>
        <Txt style={{ fontSize: 14, lineHeight: 21, color: t.t3, marginTop: 6, textAlign: 'center' }}>{sub}</Txt>
      </View>
      <View style={{ paddingTop: 22, paddingHorizontal: 22, paddingBottom: ins.bottom + 36 }}>
        {stage === 3 ? (
          <Cta label="Done" size={17} onPress={close} />
        ) : __DEV__ ? (
          <>
            <Cta label="Simulate scan" kind="secondary" size={17}
              onPress={() => { lastTag.current = { data: '', at: 0 }; lastAct.current = 0; onData(wakeTagUrl(getState().token, stage === 1 ? 'W' : 'M')); }} />
            <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center', marginTop: 10 }}>Development build only — feeds the matching tag to the scanner</Txt>
          </>
        ) : (
          <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center' }}>Hold the tag inside the frame · it scans automatically</Txt>
        )}
      </View>
    </View>
  );
}

export default function WakeScan() {
  return <Immersive><Scan /></Immersive>;
}
