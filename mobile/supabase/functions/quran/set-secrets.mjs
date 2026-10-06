#!/usr/bin/env node
// Copies the Quran Foundation keys from the repo-root .env.local into the Supabase project's
// function secrets, without printing them. Usage (after `npx supabase login` and `link`):
//   node supabase/functions/quran/set-secrets.mjs [prelive|production]
// Accepts CLIENT_ID / QF_CLIENT_ID / "client id" style names.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../../../../.env.local');
const env = {};
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i < 0 || line.trim().startsWith('#')) continue;
  env[line.slice(0, i).replace(/[\s_]+/g, '').toLowerCase().replace(/^qf/, '')] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const id = env.clientid;
const secret = env.clientsecret;
if (!id || !secret) { console.error(`No client id / secret found in ${file}`); process.exit(1); }
const mode = process.argv[2] === 'production' ? 'production' : 'prelive';
const tmp = path.join(here, '.secrets.tmp.env');
fs.writeFileSync(tmp, `QF_CLIENT_ID=${id}\nQF_CLIENT_SECRET=${secret}\nQF_ENV=${mode}\n`, { mode: 0o600 });
try {
  const r = spawnSync('npx', ['supabase', 'secrets', 'set', '--env-file', tmp], { stdio: 'inherit', cwd: path.resolve(here, '../../..') });
  if (r.status === 0) console.log(`Set QF_CLIENT_ID, QF_CLIENT_SECRET and QF_ENV=${mode}.`);
  process.exit(r.status ?? 1);
} finally {
  fs.rmSync(tmp, { force: true });
}
