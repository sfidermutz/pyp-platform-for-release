// pages/api/create-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { serialize } from 'cookie';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function setSessionCookie(res: NextApiResponse, sessionId: string) {
  const cookie = serialize('pyp_session', sessionId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  });
  res.setHeader('Set-Cookie', cookie);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('create-session: missing SUPABASE env vars');
    return res.status(500).json({ error: 'Server misconfiguration: missing SUPABASE env vars' });
  }
  if (!supabaseAdmin) {
    console.error('create-session: supabase client not initialized');
    return res.status(500).json({ error: 'Server misconfiguration: supabase client unavailable' });
  }

  try {
    const { token } = req.body ?? {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token required' });
    }

    const { data: tkn, error: tkErr } = await supabaseAdmin
      .from('tokens')
      .select('id, is_active, label')
      .eq('token', token)
      .maybeSingle();

    if (tkErr) {
      console.error('create-session: tokens query error', tkErr);
      return res.status(502).json({ error: 'supabase query error', details: tkErr.message || tkErr });
    }

    if (!tkn || tkn.is_active === false) {
      return res.status(401).json({ error: 'Invalid or inactive token' });
    }

    const { data: sessionData, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .insert({ token_id: tkn.id })
      .select('id')
      .single();

    if (sessionErr) {
      console.error('create-session: session insert error', sessionErr);
      return res.status(502).json({ error: 'supabase session creation error', details: sessionErr.message || sessionErr });
    }

    if (!sessionData?.id) {
      console.error('create-session: missing session id', sessionData);
      return res.status(500).json({ error: 'failed to create session' });
    }

    setSessionCookie(res, sessionData.id);

    return res.status(200).json({ ok: true, session: sessionData, token: { id: tkn.id, label: tkn.label ?? null } });
  } catch (e) {
    console.error('create-session: unexpected error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
