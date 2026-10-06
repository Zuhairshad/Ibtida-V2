import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '../components/Icon';
import { Breathe } from '../components/motion';
import { BackBar, Cta, Label, Page, say, Txt } from '../components/ui';
import { currentUserId } from '../lib/supabase';
import { syncNow } from '../lib/sync';
import { useT } from '../theme/ThemeProvider';
import { G } from '../theme/tokens';

/** Shared offline / sync state. All worship data lives on-device first, so nothing is lost. */
export default function Offline() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Page>
      <BackBar />
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 }}>
        <View style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }}>
          <Breathe bg={G.glowPeri} style={{ left: 0, top: 0, right: 0, bottom: 0 }} dur={6000} />
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: t.card, boxShadow: t.edge, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="wifiOff" size={40} color={t.peri} />
          </View>
        </View>
        <Txt style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.56, marginTop: 26 }}>Your progress is local</Txt>
        <Txt style={{ fontSize: 15.5, lineHeight: 24, color: t.t3, marginTop: 10, maxWidth: 290, textAlign: 'center' }}>Everything is saved safely on this device. We’ll sync when your account is connected.</Txt>
        <View style={{ width: '100%', marginTop: 26, borderRadius: 24, backgroundColor: t.card, boxShadow: t.edge, padding: 16 }}>
          <Label>STILL AVAILABLE OFFLINE</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {['Tasbeeh', 'Goals', 'Prayer logs', 'Prayer times', 'Adhkar', 'Bookmarks'].map(l => (
              <View key={l} style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12, backgroundColor: t.ctl }}>
                <Txt style={{ fontSize: 13, fontWeight: 600, color: t.t5 }}>{l}</Txt>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <Cta label={busy ? 'Trying…' : 'Retry connection'} style={{ width: '100%' }} onPress={() => {
          setBusy(true);
          if (!currentUserId()) { setTimeout(() => { setBusy(false); say('Still offline — nothing is lost'); }, 1100); return; }
          syncNow().then(ok => say(ok ? 'All synced' : 'Still offline — nothing is lost')).catch(() => say('Still offline — nothing is lost')).finally(() => setBusy(false));
        }} />
      </View>
    </Page>
  );
}
