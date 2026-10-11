import { useEffect, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { useT } from '../theme/ThemeProvider';
import { Txt } from './ui';

/**
 * A labelled slider. Drag or tap the track; screen readers adjust it with increment/decrement.
 * `format` turns the value into what is read out and shown on the right.
 */
export function Slider({ label, value, min, max, step = 1, onChange, format = v => String(v) }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const t = useT();
  const [w, setW] = useState(0);
  const width = useRef(0);
  const latest = useRef({ min, max, step, onChange });
  useEffect(() => { latest.current = { min, max, step, onChange }; });
  const snap = (v: number) => {
    const { min: lo, max: hi, step: st } = latest.current;
    return Math.max(lo, Math.min(hi, Math.round((v - lo) / st) * st + lo));
  };
  const fromX = (x: number) => {
    const { min: lo, max: hi } = latest.current;
    return snap(lo + (Math.max(0, Math.min(width.current, x)) / Math.max(1, width.current)) * (hi - lo));
  };
  // Refs are read inside the touch handlers only, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => latest.current.onChange(fromX(e.nativeEvent.locationX)),
    onPanResponderMove: e => latest.current.onChange(fromX(e.nativeEvent.locationX)),
  }));
  const pct = (value - min) / Math.max(1e-9, max - min);
  const onLayout = (e: LayoutChangeEvent) => { width.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); };
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Txt style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</Txt>
        <Txt style={{ fontSize: 13, fontWeight: 700, color: t.acc }}>{format(value)}</Txt>
      </View>
      <View onLayout={onLayout} {...pan.panHandlers}
        accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: format(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={e => onChange(snap(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
        style={{ height: 32, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: t.ctl3 }}>
          <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.acc }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, pct * w - 12), width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
      </View>
    </View>
  );
}
