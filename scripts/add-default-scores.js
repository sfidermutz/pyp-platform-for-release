// scripts/add-default-scores.js
// Run: node scripts/add-default-scores.js
const fs = require('fs');
const path = require('path');

const DIR = path.join(process.cwd(), 'data', 'scenarios');
const DEFAULT_SCORE = 50;
const DEFAULT_IDEAL_CONFIDENCE = 60;

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('readJson error', file, e.message);
    return null;
  }
}

// collect options from a dp node (mirrors validator logic)
function collectOptionsFromDp(dpRaw) {
  if (!dpRaw) return [];
  if (Array.isArray(dpRaw?.options)) return dpRaw.options;
  if (Array.isArray(dpRaw)) return dpRaw;
  if (Array.isArray(dpRaw?.default)) return dpRaw.default;

  const arr = [];
  for (const k of Object.keys(dpRaw)) {
    if (k === 'narrative' || k === 'stem' || k === 'options' || k === 'default') continue;
    const v = dpRaw[k];
    if (Array.isArray(v)) arr.push(...v);
  }
  return arr;
}

function ensureDefaultsOnOptions(options, filename, counters) {
  if (!options || !Array.isArray(options)) return;
  for (const opt of options) {
    if (!opt || typeof opt !== 'object') continue;
    if (typeof opt.score !== 'number') {
      opt.score = DEFAULT_SCORE;
      counters.addedScore++;
    }
    if (typeof opt.ideal_confidence !== 'number') {
      opt.ideal_confidence = DEFAULT_IDEAL_CONFIDENCE;
      counters.addedConfidence++;
    }
  }
}

function processFile(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  const parsed = readJson(filePath);
  if (!parsed) {
    console.warn(`Skipping ${rel} (failed parse)`);
    return { file: rel, updated: false };
  }

  const counters = { addedScore: 0, addedConfidence: 0, optionsTouched: 0 };

  // dp1
  const dp1 = parsed.dp1;
  if (dp1) {
    const opts = Array.isArray(dp1.options) ? dp1.options : (Array.isArray(dp1) ? dp1 : []);
    if (Array.isArray(opts)) {
      ensureDefaultsOnOptions(opts, filePath, counters);
      counters.optionsTouched += opts.length;
    }
  }

  // dp2 / dp3: could be array, object with keyed branches, or object with 'options'
  for (const dpKey of ['dp2', 'dp3']) {
    const raw = parsed[dpKey];
    if (!raw) continue;
    if (Array.isArray(raw) || Array.isArray(raw?.options)) {
      const opts = Array.isArray(raw) ? raw : raw.options;
      ensureDefaultsOnOptions(opts, filePath, counters);
      counters.optionsTouched += (Array.isArray(opts) ? opts.length : 0);
    } else if (typeof raw === 'object') {
      // branches keyed by previous choice
      for (const key of Object.keys(raw)) {
        const v = raw[key];
        if (Array.isArray(v)) {
          ensureDefaultsOnOptions(v, filePath, counters);
          counters.optionsTouched += v.length;
        }
      }
      // also check raw.default if present
      if (Array.isArray(raw.default)) {
        ensureDefaultsOnOptions(raw.default, filePath, counters);
        counters.optionsTouched += raw.default.length;
      }
    }
  }

  const updated = counters.addedScore > 0 || counters.addedConfidence > 0;
  if (updated) {
    // write back safely
    const formatted = JSON.stringify(parsed, null, 2) + '\n';
    fs.writeFileSync(filePath, formatted, 'utf8');
  }

  return { file: rel, updated, counters };
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error('Scenarios dir not found:', DIR);
    process.exit(2);
  }

  const files = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.json'));
  console.log(`Found ${files.length} scenario files in ${DIR}`);
  const summary = { filesProcessed: 0, filesUpdated: 0, totalAddedScore: 0, totalAddedConfidence: 0 };

  for (const f of files) {
    const full = path.join(DIR, f);
    const res = processFile(full);
    summary.filesProcessed++;
    if (res.updated) {
      summary.filesUpdated++;
      summary.totalAddedScore += res.counters.addedScore;
      summary.totalAddedConfidence += res.counters.addedConfidence;
      console.log(`Updated ${res.file}: +score ${res.counters.addedScore}, +ideal_conf ${res.counters.addedConfidence}`);
    }
  }

  console.log('---');
  console.log('Processed files:', summary.filesProcessed);
  console.log('Files updated:', summary.filesUpdated);
  console.log('Total score fields added:', summary.totalAddedScore);
  console.log('Total ideal_confidence fields added:', summary.totalAddedConfidence);
  console.log('Done. If you want different defaults change DEFAULT_SCORE / DEFAULT_IDEAL_CONFIDENCE in the script.');
}

main();
