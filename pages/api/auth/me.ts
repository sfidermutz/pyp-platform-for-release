// pages/api/auth/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sessionId = req.cookies?.['pyp_session'];
    if (!sessionId) return res.status(200).json({ authenticated: false });
    const { data, error } = await supabaseAdmin.from('sessions').select('id, token_id, created_at').eq('id', sessionId).maybeSingle();
    if (error || !data) return res.status(200).json({ authenticated: false });
    return res.status(200).json({ authenticated: true, session_id: data.id, token_id: data.token_id });
  } catch (e) {
    console.error('/api/auth/me error', e);
    return res.status(500).json({ authenticated: false });
  }
}
