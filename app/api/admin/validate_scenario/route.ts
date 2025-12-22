// app/api/admin/validate_scenario/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminApiKey } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const runtime = 'nodejs';

// Load schema at startup (server runtime). This is static file IO; fine for server runtime.
const SCHEMA_PATH = path.join(process.cwd(), 'docs', 'schemas', 'pyp_scenario_schema_v2.json');
// Make validateFn `any` so we can safely check `.errors` without TypeScript complaining.
let validateFn: any = null;
try {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true, coerceTypes: true });
  addFormats(ajv);
  validateFn = ajv.compile(schema);
} catch (e) {
  // Log and keep validateFn null. Route will return helpful error.
  console.error('validate_scenario: failed to load/compile schema at', SCHEMA_PATH, e);
}

function wordCount(text?: any): number {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','of','in','on','for','with','to','from','by','at','is','are','was','were',
  'be','as','that','this','these','those','it','its','into','their','your','you','we','our','they','them'
]);

function tokenize(text?: string) {
  if (!text) return [];
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).filter(t => !STOP_WORDS.has(t));
}

function reflectionHasLOReference(reflectionText?: string, scenarioLO?: string) {
  if (!reflectionText || !scenarioLO) return false;
  const loTokens = new Set(tokenize(scenarioLO));
  if (!loTokens.size) return false;
  const refTokens = tokenize(reflectionText);
  return refTokens.some(t => loTokens.has(t) && t.length > 3);
}

function runExtraValidations(scenario: any) {
  const errors: string[] = [];
  const warnings: string[] = [];

  // decision_points
  const dps = Array.isArray(scenario.decision_points) ? scenario.decision_points : [];
  if (dps.length < 3) {
    errors.push('decision_points must include at least 3 decision points');
  }

  dps.forEach((dp: any, dpIdx: number) => {
    const dpIndex = dp.dp_index || dpIdx + 1;
    if (!Array.isArray(dp.options) || dp.options.length < 2) {
      errors.push(`dp_index ${dpIndex} must include at least 2 options`);
      return;
    }
    dp.options.forEach((opt: any, optIdx: number) => {
      const missing = ['id', 'text', 'metric_weights', 'score', 'ideal_confidence', 'bias_tags']
        .filter(f => opt[f] === undefined);
      if (missing.length) {
        errors.push(`dp ${dpIndex} option ${optIdx + 1} missing ${missing.join(', ')}`);
      }
      const words = wordCount(opt.text);
      if (words < 12 || words > 22) {
        warnings.push(`dp ${dpIndex} option ${opt.id || optIdx + 1} text length ${words} words (recommended 12-22)`);
      }
    });
  });

  // reflection checks
  const r1Words = wordCount(scenario.reflection1_prompt);
  if (r1Words < 50) {
    errors.push(`reflection1_prompt must be at least 50 words (found ${r1Words})`);
  }
  const r2Words = wordCount(scenario.reflection2_prompt);
  if (r2Words < 50 || r2Words > 250) {
    errors.push(`reflection2_prompt must be 50-250 words (found ${r2Words})`);
  }
  if (scenario.scenario_lo && !reflectionHasLOReference(scenario.reflection2_prompt, scenario.scenario_lo)) {
    errors.push('reflection2_prompt must reference scenario_lo (token match)');
  }

  return { errors, warnings };
}

export async function POST(req: NextRequest) {
  try {
    // Admin auth - reuse existing pattern
    const auth = checkAdminApiKey(req.headers);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    // Schema not available
    if (!validateFn) {
      return NextResponse.json({ error: 'Scenario schema not available on server. Check server logs.' }, { status: 500 });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload', detail: String(e) }, { status: 400 });
    }

    // Run Ajv validation
    const ajvValid = validateFn(payload);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ajvValid && Array.isArray((validateFn as any).errors)) {
      (validateFn as any).errors.forEach((err: any) => {
        errors.push(`${err.instancePath || '(root)'} ${err.message}`);
      });
    }

    // Run extra SOT checks
    const extra = runExtraValidations(payload);
    errors.push(...extra.errors);
    warnings.push(...extra.warnings);

    const valid = errors.length === 0;
    return NextResponse.json({ valid, errors, warnings, fixed: undefined });
  } catch (err: any) {
    console.error('admin/validate_scenario error', err);
    return NextResponse.json({ error: 'Server error', detail: String(err?.message || err) }, { status: 500 });
  }
}
