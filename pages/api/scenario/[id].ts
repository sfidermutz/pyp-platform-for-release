// pages/api/scenario/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOW_PUBLIC = String(process.env.ALLOW_PUBLIC_SCENARIOS || '').toLowerCase() === 'true';

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function validateToken(token: string | null) {
  if (!supabaseAdmin || !token) return false;
  const { data, error } = await supabaseAdmin
    .from('tokens')
    .select('id, is_active')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

async function validateSession(sessionId: string | null) {
  if (!supabaseAdmin || !sessionId) return false;
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('id, token_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error || !data) return false;
  if (!data.token_id) return true;
  const { data: tkn, error: tErr } = await supabaseAdmin
    .from('tokens')
    .select('id, is_active')
    .eq('id', data.token_id)
    .maybeSingle();
  if (tErr || !tkn) return false;
  return Boolean(tkn.is_active);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'method not allowed' });
    }

    const { id } = req.query;
    const scenarioId = Array.isArray(id) ? id[0] : id;
    if (!scenarioId) return res.status(400).json({ error: 'scenario id required' });

    const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
    const publicAllowed = ALLOW_PUBLIC || !supabaseConfigured;

    if (!publicAllowed) {
      const tokenHeader = (req.headers['x-pyp-token'] as string)
        ?? (req.headers['x-demo-token'] as string)
        ?? req.headers.authorization?.replace(/Bearer\s+/i, '')
        ?? null;
      const sessionHeader = (req.headers['x-session-id'] as string) ?? (req.headers['x-pyp-session'] as string) ?? null;

      let authorized = false;
      if (tokenHeader) {
        try { authorized = await validateToken(tokenHeader); } catch (e) { authorized = false; }
      }
      if (!authorized && sessionHeader) {
        try { authorized = await validateSession(sessionHeader); } catch (e) { authorized = false; }
      }
      if (!authorized) return res.status(403).json({ error: 'unauthorized' });
    } else {
      console.warn(`PUBLIC MODE: serving scenario ${scenarioId}`);
    }

    const filePath = path.join(process.cwd(), 'data', 'scenarios', `${scenarioId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return res.status(200).json(parsed);
    } catch (e: any) {
      if (e?.code === 'ENOENT') return res.status(404).json({ error: 'scenario not found' });
      console.error('scenario read error', e);
      return res.status(500).json({ error: 'server error' });
    }
  } catch (err) {
    console.error('scenario api error', err);
    return res.status(500).json({ error: 'server error' });
  }
}
