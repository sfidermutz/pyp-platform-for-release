// scripts/fix-scenarios-metric-weights.js
// Usage: node scripts/fix-scenarios-metric-weights.js

const fs = require('fs');
const path = require('path');

const SCEN_DIR = path.join(__dirname, '..', 'data', 'scenarios');

const DEFAULT_METRIC_WEIGHTS = {
  DecisionQuality: 0.40,
  InformationAdvantage: 0.25,
  TrustCalibration: 0.15,
  CognitiveAdaptability: 0.15,
  BiasAwareness: 0.05
};

function ensureMetricWeights(obj) {
  if (!obj.metric_weights || typeof obj.metric_weights !== 'object') {
    obj.metric_weights = { ...DEFAULT_METRIC_WEIGHTS };
  }
}

function addToOption(opt) {
  if (!opt || typeof opt !== 'object') return;
  if (!opt.metric_weights || typeof opt.metric_weights !== 'object') {
    opt.metric_weights = { ...DEFAULT_METRIC_WEIGHTS };
    opt.source_references = opt.source_references || {};
    opt.source_references.metric_weights = {
      note: 'auto_populated_by_migration_script_v1',
      script: 'scripts/fix-scenarios-metric-weights.js',
      timestamp: new Date().toISOString()
    };
  }
}

function traverseDp(dp) {
  if (!dp) return;
  if (Array.isArray(dp)) dp.forEach(addToOption);
  else if (Array.isArray(dp.options)) dp.options.forEach(addToOption);
  else if (typeof dp === 'object') {
    if (Array.isArray(dp.default)) dp.default.forEach(addToOption);
    if (Array.isArray(dp.options)) dp.options.forEach(addToOption);
    Object.keys(dp).forEach(k => {
      if (['narrative','stem','default','options'].includes(k)) return;
      const v = dp[k];
      if (Array.isArray(v)) v.forEach(addToOption);
    });
  }
}

function main() {
  if (!fs.existsSync(SCEN_DIR)) {
    console.error('Scenarios dir not found:', SCEN_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(SCEN_DIR).filter(f => f.toLowerCase().endsWith('.json'));
  let touched = 0;
  for (const f of files) {
    const p = path.join(SCEN_DIR, f);
    try {
      const raw = fs.readFileSync(p,'utf8');
      const parsed = JSON.parse(raw);
      ensureMetricWeights(parsed);
      traverseDp(parsed.dp1);
      traverseDp(parsed.dp2);
      traverseDp(parsed.dp3);

      parsed.source_references = parsed.source_references || {};
      parsed.source_references.metric_weights_migration = {
        note: 'added top-level and option-level metric_weights defaults',
        script: 'scripts/fix-scenarios-metric-weights.js',
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(p, JSON.stringify(parsed, null, 2), 'utf8');
      touched++;
    } catch (e) {
      console.warn('Skipping', f, 'err', e.message);
    }
  }
  console.log('Patched', touched, 'scenario files.');
}

if (require.main === module) main();
module.exports = { main };
