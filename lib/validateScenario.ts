// lib/validateScenario.ts
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type ValidateResult = { valid: boolean; ajvErrors: any[]; errors: string[]; warnings: string[] };

const STOP_WORDS = new Set([
  'the','a','an','and','or','of','in','on','for','with','to','from','by','at','is','are','was','were',
  'be','as','that','this','these','those','it','its','into','their','your','you','we','our','they','them'
]);

function wordCount(text?: any): number {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

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

export function buildAjvValidator() {
  const schemaPath = path.join(process.cwd(), 'docs', 'schemas', 'pyp_scenario_schema_v2.json');
  let schema: any = {};
  try {
    const raw = fs.readFileSync(schemaPath, 'utf8');
    schema = JSON.parse(raw);
  } catch (e) {
    console.error('validateScenario: failed to load schema', String(e));
    // empty schema will still allow extra checks run below
  }

  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true, coerceTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return { ajv, validate, schema };
}

export function validateScenarioPayload(payload: any): ValidateResult {
  const { validate } = buildAjvValidator();
  const ajvOk = validate(payload);
  const ajvErrors = Array.isArray((validate as any).errors) ? (validate as any).errors : [];

  const errors: string[] = [];
  const warnings: string[] = [];

  // Extra SOT checks
  const dps = Array.isArray(payload?.decision_points) ? payload.decision_points : [];
  if (dps.length < 3) errors.push('decision_points must include at least 3 decision points');

  dps.forEach((dp: any, dpIdx: number) => {
    const dpIndex = dp.dp_index ?? dpIdx + 1;
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

  const r1Words = wordCount(payload?.reflection1_prompt);
  if (r1Words < 50) errors.push(`reflection1_prompt must be at least 50 words (found ${r1Words})`);

  const r2Words = wordCount(payload?.reflection2_prompt);
  if (r2Words < 50 || r2Words > 250) errors.push(`reflection2_prompt must be 50-250 words (found ${r2Words})`);
  if (payload?.scenario_lo && !reflectionHasLOReference(payload?.reflection2_prompt, payload?.scenario_lo)) {
    errors.push('reflection2_prompt must reference scenario_lo (token match)');
  }

  return { valid: ajvOk && errors.length === 0, ajvErrors, errors, warnings };
}

function camelToSnake(s: string) {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function fixScenarioPayload(payload: any): { fixedPayload: any; changelogNotes: string[] } {
  const changelogNotes: string[] = [];
  const fixed = JSON.parse(JSON.stringify(payload)); // deep copy

  // Top-level common camelCase -> snake_case
  const topMappings: Record<string, string> = {
    scenarioId: 'scenario_id',
    moduleId: 'module_id',
    canonVersion: 'canon_version',
    scenarioSchemaVersion: 'scenario_schema_version',
    learningOutcome: 'scenario_lo',
    learningOutcomeId: 'learning_outcome_id',
    learningOutcomeID: 'learning_outcome_id',
    scenarioLO: 'scenario_lo'
  };

  for (const [from, to] of Object.entries(topMappings)) {
    if ((fixed as any)[from] !== undefined && (fixed as any)[to] === undefined) {
      (fixed as any)[to] = (fixed as any)[from];
      delete (fixed as any)[from];
      changelogNotes.push(`Renamed top-level ${from} -> ${to}`);
    }
  }

  // Normalize dp1/dp2/dp3 into decision_points array
  const dpKeys = ['dp1', 'dp2', 'dp3'];
  const existingDps = dpKeys.map(k => (fixed as any)[k]).filter(Boolean);
  if (existingDps.length > 0 && !Array.isArray(fixed.decision_points)) {
    const decision_points: any[] = [];
    for (let i = 0; i < 3; i++) {
      const key = dpKeys[i];
      const dp = (fixed as any)[key] || {};
      // candidate options: dp.options || dp.default || dp['1'] || dp['2A'] etc.
      let options = dp.options;
      if (!options) {
        // try common alternate shapes
        if (dp.default) options = dp.default;
        else {
          const keys = Object.keys(dp || {});
          const arrKey = keys.find(k => Array.isArray((dp as any)[k]));
          if (arrKey) options = (dp as any)[arrKey];
        }
      }
      decision_points.push({
        dp_index: i + 1,
        narrative: dp.narrative || dp.narrative || null,
        prompt: dp.stem || dp.prompt || null,
        options: Array.isArray(options) ? options.map((o: any) => {
          // normalize option fields
          const opt = Object.assign({}, o);
          if (opt.biasTags && !opt.bias_tags) { opt.bias_tags = opt.biasTags; delete opt.biasTags; }
          if (opt.insightTags && !opt.insight_tags) { opt.insight_tags = opt.insightTags; delete opt.insightTags; }
          if (!opt.metric_weights) opt.metric_weights = {}; // fill later
          return opt;
        }) : []
      });
    }
    fixed.decision_points = decision_points;
    changelogNotes.push('Normalized dp1/dp2/dp3 into decision_points array');
  }

  // Ensure each option has metric_weights; if top-level metric_weights exist, use it, else fill defaults
  const topDefault = fixed.metric_weights || {};
  const defaultMetricWeights = {
    overall: 0.5,
    cri: 0.2,
    bias: 0,
    confidence_alignment: 0.1,
    escalation_tendency: 0.1,
    strategic_edge: {}
  };
  const dps = Array.isArray(fixed.decision_points) ? fixed.decision_points : [];
  for (const dp of dps) {
    if (!Array.isArray(dp.options)) continue;
    for (const opt of dp.options) {
      if (!opt.metric_weights || Object.keys(opt.metric_weights).length === 0) {
        opt.metric_weights = Object.assign({}, defaultMetricWeights, topDefault);
        changelogNotes.push(`Added default metric_weights to option ${opt.id || '(unknown id)'}`);
      }
      if (!opt.bias_tags) {
        opt.bias_tags = opt.biasTags ?? [];
        if (opt.biasTags) delete opt.biasTags;
      }
    }
  }

  // Add source_references migrated note if missing
  if (!Array.isArray(fixed.source_references)) {
    fixed.source_references = [{ field: 'migrated', source: 'repo:migrate_scenarios', timestamp: new Date().toISOString() }];
    changelogNotes.push('Added source_references migration note');
  }

  return { fixedPayload: fixed, changelogNotes };
}
