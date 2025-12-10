// scripts/build-canonical-scenarios.js
// Usage: node scripts/build-canonical-scenarios.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'scenarios');
const OUT = path.join(__dirname, '..', 'public', 'canonical_scenarios');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function toSnake(str) {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase()).replace(/[-\s]+/g, '_').replace(/^_+/,'').toLowerCase();
}

// Basic canonicalizer: convert camelCase top-level keys to snake_case and ensure required fields
function canonicalizeScenario(scn) {
  const mapping = {};
  Object.keys(scn).forEach(k => mapping[toSnake(k)] = scn[k]);
  // guarantee required top-level SOT fields
  mapping.scenario_id = mapping.scenario_id || mapping.scenario_key || `sc_${Math.random().toString(36).slice(2,9)}`;
  mapping.scenario_key = mapping.scenario_key || mapping.scenario_id;
  mapping.source_references = mapping.source_references || {};
  // convert dp objects to canonical default arrays
  ['dp1','dp2','dp3'].forEach(dk => {
    if (!mapping[dk]) return;
    const dp = mapping[dk];
    if (Array.isArray(dp)) mapping[dk] = { default: dp };
    else if (dp && typeof dp === 'object' && !(Array.isArray(dp.default))) {
      // ensure options exist as default array if options present
      if (Array.isArray(dp.options)) mapping[dk].default = dp.options;
    }
  });
  return mapping;
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.json'));
files.forEach(f => {
  const p = path.join(SRC,f);
  const raw = fs.readFileSync(p,'utf8');
  try {
    const parsed = JSON.parse(raw);
    const canon = canonicalizeScenario(parsed);
    const outName = `${canon.scenario_key || canon.scenario_id}.canonical.json`;
    fs.writeFileSync(path.join(OUT,outName), JSON.stringify(canon, null, 2), 'utf8');
    console.log('Wrote', outName);
  } catch(e) {
    console.warn('Failed canonicalize', f, e.message);
  }
});

console.log('Canonicalization complete. Output dir:', OUT);
