import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
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
  return Boolean(data.is_active);
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
  const { data: token, error: tokenErr } = await supabaseAdmin
    .from('tokens')
    .select('id, is_active')
    .eq('id', data.token_id)
    .maybeSingle();
  if (tokenErr || !token) return false;
  return Boolean(token.is_active);
}

async function isAuthorized(req: NextApiRequest) {
  if (!supabaseAdmin) {
    console.warn('[api/scenario] Supabase not configured; allowing access');
    return true;
  }
  const tokenHeader = (req.headers['x-pyp-token'] as string)
    || (req.headers['x-demo-token'] as string)
    || (req.headers.authorization?.replace(/Bearer\s+/i, '') ?? '');
  const sessionHeader = (req.headers['x-session-id'] as string)
    || (req.headers['x-pyp-session'] as string);

  let authorized = false;
  try {
    if (tokenHeader) {
      authorized = await validateToken(tokenHeader);
    }
    if (!authorized && sessionHeader) {
      authorized = await validateSession(sessionHeader);
    }
  } catch (err) {
    console.error('[api/scenario] auth error', err);
    authorized = false;
  }
  return authorized;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'scenario id required' });
    return;
  }

  try {
    const authorized = await isAuthorized(req);
    if (!authorized) {
      res.status(403).json({ error: 'unauthorized' });
      return;
    }
  } catch (err) {
    console.error('[api/scenario] authorization failure', err);
    res.status(500).json({ error: 'server error' });
    return;
  }

  const filePath = path.join(process.cwd(), 'data', 'scenarios', `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(parsed);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      res.status(404).json({ error: 'scenario not found' });
      return;
    }
    console.error('[api/scenario] read error', err);
    res.status(500).json({ error: 'server error' });
  }
}
