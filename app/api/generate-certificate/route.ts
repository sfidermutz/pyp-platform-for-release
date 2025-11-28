// app/api/generate-certificate/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function makeVerificationCode() {
  // simple code: 8 alphanumeric uppercase characters
  return Math.random().toString(36).substring(2,10).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, module_id, name } = body;
    if (!session_id || !module_id) {
      return NextResponse.json({ error: 'session_id & module_id required' }, { status: 400 });
    }

    const verification_code = makeVerificationCode();
    const valid_until = new Date();
    valid_until.setFullYear(valid_until.getFullYear() + 2); // 24 months

    // If you have a real module LO to put here, supply it via body or fetch from DB.
    const moduleLO = body.module_LO ?? 'Module LO placeholder';

    const { data, error } = await supabaseAdmin.from('certificates').insert([{
      session_id,
      module: module_id,
      verification_code,
      completed_on: new Date().toISOString(),
      valid_until: valid_until.toISOString(),
      ects: 0.1,
      module_LO: moduleLO
    }]).select('*').single();

    if (error) {
      console.error('certificate insert error', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    const demoPath = path.join(process.cwd(), 'public', 'demo_certificate.pdf');
    if (!fs.existsSync(demoPath)) {
      const fallback = Buffer.from(`%PDF-1.4\n%Demo placeholder certificate for code ${verification_code}\n`);
      return new NextResponse(fallback, { status: 200, headers: { 'Content-Type': 'application/pdf', 'x-verification-code': verification_code }});
    }
    const pdfBuffer = fs.readFileSync(demoPath);
    return new NextResponse(pdfBuffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'x-verification-code': verification_code }});
  } catch (e) {
    console.error('generate-certificate error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
