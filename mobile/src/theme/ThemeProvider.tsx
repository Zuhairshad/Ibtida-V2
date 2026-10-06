import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useApp } from '../state/store';
import { DARK, LIGHT, type Palette } from './tokens';

const Ctx = createContext<Palette>(DARK);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useApp(s => s.theme);
  const sys = useColorScheme();
  const light = pref === 'light' || (pref === 'system' && sys === 'light');
  return <Ctx.Provider value={light ? LIGHT : DARK}>{children}</Ctx.Provider>;
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
