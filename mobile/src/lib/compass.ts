/**
 * Live compass heading for the Qibla finder, always referenced to TRUE north (the Qibla bearing
 * is a true bearing):
 *  - iOS / Android: expo-location heading. When the OS gives only magnetic north (Android without
 *    location, some devices), it is corrected with the magnetic declination from NOAA's World
 *    Magnetic Model 2025 for the chosen city.
 *  - Web: DeviceOrientation (iOS Safari `webkitCompassHeading`, Chrome `deviceorientationabsolute`),
 *    also magnetic, corrected the same way. iOS Safari needs a tap to grant motion access.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { City } from '../data/content';
import { smooth, trueFromMagnetic } from './compassMath';
import { watchHeading } from './location';

export type CompassSource = 'true' | 'magnetic';
export type Compass = {
  /** Smoothed true heading in degrees, or null while unavailable. */
  heading: number | null;
  /** 0 (uncalibrated) … 3 (good); null when the platform doesn't say. */
  accuracy: number | null;
  source: CompassSource | null;
  /** Declination applied to magnetic readings (east positive). */
  declination: number;
  /** 'denied' | 'unsupported' | 'needs-tap' (iOS Safari) | null */
  problem: 'denied' | 'unsupported' | 'needs-tap' | null;
  /** Web only: ask for motion permission (must be called from a tap). */
  enable: () => void;
};

/** Magnetic declination at a place today (WMM 2025). 0 if the model can't be evaluated. */
export function declinationAt(city: Pick<City, 'lat' | 'lng'>, date = new Date()): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geomagnetism = require('geomagnetism') as { model: (d?: Date) => { point: (p: number[]) => { decl: number } } };
    const d = geomagnetism.model(date).point([city.lat, city.lng]).decl;
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

export function useCompass(active: boolean, city: City): Compass {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [source, setSource] = useState<CompassSource | null>(null);
  const [problem, setProblem] = useState<Compass['problem']>(null);
  const [nonce, setNonce] = useState(0);
  const last = useRef<number | null>(null);
  const declination = useMemo(() => declinationAt(city), [city.lat, city.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const decl = useRef(declination);
  useEffect(() => { decl.current = declination; }, [declination]);

  useEffect(() => {
    if (!active) return;
    let stop: (() => void) | undefined;
    let dead = false;
    const push = (deg: number, src: CompassSource, acc: number | null) => {
      if (dead || !Number.isFinite(deg)) return;
      last.current = smooth(last.current, deg);
      setHeading(last.current);
      setSource(src);
      setAccuracy(acc);
      setProblem(null);
    };

    if (Platform.OS !== 'web') {
      watchHeading(h => {
        if (h.trueHeading >= 0) push(h.trueHeading, 'true', h.accuracy);
        else push(trueFromMagnetic(h.magHeading, decl.current), 'magnetic', h.accuracy);
      }).then(s => { if (dead) s(); else stop = s; }).catch(() => { if (!dead) setProblem('denied'); });
      return () => { dead = true; stop?.(); last.current = null; };
    }

    // Web. Desktop browsers expose the API but never fire it: give up after a few seconds.
    let quiet: ReturnType<typeof setTimeout> | undefined;
    /** No reading within 3 s of listening → this browser/device has no usable compass. */
    const watchdog = () => { quiet = setTimeout(() => { if (!dead && last.current == null) setProblem(p => (p === 'denied' ? p : 'unsupported')); }, 3000); };
    const later = (p: Compass['problem']) => { queueMicrotask(() => { if (!dead) setProblem(p); }); };
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) { later('unsupported'); return () => { dead = true; clearTimeout(quiet); }; }
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    const onEvt = (e: Event) => {
      const o = e as OrientationEvt;
      if (typeof o.webkitCompassHeading === 'number') {
        const acc = typeof o.webkitCompassAccuracy === 'number' ? (o.webkitCompassAccuracy < 0 ? 0 : o.webkitCompassAccuracy <= 20 ? 3 : o.webkitCompassAccuracy <= 35 ? 2 : 1) : null;
        push(trueFromMagnetic(o.webkitCompassHeading, decl.current), 'magnetic', acc);
      } else if (o.absolute && typeof o.alpha === 'number') {
        push(trueFromMagnetic(360 - o.alpha, decl.current), 'magnetic', null);
      }
    };
    const listen = () => {
      watchdog();
      window.addEventListener('deviceorientationabsolute', onEvt as EventListener);
      window.addEventListener('deviceorientation', onEvt as EventListener);
      stop = () => {
        window.removeEventListener('deviceorientationabsolute', onEvt as EventListener);
        window.removeEventListener('deviceorientation', onEvt as EventListener);
      };
    };
    if (typeof DOE.requestPermission === 'function' && nonce === 0) later('needs-tap');
    else if (typeof DOE.requestPermission === 'function') {
      later(null);
      DOE.requestPermission().then(r => { if (dead) return; if (r === 'granted') listen(); else setProblem('denied'); }).catch(() => !dead && setProblem('denied'));
    } else listen();
    return () => { dead = true; clearTimeout(quiet); stop?.(); last.current = null; };
  }, [active, nonce]);

  return { heading, accuracy, source, declination, problem, enable: () => setNonce(n => n + 1) };
}
