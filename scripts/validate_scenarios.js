#!/usr/bin/env node
/**
 * validate_scenarios.js
 * Validates all scenario JSON files under data/scenarios against the PYP v2 schema
 * and Beth's MASTER_REQUIREMENTS authoring guardrails. Supports --fix to migrate
 * legacy keys and auto-fill missing metric weights.
 */

const fs = require('fs');
const path = require('path');
function safeRequire(moduleName, fallbackPath) {
  try {
    return require(moduleName);
  } catch (err) {
    return require(fallbackPath);
  }
}

const AjvModule = safeRequire('ajv', path.join(__dirname, '..', 'tools', 'vendor', 'ajv'));
const Ajv = AjvModule.default || AjvModule;
const addFormats = safeRequire('ajv-formats', path.join(__dirname, '..', 'tools', 'vendor', 'ajv-formats'));

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, 'docs', 'schemas', 'pyp_scenario_schema_v2.json');
const SCENARIOS_DIR = path.join(ROOT, 'data', 'scenarios');
const CHANGELOG_PATH = path.join(ROOT, 'data', 'CHANGELOG.md');

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'with', 'to', 'from',
  'by', 'at', 'is', 'are', 'was', 'were', 'be', 'as', 'that', 'this', 'these', 'those',
  'it', 'its', 'into', 'their', 'your', 'you', 'we', 'our', 'they', 'them'
]);

function loadSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  return JSON.parse(raw);
}

function buildAjvValidator(schema = null) {
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true, coerceTypes: true });
  addFormats(ajv);
  const compiled = ajv.compile(schema || loadSchema());
  return { ajv, validate: compiled, schema: schema || loadSchema() };
}

function wordCount(text) {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(t => !STOP_WORDS.has(t));
}

function reflectionHasLOReference(reflectionText, scenarioLO) {
  const tokens = new Set(tokenize(scenarioLO));
  if (!tokens.size) return false;
  const reflectionTokens = tokenize(reflectionText);
  return reflectionTokens.some(t => tokens.has(t));
}

function defaultMetricWeights() {
  return {
    overall: 0.5,
    cri: 0.2,
    bias: 0.1,
    confidence_alignment: 0.1,
    escalation_tendency: 0.1,
    strategic_edge: { default: 0.1 }
  };
}

function renameKeys(target, mapping, changes) {
  for (const [legacy, modern] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(target, legacy) && !Object.prototype.hasOwnProperty.call(target, modern)) {
      target[modern] = target[legacy];
      delete target[legacy];
      changes.push(`renamed ${legacy} -> ${modern}`);
    }
  }
}

function normalizeDecisionPoints(scenario, changes) {
  if (Array.isArray(scenario.decision_points) && scenario.decision_points.length) {
    scenario.decision_points.forEach((dp, idx) => {
      if (!dp.dp_index) dp.dp_index = idx + 1;
    });
    return;
  }

  const legacyKeys = ['dp1', 'dp2', 'dp3'];
  const dps = [];
  legacyKeys.forEach((key, idx) => {
    const dp = scenario[key];
    if (!dp) return;
    const options = Array.isArray(dp.options)
      ? dp.options
      : Array.isArray(dp.default)
        ? dp.default
        : Array.isArray(dp['1'])
          ? dp['1']
          : Array.isArray(dp['2'])
            ? dp['2']
            : [];
    dps.push({
      dp_index: idx + 1,
      narrative: dp.narrative || dp.story || '',
      prompt: dp.prompt || dp.stem || '',
      stem: dp.stem,
      options
    });
  });

  if (dps.length) {
    scenario.decision_points = dps;
    changes.push('normalized dp1/dp2/dp3 into decision_points array');
  }
}

function ensureOptionDefaults(option, scenarioMetricWeights, changes) {
  const opt = option;
  if (!opt.metric_weights) {
    opt.metric_weights = scenarioMetricWeights ? { ...scenarioMetricWeights, strategic_edge: { ...(scenarioMetricWeights.strategic_edge || {}) } } : defaultMetricWeights();
    changes.push('added default metric_weights to option');
  } else {
    const defaults = defaultMetricWeights();
    for (const key of Object.keys(defaults)) {
      if (opt.metric_weights[key] === undefined) {
        opt.metric_weights[key] = defaults[key];
        changes.push(`filled metric_weights.${key} for option ${opt.id || ''}`);
      }
    }
    if (!opt.metric_weights.strategic_edge || typeof opt.metric_weights.strategic_edge !== 'object') {
      opt.metric_weights.strategic_edge = { ...(scenarioMetricWeights?.strategic_edge || defaults.strategic_edge) };
      changes.push(`initialized strategic_edge for option ${opt.id || ''}`);
    }
  }

  if (!Array.isArray(opt.bias_tags)) {
    opt.bias_tags = [];
    changes.push(`added empty bias_tags for option ${opt.id || ''}`);
  }
  if (Array.isArray(opt.biasTags) && !opt.bias_tags?.length) {
    opt.bias_tags = opt.biasTags;
    delete opt.biasTags;
    changes.push(`renamed biasTags to bias_tags for option ${opt.id || ''}`);
  }
  if (Array.isArray(opt.insightTags) && !opt.insight_tags) {
    opt.insight_tags = opt.insightTags;
    delete opt.insightTags;
    changes.push(`renamed insightTags to insight_tags for option ${opt.id || ''}`);
  }
}

function applyAutoFixes(inputScenario) {
  const scenario = JSON.parse(JSON.stringify(inputScenario));
  const changes = [];
  const manual = [];

  renameKeys(scenario, {
    scenarioId: 'scenario_id',
    moduleId: 'module_id',
    canonVersion: 'canon_version',
    learningOutcome: 'scenario_lo',
    learningOutcomeId: 'learning_outcome_id',
    biasCatalog: 'bias_catalog',
    effectsModel: 'effects_model',
    biasTags: 'bias_tags',
    insightTags: 'insight_tags'
  }, changes);

  if (!scenario.schema_version) {
    scenario.schema_version = '2.0';
    changes.push('set schema_version to 2.0');
  }
  if (scenario.scenario_LO && !scenario.scenario_lo) {
    scenario.scenario_lo = scenario.scenario_LO;
    changes.push('copied scenario_LO to scenario_lo');
  }

  normalizeDecisionPoints(scenario, changes);
  if (Array.isArray(scenario.decision_points)) {
    scenario.decision_points.forEach((dp, idx) => {
      if (!dp.dp_index) dp.dp_index = idx + 1;
      const options = Array.isArray(dp.options) ? dp.options : [];
      options.forEach(opt => ensureOptionDefaults(opt, scenario.metric_weights, changes));
      dp.options = options;
    });
  }

  if (Array.isArray(scenario.decision_points) && scenario.decision_points.length < 3) {
    manual.push('decision_points fewer than 3; author review required');
  }

  return { scenario, changes, manualNotes: manual };
}

function validateScenarioData(scenario, validator) {
  const errors = [];
  const warnings = [];
  const validSchema = validator(scenario);
  if (!validSchema && Array.isArray(validator.errors)) {
    validator.errors.forEach(e => errors.push(`${e.instancePath || '(root)'} ${e.message}`));
  }

  const dps = Array.isArray(scenario.decision_points) ? scenario.decision_points : [];
  if (dps.length < 3) {
    errors.push('decision_points must include at least 3 decision points');
  }

  dps.forEach((dp, dpIdx) => {
    if (!Array.isArray(dp.options) || dp.options.length < 2) {
      errors.push(`dp_index ${dp.dp_index || dpIdx + 1} must include at least 2 options`);
      return;
    }
    dp.options.forEach((opt, optIdx) => {
      ['id', 'text', 'metric_weights', 'score', 'ideal_confidence', 'bias_tags'].forEach(field => {
        if (opt[field] === undefined) {
          errors.push(`dp ${dp.dp_index || dpIdx + 1} option ${optIdx + 1} missing ${field}`);
        }
      });
      const words = wordCount(opt.text || '');
      if (words < 12 || words > 22) {
        warnings.push(`dp ${dp.dp_index || dpIdx + 1} option ${opt.id || optIdx + 1} text length ${words} words (recommended 12-22)`);
      }
    });
  });

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

  return { valid: errors.length === 0, errors, warnings };
}

function appendChangeLog(filePath, changes, manualNotes) {
  if (!changes.length && !manualNotes.length) return;
  const timestamp = new Date().toISOString();
  const lines = [];
  lines.push(`## ${timestamp} - ${filePath}`);
  lines.push('migrated_by: sot-schema-validator');
  if (changes.length) {
    lines.push('changes:');
    changes.forEach(c => lines.push(`- ${c}`));
  }
  if (manualNotes.length) {
    lines.push('manual_review:');
    manualNotes.forEach(c => lines.push(`- ${c}`));
  }
  lines.push('');
  fs.appendFileSync(CHANGELOG_PATH, lines.join('\n') + '\n');
}

function readScenarioFiles() {
  return fs.readdirSync(SCENARIOS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(SCENARIOS_DIR, f));
}

function runCLI() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const { validate } = buildAjvValidator();
  const files = readScenarioFiles();
  let scanned = 0;
  let validCount = 0;
  let fixedCount = 0;
  let invalidCount = 0;

  console.log(`Scanning ${files.length} scenarios in ${SCENARIOS_DIR}`);

  files.forEach(file => {
    scanned++;
    const rel = path.relative(ROOT, file);
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const original = JSON.parse(raw);
      let scenario = JSON.parse(JSON.stringify(original));
      let appliedChanges = [];
      let manualNotes = [];

      if (fix) {
        const result = applyAutoFixes(scenario);
        scenario = result.scenario;
        appliedChanges = result.changes;
        manualNotes = result.manualNotes;
      }

      const { valid, errors, warnings } = validateScenarioData(scenario, validate);
      warnings.forEach(w => console.warn(`WARN ${rel}: ${w}`));

      if (fix && errors.some(e => e.includes('reference scenario_lo'))) {
        manualNotes.push('reflection2_prompt missing LO reference (manual author review required)');
      }

      const scenarioChanged = JSON.stringify(scenario) !== JSON.stringify(original);
      if (fix && (appliedChanges.length > 0 || scenarioChanged)) {
        fs.writeFileSync(file, JSON.stringify(scenario, null, 2));
        fixedCount++;
        console.log(`Auto-fixed ${rel}`);
      }

      if (fix && (appliedChanges.length > 0 || manualNotes.length > 0)) {
        appendChangeLog(rel, appliedChanges, manualNotes);
      }

      if (valid) {
        validCount++;
      } else {
        invalidCount++;
        console.error(`ERROR ${rel}:`);
        errors.forEach(e => console.error(` - ${e}`));
        if (fix && manualNotes.length) {
          console.error(`Manual review needed for ${rel}: ${manualNotes.join('; ')}`);
          appendChangeLog(rel, appliedChanges, manualNotes);
        }
      }
    } catch (e) {
      invalidCount++;
      console.error(`ERROR ${rel}: exception ${e.message}`);
    }
  });

  console.log('');
  console.log(`Summary: scanned=${scanned}, valid=${validCount}, fixed=${fixedCount}, invalid=${invalidCount}`);
  if (invalidCount > 0 && !fix) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCLI();
}

module.exports = {
  loadSchema,
  buildAjvValidator,
  validateScenarioData,
  applyAutoFixes,
  reflectionHasLOReference,
  defaultMetricWeights
};
