/**
 * "Scan the item itself" for the two-stage Fajr wake check: instead of a printed QR tag, the
 * camera recognises the wudu sink or the prayer mat with an on-device image classifier.
 *
 * Model: MobileNet v2 (ImageNet), run with TensorFlow.js entirely on the device — photos are
 * never uploaded. ImageNet has exact classes for both objects ("washbasin…" and "prayer rug,
 * prayer mat"); a soap dispenser also counts as being at the wudu sink. The model (~14 MB) is
 * downloaded once and then served from the HTTP / browser cache.
 */
import type { MobileNet } from '@tensorflow-models/mobilenet';
import { Platform } from 'react-native';
import type { WakeKind } from './wakeTag';

const MODEL_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json';

/** ImageNet class names that satisfy each station. */
const MATCH: Record<WakeKind, string[]> = {
  W: ['washbasin', 'soap dispenser'],
  M: ['prayer rug'],
};
/** Combined probability of the matching classes needed for one positive frame. */
export const ITEM_THRESHOLD = 0.15;
/** Consecutive positive frames needed before the station counts as scanned. */
export const ITEM_FRAMES = 2;

export const itemLabel = (k: WakeKind) => (k === 'W' ? 'wudu sink' : 'prayer mat');

type TF = typeof import('@tensorflow/tfjs');
let tfMod: TF | null = null;
let model: Promise<MobileNet> | null = null;

/** TensorFlow.js needs to be told how to fetch and encode text on React Native. */
function rnPlatform(tf: TF) {
  if (Platform.OS === 'web') return;
  try { if (tf.env().platformName) return; } catch { /* not set yet */ }
  tf.env().setPlatform('react-native', {
    fetch: (path: string, init?: RequestInit) => fetch(path, init),
    now: () => Date.now(),
    encode: (text: string) => new TextEncoder().encode(text),
    decode: (bytes: Uint8Array, enc: string) => new TextDecoder(enc).decode(bytes),
    isTypedArray: (a: unknown): a is Float32Array | Int32Array | Uint8Array | Uint8ClampedArray =>
      a instanceof Float32Array || a instanceof Int32Array || a instanceof Uint8Array || a instanceof Uint8ClampedArray,
  });
}

/** Loads (once) and warms up the classifier. Rejections clear the cache so a retry can succeed. */
export function loadItemModel(): Promise<MobileNet> {
  if (!model) {
    model = (async () => {
      const tf = await import('@tensorflow/tfjs');
      tfMod = tf;
      rnPlatform(tf);
      if (Platform.OS !== 'web') await tf.setBackend('cpu');
      await tf.ready();
      const mobilenet = await import('@tensorflow-models/mobilenet');
      return mobilenet.load({ version: 2, alpha: 1.0, modelUrl: MODEL_URL, inputRange: [-1, 1] });
    })();
    model.catch(() => { model = null; });
  }
  return model;
}

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Decodes a JPEG (base64, no data: prefix) into an RGB tensor — used on iOS/Android. */
async function jpegTensor(b64: string) {
  const { decode } = await import('jpeg-js');
  const img = decode(b64ToBytes(b64), { useTArray: true, formatAsRGBA: false });
  return tfMod!.tensor3d(img.data, [img.height, img.width, 3], 'int32');
}

function webImage(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not read the camera frame'));
    img.src = dataUri;
  });
}

export type ItemResult = { ok: boolean; score: number; top: { name: string; p: number } | null };

/**
 * Classifies one camera frame. `frame` is a data: URI on web, or base64 JPEG on native
 * (already shrunk to ~224 px so decoding stays fast).
 */
export async function classifyFrame(kind: WakeKind, frame: string): Promise<ItemResult> {
  const m = await loadItemModel();
  let preds: { className: string; probability: number }[];
  if (Platform.OS === 'web') {
    preds = await m.classify(await webImage(frame), 10);
  } else {
    const t = await jpegTensor(frame);
    try { preds = await m.classify(t, 10); } finally { t.dispose(); }
  }
  const want = MATCH[kind];
  const score = preds.filter(p => want.some(w => p.className.toLowerCase().includes(w))).reduce((a, p) => a + p.probability, 0);
  const top = preds[0] ? { name: preds[0].className.split(',')[0], p: preds[0].probability } : null;
  return { ok: score >= ITEM_THRESHOLD, score, top };
}
