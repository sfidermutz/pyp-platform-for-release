// scripts/generate-scenarios-index.js
// Run at build time: reads data/scenarios/*.json and writes public/data/scenarios_index.json
// Usage: node scripts/generate-scenarios-index.js

const fs = require('fs');
const path = require('path');

const SCENARIOS_DIR = path.join(__dirname, '..', 'data', 'scenarios');
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'scenarios_index.json');

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Skipping invalid scenario file', filePath, e.message);
    return null;
  }
}

function buildIndex() {
  if (!fs.existsSync(SCENARIOS_DIR)) {
    console.warn('No data/scenarios directory found:', SCENARIOS_DIR);
    return { generated_at: new Date().toISOString(), count: 0, items: [] };
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SCENARIOS_DIR).filter(f => f.toLowerCase().endsWith('.json'));
  const list = [];

  for (const f of files) {
    const p = path.join(SCENARIOS_DIR, f);
    const parsed = safeReadJson(p);
    if (!parsed) continue;

    const item = {
      filename: f,
      id: parsed.scenario_id ?? parsed.id ?? parsed.scenarioId ?? null,
      title: parsed.title ?? parsed.name ?? null,
      module: parsed.module ?? parsed.module_id ?? parsed.moduleId ?? null,
      role: parsed.role ?? null,
      year: parsed.year ?? null,
      default_scenario_id: parsed.default_scenario_id ?? null,
    };
    list.push(item);
  }

  const out = { generated_at: new Date().toISOString(), count: list.length, items: list };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE} (${list.length} items)`);
  return out;
}

if (require.main === module) {
  try {
    buildIndex();
    process.exit(0);
  } catch (e) {
    console.error('generate-scenarios-index failed', e);
    process.exit(1);
  }
}

module.exports = { buildIndex };
