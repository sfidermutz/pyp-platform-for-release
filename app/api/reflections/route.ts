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

    if (!scenario_id) {
      return NextResponse.json({ error: 'scenario_id required' }, { status: 400 });
    }
    if (!reflection_phase || (reflection_phase !== 'pre' && reflection_phase !== 'post')) {
      return NextResponse.json({ error: 'reflection_phase must be "pre" or "post"' }, { status: 400 });
    }

    const wordCount = (reflection_text || '').trim().split(/\s+/).filter(Boolean).length;

    const { data, error } = await supabaseAdmin
      .from('reflections')
      .insert([{ session_id, scenario_id, reflection_phase, reflection_text, word_count: wordCount }]);

    if (error) {
      console.error('reflections insert error', error);
      // If reflections table missing, give helpful message
      if (String(error?.message || '').toLowerCase().includes('relation') || String(error?.message || '').toLowerCase().includes('does not exist')) {
        return NextResponse.json({ error: 'reflections table missing in DB (run migrations)' }, { status: 500 });
      }
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }
    return NextResponse.json({ reflection: data?.[0] ?? null });
  } catch (e) {
    console.error('reflection POST error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
