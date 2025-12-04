import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env variables for create-session API');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });

    const { data: tkn, error: tkErr } = await supabaseAdmin
      .from('tokens')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (tkErr || !tkn) {
      return res.status(401).json({ error: 'invalid or inactive token' });
    }

    const { data: session, error: sessErr } = await supabaseAdmin
      .from('sessions')
      .insert([{ token_id: tkn.id }])
      .select('*')
      .single();

    if (sessErr || !session) {
      return res.status(500).json({ error: 'failed to create session' });
    }

    return res.status(200).json({ session });
  } catch (e) {
    console.error('create-session error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
