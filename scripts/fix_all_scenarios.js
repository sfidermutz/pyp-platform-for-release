#!/usr/bin/env node
/**
 * scripts/fix_all_scenarios.js
 *
 * Auto-fix scenario JSON files so strict validator can run.
 *
 * Usage:
 *   node scripts/fix_all_scenarios.js
 *
 * Writes corrected JSON files in-place. Review changes and commit them.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SEARCH_PATHS = [
  path.join(process.cwd(), 'public', 'data', 'scenarios'),
  path.join(process.cwd(), 'data', 'scenarios'),
  path.join(process.cwd(), 'content', 'scenarios'),
];

const EXPECTED_DP3_BRANCHES = ['AA','AB','AC','BA','BB','BC','CA','CB','CC'];

function listJsonFiles(paths) {
  const out = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const entries = fs.readdirSync(p, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(p, e.name);
      if (e.isFile() && e.name.endsWith('.json')) out.push(full);
      if (e.isDirectory()) {
        // include files directly under subfolders too
        const sub = fs.readdirSync(full, { withFileTypes: true });
        for (const s of sub) {
          if (s.isFile() && s.name.endsWith('.json')) out.push(path.join(full, s.name));
        }
      }
    }
  }
  // dedupe
  return Array.from(new Set(out));
}

function readJson(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch (e) {
    console.error(`[ERROR] parse failed for ${file}: ${e.message}`);
    return null;
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
}

function ensureScenarioMetricWeights(scenario) {
  if (!scenario.metric_weights || typeof scenario.metric_weights !== 'object') {
    const defaults = {};
    if (scenario.metrics && Array.isArray(scenario.metrics.core) && scenario.metrics.core.length) {
      for (const m of scenario.metrics.core) defaults[m] = 1.0;
    } else {
      // conservative default set
      defaults.DecisionQuality = 1.0;
      defaults.InformationAdvantage = 1.0;
      defaults.TrustCalibration = 1.0;
      defaults.BiasAwareness = 0.5;
      defaults.CognitiveAdaptability = 0.5;
      defaults.EscalationTendency = 0.0;
    }
    scenario.metric_weights = defaults;
    return true;
  }
  return false;
}

function normalizeOptionFields(option) {
  let changed = false;

  // Accept alternate keys
  if (!option.metric_weights && option.score_weights) {
    option.metric_weights = option.score_weights;
    changed = true;
  } else if (!option.metric_weights && option.scoreWeights) {
    option.metric_weights = option.scoreWeights;
    changed = true;
  }

  if (!option.metric_weights || typeof option.metric_weights !== 'object') {
    option.metric_weights = option.metric_weights || {};
    // add neutral keys if missing
    option.metric_weights.DecisionQuality = option.metric_weights.DecisionQuality ?? 0;
    option.metric_weights.InformationAdvantage = option.metric_weights.InformationAdvantage ?? 0;
    option.metric_weights.TrustCalibration = option.metric_weights.TrustCalibration ?? 0;
    option.metric_weights.EscalationTendency = option.metric_weights.EscalationTendency ?? 0;
    option.metric_weights.BiasAwareness = option.metric_weights.BiasAwareness ?? 0;
    option.metric_weights.CognitiveAdaptability = option.metric_weights.CognitiveAdaptability ?? 0;
    changed = true;
  } else {
    // ensure numeric
    for (const k of Object.keys(option.metric_weights)) {
      const v = option.metric_weights[k];
      if (typeof v === 'string') {
        const n = Number(v);
        if (!Number.isNaN(n)) {
          option.metric_weights[k] = n;
          changed = true;
        }
      }
    }
    // ensure canonical keys exist (don't overwrite existing values)
    option.metric_weights.DecisionQuality = option.metric_weights.DecisionQuality ?? 0;
    option.metric_weights.InformationAdvantage = option.metric_weights.InformationAdvantage ?? 0;
    option.metric_weights.TrustCalibration = option.metric_weights.TrustCalibration ?? 0;
    option.metric_weights.EscalationTendency = option.metric_weights.EscalationTendency ?? 0;
    option.metric_weights.BiasAwareness = option.metric_weights.BiasAwareness ?? 0;
    option.metric_weights.CognitiveAdaptability = option.metric_weights.CognitiveAdaptability ?? 0;
  }

  // ensure score numeric
  if (typeof option.score !== 'number') {
    const mw = option.metric_weights || {};
    const dq = Number(mw.DecisionQuality || 0);
    const ia = Number(mw.InformationAdvantage || 0);
    const et = Number(mw.EscalationTendency || 0);
    let score = 50 + (dq * 10) + (ia * 5) - (et * 7);
    if (!Number.isFinite(score)) score = 50;
    score = Math.round(Math.max(0, Math.min(100, score)));
    option.score = score;
    changed = true;
  }

  // ensure ideal_confidence numeric 1..100
  if (typeof option.ideal_confidence !== 'number') {
    const sc = Number(option.score || 50);
    let ic = Math.round(sc * 0.9);
    if (!Number.isFinite(ic)) ic = 50;
    ic = Math.max(1, Math.min(100, ic));
    option.ideal_confidence = ic;
    changed = true;
  }

  // ensure id
  if (!option.id && option.option_id) {
    option.id = option.option_id;
    changed = true;
  } else if (!option.id) {
    // create stable id from text if available
    if (option.text && typeof option.text === 'string') {
      option.id = 'opt-' + sha1(option.text);
    } else {
      option.id = 'opt-' + sha1(JSON.stringify(option).slice(0,200));
    }
    changed = true;
  }

  // ensure text
  if (!option.text) {
    option.text = option.text || 'TODO: fill option text';
    changed = true;
  }

  // ensure bias_tags is array
  if (!Array.isArray(option.bias_tags)) {
    if (!option.bias_tags && option.bias) {
      option.bias_tags = [option.bias];
    } else {
      option.bias_tags = option.bias_tags ? [option.bias_tags] : [];
    }
    changed = true;
  }

  return changed;
}

function ensureDp1(s) {
  if (!s.dp1) return false;
  let changed = false;
  if (Array.isArray(s.dp1)) {
    // uncommon but handle
    for (const opt of s.dp1) {
      if (normalizeOptionFields(opt)) changed = true;
    }
    s.dp1 = { options: s.dp1 };
    changed = true;
    return changed;
  }
  if (s.dp1.options && Array.isArray(s.dp1.options)) {
    for (const opt of s.dp1.options) {
      if (normalizeOptionFields(opt)) changed = true;
    }
  } else if (s.dp1.options && typeof s.dp1.options === 'object') {
    const arr = Object.values(s.dp1.options);
    for (const opt of arr) if (normalizeOptionFields(opt)) changed = true;
    s.dp1.options = arr;
    changed = true;
  }
  return changed;
}

function ensureDp2(s) {
  if (!s.dp2) return false;
  let changed = false;
  if (Array.isArray(s.dp2)) {
    for (const branch of s.dp2) {
      if (branch.options && Array.isArray(branch.options)) {
        for (const opt of branch.options) if (normalizeOptionFields(opt)) changed = true;
      } else if (branch.options && typeof branch.options === 'object') {
        const arr = Object.values(branch.options);
        branch.options = arr;
        changed = true;
        for (const opt of arr) if (normalizeOptionFields(opt)) changed = true;
      }
    }
    return changed;
  } else if (typeof s.dp2 === 'object') {
    // convert to array of { branch, stem, options }
    const arr = [];
    for (const k of Object.keys(s.dp2)) {
      const b = s.dp2[k] || {};
      const opts = Array.isArray(b.options) ? b.options : (b.options ? Object.values(b.options) : []);
      for (const opt of opts) if (normalizeOptionFields(opt)) changed = true;
      arr.push({ branch: String(k).toUpperCase(), stem: b.stem || '', options: opts });
    }
    s.dp2 = arr;
    changed = true;
    return changed;
  }
  return false;
}

function ensureDp3(s) {
  if (!s.dp3) { s.dp3 = []; }
  let changed = false;
  // Normalize dp3 to array of branches
  if (!Array.isArray(s.dp3)) {
    if (typeof s.dp3 === 'object') {
      const arr = [];
      for (const k of Object.keys(s.dp3)) {
        const b = s.dp3[k];
        const opts = Array.isArray(b.options) ? b.options : (b.options ? Object.values(b.options) : []);
        for (const opt of opts) if (normalizeOptionFields(opt)) changed = true;
        arr.push({ branch: String(k).toUpperCase(), stem: b.stem || '', options: opts });
      }
      s.dp3 = arr;
      changed = true;
    } else {
      s.dp3 = [];
      changed = true;
    }
  }
  // ensure all expected branches exist
  const existing = new Set(s.dp3.map(b => String(b.branch).toUpperCase()));
  for (const b of EXPECTED_DP3_BRANCHES) {
    if (!existing.has(b)) {
      // create placeholder branch
      const opts = [];
      for (let i=1;i<=3;i++) {
        const opt = {
          id: `DP3-${b}${i}`,
          option_id: `DP3-${b}${i}`,
          text: `TODO: fill DP3 ${b}${i} text`,
          metric_weights: {
            DecisionQuality: 0,
            InformationAdvantage: 0,
            TrustCalibration: 0,
            EscalationTendency: 0,
            BiasAwareness: 0,
            CognitiveAdaptability: 0
          },
          score: 50,
          ideal_confidence: 50,
          bias_tags: []
        };
        opts.push(opt);
      }
      s.dp3.push({ branch: b, stem: `TODO: DP3 ${b} stem`, options: opts });
      changed = true;
    } else {
      // ensure branch has 3 options
      const br = s.dp3.find(x => String(x.branch).toUpperCase() === b);
      if (!Array.isArray(br.options)) { br.options = []; changed = true; }
      for (const opt of br.options) {
        if (normalizeOptionFields(opt)) changed = true;
      }
      while (br.options.length < 3) {
        const i = br.options.length + 1;
        const opt = {
          id: `DP3-${b}${i}`,
          option_id: `DP3-${b}${i}`,
          text: `TODO: fill DP3 ${b}${i} text`,
          metric_weights: {
            DecisionQuality: 0,
            InformationAdvantage: 0,
            TrustCalibration: 0,
            EscalationTendency: 0,
            BiasAwareness: 0,
            CognitiveAdaptability: 0
          },
          score: 50,
          ideal_confidence: 50,
          bias_tags: []
        };
        br.options.push(opt);
        changed = true;
      }
    }
  }
  return changed;
}

function processFile(file) {
  const s = readJson(file);
  if (!s) return false;
  let changed = false;
  if (ensureScenarioMetricWeights(s)) changed = true;
  if (ensureDp1(s)) changed = true;
  if (ensureDp2(s)) changed = true;
  if (ensureDp3(s)) changed = true;
  // final safe-guard: ensure scenario.metric_weights exists
  if (!s.metric_weights || typeof s.metric_weights !== 'object') {
    s.metric_weights = { DecisionQuality: 1, InformationAdvantage: 1, TrustCalibration: 1 };
    changed = true;
  }
  if (changed) {
    writeJson(file, s);
    console.log('[fixed] ', file);
    return true;
  } else {
    console.log('[ok]    ', file);
    return false;
  }
}

function main() {
  const files = listJsonFiles(SEARCH_PATHS);
  if (!files || files.length === 0) {
    console.log('No scenario files found under', SEARCH_PATHS.join(', '));
    process.exit(0);
  }
  let any = false;
  for (const f of files) {
    try {
      const c = processFile(f);
      if (c) any = true;
    } catch (e) {
      console.error('[ERROR] processing', f, e && e.message);
    }
  }
  if (any) {
    console.log('Fixes applied. Please review changed files and commit.');
    process.exit(0);
  } else {
    console.log('No fixes required.');
    process.exit(0);
  }
}

main();
