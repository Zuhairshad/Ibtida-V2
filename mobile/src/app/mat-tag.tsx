import { Share, View } from 'react-native';
import { useState } from 'react';
import { FadeIn } from '../components/motion';
import { QR } from '../components/QR';
import { BackBar, Cta, Page, Seg, say, Txt } from '../components/ui';
import { code8 } from '../data/content';
import { set, useApp } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function MatTag() {
  const t = useT();
  const token = useApp(s => s.token);
  const [tab, setTab] = useState(0);
  const tag = token + (tab ? '-M' : '-W');
  return (
    <Page>
      <BackBar title="Prayer mat tag" />
      <View style={{ paddingTop: 10, paddingHorizontal: 22 }}>
        <Seg labels={['Wudu station', 'Prayer mat']} value={tab} onChange={setTab} height={44} size={14} />
      </View>
      <View style={{ paddingTop: 22, alignItems: 'center' }}>
        <FadeIn key={tag} dur={450} style={{ width: 250, height: 250, borderRadius: 32, backgroundColor: '#FFFFFF', padding: 20, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)' }}>
          <QR value={`ibtida://wake/${tag}`} size={210} fg="#111217" bg="#FFFFFF" />
        </FadeIn>
      </View>
      <Txt mono style={{ textAlign: 'center', fontSize: 13, color: t.t2, marginTop: 16, letterSpacing: 1.8 }}>TOKEN {tag}</Txt>
      <View style={{ marginTop: 18, marginHorizontal: 22, borderRadius: 24, backgroundColor: t.card, paddingVertical: 16, paddingHorizontal: 18 }}>
        <Txt style={{ fontSize: 14, lineHeight: 22, color: t.t5 }}>
          {tab === 0
            ? 'Print this and stick it near your sink or wudu area. Stage 1 of the Fajr alarm asks you to scan it.'
            : 'Stick this under the corner of your prayer mat. Scan it within 10 minutes of the wudu scan to stop the alarm.'}
        </Txt>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 22, flexDirection: 'row', gap: 10 }}>
        <Cta label="Regenerate" kind="secondary" size={16} style={{ flex: 1 }}
          onPress={() => { set({ token: `${code8().slice(0, 4)}-${code8().slice(0, 4)}-${code8().slice(0, 4)}` }); say('New tag generated · reprint to use'); }} />
        <Cta label="Print tag" size={16} style={{ flex: 1 }}
          onPress={() => { Share.share({ message: `Ibtida wake tag ${tag} — ibtida://wake/${tag}` }).catch(() => {}); }} />
      </View>
    </Page>
  );
}
