import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, BackHandler, Easing, Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/motion';
import { buzz, buzzError, Cta, say, Tap, Txt } from '../components/ui';
import { usePrayerNow } from '../lib/hooks';
import { dayKey, fmtTime } from '../lib/prayer';
import { classifyFrame, ITEM_FRAMES, itemLabel, loadItemModel } from '../lib/itemScan';
import { fmtCountdown, readWakeTag, WAKE_WINDOW_MS, wakeTagUrl, type WakeKind } from '../lib/wakeTag';
import { getState, set, useApp } from '../state/store';
import { Immersive, useT } from '../theme/ThemeProvider';
import { FIXED, G, bgImage } from '../theme/tokens';

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
    <Animated.View style={{ position: 'absolute', left: 14, right: 14, height: 2, top: 0, ...bgImage(`linear-gradient(90deg, rgba(242,166,90,0), ${color}, rgba(242,166,90,0))`), boxShadow: `0 0 14px ${color}`, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [30, 210] }) }] }} />
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

/** Time between frames sent to the item classifier. */
const ITEM_EVERY_MS = Platform.OS === 'web' ? 900 : 1600;

/** Grabs one small JPEG frame for the classifier: a data: URI on web, base64 on native. */
async function grabFrame(cam: CameraView): Promise<string | null> {
  if (Platform.OS === 'web') {
    const pic = await cam.takePictureAsync({ base64: true, quality: 0.6, scale: 0.4, shutterSound: false });
    if (!pic) return null;
    return pic.uri?.startsWith('data:') ? pic.uri : pic.base64 ? `data:image/jpeg;base64,${pic.base64}` : null;
  }
  const pic = await cam.takePictureAsync({ quality: 0.3, shutterSound: false });
  if (!pic?.uri) return null;
  const img = await ImageManipulator.manipulate(pic.uri).resize({ width: 256 }).renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG });
  return out.base64 ?? null;
}

function Scan() {
  const t = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { times } = usePrayerNow();
  // `test=W|M` checks a single station from Prayer mat tag (no alarm, nothing logged).
  const { test } = useLocalSearchParams<{ test?: string }>();
  const testKind: WakeKind | null = test === 'W' || test === 'M' ? test : null;
  const mode = useApp(s => s.wakeMode);
  const [perm, requestPerm, getPerm] = useCameraPermissions();
  const [stage, setStage] = useState(testKind === 'M' ? 2 : 1);
  const cam = useRef<CameraView>(null);
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [seeing, setSeeing] = useState<{ name: string; p: number; match: number } | null>(null);
  const [torch, setTorch] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [wuduAt, setWuduAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Refs mirror state so bursts of barcode frames between renders see the latest stage.
  const stageRef = useRef(testKind === 'M' ? 2 : 1);
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

  /** A station was verified — by its QR tag or by recognising the item. */
  const pass = useCallback((kind: WakeKind, how: 'tag' | 'item') => {
    const n = Date.now();
    const s = stageRef.current;
    if (s === 3) return;
    if (testKind) {
      if (kind !== testKind) return;
      buzz([30, 40, 30]);
      goStage(3, null);
      say(how === 'item' ? `${itemLabel(kind)[0].toUpperCase()}${itemLabel(kind).slice(1)} recognised` : 'Tag verified');
      return;
    }
    if (s === 1 && kind === 'W') {
      buzz([30, 40, 30]);
      goStage(2, n);
      say(`${how === 'item' ? 'Sink recognised' : 'Wudu scan verified'} · 10 min to reach the mat`);
      return;
    }
    if (s === 2 && kind === 'M' && n - (wuduAtRef.current ?? 0) < WAKE_WINDOW_MS) {
      buzz([30, 40, 30]);
      goStage(3, null);
      const d = new Date(n);
      set(st => ({ wakeLog: [...st.wakeLog, { date: dayKey(d), at: n }].slice(-90) }));
      say('Wake verified · alarm stopped');
    }
  }, [goStage, testKind]);

  // Live countdown for stage 2; expiry sends the user back to the wudu station.
  useEffect(() => {
    if (testKind || stage !== 2 || wuduAt == null) return;
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
  }, [stage, wuduAt, goStage, testKind]);

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
    if (testKind) {
      if (tag?.current && tag.kind === testKind) pass(testKind, 'tag');
      else { buzzError(); say(`That’s not your current ${testKind === 'W' ? 'wudu' : 'prayer mat'} tag`); }
      return;
    }
    if (s === 1) {
      if (tag?.current && tag.kind === 'W') {
        pass('W', 'tag');
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
      pass('M', 'tag');
    } else if (tag?.current && tag.kind === 'W') {
      say('Wudu already scanned · now your prayer mat');
    } else {
      buzzError();
      say('That’s not your prayer mat tag — reprint it from Prayer mat tag');
    }
  }, [pass, testKind]);

  const onScanned = useCallback((r: BarcodeScanningResult) => onData(r.data), [onData]);

  const granted = !!perm?.granted;
  const blocked = !!perm && !perm.granted && !perm.canAskAgain;
  const live = granted && !camErr;
  const left = wuduAt == null ? WAKE_WINDOW_MS : WAKE_WINDOW_MS - (now - wuduAt);
  const kind: WakeKind = stage === 2 ? 'M' : 'W';
  const itemMode = stage < 3 && mode[kind] === 'item';

  // Item mode: recognise the sink / prayer mat itself from camera frames (QR tags still work too).
  useEffect(() => {
    if (!itemMode || !live) return;
    let stop = false;
    let hits = 0;
    (async () => {
      setSeeing(null);
      setModelState(s => (s === 'ready' ? s : 'loading'));
      try { await loadItemModel(); } catch { if (!stop) setModelState('error'); return; }
      if (stop) return;
      setModelState('ready');
      while (!stop && stageRef.current < 3) {
        const started = Date.now();
        try {
          const frame = cam.current ? await grabFrame(cam.current) : null;
          if (frame && !stop) {
            const r = await classifyFrame(kind, frame);
            if (stop) break;
            setSeeing(r.top ? { ...r.top, match: r.score } : null);
            hits = r.ok ? hits + 1 : 0;
            if (hits >= ITEM_FRAMES) { pass(kind, 'item'); break; }
          }
        } catch { /* a dropped frame is fine; try the next one */ }
        await new Promise(res => setTimeout(res, Math.max(150, ITEM_EVERY_MS - (Date.now() - started))));
      }
    })();
    return () => { stop = true; };
  }, [itemMode, live, kind, pass]);

  const ink = stage === 3 ? FIXED.ok : t.acc;
  const title = stage === 3
    ? (testKind ? `${testKind === 'W' ? 'Wudu station' : 'Prayer mat'} works` : 'You’re up. Alhamdulillah.')
    : itemMode
      ? (stage === 1 ? 'Point at your wudu sink' : 'Now point at your prayer mat')
      : (stage === 1 ? 'Scan your wudu station' : 'Now scan your prayer mat');
  const itemHint = modelState === 'error'
    ? 'Couldn’t load recognition — connect to the internet once, or scan your QR tag.'
    : modelState !== 'ready'
      ? 'Preparing on-device recognition…'
      : seeing
        ? `Seeing: ${seeing.name}${seeing.match > 0.02 ? ` · ${Math.round(seeing.match * 100)}% ${kind === 'W' ? 'sink' : 'mat'}` : ''}`
        : `Hold the ${itemLabel(kind)} in the frame`;
  const sub = stage === 3
    ? (testKind ? 'This is what the Fajr alarm will ask for.' : `Alarm stopped. Fajr ends at ${fmtTime(times.Sunrise)}.`)
    : stage === 1
      ? (itemMode ? `Fill the frame with your sink or basin. ${itemHint}` : 'Point the camera at the QR tag by your sink.')
      : testKind
        ? (itemMode ? `Fill the frame with your prayer mat, seen from above. ${itemHint}` : 'Point the camera at the QR tag on your prayer mat.')
        : `${fmtCountdown(left)} left to reach the mat.${itemMode ? ` ${itemHint}` : ' The alarm keeps ringing until then.'}`;

  return (
    <View style={{ flex: 1, backgroundColor: FIXED.scanBg, ...bgImage(live ? undefined : G.scan) }}>
      <StatusBar style="light" />
      {live && (
        <>
          <CameraView
            ref={cam}
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
          <Txt style={{ fontSize: 13, fontWeight: 700 }}>{testKind ? `Test · ${testKind === 'W' ? 'Wudu' : 'Prayer mat'}` : `Fajr · ${stage === 3 ? 'Verified' : `Stage ${stage} of 2`}`}</Txt>
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
            {itemMode && modelState === 'loading' && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.acc} /></View>}
            {stage === 3 && (
              <View style={{ position: 'absolute', left: 60, top: 60, right: 60, bottom: 60, borderRadius: 100, backgroundColor: FIXED.ok, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={56} color={FIXED.white} />
              </View>
            )}
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {(testKind ? [] : [1, 2]).map(i => <View key={i} style={{ height: 6, width: stage === i ? 26 : 8, borderRadius: 3, backgroundColor: stage > i || stage === 3 ? FIXED.ok : stage === i ? t.acc : t.ctl4 }} />)}
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
              onPress={() => { lastTag.current = { data: '', at: 0 }; lastAct.current = 0; if (itemMode) pass(kind, 'item'); else onData(wakeTagUrl(getState().token, kind)); }} />
            <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center', marginTop: 10 }}>Development build only — feeds the matching tag to the scanner</Txt>
          </>
        ) : (
          <Txt style={{ fontSize: 12, color: t.t4, textAlign: 'center' }}>{itemMode ? 'Recognised on your device · your QR tag also works' : 'Hold the tag inside the frame · it scans automatically'}</Txt>
        )}
      </View>
    </View>
  );
}

export default function WakeScan() {
  return <Immersive><Scan /></Immersive>;
}
