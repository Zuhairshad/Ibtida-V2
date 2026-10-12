import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useT } from '../theme/ThemeProvider';
import { Label, Txt } from './ui';

/** `Label` for English; in Urdu the same small heading without letter-spacing, which would break the joined script. */
export function Cap({ ur, children, color, style }: { ur: boolean; children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useT();
  if (!ur) return <Label color={color} style={style}>{children}</Label>;
  return <Txt ur style={[{ fontSize: 13, color: color ?? t.t2 }, style]}>{children}</Txt>;
}
