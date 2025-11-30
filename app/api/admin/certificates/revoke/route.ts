// app/api/admin/certificates/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiKey } from '@/lib/adminAuth';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/admin/certificates/revoke
 * Headers: x-api-key required (ADMIN_API_KEY)
 * Body: { id: '<certificate-id>' }
 *
 * This implementation:
 *  - Fetches the current certificate.meta
 *  - Merges { revoked: true } into meta client-side (safe)
 *  - Updates valid_until to now and writes meta back
 */
export async function POST(req: NextRequest) {
  try {
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const body = await req.json();
    const { id } = body ?? {};
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // 1) Read current meta
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('certificates')
      .select('meta')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('certificate fetch meta error', fetchErr);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    let metaObj: any = existing?.meta ?? null;

    // Normalize meta to an object
    if (metaObj === null || typeof metaObj !== 'object') {
      // If meta is a JSON string, attempt parse
      if (typeof metaObj === 'string') {
        try {
          metaObj = JSON.parse(metaObj);
        } catch (e) {
          metaObj = {};
        }
      } else {
        metaObj = {};
      }
    }

    // Merge revoked flag
    metaObj = { ...metaObj, revoked: true, revoked_at: new Date().toISOString() };

    // 2) Update the certificate: set valid_until to now and merged meta
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .update({ valid_until: now, meta: metaObj })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('certificate revoke error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ revoked: data });
  } catch (e: any) {
    console.error('certificate revoke catch', e);
    return NextResponse.json({ error: 'server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
