// app/api/log-event/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, event_type, payload } = body;

    if (!session_id || !event_type) {
      return NextResponse.json({ error: 'session_id and event_type required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert([{ session_id, event_type, payload: payload ?? {} }])
      .select('*')
      .single();

    if (error) {
      console.error('log-event error', error);
      return NextResponse.json({ error: 'failed to log event' }, { status: 500 });
    }

    return NextResponse.json({ event: data });
  } catch (err) {
    console.error('log-event fail', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
