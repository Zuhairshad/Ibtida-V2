import { set, useApp } from '../state/store';
import { Seg } from './ui';

/** English / اردو switch for the app language. Only the language changes; the saved name stays as typed. */
export function LangSeg({ height = 44, bg, size = 14 }: { height?: number; bg?: string; size?: number }) {
  const lang = useApp(s => s.lang);
  return <Seg labels={['English', 'اردو']} value={lang === 'ur' ? 1 : 0} onChange={i => set({ lang: i === 1 ? 'ur' : 'en' })} height={height} radius={height / 2} inner={height / 2 - 4} bg={bg} size={size} />;
}
