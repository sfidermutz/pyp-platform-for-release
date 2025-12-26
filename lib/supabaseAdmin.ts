// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Warning is intentional for Vercel logs when envs missing.
  // Do not log the secret itself.
  // eslint-disable-next-line no-console
  console.warn('lib/supabaseAdmin: missing SUPABASE env vars; server functions will not be able to query Supabase.');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default supabaseAdmin;
