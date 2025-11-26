// app/api/reflections/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, scenario_id, reflection_phase, reflection_text } = body;
    const wordCount = (reflection_text || '').trim().split(/\s+/).filter(Boolean).length;
    const { data, error } = await supabaseAdmin
      .from('reflections')
      .insert([{ session_id, scenario_id, reflection_phase, reflection_text, word_count: wordCount }]);

    if (error) {
      console.error('reflections insert error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    return NextResponse.json({ reflection: data?.[0] ?? null });
  } catch (e) {
    console.error('reflection POST error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
