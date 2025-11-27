/**
 * scripts/validate-scenarios.js
 *
 * Scans data/scenarios/*.json for:
 *  - JSON syntax errors
 *  - missing scenarioId / scenario_id / id
 *  - missing moduleId / module_id / module
 *  - outputs a short report and exits with non-zero if any problem
 *
 * Usage:
 *   node scripts/validate-scenarios.js
 *
 * Intended to run in CI where workspace has the repository checked out.
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

function short(s, n=200) {
  return String(s).slice(0, n) + (String(s).length > n ? '…' : '');
}

function run() {
  console.log('validate-scenarios: scanning', SCENARIOS_DIR);
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
      if (!sid) {
        errors.push({ file: rel, kind: 'MISSING_SCENARIO_ID', message: 'no scenarioId / scenario_id / id found' });
      } else {
        // check file name vs scenario id
        const base = path.basename(file);
        const expectedName = `${sid}.json`;
        if (base !== expectedName) {
          errors.push({ file: rel, kind: 'FILENAME_MISMATCH', message: `basename=${base} expected ${expectedName}` });
        }
      }

      if (!mid) {
        errors.push({ file: rel, kind: 'MISSING_MODULE_ID', message: 'no moduleId/module_id/module found' });
      }

      // minimal structural checks useful for this project:
      if (!parsed.title) {
        errors.push({ file: rel, kind: 'MISSING_TITLE', message: 'title is missing or empty' });
      }
      // check dp structure exists
      if (!parsed.dp1 && !parsed.dp2 && !parsed.dp3) {
        errors.push({ file: rel, kind: 'MISSING_DPS', message: 'dp1/dp2/dp3 structure missing' });
      }
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
