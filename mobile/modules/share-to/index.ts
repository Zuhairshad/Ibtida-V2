/**
 * Share an image straight to WhatsApp or Instagram (Android). Elsewhere `isSupported()` is false
 * and the app uses the system share sheet instead.
 */
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { Platform } from 'react-native';

declare class ShareToNative extends NativeModule {
  installed(packages: string[]): string[];
  shareImage(path: string, packageName: string, caption: string | null): Promise<boolean>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<ShareToNative>('ShareTo') : null;

export const isSupported = () => !!native;

export function installed(packages: string[]): string[] {
  if (!native) return [];
  try { return native.installed(packages); } catch { return []; }
}

/** Resolves false when the app isn't installed. */
export async function shareImage(path: string, packageName: string, caption?: string): Promise<boolean> {
  if (!native) return false;
  return native.shareImage(path, packageName, caption ?? null);
}
