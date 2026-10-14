import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { nextPrayer } from '../lib/prayer';
import { getState, useApp } from '../state/store';
import { DARK, LIGHT, skyPalette, type Palette, type SkyPhase } from './tokens';

const Ctx = createContext<Palette>(DARK);

const phaseNow = (): SkyPhase => {
  const s = getState();
  return nextPrayer(s.city, new Date(), s.method, s.hanafi, s.adj).phase;
};

/**
 * The prayer window in progress (the same phase the Home timeline card paints), or null when the
 * sky theme is off. Checked twice a minute and on returning to the app; an unchanged phase re-renders nothing.
 */
export function useSkyPhase(): SkyPhase | null {
  const on = useApp(s => s.sky !== false);
  const city = useApp(s => s.city);
  const method = useApp(s => s.method);
  const hanafi = useApp(s => s.hanafi);
  const adj = useApp(s => s.adj);
  const [phase, setPhase] = useState<SkyPhase>(phaseNow);
  useEffect(() => {
    if (!on) return;
    const tick = () => setPhase(phaseNow());
    tick();
    const id = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') tick(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [on, city, method, hanafi, adj]);
  return on ? phase : null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useApp(s => s.theme);
  const sys = useColorScheme();
  const light = pref === 'light' || (pref === 'system' && sys === 'light');
  const phase = useSkyPhase();
  return <Ctx.Provider value={phase ? skyPalette(phase, light) : light ? LIGHT : DARK}>{children}</Ctx.Provider>;
}

/** Counting, reading and lock screens always use the dark palette, as in v7. */
export function Immersive({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={DARK}>{children}</Ctx.Provider>;
}

/** Renders children with a specific palette (e.g. the adhkar session's chosen background). */
export function PaletteProvider({ value, children }: { value: Palette; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
