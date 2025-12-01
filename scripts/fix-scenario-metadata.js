// scripts/fix-scenario-metadata.js
// Add minimal safe defaults when certain scenario metadata is missing.
// - Adds moduleId = "HYB" if moduleId/module/module_id is missing
// - Adds metrics.core default array if missing or empty
// - Strips BOM before parsing
const fs = require('fs');
const path = require('path');

const DIR = path.join(process.cwd(), 'data', 'scenarios');
const DEFAULT_MODULE_ID = 'HYB';
const DEFAULT_METRICS_CORE = [
  "InformationAdvantage",
  "TrustCalibration",
  "BiasAwareness",
  "CognitiveAdaptability",
  "EscalationRisk"
];

function readJson(file) {
  try {
    let raw = fs.readFileSync(file, 'utf8');
    if (raw && raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch (e) {
    console.error('readJson error', file, e.message);
    return null;
  }
}

function writeJson(file, obj) {
  const formatted = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(file, formatted, 'utf8');
}

function normalizeModule(obj) {
  return obj?.moduleId ?? obj?.module_id ?? obj?.module ?? null;
}

function run() {
  if (!fs.existsSync(DIR)) {
    console.error('Scenarios dir not found:', DIR);
    process.exit(2);
  }

  const files = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.json'));
  console.log(`Scanning ${files.length} scenario files in ${DIR}`);
  let updatedCount = 0;

  for (const f of files) {
    const full = path.join(DIR, f);
    // skip templates
    if (f.startsWith('_')) continue;
    const parsed = readJson(full);
    if (!parsed) {
      console.warn(`Skipping ${f} — parse failed`);
      continue;
    }

    let changed = false;

    // Add moduleId if missing
    const mid = normalizeModule(parsed);
    if (!mid) {
      parsed.moduleId = DEFAULT_MODULE_ID;
      parsed.module_id = parsed.module_id ?? DEFAULT_MODULE_ID; // optional
      console.log(`Added moduleId=${DEFAULT_MODULE_ID} to ${f}`);
      changed = true;
    }

    // Ensure metrics.core exists and is non-empty
    if (!parsed.metrics || !Array.isArray(parsed.metrics.core) || parsed.metrics.core.length === 0) {
      parsed.metrics = parsed.metrics || {};
      parsed.metrics.core = DEFAULT_METRICS_CORE;
      console.log(`Set default metrics.core on ${f}`);
      changed = true;
    }

    if (changed) {
      writeJson(full, parsed);
      updatedCount++;
    }
  }

  console.log(`Done — files updated: ${updatedCount}`);
}

run();
