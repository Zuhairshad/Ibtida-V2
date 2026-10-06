import { ScrollView, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FadeIn } from '../components/motion';
import { QR } from '../components/QR';
import { BackBar, buzz, Cta, Label, Option, Page, Seg, say, Txt } from '../components/ui';
import { wakeTagUrl } from '../lib/wakeTag';
import { newToken, set, useApp, type WakeMode } from '../state/store';
import { useT } from '../theme/ThemeProvider';

export default function MatTag() {
  const t = useT();
  const router = useRouter();
  const token = useApp(s => s.token);
  const modes = useApp(s => s.wakeMode);
  const [tab, setTab] = useState(0);
  const kind = tab ? 'M' : 'W';
  const mode = modes[kind];
  const tag = token + (tab ? '-M' : '-W');
  const url = wakeTagUrl(token, kind);
  const setMode = (m: WakeMode) => { buzz(6); set(s => ({ wakeMode: { ...s.wakeMode, [kind]: m } })); };
  return (
    <Page>
      <BackBar title="Prayer mat tag" />
      <View style={{ paddingTop: 10, paddingHorizontal: 22 }}>
        <Seg labels={['Wudu station', 'Prayer mat']} value={tab} onChange={setTab} height={44} size={14} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Label style={{ marginTop: 18, marginBottom: 10, marginHorizontal: 26 }}>SCAN WITH</Label>
        <View style={{ paddingHorizontal: 22, gap: 10 }}>
          <Option title="Printed QR tag" sub={tab === 0 ? 'Stick the tag by your sink' : 'Stick the tag under your prayer mat'} on={mode === 'tag'} onPress={() => setMode('tag')} />
          <Option title={tab === 0 ? 'The sink itself' : 'The prayer mat itself'}
            sub={tab === 0 ? 'The camera recognises a sink or basin on your device — no printing' : 'The camera recognises a prayer mat on your device — no printing'}
            on={mode === 'item'} onPress={() => setMode('item')} />
        </View>
        {mode === 'tag' ? (
          <>
            <View style={{ paddingTop: 22, alignItems: 'center' }}>
              <FadeIn key={tag} dur={450} style={{ width: 250, height: 250, borderRadius: 32, backgroundColor: '#FFFFFF', padding: 20, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)' }}>
                <QR value={url} size={210} fg="#111217" bg="#FFFFFF" />
              </FadeIn>
            </View>
            <Txt mono style={{ textAlign: 'center', fontSize: 13, color: t.t2, marginTop: 16, letterSpacing: 1.8 }}>TOKEN {tag}</Txt>
          </>
        ) : null}
        <View style={{ marginTop: 18, marginHorizontal: 22, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, paddingVertical: 16, paddingHorizontal: 18 }}>
          <Txt style={{ fontSize: 14, lineHeight: 22, color: t.t5 }}>
            {mode === 'item'
              ? (tab === 0
                ? 'Stage 1 of the Fajr alarm opens the camera — point it at your sink until it’s recognised. Recognition runs on your phone; nothing is uploaded. It needs internet once to download. A printed tag still works as a backup.'
                : 'Within 10 minutes of the wudu step, point the camera down at your prayer mat until it’s recognised. Patterned mats are recognised best. A printed tag still works as a backup.')
              : (tab === 0
                ? 'Print this and stick it near your sink or wudu area. Stage 1 of the Fajr alarm asks you to scan it.'
                : 'Stick this under the corner of your prayer mat. Scan it within 10 minutes of the wudu scan to stop the alarm.')}
          </Txt>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, flexDirection: 'row', gap: 10, paddingTop: 10 }}>
        {mode === 'tag' ? (
          <>
            <Cta label="Regenerate" kind="secondary" size={16} style={{ flex: 1 }}
              onPress={() => { set({ token: newToken() }); say('New tag generated · reprint to use'); }} />
            <Cta label="Print tag" size={16} style={{ flex: 1 }}
              onPress={() => { Share.share({ message: `Ibtida wake tag ${tag} — ${url}` }).catch(() => {}); }} />
          </>
        ) : null}
        <Cta label={mode === 'item' ? `Test with my ${tab === 0 ? 'sink' : 'prayer mat'}` : 'Test'} kind={mode === 'item' ? 'primary' : 'secondary'} size={16}
          style={{ flex: mode === 'item' ? 1 : 0.8 }} onPress={() => router.push({ pathname: '/wake-scan', params: { test: kind } })} />
      </View>
    </Page>
  );
}
