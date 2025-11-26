// app/api/verify/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('certificates').select('*').eq('verification_code', code).maybeSingle();
    if (error) {
      console.error('verify select error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ certificate: data });
  } catch (e) {
    console.error('verify GET error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
