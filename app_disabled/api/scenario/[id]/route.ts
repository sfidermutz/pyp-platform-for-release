// app/api/scenario/[id]/route.ts
// Serve scenario JSON only to authorized clients (session or token).
// Use plain Request/Response and accept context:any so TypeScript/Next.js signatures align.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // keep a server-side warning but allow build — runtime will fail auth checks without keys
  // eslint-disable-next-line no-console
  console.warn('SUPABASE env not configured for scenario API');
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
  if (!data.token_id) return true;
  const { data: tkn, error: tErr } = await supabaseAdmin
    .from('tokens')
    .select('id, is_active')
    .eq('id', data.token_id)
    .maybeSingle();
  if (tErr || !tkn) return false;
  return Boolean(tkn.is_active);
}

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * GET handler for /api/scenario/[id]
 *
 * context may have params as a Promise in some runtimes, so accept context:any
 * and await context.params if necessary.
 */
export async function GET(request: Request, context: any): Promise<Response> {
  try {
    // normalize params (context.params might be a Promise in some Next runtimes)
    let paramsObj = context?.params;
    if (paramsObj && typeof paramsObj.then === 'function') {
      paramsObj = await paramsObj;
    }
    const scenarioId = paramsObj?.id ?? null;
    if (!scenarioId) {
      return jsonResponse({ error: 'scenario id required' }, 400);
    }

    // read auth headers from the incoming Request
    // Accept either x-pyp-token (access token) OR x-session-id (session created via /api/create-session)
    const headers = request.headers;
    const tokenHeader = headers.get('x-pyp-token') ?? headers.get('x-demo-token');
    const sessionHeader = headers.get('x-session-id') ?? headers.get('x-pyp-session');

    let authorized = false;
    if (tokenHeader) {
      try {
        authorized = await validateToken(tokenHeader);
      } catch (e) {
        authorized = false;
      }
    }
    if (!authorized && sessionHeader) {
      try {
        authorized = await validateSession(sessionHeader);
      } catch (e) {
        authorized = false;
      }
    }

    if (!authorized) {
      return jsonResponse({ error: 'unauthorized' }, 403);
    }

    // Read canonical scenario JSON from server filesystem (data/scenarios/<id>.json)
    const filePath = path.join(process.cwd(), 'data', 'scenarios', `${scenarioId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return jsonResponse(parsed, 200);
    } catch (e: any) {
      if (e?.code === 'ENOENT') {
        return jsonResponse({ error: 'scenario not found' }, 404);
      }
      // eslint-disable-next-line no-console
      console.error('scenario read error', e);
      return jsonResponse({ error: 'server error' }, 500);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('scenario route error', err);
    return jsonResponse({ error: 'server error' }, 500);
  }
}
