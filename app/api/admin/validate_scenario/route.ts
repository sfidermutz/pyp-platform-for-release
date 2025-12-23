import { NextRequest, NextResponse } from 'next/server';
import { checkAdminApiKey } from '@/lib/adminAuth';

const {
  buildAjvValidator,
  validateScenarioData,
  applyAutoFixes
} = require('../../../../scripts/validate_scenarios');

export const runtime = 'nodejs';

const { validate } = buildAjvValidator();

export async function POST(req: NextRequest) {
  try {
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload', detail: String(e) }, { status: 400 });
    }

    const { scenario: fixedScenario } = applyAutoFixes(body);
    const result = validateScenarioData(fixedScenario, validate);

    return NextResponse.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      fixed: fixedScenario
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
