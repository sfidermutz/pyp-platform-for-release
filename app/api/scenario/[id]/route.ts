// app/api/scenario/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env variables for scenario API');
}

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
  // optional: ensure token linked to session is active
  if (!data.token_id) return true;
  const { data: tkn, error: tErr } = await supabaseAdmin
    .from('tokens')
    .select('id, is_active')
    .eq('id', data.token_id)
    .maybeSingle();
  if (tErr || !tkn) return false;
  return Boolean(tkn.is_active);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scenarioId = params.id;
    if (!scenarioId) {
      return NextResponse.json({ error: 'scenario id required' }, { status: 400 });
    }

    // Accept either x-pyp-token (access token) OR x-session-id (session created via /api/create-session)
    const tokenHeader = req.headers.get('x-pyp-token') ?? req.headers.get('x-demo-token');
    const sessionHeader = req.headers.get('x-session-id') ?? req.headers.get('x-pyp-session');

    let authorized = false;
    if (tokenHeader) {
      authorized = await validateToken(tokenHeader);
    }
    if (!authorized && sessionHeader) {
      authorized = await validateSession(sessionHeader);
    }

    if (!authorized) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    // Read canonical scenario JSON from server filesystem (data/scenarios/<id>.json)
    const filePath = path.join(process.cwd(), 'data', 'scenarios', `${scenarioId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed, { status: 200 });
    } catch (e: any) {
      // Not found or parse error
      if (e.code === 'ENOENT') {
        return NextResponse.json({ error: 'scenario not found' }, { status: 404 });
      }
      console.error('scenario read error', e);
      return NextResponse.json({ error: 'server error' }, { status: 500 });
    }
  } catch (e) {
    console.error('scenario route error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
