#!/usr/bin/env node
/**
 * migrate_scenarios_to_v2.js
 * Converts legacy scenario JSON files into v2-compliant payloads.
 * Default mode is --dry-run which prints proposed output and unified diffs.
 * Use --overwrite to write converted files to data/scenarios_v2/ without touching originals.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  buildAjvValidator,
  validateScenarioData,
  applyAutoFixes,
  defaultMetricWeights
} = require('./validate_scenarios');

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'data', 'scenarios');
const OUTPUT_DIR = path.join(ROOT, 'data', 'scenarios_v2');

function readScenarioFiles() {
  return fs.readdirSync(INPUT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(INPUT_DIR, f));
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function buildV2Scenario(raw) {
  const { scenario, changes, manualNotes } = applyAutoFixes(raw);
  const output = {
    schema_version: '2.0',
    scenario_id: scenario.scenario_id || scenario.scenarioId || 'UNKNOWN',
    module_id: scenario.module_id || scenario.moduleId || '',
    canon_version: scenario.canon_version || scenario.canonVersion || '2.0',
    title: scenario.title || '',
    role: scenario.role || '',
    year: scenario.year || '',
    learning_outcome_id: scenario.learning_outcome_id || scenario.learningOutcomeId || '',
    scenario_lo: scenario.scenario_lo || scenario.learningOutcome || '',
    metrics: scenario.metrics || { core: [], secondary: [] },
    metric_weights: scenario.metric_weights || defaultMetricWeights(),
    bias_catalog: scenario.bias_catalog || [],
    effects_model: scenario.effects_model || {},
    situation: scenario.situation || '',
    decision_points: Array.isArray(scenario.decision_points) ? scenario.decision_points : [],
    reflection1_prompt: scenario.reflection1_prompt || '',
    reflection2_prompt: scenario.reflection2_prompt || '',
    source_references: Array.isArray(scenario.source_references) ? [...scenario.source_references] : []
  };

  output.source_references.push({
    field: 'migrated',
    source: 'repo:migrate_scenarios_to_v2.js',
    timestamp: new Date().toISOString()
  });

  // Normalize options once more to ensure defaults exist
  output.decision_points.forEach((dp, idx) => {
    if (!dp.dp_index) dp.dp_index = idx + 1;
    const options = Array.isArray(dp.options) ? dp.options : [];
    options.forEach(opt => {
      if (!opt.metric_weights) opt.metric_weights = defaultMetricWeights();
      if (!Array.isArray(opt.bias_tags)) opt.bias_tags = [];
      if (Array.isArray(opt.insightTags) && !opt.insight_tags) {
        opt.insight_tags = opt.insightTags;
        delete opt.insightTags;
      }
      if (opt.score === undefined) opt.score = 0;
      if (opt.ideal_confidence === undefined) opt.ideal_confidence = 0;
    });
    dp.options = options;
  });

  return { scenario: output, changes, manualNotes };
}

function showDiff(originalObj, newObj) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyp-migrate-'));
  const origPath = path.join(tmpDir, 'orig.json');
  const newPath = path.join(tmpDir, 'new.json');
  fs.writeFileSync(origPath, JSON.stringify(originalObj, null, 2));
  fs.writeFileSync(newPath, JSON.stringify(newObj, null, 2));
  const diff = spawnSync('diff', ['-u', origPath, newPath], { encoding: 'utf8' });
  return diff.stdout || diff.stderr || '(no diff output)';
}

function runCLI() {
  const args = process.argv.slice(2);
  const overwrite = args.includes('--overwrite');
  const files = readScenarioFiles();
  const { validate } = buildAjvValidator();
  const report = [];
  let processed = 0;
  let needingReview = 0;

  if (overwrite) ensureOutputDir();

  files.forEach(file => {
    const base = path.basename(file);
    if (base.startsWith('_')) return; // skip template

    processed++;
    const rel = path.relative(ROOT, file);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const { scenario, changes, manualNotes } = buildV2Scenario(raw);
    const validation = validateScenarioData(scenario, validate);

    const outName = `${scenario.scenario_id || base.replace('.json', '')}.v2.json`;
    const outPath = path.join(OUTPUT_DIR, outName);

    if (overwrite) {
      fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2));
      console.log(`Wrote ${outPath}`);
    } else {
      console.log(`\n=== ${rel} → ${outName} (dry-run) ===`);
      console.log(showDiff(raw, scenario));
    }

    const issues = [...validation.errors, ...validation.warnings, ...manualNotes];
    if (!validation.valid) needingReview++;
    if (issues.length) {
      report.push({ file: rel, issues });
    }
  });

  console.log('\nMigration report');
  console.log(`Processed: ${processed}`);
  console.log(`Needs author review: ${needingReview}`);
  if (report.length) {
    report.forEach(r => {
      console.log(` - ${r.file}`);
      r.issues.forEach(i => console.log(`    * ${i}`));
    });
  } else {
    console.log('No issues detected.');
  }
}

if (require.main === module) {
  runCLI();
}

module.exports = { runCLI, buildV2Scenario };
