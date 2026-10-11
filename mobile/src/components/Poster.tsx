import { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BACKGROUNDS, formatOf, type Design } from '../lib/studio';
import { bgImage, FONTS } from '../theme/tokens';
import { MosqueLogo } from './Icon';

/**
 * One designed post, drawn at any width. The Studio shows it small as a live preview and draws it
 * again at 1080 px wide for export, so what you see is exactly what you share.
 */
export const Poster = forwardRef<View, { d: Design; width: number }>(function Poster({ d, width }, ref) {
  const f = formatOf(d.format);
  const height = (width * f.h) / f.w;
  const s = width / 1000;
  const m = (d.margin / 100) * width;
  const bg = d.bg;
  const preset = bg.type === 'preset' ? BACKGROUNDS.find(b => b.key === bg.key) ?? BACKGROUNDS[0] : null;
  const align = d.align === 'center' ? 'center' : 'flex-start';
  const textAlign = d.align === 'center' ? 'center' : 'left';
  const latin = d.latin === 'serif' ? FONTS.serif : FONTS.sans[500];
  const lh = (size: number) => size * s * d.leading;

  return (
    <View ref={ref} collapsable={false}
      style={{ width, height, overflow: 'hidden', backgroundColor: d.bg.type === 'solid' ? d.bg.color : '#16171D', ...(preset ? bgImage(preset.css) : {}) }}>
      {d.bg.type === 'photo' && <Image source={{ uri: d.bg.uri }} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width, height }} />}
      {d.dim > 0 && <View style={{ position: 'absolute', left: 0, top: 0, width, height, backgroundColor: `rgba(0,0,0,${d.dim})` }} />}

      {d.frame === 'line' && (
        <View pointerEvents="none" style={{ position: 'absolute', left: m * 0.45, right: m * 0.45, top: m * 0.45, bottom: m * 0.45,
          borderWidth: Math.max(1, 3 * s), borderColor: d.accent, borderRadius: 26 * s, opacity: 0.75 }} />
      )}
      {d.frame === 'arch' && (
        <Svg pointerEvents="none" width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          {[0, 1].map(k => {
            const inset = m * 0.45 + k * 14 * s;
            const top = height * 0.06 + inset;
            const shoulder = top + (width - 2 * inset) * 0.42;
            const path = `M${inset} ${height - inset} L${inset} ${shoulder} Q${inset} ${top} ${width / 2} ${top} Q${width - inset} ${top} ${width - inset} ${shoulder} L${width - inset} ${height - inset} Z`;
            return <Path key={k} d={path} fill="none" stroke={d.accent} strokeWidth={(k ? 1.5 : 3.5) * s} strokeOpacity={k ? 0.55 : 0.85} />;
          })}
        </Svg>
      )}

      <View style={{ position: 'absolute', left: m, right: m, top: m * 1.4, bottom: m * 1.4 + (d.show.brand ? 60 * s : 0),
        justifyContent: d.valign === 'top' ? 'flex-start' : d.valign === 'bottom' ? 'flex-end' : 'center', alignItems: align }}>
        {d.show.title && !!d.title.trim() && (
          <Text style={{ fontFamily: FONTS.sans[700], fontSize: 30 * s, letterSpacing: 6 * s, color: d.accent, textAlign, marginBottom: 34 * s }}>
            {d.title.toUpperCase()}
          </Text>
        )}
        {d.show.ar && !!d.ar.trim() && (
          <Text style={{ fontFamily: FONTS.arabic[600], fontSize: d.arSize * s, lineHeight: lh(d.arSize) * 1.15, color: d.color, textAlign: d.align === 'center' ? 'center' : 'right', writingDirection: 'rtl', alignSelf: 'stretch' }}>
            {d.ar}
          </Text>
        )}
        {(d.show.ar && !!d.ar.trim()) && ((d.show.en && !!d.en.trim()) || (d.show.ur && !!d.ur.trim())) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * s, marginVertical: 30 * s, alignSelf: d.align === 'center' ? 'center' : 'flex-start' }}>
            <View style={{ width: 70 * s, height: Math.max(1, 2 * s), backgroundColor: d.accent, opacity: 0.7 }} />
            <View style={{ width: 14 * s, height: 14 * s, backgroundColor: d.accent, transform: [{ rotate: '45deg' }] }} />
            <View style={{ width: 70 * s, height: Math.max(1, 2 * s), backgroundColor: d.accent, opacity: 0.7 }} />
          </View>
        )}
        {d.show.en && !!d.en.trim() && (
          <Text style={{ fontFamily: latin, fontSize: d.enSize * s, lineHeight: lh(d.enSize), color: d.color, textAlign }}>
            {d.en}
          </Text>
        )}
        {d.show.ur && !!d.ur.trim() && (
          <Text style={{ fontFamily: FONTS.urdu, fontSize: d.urSize * s, lineHeight: lh(d.urSize) * 1.45, color: d.color, textAlign: d.align === 'center' ? 'center' : 'right', writingDirection: 'rtl', alignSelf: 'stretch', marginTop: d.show.en && d.en.trim() ? 24 * s : 0 }}>
            {d.ur}
          </Text>
        )}
        {d.show.source && !!d.source.trim() && (
          <Text style={{ fontFamily: FONTS.sans[600], fontSize: 28 * s, letterSpacing: 2 * s, color: d.accent, textAlign, marginTop: 34 * s }}>
            {d.source.toUpperCase()}
          </Text>
        )}
      </View>

      {d.show.brand && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: m * 0.9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 * s, opacity: 0.85 }}>
          <MosqueLogo size={38 * s} />
          <Text style={{ fontFamily: FONTS.sans[800], fontSize: 30 * s, letterSpacing: -0.5 * s, color: d.color }}>ibtida</Text>
        </View>
      )}
    </View>
  );
});
