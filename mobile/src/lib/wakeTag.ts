/**
 * Wake tags are printed from Prayer mat tag and encode
 * `ibtida://wake/<token>-W` (wudu station) or `ibtida://wake/<token>-M` (prayer mat).
 */
export type WakeKind = 'W' | 'M';

/** Time allowed between the wudu scan and the prayer-mat scan. */
export const WAKE_WINDOW_MS = 10 * 60 * 1000;

const PREFIX = 'ibtida://wake/';

export const wakeTagUrl = (token: string, kind: WakeKind) => `${PREFIX}${token}-${kind}`;

/**
 * Reads a scanned QR payload. Returns null for anything that is not an Ibtida wake tag;
 * otherwise the tag kind and whether it belongs to the current token (an old, regenerated
 * tag reads as `current: false`).
 */
export function readWakeTag(data: string, token: string): { kind: WakeKind; current: boolean } | null {
  const raw = data.trim();
  if (!raw.toLowerCase().startsWith(PREFIX)) return null;
  const m = /^(.+)-([WM])$/i.exec(raw.slice(PREFIX.length));
  if (!m) return null;
  const kind = m[2].toUpperCase() as WakeKind;
  return { kind, current: m[1].toUpperCase() === token.toUpperCase() };
}

export const fmtCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
