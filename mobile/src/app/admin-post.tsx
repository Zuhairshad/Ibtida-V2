import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, TextInput, View } from 'react-native';
import { Poster } from '../components/Poster';
import { BackBar, buzz, Chips, Cta, Label, Page, say, Seg, Txt, useBack } from '../components/ui';
import { SURAHS } from '../data/surahs';
import { adminList, deletePost, KINDS, savePost, validateDraft, type Draft, type InspirationKind } from '../lib/inspiration';
import { addDays, fmtTime, timesFor } from '../lib/prayer';
import { fetchSurah, readCachedSurah } from '../lib/quran';
import { designFor } from '../lib/studio';
import { getState } from '../state/store';
import { useT } from '../theme/ThemeProvider';

/** The current time, for event handlers (not render). */
const nowMs = () => Date.now();

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Tomorrow, 20 minutes after Fajr where the admin is — a good moment for the day's first post. */
function tomorrowMorning() {
  const s = getState();
  return timesFor(s.city, addDays(new Date(), 1), s.method, s.hanafi, s.adj).Fajr.getTime() + 20 * 60_000;
}

const empty = (): Draft => ({ kind: 'reminder', title: '', ar: '', en: '', ur: '', source: '', surah: null, ayah: null, status: 'published', publishAt: Date.now() });

/** Create or edit one inspiration post. Ayahs are filled verbatim from the Quran source the reader uses. */
export default function AdminPost() {
  const t = useT();
  const back = useBack();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [d, setD] = useState<Draft | null>(id ? null : empty());
  const [when, setWhen] = useState<'keep' | 'now' | 'morning' | 'draft'>(id ? 'keep' : 'now');
  const [busy, setBusy] = useState(false);
  const [surahText, setSurahText] = useState('');
  const [ayahText, setAyahText] = useState('');
  const [loadingAyah, setLoadingAyah] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminList().then(list => {
      const p = list.find(x => x.id === id);
      if (!p) { say('That post no longer exists'); back(); return; }
      setD(p);
      if (p.surah) setSurahText(String(p.surah));
      if (p.ayah) setAyahText(String(p.ayah));
    }).catch(e => say(e instanceof Error ? e.message : 'Couldn’t load the post'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <Page><BackBar title="Edit post" /><ActivityIndicator color={t.acc} style={{ marginTop: 60 }} /></Page>;

  const put = (p: Partial<Draft>) => setD(x => (x ? { ...x, ...p } : x));
  const problems = validateDraft(d);

  const loadAyah = async () => {
    const s = Number(surahText);
    const a = Number(ayahText);
    const meta = SURAHS[s - 1];
    if (!meta) { say('Surah is a number from 1 to 114'); return; }
    if (!Number.isInteger(a) || a < 1 || a > meta.ayahs) { say(`${meta.name} has ${meta.ayahs} ayahs`); return; }
    setLoadingAyah(true);
    try {
      const surah = (await readCachedSurah(s))?.surah ?? (await fetchSurah(s));
      const ay = surah.ayahs[a - 1];
      put({ surah: s, ayah: a, ar: ay.ar, en: ay.en ?? '', ur: ay.ur ?? '', source: `${meta.name} ${s}:${a}` });
      buzz([10, 30, 16]);
      say(`${meta.name} ${s}:${a} loaded · verbatim text`);
    } catch {
      say('Couldn’t load the ayah — check your connection');
    } finally {
      setLoadingAyah(false);
    }
  };

  const save = async () => {
    setTried(true);
    if (problems.length) { say(problems[0]); buzz([40, 40]); return; }
    const publishAt = when === 'now' ? nowMs() : when === 'morning' ? tomorrowMorning() : d.publishAt;
    const status = when === 'draft' ? 'draft' : when === 'keep' ? d.status : 'published';
    setBusy(true);
    try {
      await savePost({ ...d, publishAt, status });
      buzz([10, 30, 16]);
      say(status === 'draft' ? 'Saved as draft' : publishAt > nowMs() + 60_000 ? `Scheduled for ${new Date(publishAt).getDate()} ${MON[new Date(publishAt).getMonth()]} · ${fmtTime(new Date(publishAt))}` : 'Published · it’s in everyone’s feed now');
      back();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Couldn’t save');
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    setBusy(true);
    try { await savePost({ ...d, status: 'archived' }); say('Archived · removed from the feed'); back(); } catch (e) { say(e instanceof Error ? e.message : 'Couldn’t archive'); } finally { setBusy(false); }
  };

  const remove = () => {
    if (!d.id) return;
    const go = async () => { try { await deletePost(d.id!); say('Deleted'); back(); } catch (e) { say(e instanceof Error ? e.message : 'Couldn’t delete'); } };
    if (Platform.OS === 'web') { if (window.confirm('Delete this post for everyone?')) go(); return; }
    Alert.alert('Delete this post?', 'It disappears from everyone’s feed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  const input = (bad = false, rtl = false, font?: string) => ({
    outlineWidth: 0, marginTop: 8, minHeight: 50, borderRadius: 18, backgroundColor: t.sunk, boxShadow: bad ? 'inset 0 0 0 1.5px rgba(240,138,122,0.6)' : t.edge,
    paddingHorizontal: 14, paddingVertical: 12, color: t.txw, fontSize: rtl ? 19 : 15, fontFamily: font ?? 'PlusJakartaSans_500Medium',
    textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr', textAlignVertical: 'top',
  } as const);
  const kindIdx = KINDS.findIndex(k => k.key === d.kind);

  return (
    <Page bottom={24}>
      <BackBar title={d.id ? 'Edit post' : 'New post'} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Label style={{ marginTop: 6, marginBottom: 10 }}>TYPE</Label>
        <Seg labels={KINDS.map(k => k.label.replace('Quranic ', ''))} value={Math.max(0, kindIdx)} onChange={i => put({ kind: KINDS[i].key as InspirationKind })} height={42} size={12.5} />

        {d.kind === 'ayah' && (
          <>
            <Label style={{ marginTop: 18 }}>SURAH AND AYAH</Label>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput value={surahText} onChangeText={v => setSurahText(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="Surah (1–114)" placeholderTextColor={t.t4} accessibilityLabel="Surah number" style={[input(), { flex: 1 }]} />
              <TextInput value={ayahText} onChangeText={v => setAyahText(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="Ayah" placeholderTextColor={t.t4} accessibilityLabel="Ayah number" style={[input(), { flex: 1 }]} />
            </View>
            {!!SURAHS[Number(surahText) - 1] && <Txt style={{ fontSize: 12.5, color: t.t2, marginTop: 6 }}>{SURAHS[Number(surahText) - 1].name} · {SURAHS[Number(surahText) - 1].ayahs} ayahs</Txt>}
            <Cta label={loadingAyah ? 'Loading…' : 'Load verified text'} kind="secondary" height={46} size={14} style={{ marginTop: 10 }} disabled={loadingAyah} onPress={loadAyah} />
            <Txt style={{ fontSize: 12, lineHeight: 17, color: t.t4, marginTop: 6 }}>Arabic (Tanzil Uthmani), English (Saheeh International) and Urdu (Jalandhry), exactly as in the Quran reader.</Txt>
          </>
        )}

        <Label style={{ marginTop: 18 }}>TITLE · OPTIONAL</Label>
        <TextInput value={d.title ?? ''} onChangeText={v => put({ title: v.slice(0, 80) })} placeholder="e.g. Morning reminder" placeholderTextColor={t.t4} accessibilityLabel="Title" style={input()} />
        <Label style={{ marginTop: 18 }}>ARABIC</Label>
        <TextInput value={d.ar ?? ''} onChangeText={v => put({ ar: v })} multiline placeholder="النص العربي" placeholderTextColor={t.t4} accessibilityLabel="Arabic text" style={input(false, true, 'ScheherazadeNew_400Regular')} />
        <Label style={{ marginTop: 18 }}>ENGLISH</Label>
        <TextInput value={d.en ?? ''} onChangeText={v => put({ en: v })} multiline placeholder="English text" placeholderTextColor={t.t4} accessibilityLabel="English text" style={input()} />
        <Label style={{ marginTop: 18 }}>URDU</Label>
        <TextInput value={d.ur ?? ''} onChangeText={v => put({ ur: v })} multiline placeholder="اردو متن" placeholderTextColor={t.t4} accessibilityLabel="Urdu text" style={input(false, true, 'NotoNastaliqUrdu_400Regular')} />
        <Label style={{ marginTop: 18 }}>SOURCE{d.kind === 'ayah' || d.kind === 'hadith' ? '' : ' · OPTIONAL'}</Label>
        <TextInput value={d.source ?? ''} onChangeText={v => put({ source: v.slice(0, 120) })} placeholder={d.kind === 'hadith' ? 'e.g. Sahih al-Bukhari 6464' : 'e.g. Imam al-Ghazali'} placeholderTextColor={t.t4} accessibilityLabel="Source"
          style={input(tried && (d.kind === 'ayah' || d.kind === 'hadith') && !d.source?.trim())} />

        <Label style={{ marginTop: 18, marginBottom: 10 }}>PUBLISH</Label>
        <Chips wrap labels={[...(d.id ? ['Keep as is'] : []), 'Now', 'Tomorrow after Fajr', 'Draft']}
          isOn={i => (d.id ? ['keep', 'now', 'morning', 'draft'] : ['now', 'morning', 'draft'])[i] === when}
          onPick={i => setWhen((d.id ? ['keep', 'now', 'morning', 'draft'] : ['now', 'morning', 'draft'])[i] as typeof when)} height={40} size={13} />
        <Txt style={{ fontSize: 12, lineHeight: 17, color: t.t4, marginTop: 8 }}>Up to 3 posts a day. Published posts reach every open app straight away.</Txt>

        {tried && problems.length > 0 && <Txt style={{ fontSize: 13, color: t.rose, marginTop: 12 }}>{problems.join(' · ')}</Txt>}

        <Label style={{ marginTop: 20, marginBottom: 10 }}>HOW IT LOOKS</Label>
        <View style={{ alignItems: 'center' }}>
          <View style={{ borderRadius: 14, overflow: 'hidden' }}>
            <Poster d={{ ...designFor({ kind: d.kind, title: d.title, ar: d.ar, en: d.en, ur: d.ur, source: d.source }), format: 'portrait' }} width={220} />
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, gap: 10 }}>
        <Cta label={busy ? 'Saving…' : when === 'draft' ? 'Save draft' : d.id ? 'Save' : 'Publish'} disabled={busy} onPress={save} />
        {d.id && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {d.status !== 'archived' && <Cta label="Archive" kind="secondary" height={48} size={14} style={{ flex: 1 }} disabled={busy} onPress={archive} />}
            <Cta label="Delete" kind="danger" height={48} size={14} style={{ flex: 1 }} disabled={busy} onPress={remove} />
          </View>
        )}
      </View>
    </Page>
  );
}
