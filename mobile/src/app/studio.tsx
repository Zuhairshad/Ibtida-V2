import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, PixelRatio, Platform, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { Poster } from '../components/Poster';
import { Slider } from '../components/Slider';
import { BackBar, buzz, Chips, Label, say, Seg, Tap, Txt } from '../components/ui';
import { findPost } from '../lib/inspiration';
import { capturePoster, directTargets, sendImage, type Target } from '../lib/shareExport';
import {
  ACCENTS, BACKGROUNDS, clamp, designFor, FORMATS, formatOf, hasText, SIZE_RANGE, TEXT_COLORS, type Design,
} from '../lib/studio';
import { useT } from '../theme/ThemeProvider';
import { bgImage } from '../theme/tokens';

const BLANK = { kind: 'reminder' as const, title: '', ar: '', en: 'Write your reminder here.', ur: '', source: '' };

function Swatch({ on, onPress, label, children }: { on: boolean; onPress: () => void; label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <Tap scale={0.92} onPress={() => { buzz(4); onPress(); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 22, padding: 3, borderWidth: 2, borderColor: on ? t.acc : 'transparent' }}>
      {children}
    </Tap>
  );
}

function Field({ label, value, onChange, rtl, font, multiline = true }: { label: string; value: string; onChange: (v: string) => void; rtl?: boolean; font?: string; multiline?: boolean }) {
  const t = useT();
  return (
    <TextInput value={value} onChangeText={onChange} multiline={multiline} accessibilityLabel={label} placeholder={label} placeholderTextColor={t.t4}
      style={{ outlineWidth: 0, marginTop: 10, minHeight: multiline ? 70 : 48, maxHeight: 180, borderRadius: 18, backgroundColor: t.sunk, boxShadow: t.edge,
        paddingHorizontal: 14, paddingVertical: 12, color: t.txw, fontSize: rtl ? 19 : 15, fontFamily: font ?? 'PlusJakartaSans_500Medium',
        textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr', textAlignVertical: 'top' }} />
  );
}

/**
 * Inspiration Studio: design a post with a live preview, then export it at full size for WhatsApp
 * Status, Instagram Stories, Reels covers or posts — straight into the app, the share sheet, or the gallery.
 */
export default function Studio() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [d, setD] = useState<Design>(() => designFor((id && findPost(id)) || BLANK));
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState<Target | null>(null);
  const [direct] = useState(directTargets);
  const exportRef = useRef<View>(null);
  const put = (p: Partial<Design>) => setD(x => ({ ...x, ...p }));
  const show = (k: keyof Design['show']) => setD(x => ({ ...x, show: { ...x.show, [k]: !x.show[k] } }));

  const f = formatOf(d.format);
  const maxH = Math.min(height * 0.44, 460);
  const previewW = Math.min(width - 64, (maxH * f.w) / f.h);
  const exportW = f.w / PixelRatio.get();

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (r.canceled || !r.assets?.[0]) return;
    put({ bg: { type: 'photo', uri: r.assets[0].uri }, dim: Math.max(d.dim, 0.35), color: '#FFFFFF', accent: '#F2DFB8' });
  };

  const share = async (target: Target) => {
    if (busy) return;
    if (!hasText(d)) { say('Add some text first'); return; }
    setBusy(target);
    try {
      const uri = await capturePoster(exportRef, d.format);
      const r = await sendImage(uri, target, d.show.source && d.source ? d.source : undefined);
      buzz([10, 30, 16]);
      if (r === 'saved') say(`Saved to your gallery · ${f.label}`);
      if (r === 'downloaded') say('Image downloaded');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Couldn’t export — try again');
    } finally {
      setBusy(null);
    }
  };

  const actions: [Target, string, IconName][] = [
    ['whatsapp', 'WhatsApp', 'share'],
    ['instagram', 'Instagram', 'share'],
    ['sheet', 'More', 'share'],
    ['save', Platform.OS === 'web' ? 'Download' : 'Save', 'bookmark'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: ins.top + 6 }}>
        <BackBar title="Studio" right={
          <Tap onPress={() => { buzz(5); setD(designFor((id && findPost(id)) || BLANK)); say('Design reset'); }} accessibilityRole="button" hitSlop={8} style={{ marginRight: 16 }}>
            <Txt style={{ fontSize: 13.5, fontWeight: 700, color: t.acc }}>Reset</Txt>
          </Tap>
        } />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 + ins.bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* live preview */}
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <View style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px -16px rgba(0,0,0,0.55)' }} accessibilityLabel={`Preview, ${f.label}`}>
            <Poster d={d} width={previewW} />
          </View>
          <Txt style={{ fontSize: 12, color: t.t4, marginTop: 8 }}>{f.label} · {f.sub}</Txt>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
          {FORMATS.map(x => {
            const on = d.format === x.key;
            return (
              <Tap key={x.key} scale={0.95} onPress={() => { buzz(4); put({ format: x.key }); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? t.cta : t.card, boxShadow: on ? undefined : t.edge }}>
                <Txt style={{ fontSize: 13, fontWeight: 700, color: on ? t.ctaInk : t.tx }}>{x.label}</Txt>
              </Tap>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Seg labels={['Text', 'Style', 'Layout']} value={tab} onChange={setTab} height={44} size={14} />
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 6 }}>
          {tab === 0 && (
            <>
              <Label style={{ marginTop: 16 }}>LANGUAGES</Label>
              <Chips wrap labels={['العربية', 'English', 'اردو', 'Title', 'Source', 'Ibtida mark']}
                isOn={i => [d.show.ar, d.show.en, d.show.ur, d.show.title, d.show.source, d.show.brand][i]}
                onPick={i => show((['ar', 'en', 'ur', 'title', 'source', 'brand'] as const)[i])} height={38} size={13} style={{ marginTop: 10 }} />
              {d.show.title && <Field label="Title" value={d.title} onChange={v => put({ title: v.slice(0, 60) })} multiline={false} />}
              {d.show.ar && <Field label="Arabic text" value={d.ar} onChange={v => put({ ar: v })} rtl font="ScheherazadeNew_400Regular" />}
              {d.show.en && <Field label="English text" value={d.en} onChange={v => put({ en: v })} />}
              {d.show.ur && <Field label="Urdu text" value={d.ur} onChange={v => put({ ur: v })} rtl font="NotoNastaliqUrdu_400Regular" />}
              {d.show.source && <Field label="Source, e.g. Sahih al-Bukhari 6464" value={d.source} onChange={v => put({ source: v.slice(0, 80) })} multiline={false} />}
              <Txt style={{ fontSize: 12, lineHeight: 17, color: t.t4, marginTop: 10 }}>
                Edits here change only your post, never the original. Keep Quran and hadith wording exactly as published.
              </Txt>
            </>
          )}

          {tab === 1 && (
            <>
              <Label style={{ marginTop: 16 }}>BACKGROUND</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10 }}>
                {BACKGROUNDS.map(b => (
                  <Swatch key={b.key} label={b.label} on={d.bg.type === 'preset' && d.bg.key === b.key}
                    onPress={() => put({ bg: { type: 'preset', key: b.key }, dim: 0, color: b.light ? '#1F2A22' : '#FBF7EE', accent: b.light ? '#3E5A47' : '#D8B877' })}>
                    <View style={{ flex: 1, borderRadius: 18, ...bgImage(b.css) }} />
                  </Swatch>
                ))}
              </ScrollView>
              <Tap onPress={() => { buzz(5); pickPhoto().catch(() => say('Couldn’t open your photos')); }} accessibilityRole="button"
                style={{ marginTop: 12, height: 46, borderRadius: 23, backgroundColor: d.bg.type === 'photo' ? t.tAmb : t.ctl2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name="plus" size={18} color={t.tx} />
                <Txt style={{ fontSize: 14, fontWeight: 700 }}>{d.bg.type === 'photo' ? 'Change photo' : 'Use your own photo'}</Txt>
              </Tap>
              <Slider label="Darken background" value={Math.round(d.dim * 100)} min={0} max={80} step={5} onChange={v => put({ dim: v / 100 })} format={v => `${v}%`} />

              <Label style={{ marginTop: 20 }}>TEXT COLOUR</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {TEXT_COLORS.map(c => <Swatch key={c} label={`Text colour ${c}`} on={d.color === c} onPress={() => put({ color: c })}><View style={{ flex: 1, borderRadius: 18, backgroundColor: c, boxShadow: t.hair }} /></Swatch>)}
              </View>
              <Label style={{ marginTop: 18 }}>ACCENT</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {ACCENTS.map(c => <Swatch key={c} label={`Accent ${c}`} on={d.accent === c} onPress={() => put({ accent: c })}><View style={{ flex: 1, borderRadius: 18, backgroundColor: c, boxShadow: t.hair }} /></Swatch>)}
              </View>

              <Label style={{ marginTop: 18 }}>TYPEFACE</Label>
              <Chips flex labels={['Elegant serif', 'Clean sans']} isOn={i => d.latin === (i ? 'sans' : 'serif')} onPick={i => put({ latin: i ? 'sans' : 'serif' })} height={40} size={13} style={{ marginTop: 10 }} />
              <Label style={{ marginTop: 18 }}>FRAME</Label>
              <Chips flex labels={['None', 'Line', 'Arch']} isOn={i => d.frame === (['none', 'line', 'arch'] as const)[i]} onPick={i => put({ frame: (['none', 'line', 'arch'] as const)[i] })} height={40} size={13} style={{ marginTop: 10 }} />
            </>
          )}

          {tab === 2 && (
            <>
              {d.show.ar && <Slider label="Arabic size" value={d.arSize} min={SIZE_RANGE.ar[0]} max={SIZE_RANGE.ar[1]} onChange={v => put({ arSize: v })} />}
              {d.show.en && <Slider label="English size" value={d.enSize} min={SIZE_RANGE.en[0]} max={SIZE_RANGE.en[1]} onChange={v => put({ enSize: v })} />}
              {d.show.ur && <Slider label="Urdu size" value={d.urSize} min={SIZE_RANGE.ur[0]} max={SIZE_RANGE.ur[1]} onChange={v => put({ urSize: v })} />}
              <Slider label="Line spacing" value={Math.round(d.leading * 10)} min={11} max={22} onChange={v => put({ leading: clamp(v / 10, 1.1, 2.2) })} format={v => (v / 10).toFixed(1)} />
              <Slider label="Margins" value={d.margin} min={4} max={18} onChange={v => put({ margin: v })} format={v => `${v}%`} />
              <Label style={{ marginTop: 20 }}>ALIGN</Label>
              <Chips flex labels={['Centred', 'Left']} isOn={i => d.align === (i ? 'start' : 'center')} onPick={i => put({ align: i ? 'start' : 'center' })} height={40} size={13} style={{ marginTop: 10 }} />
              <Label style={{ marginTop: 18 }}>POSITION</Label>
              <Chips flex labels={['Top', 'Middle', 'Bottom']} isOn={i => d.valign === (['top', 'center', 'bottom'] as const)[i]} onPick={i => put({ valign: (['top', 'center', 'bottom'] as const)[i] })} height={40} size={13} style={{ marginTop: 10 }} />
            </>
          )}
        </View>
      </ScrollView>

      {/* the share bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingBottom: ins.bottom + 14, paddingHorizontal: 16, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.line, flexDirection: 'row', gap: 8 }}>
        {actions.map(([target, label, icon]) => {
          const primary = target === 'whatsapp' || target === 'instagram';
          return (
            <Tap key={target} scale={0.95} onPress={() => share(target)} accessibilityRole="button"
              accessibilityLabel={target === 'sheet' ? 'Share with another app' : target === 'save' ? 'Save image' : `Share to ${label}`}
              accessibilityHint={primary && !direct[target as 'whatsapp' | 'instagram'] ? 'Opens the share sheet' : undefined}
              style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: primary ? t.cta : t.ctl2, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {busy === target ? <ActivityIndicator color={primary ? t.ctaInk : t.tx} /> : <Icon name={icon} size={18} color={primary ? t.ctaInk : t.tx} />}
              <Txt style={{ fontSize: 11.5, fontWeight: 700, color: primary ? t.ctaInk : t.tx }}>{label}</Txt>
            </Tap>
          );
        })}
      </View>

      {/* full-size copy for export (drawn off-screen at the format's real pixel size) */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Poster ref={exportRef} d={d} width={exportW} />
      </View>
    </View>
  );
}
