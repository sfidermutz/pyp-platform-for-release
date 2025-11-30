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
 * Headers: x-api-key, Body: { id: '<certificate-id>' }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const body = await req.json();
    const { id } = body ?? {};
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const now = new Date().toISOString();
    // set valid_until to now and annotate meta.revoked=true
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .update({ valid_until: now, meta: supabaseAdmin.raw('COALESCE(meta, \'{}\'::jsonb) || ?::jsonb', [JSON.stringify({ revoked: true })]) })
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
