// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sessionId = req.cookies?.['pyp_session'];
    if (sessionId) {
      try {
        await supabaseAdmin.from('sessions').delete().eq('id', sessionId);
      } catch (e) {
        console.warn('logout: could not delete session', e);
      }
    }
    res.setHeader('Set-Cookie', serialize('pyp_session', '', { httpOnly: true, path: '/', maxAge: 0 }));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('logout error', e);
    return res.status(500).json({ error: 'server error' });
  }
}
