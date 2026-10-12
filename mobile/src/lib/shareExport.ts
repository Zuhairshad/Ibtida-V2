/**
 * Turning a designed post into an image and sending it on.
 *
 * - The post is drawn at its format's real size (e.g. 1080×1920) and captured as a PNG.
 * - Android: straight into WhatsApp or Instagram (each then offers Status / Story / Post / Reels),
 *   or the system share sheet. iOS: the share sheet, where WhatsApp and Instagram appear.
 * - Save puts the PNG in the photo gallery. On web the image downloads instead.
 */
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as ShareTo from '../../modules/share-to';
import { formatOf, type FormatKey } from './studio';

export type Target = 'whatsapp' | 'instagram' | 'sheet' | 'save';

export const PACKAGES = { whatsapp: ['com.whatsapp', 'com.whatsapp.w4b'], instagram: ['com.instagram.android'] } as const;

/** Captures the full-size poster behind `ref` as a PNG; a file URI on phones, a data URI on web. */
export async function capturePoster(ref: RefObject<View | null>, format: FormatKey): Promise<string> {
  const f = formatOf(format);
  if (!ref.current) throw new Error('Nothing to export yet');
  return captureRef(ref, {
    format: 'png',
    quality: 1,
    width: f.w,
    height: f.h,
    result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
  });
}

/** Which direct targets this phone offers (only on Android, when the app is installed). */
export function directTargets(): { whatsapp: boolean; instagram: boolean } {
  if (!ShareTo.isSupported()) return { whatsapp: false, instagram: false };
  const have = ShareTo.installed([...PACKAGES.whatsapp, ...PACKAGES.instagram]);
  return { whatsapp: PACKAGES.whatsapp.some(p => have.includes(p)), instagram: have.includes(PACKAGES.instagram[0]) };
}

export type ShareResult = 'shared' | 'saved' | 'downloaded' | 'sheet';

/** Sends a captured image to `target`, falling back to the share sheet wherever a direct path isn't available. */
export async function sendImage(uri: string, target: Target, caption?: string): Promise<ShareResult> {
  if (Platform.OS === 'web') return downloadOnWeb(uri, target);
  if (target === 'save') {
    // Loaded only here: the media library has no web build, and only phones save to a gallery.
    const media = await import('expo-media-library');
    const perm = await media.requestPermissionsAsync(true, ['photo']);
    if (!perm.granted) throw new Error('Allow Ibtida to save photos to your gallery in Settings');
    await media.Asset.create(uri);
    return 'saved';
  }
  if (target === 'whatsapp' || target === 'instagram') {
    const have = ShareTo.isSupported() ? ShareTo.installed([...PACKAGES[target]]) : [];
    if (have.length && (await ShareTo.shareImage(uri, have[0], caption))) return 'shared';
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your post' });
  return 'sheet';
}

async function downloadOnWeb(dataUri: string, target: Target): Promise<ShareResult> {
  // Use the browser's own share sheet when it can share files; otherwise download the PNG.
  if (target !== 'save' && typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const blob = await (await fetch(dataUri)).blob();
      const file = new File([blob], 'ibtida-post.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; }
    } catch { /* fall back to download */ }
  }
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = 'ibtida-post.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'downloaded';
}
