// app/api/create-session/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE env variables for create-session API');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    // Validate token server-side.
    const { data: tkn, error: tkErr } = await supabaseAdmin
      .from('tokens')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (tkErr || !tkn) {
      return NextResponse.json({ error: 'invalid or inactive token' }, { status: 401 });
    }

    // Create a session row linked to token_id
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('sessions')
      .insert([{ token_id: tkn.id }])
      .select('*')
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: 'failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (e) {
    console.error('create-session error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
