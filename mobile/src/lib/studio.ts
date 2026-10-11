/**
 * Inspiration Studio: the design of one shareable post. Every size is relative to the poster's
 * width, so the live preview and the full-resolution export are the same picture.
 */
import type { Inspiration } from './inspiration';

export type FormatKey = 'status' | 'story' | 'post' | 'portrait' | 'reel';
export const FORMATS: { key: FormatKey; label: string; sub: string; w: number; h: number }[] = [
  { key: 'status', label: 'WhatsApp Status', sub: '9:16 · 1080×1920', w: 1080, h: 1920 },
  { key: 'story', label: 'Instagram Story', sub: '9:16 · 1080×1920', w: 1080, h: 1920 },
  { key: 'reel', label: 'Reels cover', sub: '9:16 · 1080×1920', w: 1080, h: 1920 },
  { key: 'post', label: 'Post · square', sub: '1:1 · 1080×1080', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Post · portrait', sub: '4:5 · 1080×1350', w: 1080, h: 1350 },
];
export const formatOf = (k: FormatKey) => FORMATS.find(f => f.key === k) ?? FORMATS[0];

/** Premium backgrounds: ivory, sage and champagne first, then deeper night tones. */
export const BACKGROUNDS: { key: string; label: string; css: string; light: boolean }[] = [
  { key: 'ivory', label: 'Ivory pearl', css: 'linear-gradient(160deg, #FBF7EE 0%, #F1E9D6 60%, #E6DBC1 100%)', light: true },
  { key: 'sage', label: 'Sage dawn', css: 'linear-gradient(165deg, #DCE6D9 0%, #A9C0A6 55%, #7E9C83 100%)', light: true },
  { key: 'champagne', label: 'Champagne', css: 'linear-gradient(160deg, #FFF8EA 0%, #F2DFB8 55%, #D9B877 100%)', light: true },
  { key: 'emerald', label: 'Emerald velvet', css: 'linear-gradient(165deg, #2F5A45 0%, #1D3D2E 60%, #10241B 100%)', light: false },
  { key: 'midnight', label: 'Midnight', css: 'linear-gradient(170deg, #1C2446 0%, #141A33 60%, #0B0F20 100%)', light: false },
  { key: 'fajr', label: 'Fajr sky', css: 'linear-gradient(180deg, #1C2446 0%, #5B4E83 55%, #E59A74 100%)', light: false },
  { key: 'maghrib', label: 'Maghrib', css: 'linear-gradient(180deg, #221A38 0%, #7A3050 55%, #E5774A 100%)', light: false },
  { key: 'charcoal', label: 'Charcoal gold', css: 'linear-gradient(160deg, #2A2A2E 0%, #16171D 70%, #3A2F1E 100%)', light: false },
];

export const TEXT_COLORS = ['#FFFFFF', '#FBF7EE', '#F2DFB8', '#1F2A22', '#3E5A47', '#111217'];
export const ACCENTS = ['#D8B877', '#86A38A', '#F2A65A', '#C9A0DC', '#E07A4B', '#FFFFFF'];

export type Frame = 'none' | 'line' | 'arch';
export type Align = 'center' | 'start';
export type VAlign = 'top' | 'center' | 'bottom';

export type Design = {
  format: FormatKey;
  bg: { type: 'preset'; key: string } | { type: 'solid'; color: string } | { type: 'photo'; uri: string };
  /** Darkening over the background, 0–0.8 (keeps text readable on photos). */
  dim: number;
  title: string;
  ar: string;
  en: string;
  ur: string;
  source: string;
  show: { ar: boolean; en: boolean; ur: boolean; title: boolean; source: boolean; brand: boolean };
  latin: 'serif' | 'sans';
  /** Sizes, as a share of the poster width ×1000 (so 60 means 6% of the width). */
  arSize: number;
  enSize: number;
  urSize: number;
  /** Line spacing multiplier, 1.1–2.2. */
  leading: number;
  /** Side margin, 4–18 % of the width. */
  margin: number;
  color: string;
  accent: string;
  align: Align;
  valign: VAlign;
  frame: Frame;
};

export const SIZE_RANGE = { ar: [40, 110], en: [30, 80], ur: [32, 90] } as const;

/** A good starting design for a post: text from the post, background by kind. */
export function designFor(p: Pick<Inspiration, 'kind' | 'title' | 'ar' | 'en' | 'ur' | 'source'>): Design {
  const bg = p.kind === 'ayah' ? 'emerald' : p.kind === 'hadith' ? 'ivory' : p.kind === 'reminder' ? 'sage' : 'midnight';
  const light = BACKGROUNDS.find(b => b.key === bg)!.light;
  const long = (p.en?.length ?? 0) > 220;
  return {
    format: 'status',
    bg: { type: 'preset', key: bg },
    dim: 0,
    title: p.title ?? '',
    ar: p.ar ?? '',
    en: p.en ?? '',
    ur: p.ur ?? '',
    source: p.source ?? '',
    show: { ar: !!p.ar, en: !!p.en, ur: !!p.ur && !p.en, title: !!p.title, source: !!p.source, brand: true },
    latin: 'serif',
    arSize: long ? 58 : 70,
    enSize: long ? 40 : 50,
    urSize: long ? 46 : 54,
    leading: 1.5,
    margin: 10,
    color: light ? '#1F2A22' : '#FBF7EE',
    accent: light ? '#3E5A47' : '#D8B877',
    align: 'center',
    valign: 'center',
    frame: p.kind === 'ayah' ? 'arch' : 'line',
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Whether a design has anything to show. */
export const hasText = (d: Design) => (d.show.ar && d.ar.trim()) || (d.show.en && d.en.trim()) || (d.show.ur && d.ur.trim()) || (d.show.title && d.title.trim());

/** A plain-text version for sharing as a message (when an image isn't wanted). */
export function asText(d: Design) {
  return [
    d.show.title && d.title, d.show.ar && d.ar, d.show.en && d.en, d.show.ur && d.ur,
    d.show.source && d.source ? `— ${d.source}` : '', 'Shared from Ibtida',
  ].filter(Boolean).join('\n\n');
}
