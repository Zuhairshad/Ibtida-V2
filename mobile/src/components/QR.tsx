import QRCode from 'qrcode';
import { memo, useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Real, scannable QR code rendered as a single SVG path. */
export const QR = memo(function QR({ value, size, fg, bg }: { value: string; size: number; fg: string; bg: string }) {
  const { d, n } = useMemo(() => {
    const q = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = q.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    return { d, n };
  }, [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
      <Rect width={n} height={n} fill={bg} />
      <Path d={d} fill={fg} />
    </Svg>
  );
});
