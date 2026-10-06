// Supabase Edge Function `quran`: Quran Foundation content proxy. Secrets:
//   QF_CLIENT_ID, QF_CLIENT_SECRET, QF_ENV (production | prelive)
// Logic lives in ./core.ts (shared with the Node tests). Deployed with verify_jwt off because the
// app's publishable key is not a JWT; projectKeyOk() checks the key against this project instead.
import { configFrom, handle, projectKeyOk, unauthorized } from './core.ts';

const cfg = configFrom(k => Deno.env.get(k));
const projectUrl = Deno.env.get('SUPABASE_URL');

Deno.serve(async req => ((await projectKeyOk(req, projectUrl)) ? handle(req, cfg) : unauthorized()));
