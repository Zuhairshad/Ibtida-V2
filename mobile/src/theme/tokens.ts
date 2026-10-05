import { Platform } from 'react-native';
/**
 * Ibtida v7 design tokens — ported 1:1 from THEME_D / THEME_L in `Ibtida v7.dc.html`.
 * Every colour in the app comes from here or from `G` (gradients) / `FIXED` below.
 */

export type Palette = {
  bg: string; sunk: string; card: string; opt: string; sheetc: string;
  ctl: string; ctl2: string; ctl3: string; ctl4: string; ctl4b: string; seg: string; sunk2: string;
  tx: string; txw: string; t2: string; t3: string; t4: string; t5: string; t6: string;
  acc: string; gold: string; mint: string; rose: string; peri: string; lav: string;
  tMint: string; tBlue: string; tAmb: string; tLav: string;
  noteBg: string; noteTx: string; iosBg: string; iosTx: string; iosB: string;
  mintTx: string; okTx: string; errTx: string;
  cta: string; ctaInk: string; sheet: string;
  tabbar: string; tabShadow: string; tabOn: string; tabRing: string; tabInk: string;
  toast: string; line: string; hair: string; bord: string; dayRing: string; dayBg: string;
  dark: boolean;
};

export const DARK: Palette = {
  dark: true,
  tMint: '#233633', bg: '#16171D', sunk: '#1E1F26', card: '#22232A', opt: '#24252D', sheetc: '#26272F',
  ctl2: '#2B2C34', ctl: '#2E2F38', ctl3: '#33343D', seg: '#34353E', ctl4: '#3A3B44', sunk2: '#1C1D23',
  tx: '#F5F3EF', t2: '#A9A8B1', t3: '#B8B7BF', t4: '#8F8E98', t5: '#E4E2DE', t6: '#7C7B85', ctl4b: '#4A4B55',
  acc: '#F2A65A', gold: '#F2C48A', mint: '#9FD8C2', rose: '#F5A092', peri: '#A9B8F0', lav: '#D6A8F0',
  noteBg: '#2A2419', noteTx: '#F0D9B8', iosBg: '#1E2230', iosTx: '#C6D1EE', iosB: '#E4EAFB',
  mintTx: '#D6EDE4', okTx: '#BFE8CB', errTx: '#F08A7A',
  tBlue: '#2A2F45', tAmb: '#3A2F24', tLav: '#352A3D',
  cta: '#FFFFFF', ctaInk: '#111217', txw: '#FFFFFF', sheet: '#1E1F26',
  tabbar: 'rgba(60,61,72,0.66)',
  tabShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 24px 40px -12px rgba(0,0,0,0.7)',
  tabOn: 'rgba(255,255,255,0.16)', tabRing: 'inset 0 0 0 1px rgba(255,255,255,0.18)', tabInk: '#C4C3CB',
  toast: 'rgba(44,45,54,0.92)', line: 'rgba(255,255,255,0.05)',
  hair: 'inset 0 0 0 1px rgba(255,255,255,0.08)', bord: 'rgba(255,255,255,0.08)',
  dayRing: 'inset 0 0 0 1.5px rgba(255,255,255,0.3)', dayBg: 'rgba(255,255,255,0.06)',
};

export const LIGHT: Palette = {
  dark: false,
  tMint: '#E3F1EC', bg: '#FFFFFF', sunk: '#F3F3F6', card: '#F7F7F9', opt: '#F7F7F9', sheetc: '#F3F3F6',
  ctl2: '#EEEEF2', ctl: '#EFEFF3', ctl3: '#E7E7EC', seg: '#FFFFFF', ctl4: '#D9D9E0', sunk2: '#F4F4F7',
  tx: '#0F1014', t2: '#5E5E66', t3: '#55555D', t4: '#6B6B73', t5: '#26262B', t6: '#7A7A82', ctl4b: '#CFCFD6',
  acc: '#B45F25', gold: '#9A5B20', mint: '#2B7458', rose: '#B4463A', peri: '#3F55A6', lav: '#7447A0',
  noteBg: '#FBF1E3', noteTx: '#7A4A12', iosBg: '#EEF1FA', iosTx: '#34457E', iosB: '#1F2B55',
  mintTx: '#1F5B47', okTx: '#22613A', errTx: '#B4463A',
  tBlue: '#E7EBF8', tAmb: '#F6ECDF', tLav: '#F1E8F6',
  cta: '#0F1014', ctaInk: '#FFFFFF', txw: '#0F1014', sheet: '#FFFFFF',
  tabbar: 'rgba(255,255,255,0.9)',
  tabShadow: 'inset 0 0 0 1px rgba(15,16,20,0.06), 0 18px 40px -12px rgba(15,16,20,0.22)',
  tabOn: 'rgba(15,16,20,0.05)', tabRing: 'inset 0 0 0 1px rgba(15,16,20,0.07)', tabInk: '#55545D',
  toast: 'rgba(255,255,255,0.97)', line: 'rgba(15,16,20,0.06)',
  hair: 'inset 0 0 0 1px rgba(15,16,20,0.06)', bord: 'rgba(15,16,20,0.1)',
  dayRing: 'inset 0 0 0 1.5px rgba(15,16,20,0.18)', dayBg: '#FFFFFF',
};

/** Theme-independent colours used by the design (illustration, brand gradient, avatars). */
export const FIXED = {
  orangeA: '#F7BD5A',
  orangeB: '#E07A4B',
  sun: '#F5A83E',
  ok: '#5EB87A',
  ink: '#111217',
  white: '#FFFFFF',
  /** Wake-scan backdrop (deepest stop of G.scan) and the dim scrim drawn over the live camera. */
  scanBg: '#07080A',
  scanScrim: 'rgba(7,8,10,0.38)',
  /** Translucent chrome over the camera (close / torch / stage pill / permission card). */
  glass: 'rgba(255,255,255,0.12)',
  glassCard: 'rgba(30,31,38,0.92)',
  sel: 'inset 0 0 0 1.5px rgba(242,166,90,0.75)',
  avatars: ['#F7BD5A', '#9FB3F0', '#9FD8C2', '#F5A092', '#D6A8F0', '#E4E2DE'],
};

/** CSS gradient strings (rendered through RN's `experimental_backgroundImage`). */
export const G = {
  brand: 'linear-gradient(135deg, #F7BD5A, #E07A4B)',
  brandH: 'linear-gradient(90deg, #F7BD5A, #E07A4B)',
  brandV: 'linear-gradient(180deg, #F7BD5A, #E07A4B)',
  insight: 'linear-gradient(165deg, #3B2F66 0%, #6A4E8C 45%, #C98A7A 100%)',
  ummah: 'linear-gradient(165deg, #15324A 0%, #1E5A68 52%, #5AA08A 100%)',
  quran: 'linear-gradient(160deg, #1C3B4A 0%, #2E5E62 55%, #C98A5A 120%)',
  circleCode: 'linear-gradient(135deg, #3B2F66, #6A4E8C)',
  featured: [
    'linear-gradient(160deg, #6A4E8C, #3B2F66)',
    'linear-gradient(160deg, #C98A5A, #7A4A2E)',
    'linear-gradient(160deg, #2E6A66, #1C3B4A)',
  ],
  welcome: [
    'linear-gradient(160deg, #2A3563, #16203F)',
    'linear-gradient(160deg, #6A4E8C, #3B2F66)',
    'linear-gradient(160deg, #2E6A66, #1C3B4A)',
    'linear-gradient(160deg, #C98A5A, #7A4A2E)',
  ],
  sky: {
    Fajr: 'linear-gradient(180deg, #1C2446 0%, #5B4E83 55%, #E59A74 100%)',
    Dhuhr: 'linear-gradient(180deg, #1F5C9E 0%, #5E9AD6 60%, #A9CDEE 100%)',
    Asr: 'linear-gradient(180deg, #27406E 0%, #9A6E6A 58%, #E7A968 100%)',
    Maghrib: 'linear-gradient(180deg, #221A38 0%, #7A3050 55%, #E5774A 100%)',
    Isha: 'linear-gradient(180deg, #0B0F20 0%, #16203F 60%, #2A3563 100%)',
  } as Record<string, string>,
  skyFade: 'linear-gradient(180deg, rgba(14,15,19,0), rgba(14,15,19,0.78))',
  session: 'radial-gradient(120% 70% at 50% 0%, #2A2440 0%, #16171D 62%)',
  tasbeeh: 'radial-gradient(100% 60% at 50% 38%, #26203C 0%, #14151B 70%)',
  goalDone: 'radial-gradient(90% 55% at 50% 30%, #4A3420 0%, #16171D 70%)',
  focus: 'radial-gradient(100% 60% at 50% 35%, #1F2A2A 0%, #0F1013 70%)',
  scan: 'radial-gradient(80% 60% at 50% 45%, #1C2024, #07080A)',
  glowWarm: 'radial-gradient(circle, rgba(255,214,150,0.45), rgba(255,214,150,0) 65%)',
  glowViolet: 'radial-gradient(circle, rgba(140,120,220,0.35), rgba(140,120,220,0) 65%)',
  glowGold: 'radial-gradient(circle, rgba(247,189,90,0.5), rgba(247,189,90,0) 65%)',
  glowGoldSoft: 'radial-gradient(circle, rgba(247,189,90,0.35), rgba(247,189,90,0) 65%)',
  glowWhite: 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0) 65%)',
  glowWhiteSoft: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 65%)',
  glowAcc: 'radial-gradient(circle, rgba(242,166,90,0.18), rgba(242,166,90,0) 70%)',
  glowAcc2: 'radial-gradient(circle, rgba(242,166,90,0.2), rgba(242,166,90,0) 70%)',
  glowPeri: 'radial-gradient(circle, rgba(111,135,201,0.25), rgba(111,135,201,0) 70%)',
  glowDone: 'radial-gradient(circle, rgba(247,189,90,0.45), rgba(247,189,90,0) 65%)',
  sunOrb: 'radial-gradient(circle at 40% 35%, #FFD27A, #F29A4A 60%, #D66E3E)',
  moonOrb: 'radial-gradient(circle at 35% 30%, #F2F3F8, #8F97B0)',
  beadOn: 'radial-gradient(circle at 35% 30%, #FFE0A8, #F2A65A 55%, #C9683A)',
  beadOff: 'radial-gradient(circle at 35% 30%, #FFFFFF, #C9CBD6 50%, #7D8096)',
  trophy: 'linear-gradient(135deg, #FFD27A, #E07A4B)',
  nextRow: 'linear-gradient(135deg, rgba(247,189,90,0.16), rgba(224,122,75,0.08))',
  mintNote: 'linear-gradient(135deg, rgba(90,160,138,0.2), rgba(30,90,104,0.2))',
};

/** Spacing, radii and type scale used across the design. */
export const R = { pill: 999, card: 28, cardL: 30, hero: 36, sheet: 36, opt: 22, chip: 15 };

export const FONTS = {
  sans: {
    400: 'PlusJakartaSans_400Regular',
    500: 'PlusJakartaSans_500Medium',
    600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold',
    800: 'PlusJakartaSans_800ExtraBold',
  },
  serif: 'DMSerifDisplay_400Regular',
  arabic: { 400: 'ScheherazadeNew_400Regular', 600: 'ScheherazadeNew_600SemiBold', 700: 'ScheherazadeNew_700Bold' },
  urdu: 'NotoNastaliqUrdu_400Regular',
  mono: 'monospace',
};

/** Screens that always render in the dark palette (from IMMERSIVE in the prototype). */
export const IMMERSIVE = ['splash', 'loading', 'session', 'tasbeeh', 'goal-done', 'focus-active', 'wake-scan', 'reader'];

/**
 * Gradient background for a style object. Native (new architecture) draws CSS gradients through
 * `experimental_backgroundImage`; react-native-web ignores that key but passes standard CSS
 * `backgroundImage` through, so web needs the plain name. Usage: `{ ...bgImage(G.brand) }`.
 */
export function bgImage(g: string | undefined): object {
  if (!g) return {};
  return Platform.OS === 'web' ? { backgroundImage: g } : { experimental_backgroundImage: g };
}
