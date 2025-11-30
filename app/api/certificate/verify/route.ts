// app/api/certificate/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/certificate/verify
 * Body: { verification_code: 'ABC12345' }
 * Returns limited certificate info if code exists and is valid (not expired).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verification_code } = body ?? {};

    if (!verification_code) {
      return NextResponse.json({ error: 'verification_code required' }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'server not configured for DB access' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('id, session_id, module, verification_code, completed_on, valid_until, module_lo, ects, meta')
      .eq('verification_code', verification_code)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('certificate verify db error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 });
    }

    const now = new Date();
    const valid_until = data.valid_until ? new Date(data.valid_until) : null;
    const is_valid = !!valid_until ? (valid_until >= now) : true;

    return NextResponse.json({
      valid: is_valid,
      certificate: {
        id: data.id,
        module: data.module,
        completed_on: data.completed_on,
        valid_until: data.valid_until,
        module_lo: data.module_lo,
        ects: data.ects,
      },
      meta: is_valid ? null : { reason: 'expired' }
    });
  } catch (e: any) {
    console.error('certificate verify error', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
