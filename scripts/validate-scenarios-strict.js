// scripts/validate-scenarios-strict.js
// Strict validator for scenario JSONs. Exits with code 1 if issues found.
//
// Checks:
//  - JSON parseable
//  - DP1/DP2/DP3 presence
//  - For each option: id, text, numeric score, numeric ideal_confidence
//  - Each option has metric_weights object (non-empty)
//  - HYB-PRE-01: ensure DP3 total options == 27 (3x3x3 branches)

const fs = require('fs');
const path = require('path');

const SCENARIOS_DIR = path.join(__dirname, '..', 'data', 'scenarios');
const PUBLIC_SCENARIOS_DIR = path.join(__dirname, '..', 'public', 'data', 'scenarios');

function readFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json')).map(f => path.join(dir, f));
}

function safeParse(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { __parseError: e.message };
  }
}

function checkOption(opt, filePath, issues, pathPrefix='') {
  if (!opt) {
    issues.push(`${filePath}: ${pathPrefix} option missing`);
    return;
  }
  if (!('id' in opt)) issues.push(`${filePath}: ${pathPrefix} option missing 'id'`);
  if (!('text' in opt) || typeof (opt.text) !== 'string') issues.push(`${filePath}: ${pathPrefix} option missing 'text'`);
  if (!('score' in opt) || typeof opt.score !== 'number') issues.push(`${filePath}: ${pathPrefix} option '${opt.id ?? '?'}' missing numeric 'score'`);
  if (!('ideal_confidence' in opt) || typeof opt.ideal_confidence !== 'number') issues.push(`${filePath}: ${pathPrefix} option '${opt.id ?? '?'}' missing numeric 'ideal_confidence'`);
  if (!('metric_weights' in opt) || typeof opt.metric_weights !== 'object' || opt.metric_weights === null) issues.push(`${filePath}: ${pathPrefix} option '${opt.id ?? '?'}' missing 'metric_weights' object`);
}

function validateScenario(filePath, issues) {
  const parsed = safeParse(filePath);
  if (parsed && parsed.__parseError) {
    issues.push(`${filePath}: JSON parse error: ${parsed.__parseError}`);
    return;
  }
  const sc = parsed;
  if (!sc) {
    issues.push(`${filePath}: empty scenario`);
    return;
  }

  // check dp1, dp2, dp3
  const dps = ['dp1','dp2','dp3'];
  for (const dp of dps) {
    if (!(dp in sc)) {
      issues.push(`${filePath}: missing ${dp}`);
    }
  }

  // DP1: options array or object
  const dp1 = sc.dp1;
  const dp2 = sc.dp2;
  const dp3 = sc.dp3;

  function iterateOptions(dpVal, prefix) {
    if (!dpVal) return;
    if (Array.isArray(dpVal)) {
      dpVal.forEach((o, i) => checkOption(o, filePath, issues, `${prefix}[${i}]`));
    } else if (Array.isArray(dpVal?.options)) {
      dpVal.options.forEach((o, i) => checkOption(o, filePath, issues, `${prefix}.options[${i}]`));
    } else if (typeof dpVal === 'object') {
      // may be keyed by previous option id
      for (const k of Object.keys(dpVal)) {
        if (k === 'stem' || k === 'narrative' || k === 'default' || k === 'options') continue;
        const v = dpVal[k];
        if (Array.isArray(v)) {
          v.forEach((o, i) => checkOption(o, filePath, issues, `${prefix}.${k}[${i}]`));
        }
      }
      if (Array.isArray(dpVal.default)) dpVal.default.forEach((o,i)=> checkOption(o,filePath,issues,`${prefix}.default[${i}]`));
    }
  }

  iterateOptions(dp1, 'dp1');
  iterateOptions(dp2, 'dp2');
  iterateOptions(dp3, 'dp3');

  // Specific check for HYB-PRE-01: ensure total DP3 options = 27
  const scenarioId = sc.scenario_id ?? sc.id ?? null;
  if (scenarioId === 'HYB-PRE-01') {
    // compute total dp3 options from structure
    let total = 0;
    function countOptions(dpVal) {
      if (!dpVal) return 0;
      if (Array.isArray(dpVal)) return dpVal.length;
      if (Array.isArray(dpVal?.options)) return dpVal.options.length;
      if (typeof dpVal === 'object') {
        let sum = 0;
        for (const k of Object.keys(dpVal)) {
          if (k === 'stem' || k === 'narrative' || k === 'default' || k === 'options') continue;
          const v = dpVal[k];
          if (Array.isArray(v)) sum += v.length;
        }
        if (Array.isArray(dpVal.default)) sum += dpVal.default.length;
        return sum;
      }
      return 0;
    }
    total = countOptions(dp3);
    if (total !== 27) {
      issues.push(`${filePath}: HYB-PRE-01 dp3 total options expected 27 but found ${total}`);
    }
  }

  // Check metric_weights presence at scenario level (optional)
  if (!sc.metric_weights || typeof sc.metric_weights !== 'object') {
    // not required for every scenario but warn
    issues.push(`${filePath}: missing or invalid scenario.metric_weights (expected object)`);
  }
}

function main() {
  const issues = [];
  const files = [...readDirSafe(SCENARIOS_DIR), ...readDirSafe(PUBLIC_SCENARIOS_DIR)];
  const uniqueFiles = Array.from(new Set(files));
  if (uniqueFiles.length === 0) {
    console.error('No scenario files found to validate.');
    process.exit(1);
  }
  for (const f of uniqueFiles) validateScenario(f, issues);

  if (issues.length) {
    console.error('VALIDATOR: Found issues:');
    for (const it of issues) console.error(' -', it);
    process.exit(1);
  }
  console.log('VALIDATOR: All checks passed.');
  process.exit(0);
}

function readDirSafe(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json')).map(f => path.join(dir, f));
  } catch (e) {
    return [];
  }
}

if (require.main === module) main();

module.exports = { main };
