/**
 * scripts/validate-scenarios-strict.js
 *
 * Enhanced validator for scenario JSON files:
 *  - requires scenarioId / scenario_id / id
 *  - requires moduleId / module_id / module
 *  - requires learningOutcomeId / learningOutcome / scenario_LO
 *  - requires metrics.core (non-empty array)
 *  - ensures filename matches scenarioId (case-sensitive expected behavior)
 *  - requires numeric score and ideal_confidence on options
 *
 * Exit codes:
 *  0 = ok
 *  1 = issues found
 *  2 = IO/dir errors
 *
 * Usage:
 *   node scripts/validate-scenarios-strict.js
 */

const fs = require('fs');
const path = require('path');

const SCENARIOS_DIR = path.join(process.cwd(), 'data', 'scenarios');

function readAllJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return { ok: false, message: `directory not found: ${dir}`, files: [] };
  }
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'));
  return { ok: true, files: files.map(f => path.join(dir, f)) };
}

function normalizeId(obj) {
  return obj?.scenarioId ?? obj?.scenario_id ?? obj?.id ?? null;
}

function normalizeModule(obj) {
  return obj?.moduleId ?? obj?.module_id ?? obj?.module ?? null;
}

function normalizeLearningOutcome(obj) {
  return obj?.learningOutcomeId ?? obj?.learningOutcome ?? obj?.scenario_LO ?? null;
}

function short(s, n=200) {
  return String(s).slice(0, n) + (String(s).length > n ? '…' : '');
}

function collectOptionsFromDp(dpRaw) {
  if (!dpRaw) return [];
  if (Array.isArray(dpRaw?.options)) return dpRaw.options;
  if (Array.isArray(dpRaw)) return dpRaw;
  if (Array.isArray(dpRaw?.default)) return dpRaw.default;

  // If dpRaw is an object with keyed arrays (branches), collect all arrays
  const arr = [];
  for (const k of Object.keys(dpRaw)) {
    if (k === 'narrative' || k === 'stem' || k === 'options' || k === 'default') continue;
    const v = dpRaw[k];
    if (Array.isArray(v)) arr.push(...v);
  }
  return arr;
}

function run() {
  console.log('validate-scenarios-strict: scanning', SCENARIOS_DIR);
  const { ok, message, files } = readAllJsonFiles(SCENARIOS_DIR);
  if (!ok) {
    console.error('ERROR:', message);
    process.exit(2);
  }

  let total = 0;
  const errors = [];
  for (const file of files) {
    total++;
    const rel = path.relative(process.cwd(), file);
    try {
      const raw = fs.readFileSync(file, 'utf8');
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (pe) {
        errors.push({ file: rel, kind: 'JSON_PARSE', message: pe.message });
        continue;
      }

      const sid = normalizeId(parsed);
      const mid = normalizeModule(parsed);
      const lo = normalizeLearningOutcome(parsed);
      const filename = path.basename(file);

      if (!sid) {
        errors.push({ file: rel, kind: 'MISSING_SCENARIO_ID', message: 'no scenarioId / scenario_id / id found' });
      } else {
        const expectedName = `${sid}.json`;
        if (filename !== expectedName) {
          errors.push({ file: rel, kind: 'FILENAME_MISMATCH', message: `basename=${filename} expected ${expectedName}` });
        }
      }

      if (!mid) {
        errors.push({ file: rel, kind: 'MISSING_MODULE_ID', message: 'no moduleId/module_id/module found' });
      }

      if (!lo) {
        errors.push({ file: rel, kind: 'MISSING_LEARNING_OUTCOME', message: 'no learningOutcomeId / learningOutcome / scenario_LO found' });
      }

      // metrics check
      const metrics = parsed?.metrics;
      if (!metrics || !Array.isArray(metrics.core) || metrics.core.length === 0) {
        errors.push({ file: rel, kind: 'MISSING_METRICS', message: 'metrics.core must be a non-empty array' });
      }

      // basic dp sanity
      if (!parsed.dp1 && !parsed.dp2 && !parsed.dp3) {
        errors.push({ file: rel, kind: 'MISSING_DPS', message: 'dp1/dp2/dp3 structure missing' });
      }

      // Check options for required fields
      ['dp1', 'dp2', 'dp3'].forEach((dpKey) => {
        const dpRaw = parsed[dpKey];
        if (!dpRaw) return;
        const options = collectOptionsFromDp(dpRaw);
        if (!options || options.length === 0) {
          errors.push({ file: rel, kind: 'NO_OPTIONS', message: `no options found for ${dpKey}` });
          return;
        }
        for (const opt of options) {
          if (!opt || typeof opt !== 'object') {
            errors.push({ file: rel, kind: 'OPTION_MALFORMED', message: `option in ${dpKey} is not an object` });
            continue;
          }
          if (!opt.id || !opt.text) {
            errors.push({ file: rel, kind: 'OPTION_MALFORMED', message: `option in ${dpKey} missing id or text` });
          }
          if (typeof opt.score !== 'number' || typeof opt.ideal_confidence !== 'number') {
            errors.push({ file: rel, kind: 'OPTION_MISSING_SCORE_OR_CONF', message: `option ${opt.id ?? '[unknown]'} in ${dpKey} missing numeric score or ideal_confidence` });
          }
        }
      });

    } catch (e) {
      errors.push({ file: rel, kind: 'IO_ERROR', message: String(e) });
    }
  }

  console.log('');
  console.log('SUMMARY: scanned', total, 'files.');
  if (errors.length === 0) {
    console.log('✅ No issues found.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} issue(s):`);
    for (const err of errors) {
      console.log(` - ${err.file} :: ${err.kind} :: ${err.message}`);
    }
    process.exit(1);
  }
}

if (require.main === module) run();
module.exports = { run };
