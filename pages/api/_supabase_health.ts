// pages/api/_supabase_health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('_supabase_health: missing SUPABASE env vars');
    return res.status(500).json({ ok: false, error: 'missing SUPABASE env vars' });
  }
  if (!supabaseAdmin) {
    console.error('_supabase_health: supabase client unavailable');
    return res.status(500).json({ ok: false, error: 'supabase client not initialized' });
  }
  try {
    const { data, error } = await supabaseAdmin.from('tokens').select('id').limit(1);
    if (error) {
      console.error('_supabase_health: supabase query error', error);
      return res.status(502).json({ ok: false, error: 'supabase query error', details: error.message || error });
    }
    return res.status(200).json({ ok: true, tokens_sample_count: Array.isArray(data) ? data.length : 0 });
  } catch (e) {
    console.error('_supabase_health: unexpected error', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
