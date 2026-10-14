#!/usr/bin/env node
/**
 * Online audit of every ayah and Quran reference in the app, against two independent sources:
 * AlQuran Cloud (Tanzil text and metadata) and Quran.com (chapter metadata).
 *
 *   node scripts/verify-quran.mjs
 *
 * Checks: surah names (Arabic), ayah counts, Makki/Madani and juz starts; every bundled ayah in
 * src/data/ayat.ts character for character (Arabic, Saheeh International, Jalandhry); every
 * Quranic adhkar reference; and every Arabic string in src/, swept against the whole Quran so
 * hand-typed Quran inside a dua is found and shown word for word. Exits 1 on any mismatch.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

// The app's own data modules, transpiled as they are (types only are stripped).
const BUILD = join(tmpdir(), `ibtida-verify-${process.pid}`);
mkdirSync(BUILD, { recursive: true });
for (const f of readdirSync(join(APP, 'src/data')).filter(f => f.endsWith('.ts'))) {
  const out = ts.transpileModule(readFileSync(join(APP, 'src/data', f), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  writeFileSync(join(BUILD, f.replace(/\.ts$/, '.cjs')), out.replace(/require\("\.\/(\w+)"\)/g, 'require("./$1.cjs")'));
}
const load = n => require(join(BUILD, `${n}.cjs`));

async function json(url) {
  for (let i = 0; ; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (i === 3) throw new Error(`${url}: HTTP ${r.status}`);
    await new Promise(ok => setTimeout(ok, 2000 * 2 ** i));
  }
}
const edition = async e => (await json(`https://api.alquran.cloud/v1/quran/${e}`)).data.surahs;
const [AR, EN, UR, SC, META, QCOM] = await Promise.all([
  edition('quran-uthmani'), edition('en.sahih'), edition('ur.jalandhry'), edition('quran-simple-clean'),
  json('https://api.alquran.cloud/v1/meta').then(d => d.data), json('https://api.quran.com/api/v4/chapters').then(d => d.chapters),
]);

const issues = [];
const notes = [];
const bad = (area, msg) => issues.push(`[${area}] ${msg}`);

/* Surah metadata */
const { SURAHS, JUZ_STARTS } = load('surahs');
const arName = s => s.normalize('NFKD').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/^سورة\s+/, '').trim();
const latin = s => s.normalize('NFKD').replace(/[^a-zA-Z]/g, '').toLowerCase();
if (SURAHS.length !== 114) bad('surahs', `${SURAHS.length} surahs`);
SURAHS.forEach((m, i) => {
  const t = META.surahs.references[i], q = QCOM[i];
  if (m.n !== i + 1) bad('surahs', `#${i + 1} has n=${m.n}`);
  if (m.ayahs !== t.numberOfAyahs || m.ayahs !== q.verses_count) bad('surahs', `${m.n} ${m.name}: ${m.ayahs} ayat; Tanzil ${t.numberOfAyahs}, Quran.com ${q.verses_count}`);
  if (m.place !== (t.revelationType === 'Medinan' ? 'Madinah' : 'Makkah')) bad('surahs', `${m.n} ${m.name}: ${m.place}; Tanzil ${t.revelationType}`);
  if (arName(m.ar) !== arName(q.name_arabic) && arName(m.ar) !== arName(t.name)) bad('surahs', `${m.n}: Arabic name ${m.ar}; Quran.com ${q.name_arabic}`);
  // Transliterations differ between sources (Al-Anbiya / Al-Anbya); only report, never fail.
  if (![latin(q.name_simple), latin(t.englishName)].includes(latin(m.name))) notes.push(`${m.n}: "${m.name}" (Quran.com "${q.name_simple}", Tanzil "${t.englishName}")`);
});
if (SURAHS.reduce((a, m) => a + m.ayahs, 0) !== 6236) bad('surahs', 'ayah counts do not total 6236');
META.juzs.references.forEach((r, i) => { const [s, a] = JUZ_STARTS[i] ?? []; if (s !== r.surah || a !== r.ayah) bad('juz', `juz ${i + 1}: ${s}:${a}; Tanzil ${r.surah}:${r.ayah}`); });

/* Bundled ayat: exact text (English with the documented quote rule from fetch-ayat.mjs) */
const { PRAYER_AYAT, LAUNCH_AYAT } = load('ayat');
const display = en => en.replace(/"/g, '').replace(/\s{2,}/g, ' ').trim();
for (const x of [...PRAYER_AYAT, ...LAUNCH_AYAT]) {
  const at = (ed) => ed[x.s - 1]?.ayahs[x.a - 1]?.text;
  if (!at(AR)) { bad('ayat', `${x.s}:${x.a} does not exist`); continue; }
  if (x.ar !== at(AR)) bad('ayat', `${x.s}:${x.a} Arabic differs from Tanzil Uthmani`);
  if (x.en !== display(at(EN))) bad('ayat', `${x.s}:${x.a} English differs from Saheeh International`);
  if (x.ur !== at(UR)) bad('ayat', `${x.s}:${x.a} Urdu differs from Jalandhry`);
}

/* Quranic adhkar */
const items = load('adhkar').ADHKAR.flatMap(c => c.items);
const qItems = items.filter(d => d.q);
for (const d of qItems) {
  const { s, a } = d.q, b = d.q.b ?? a, n = SURAHS[s - 1]?.ayahs;
  if (!n || a < 1 || b < a || b > n) bad('adhkar', `${d.id}: ${s}:${a}-${b} (surah has ${n})`);
  const m = /^Surah (.+)$/.exec(d.title ?? '');
  if (m && (latin(m[1]) !== latin(SURAHS[s - 1].name) || a !== 1 || b !== n)) bad('adhkar', `${d.id}: "${d.title}" vs ${s}:${a}-${b}`);
}

/* Every Arabic string in src/ against the whole Quran (simple-clean spelling, no diacritics) */
const norm = s => s.normalize('NFKD').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ‌-‏⁦-⁩]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '')
  .replace(/[^ء-ي\s]/g, ' ').replace(/\s+/g, ' ').trim();
const verses = [];
SC.forEach((su, i) => su.ayahs.forEach((ay, j) => verses.push({ s: i + 1, a: j + 1, w: norm(j === 0 && i !== 0 && i !== 8 ? ay.text.replace(/^بسم الله الرحمن الرحيم\s*/, '') : ay.text).split(' ') })));
const K = 4;
const index = new Map();
verses.forEach((v, vi) => { for (let i = 0; i + K <= v.w.length; i++) { const g = v.w.slice(i, i + K).join(' '); if (!index.has(g)) index.set(g, new Set()); index.get(g).add(vi); } });
const literals = [];
const scan = dir => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== '__tests__') scan(p); continue; }
    if (!/\.tsx?$/.test(f) || f === 'ayat.ts') continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1).)*?[؀-ۿ](?:\\.|(?!\1).)*?)\1/g)) literals.push({ at: `${relative(APP, p)}:${src.slice(0, m.index).split('\n').length}`, text: m[2] });
  }
};
scan(join(APP, 'src'));
const run = (x, y) => { let best = 0, at = 0; for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) { let k = 0; while (x[i + k] !== undefined && x[i + k] === y[j + k]) k++; if (k > best) { best = k; at = j; } } return { best, at }; };
const quotes = [];
for (const L of literals) {
  const w = norm(L.text).split(' ').filter(Boolean);
  const cand = new Set();
  for (let i = 0; i + K <= w.length; i++) for (const vi of index.get(w.slice(i, i + K).join(' ')) ?? []) cand.add(vi);
  for (const vi of cand) {
    const v = verses[vi], r = run(w, v.w);
    // A long verbatim run (or a whole short ayah) is Quran text typed by hand: show it for review.
    if (r.best >= 7 || (r.best >= 4 && r.best === v.w.length)) quotes.push(`${L.at}  ${v.s}:${v.a}  ${r.best}/${v.w.length} words verbatim  «${v.w.slice(r.at, r.at + r.best).join(' ')}»`);
  }
}

console.log(`Surahs: 114 checked against Tanzil and Quran.com (Arabic names, ayah counts, Makki/Madani, 30 juz starts).`);
console.log(`Bundled ayat: ${PRAYER_AYAT.length + LAUNCH_AYAT.length} compared character for character in Arabic, English and Urdu.`);
console.log(`Quranic adhkar: ${qItems.length} references checked.`);
console.log(`Arabic strings swept against all 6,236 ayat: ${literals.length}. Quran text typed inside them (verbatim runs):`);
for (const q of [...new Set(quotes)]) console.log(`  ${q}`);
if (notes.length) console.log(`\nTransliteration differs from both sources (spelling only, not an error):\n  ${notes.join('\n  ')}`);
console.log(issues.length ? `\n✗ ${issues.length} problem(s):\n${issues.join('\n')}` : '\n✓ No problems found.');
process.exit(issues.length ? 1 : 0);
