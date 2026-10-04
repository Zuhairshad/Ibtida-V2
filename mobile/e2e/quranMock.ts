import type { Page, Route } from '@playwright/test';
import { globalIndex, juzOf, SURAHS } from '../src/data/surahs';

/**
 * Offline stand-in for api.alquran.cloud with the documented response shapes. Text is placeholder
 * ("AR_TEXT_2_183") — scripture is never written into tests.
 */
const EDITIONS = ['quran-uthmani', 'en.sahih', 'ur.jalandhry'];

function surahEdition(n: number, ed: string) {
  const m = SURAHS[n - 1];
  const tag = ed === 'quran-uthmani' ? 'AR' : ed === 'en.sahih' ? 'EN' : 'UR';
  return {
    number: n, name: `AR_NAME_${n}`, englishName: m.name, englishNameTranslation: `MEANING_${n}`,
    revelationType: m.place === 'Madinah' ? 'Medinan' : 'Meccan', numberOfAyahs: m.ayahs,
    edition: { identifier: ed },
    ayahs: Array.from({ length: m.ayahs }, (_, i) => ({
      number: globalIndex(n, i + 1), text: `${tag}_TEXT_${n}_${i + 1}`, numberInSurah: i + 1,
      juz: juzOf(n, i + 1), manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false,
    })),
  };
}

const ok = (route: Route, data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, status: 'OK', data }) });

export async function mockQuranApi(page: Page) {
  await page.route('**://api.alquran.cloud/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/v1/, '');
    let m = /^\/surah\/(\d+)\/editions\/([^/]+)$/.exec(path);
    if (m) return ok(route, m[2].split(',').filter(e => EDITIONS.includes(e)).map(e => surahEdition(Number(m![1]), e)));
    if (path === '/meta') {
      return ok(route, { surahs: { count: 114, references: SURAHS.map(s => ({ number: s.n, englishName: s.name, numberOfAyahs: s.ayahs, revelationType: s.place === 'Madinah' ? 'Medinan' : 'Meccan' })) } });
    }
    m = /^\/juz\/(\d+)\//.exec(path);
    if (m) {
      const j = Number(m[1]);
      const ayahs = SURAHS.flatMap(s => Array.from({ length: s.ayahs }, (_, i) => ({ s: s.n, a: i + 1 })))
        .filter(x => juzOf(x.s, x.a) === j)
        .map(x => ({ number: globalIndex(x.s, x.a), text: `AR_TEXT_${x.s}_${x.a}`, numberInSurah: x.a, juz: j, surah: { number: x.s } }));
      return ok(route, { number: j, ayahs });
    }
    return route.fulfill({ status: 404, body: '{"code":404}' });
  });
}
