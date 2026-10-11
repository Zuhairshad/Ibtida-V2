import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useT } from '../theme/ThemeProvider';
import { bgImage } from '../theme/tokens';
import { Float } from './motion';
import { buzz, Tap, Txt } from './ui';

/**
 * The four Home shortcuts with small 3D-rendered objects: a prayer mat, tasbeeh beads, a mushaf
 * and a padlock. Vector art (layered gradients, light from the top-left, soft contact shadows) in
 * Ibtida's ivory, sage and champagne — light to draw, crisp at any size, and the same on web.
 */

export type TileArt = 'mat' | 'beads' | 'quran' | 'lock';

const IVORY = '#F4EEDF';
const IVORY_D = '#DCD2B8';
const SAGE = '#86A38A';
const SAGE_D = '#55745D';
const SAGE_DD = '#3E5A47';
const GOLD = '#D8B877';
const GOLD_D = '#A9874A';

/** Unique gradient ids per drawing (several tiles share one screen; ids must not collide). */
function useIds() {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name: string) => `${name}${base}`;
}

/** Soft contact shadow under an object. */
function Shadow({ id, cx, cy, rx, ry }: { id: string; cx: number; cy: number; rx: number; ry: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000" stopOpacity="0.38" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id})`} />
    </>
  );
}

/** A prayer mat lying on the floor, seen from the front: sage field, ivory border, mihrab, fringe. */
function PrayerMat() {
  const id = useIds();
  const fringe = Array.from({ length: 15 }, (_, i) => 26 + i * 4.85);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Defs>
        <LinearGradient id={id('field')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SAGE} />
          <Stop offset="1" stopColor={SAGE_D} />
        </LinearGradient>
        <LinearGradient id={id('border')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={IVORY} />
          <Stop offset="1" stopColor={IVORY_D} />
        </LinearGradient>
        <LinearGradient id={id('arch')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD} />
          <Stop offset="1" stopColor={GOLD_D} />
        </LinearGradient>
        <LinearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0" stopColor="#FFF" stopOpacity="0.28" />
          <Stop offset="0.5" stopColor="#FFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Shadow id={id('sh')} cx={60} cy={77} rx={46} ry={7} />
      {/* thickness of the mat at the near edge */}
      <Polygon points="20,70 100,70 100,73.5 20,73.5" fill={IVORY_D} stroke="#BFB18D" strokeWidth="0.7" />
      {/* border and field, in perspective (the far edge is narrower) */}
      <Polygon points="20,70 100,70 89,20 31,20" fill={`url(#${id('border')})`} stroke="#BFB18D" strokeWidth="0.7" strokeLinejoin="round" />
      <Polygon points="25.5,67 94.5,67 85.5,23.5 34.5,23.5" fill={`url(#${id('field')})`} />
      <Polygon points="28.5,64.5 91.5,64.5 83.5,26 36.5,26" fill="none" stroke={GOLD} strokeWidth="0.9" strokeOpacity="0.8" />
      {/* mihrab arch toward the far end */}
      <Path d="M48.5 47 L48.5 37.5 Q48.5 28.5 60 26.8 Q71.5 28.5 71.5 37.5 L71.5 47 Z" fill={`url(#${id('arch')})`} opacity="0.95" />
      <Path d="M51.5 47 L51.5 38.5 Q51.5 31.5 60 30 Q68.5 31.5 68.5 38.5 L68.5 47 Z" fill={SAGE_DD} />
      <Circle cx="60" cy="37" r="1.8" fill={GOLD} />
      {/* a small rosette near the knees */}
      <Polygon points="60,51 64,55.5 60,60 56,55.5" fill={GOLD} opacity="0.9" />
      <Polygon points="60,53.2 62,55.5 60,57.8 58,55.5" fill={SAGE_DD} />
      {/* light falling across the weave */}
      <Polygon points="25.5,67 94.5,67 85.5,23.5 34.5,23.5" fill={`url(#${id('sheen')})`} />
      {/* fringe */}
      {fringe.map(x => <Line key={x} x1={x} y1={73.5} x2={x} y2={78} stroke={IVORY} strokeWidth="1.1" strokeLinecap="round" />)}
    </Svg>
  );
}

/** A loop of pearl tasbeeh beads in perspective, with the imam bead and tassel. */
function Beads() {
  const id = useIds();
  const n = 17;
  const beads = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    const depth = (Math.sin(a) + 1) / 2; // 1 = nearest the viewer
    return { x: 60 + 36 * Math.cos(a), y: 40 + 15 * Math.sin(a), r: 3.6 + depth * 2.4, depth };
  }).sort((p, q) => p.depth - q.depth);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Defs>
        <RadialGradient id={id('pearl')} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#FFFDF6" />
          <Stop offset="0.45" stopColor={GOLD} />
          <Stop offset="1" stopColor={GOLD_D} />
        </RadialGradient>
        <RadialGradient id={id('imam')} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#CFE0D1" />
          <Stop offset="0.5" stopColor={SAGE} />
          <Stop offset="1" stopColor={SAGE_DD} />
        </RadialGradient>
      </Defs>
      <Shadow id={id('sh')} cx={60} cy={80} rx={42} ry={6} />
      {/* the cord */}
      <Ellipse cx="60" cy="40" rx="36" ry="15" fill="none" stroke={GOLD_D} strokeWidth="0.8" strokeOpacity="0.6" />
      {beads.map((b, i) => (
        <G key={i} opacity={0.72 + b.depth * 0.28}>
          <Circle cx={b.x} cy={b.y} r={b.r} fill={`url(#${id('pearl')})`} />
        </G>
      ))}
      {/* imam bead, tassel stem and tassel */}
      <Line x1="60" y1="55" x2="60" y2="64" stroke={GOLD_D} strokeWidth="1" />
      <Ellipse cx="60" cy="61" rx="4.6" ry="5.8" fill={`url(#${id('imam')})`} />
      <Path d="M56.5 66 Q60 63.5 63.5 66 L65.5 78 Q60 80 54.5 78 Z" fill={SAGE_D} />
      {[56.5, 58.5, 60, 61.5, 63.5].map(x => <Line key={x} x1={x} y1={68} x2={x + (x - 60) * 0.4} y2={78} stroke={SAGE_DD} strokeWidth="0.6" />)}
      <Rect x="56" y="64.5" width="8" height="2.4" rx="1.2" fill={GOLD} />
    </Svg>
  );
}

/** A closed mushaf lying at an angle: sage cover with gilded border and medallion, ivory page block, ribbon. */
function Mushaf() {
  const id = useIds();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Defs>
        <LinearGradient id={id('cover')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={SAGE} />
          <Stop offset="0.55" stopColor={SAGE_D} />
          <Stop offset="1" stopColor={SAGE_DD} />
        </LinearGradient>
        <LinearGradient id={id('pages')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFBF0" />
          <Stop offset="1" stopColor={IVORY_D} />
        </LinearGradient>
        <LinearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F3DDA6" />
          <Stop offset="1" stopColor={GOLD_D} />
        </LinearGradient>
        <LinearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="0.8">
          <Stop offset="0" stopColor="#FFF" stopOpacity="0.32" />
          <Stop offset="0.45" stopColor="#FFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Shadow id={id('sh')} cx={64} cy={76} rx={42} ry={7} />
      {/* page block (thickness), seen along the fore-edge */}
      <Polygon points="38,62 98,52 98,60 38,70" fill={`url(#${id('pages')})`} />
      {[0, 1, 2, 3].map(k => <Line key={k} x1={38} y1={63.6 + k * 1.6} x2={98} y2={53.6 + k * 1.6} stroke={IVORY_D} strokeWidth="0.45" />)}
      {/* spine */}
      <Polygon points="26,34 38,62 38,70 26,42" fill={SAGE_DD} />
      {/* cover */}
      <Polygon points="26,34 86,24 98,52 38,62" fill={`url(#${id('cover')})`} />
      {/* gilded border, inset */}
      <Polygon points="31.5,35.5 82.8,27 92.4,50.3 41.2,58.8" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="1.3" />
      <Polygon points="34.5,37 80.8,29.4 89.3,49 43.2,56.7" fill="none" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.8" />
      {/* central medallion: an eight-pointed star in perspective */}
      <G transform="translate(62 43) skewX(-24) scale(1 0.62)">
        <Rect x="-8" y="-8" width="16" height="16" fill={`url(#${id('gold')})`} />
        <Rect x="-8" y="-8" width="16" height="16" fill={`url(#${id('gold')})`} transform="rotate(45)" />
        <Circle r="4.6" fill={SAGE_D} />
        <Circle r="2" fill={GOLD} />
      </G>
      {/* corner ornaments */}
      {[[36, 38.4], [79, 31.2], [86.6, 47.6], [44, 54.8]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r="1.3" fill={GOLD} />)}
      {/* light on the cover */}
      <Polygon points="26,34 86,24 98,52 38,62" fill={`url(#${id('sheen')})`} />
      {/* ribbon bookmark */}
      <Path d="M72 56.5 L76 55.8 L77.5 74 L74.8 71.6 L72.4 74.6 Z" fill="#B5574B" />
    </Svg>
  );
}

/** A champagne padlock with a crescent on its face. */
function Padlock() {
  const id = useIds();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Defs>
        <LinearGradient id={id('shackle')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#8F8F8A" />
          <Stop offset="0.35" stopColor="#F2F0EA" />
          <Stop offset="0.7" stopColor="#B9B6AC" />
          <Stop offset="1" stopColor="#7E7C75" />
        </LinearGradient>
        <LinearGradient id={id('face')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F3DDA6" />
          <Stop offset="0.5" stopColor={GOLD} />
          <Stop offset="1" stopColor={GOLD_D} />
        </LinearGradient>
        <LinearGradient id={id('side')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_D} />
          <Stop offset="1" stopColor="#7C6232" />
        </LinearGradient>
        <LinearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF" stopOpacity="0.45" />
          <Stop offset="0.4" stopColor="#FFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Shadow id={id('sh')} cx={63} cy={79} rx={30} ry={5.5} />
      {/* shackle (behind the body) */}
      <Path d="M47 44 L47 30 Q47 14 61 14 Q75 14 75 30 L75 44" fill="none" stroke={`url(#${id('shackle')})`} strokeWidth="7" strokeLinecap="round" />
      {/* body: right side for depth, then the face */}
      <Path d="M80 42 L85 39 L85 70 Q85 74 81 76 L80 76 Z" fill={`url(#${id('side')})`} />
      <Rect x="38" y="40" width="46" height="36" rx="9" fill={`url(#${id('face')})`} />
      <Rect x="38" y="40" width="46" height="36" rx="9" fill={`url(#${id('sheen')})`} />
      <Rect x="41.5" y="43.5" width="39" height="29" rx="6.5" fill="none" stroke="#FFF6DC" strokeOpacity="0.55" strokeWidth="0.8" />
      {/* crescent and keyhole */}
      <Circle cx="61" cy="53" r="6.2" fill={SAGE_D} />
      <Circle cx="63.4" cy="51.6" r="5.4" fill={GOLD} />
      <Circle cx="61" cy="62" r="2.2" fill={SAGE_DD} />
      <Path d="M60 63 L62 63 L62.6 68 L59.4 68 Z" fill={SAGE_DD} />
    </Svg>
  );
}

const ART: Record<TileArt, () => React.JSX.Element> = { mat: PrayerMat, beads: Beads, quran: Mushaf, lock: Padlock };
const DELAY: Record<TileArt, number> = { mat: 0, beads: 600, quran: 1200, lock: 1800 };

/** One Home shortcut: the 3D object on a soft glow, then its title and live subtitle. */
export function QuickTile3D({ art, title, sub, onPress, style }: { art: TileArt; title: string; sub: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  const Art = ART[art];
  return (
    <Tap scale={0.96} onPress={() => { buzz(6); onPress(); }} accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`}
      style={[{ borderRadius: 28, backgroundColor: t.card, boxShadow: t.edge, padding: 14, paddingBottom: 18, overflow: 'hidden' }, style]}>
      <View style={{ height: 104, borderRadius: 20, backgroundColor: t.dark ? 'rgba(244,238,223,0.05)' : '#F7F3E8', overflow: 'hidden' }}>
        {/* warm light from above, so each object sits in its own little scene */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
          ...bgImage(`radial-gradient(70% 85% at 50% 18%, rgba(216,184,119,${t.dark ? 0.16 : 0.24}) 0%, rgba(216,184,119,0) 100%)`) }} />
        <Float dur={4600} delay={DELAY[art]} lift={2.5} style={{ flex: 1 }}>
          <Art />
        </Float>
      </View>
      <Txt style={{ fontSize: 16, fontWeight: 700, marginTop: 12, marginHorizontal: 4 }} numberOfLines={1}>{title}</Txt>
      <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 4, marginHorizontal: 4 }} numberOfLines={1}>{sub}</Txt>
    </Tap>
  );
}
