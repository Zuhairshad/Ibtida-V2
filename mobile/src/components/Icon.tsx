import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

/** Icon paths copied verbatim from the `P` map in Ibtida v7. */
const K = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const P = {
  back: `<path d="M15 5l-7 7 7 7" ${K}/>`,
  chev: `<path d="M9 5l7 7-7 7" ${K}/>`,
  home: '<path d="M12 3c.5 0 .85.4.85.9v1.05c3.35 1.2 5.65 4 5.65 7.2V12.6h-13v-.45c0-3.2 2.3-6 5.65-7.2V3.9c0-.5.35-.9.85-.9z" fill="currentColor"/><path d="M5 14h14v7h-4.6v-3.4a2.4 2.4 0 0 0-4.8 0V21H5z" fill="currentColor"/>',
  prayer: `<path d="M5 21v-7.5a7 7 0 0 1 14 0V21M12 6.5V3M3 21h18" ${K}/>`,
  beads: `<circle cx="12" cy="12" r="7.5" ${K}/><circle cx="12" cy="4.5" r="2.4" fill="currentColor"/><circle cx="19.5" cy="12" r="2.4" fill="currentColor"/><circle cx="12" cy="19.5" r="2.4" fill="currentColor"/><circle cx="4.5" cy="12" r="2.4" fill="currentColor"/>`,
  people: '<circle cx="9" cy="8" r="3.4" fill="currentColor"/><path d="M2.6 20c0-3.5 2.9-6 6.4-6s6.4 2.5 6.4 6z" fill="currentColor"/><circle cx="17.2" cy="9" r="2.7" fill="currentColor" opacity=".6"/><path d="M16.4 14.1c2.9.3 5 2.5 5 5.9h-4.2" fill="currentColor" opacity=".6"/>',
  user: '<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/>',
  compass: `<circle cx="12" cy="12" r="9" ${K}/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor"/>`,
  search: `<circle cx="11" cy="11" r="6.5" ${K}/><path d="M16 16l4.5 4.5" ${K}/>`,
  bell: `<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" ${K}/>`,
  book: `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" ${K}/>`,
  lock: `<rect x="5" y="10.5" width="14" height="10" rx="3" ${K}/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ${K}/>`,
  sun: `<circle cx="12" cy="12" r="4" ${K}/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" ${K}/>`,
  moon: `<path d="M20 14.6A8.6 8.6 0 1 1 9.4 4 7 7 0 0 0 20 14.6z" ${K}/>`,
  sunrise: `<path d="M3.5 19h17M7.5 19a4.5 4.5 0 0 1 9 0M12 4v5M9.5 6.5L12 4l2.5 2.5" ${K}/>`,
  sunset: `<path d="M3.5 19h17M7.5 19a4.5 4.5 0 0 1 9 0M12 9V4M9.5 6.5L12 9l2.5-2.5" ${K}/>`,
  dusk: `<circle cx="12" cy="13" r="4" ${K}/><path d="M3.5 20h17M12 4.5v2M5.8 7.3l1.4 1.4M18.2 7.3l-1.4 1.4" ${K}/>`,
  alarm: `<circle cx="12" cy="13" r="7.5" ${K}/><path d="M12 9.5V13l2.5 1.5M4 5l3-2.5M20 5l-3-2.5" ${K}/>`,
  qr: `<rect x="4" y="4" width="6" height="6" rx="1" ${K}/><rect x="14" y="4" width="6" height="6" rx="1" ${K}/><rect x="4" y="14" width="6" height="6" rx="1" ${K}/><path d="M14 14h2v2h-2zM18 18h2v2h-2z" ${K}/>`,
  shield: `<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" ${K}/>`,
  spark: '<path d="M12 2.5l2 7.5 7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2z" fill="currentColor"/>',
  plus: `<path d="M12 5v14M5 12h14" ${K}/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${K}/>`,
  share: `<path d="M12 15V4M8 7.5L12 4l4 3.5M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6" ${K}/>`,
  copy: `<rect x="8" y="8" width="12" height="12" rx="3" ${K}/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" ${K}/>`,
  vib: `<rect x="8" y="3.5" width="8" height="17" rx="2.5" ${K}/><path d="M4.5 8v8M19.5 8v8" ${K}/>`,
  pin: `<path d="M12 21s7-6 7-11.5a7 7 0 0 0-14 0C5 15 12 21 12 21z" ${K}/><circle cx="12" cy="9.5" r="2.5" ${K}/>`,
  flame: '<path d="M12 21c4 0 6.5-2.7 6.5-6.3 0-3.7-2.8-5.7-4-9.7-2.6 1.6-3.4 4.1-3.2 6-1.1-.6-1.9-1.8-2-3-1.9 1.6-3.8 4-3.8 6.7C5.5 18.3 8 21 12 21z" fill="currentColor"/>',
  chart: `<path d="M5 20v-8M12 20V5M19 20v-5" ${K}/>`,
  cal: `<rect x="4" y="5.5" width="16" height="14.5" rx="3.5" fill="currentColor"/><path d="M8 3.5v4M16 3.5v4" ${K}/>`,
  trophy: `<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5" ${K}/>`,
  x: `<path d="M6 6l12 12M18 6L6 18" ${K}/>`,
  torch: `<path d="M8 3h8l-1.5 5v12h-5V8zM12 12v2" ${K}/>`,
  wifiOff: `<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4.5-2.4M19 12.5a10 10 0 0 0-2.2-1.6M2 8.8a14 14 0 0 1 4-2.5M22 8.8a14 14 0 0 0-8.5-3.7M12 20h.01" ${K}/>`,
  bookmark: `<path d="M6 4h12v17l-6-4-6 4z" ${K}/>`,
  bookmarkF: '<path d="M6 4h12v17l-6-4-6 4z" fill="currentColor"/>',
  heart: `<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" ${K}/>`,
  sunDay: '<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M18.9 5.1l-1.8 1.8M6.9 17.1l-1.8 1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

export type IconName = keyof typeof P;

export const Icon = memo(function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  const xml = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${P[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
});

/** The small orange mosque mark (splash, Home header, brand). */
export const MosqueLogo = memo(function MosqueLogo({ size }: { size: number }) {
  const g = 'url(#mq)';
  const xml = `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"><defs><linearGradient id="mq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7BD5A"/><stop offset="1" stop-color="#E07A4B"/></linearGradient></defs><path d="M32 5.5c.9 0 1.5.7 1.5 1.6v2.6C41.8 12.4 47.5 19.6 47.5 28v2h-31v-2c0-8.4 5.7-15.6 14-18.3V7.1c0-.9.6-1.6 1.5-1.6z" fill="${g}"/><rect x="15" y="32" width="34" height="24" rx="2" fill="${g}"/><path d="M27 56V45a5 5 0 0 1 10 0v11z" fill="rgba(0,0,0,.3)"/><path d="M7 11.5l3.2 7.5H3.8z" fill="${g}"/><rect x="4" y="20" width="6" height="36" rx="2" fill="${g}"/><path d="M57 11.5l3.2 7.5h-6.4z" fill="${g}"/><rect x="54" y="20" width="6" height="36" rx="2" fill="${g}"/><rect x="2" y="56.5" width="60" height="3.5" rx="1.75" fill="${g}"/></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
});

export const GoogleG = memo(function GoogleG() {
  const xml = '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853"/><path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335"/></svg>';
  return <SvgXml xml={xml} width={18} height={18} />;
});
