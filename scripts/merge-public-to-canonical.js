// scripts/merge-public-to-canonical.js
// Merge metric_weights from public/data/scenarios/*.json into data/scenarios/*.json
// and add conservative numeric score/ideal_confidence placeholders where missing.
// Marks inserted numeric values with todo_beth:true so editors can find them.
//
// Usage: node scripts/merge-public-to-canonical.js
// WARNING: run on a branch or ensure you have a backup. This script writes canonical files.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'scenarios');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'data', 'scenarios');

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'));
}

function safeParse(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn('parse failed for', file, e.message);
    return null;
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

function collectOptionsMap(scenario) {
  // returns map id -> option object (shallow)
  const map = new Map();

  function visitDp(dp) {
    if (!dp) return;
    if (Array.isArray(dp)) {
      dp.forEach(o => { if (o && o.id) map.set(String(o.id), o); });
      return;
    }
    if (Array.isArray(dp.options)) {
      dp.options.forEach(o => { if (o && o.id) map.set(String(o.id), o); });
    }
    if (typeof dp === 'object') {
      for (const k of Object.keys(dp)) {
        if (['stem','narrative','default','options'].includes(k)) continue;
        const v = dp[k];
        if (Array.isArray(v)) {
          v.forEach(o => { if (o && o.id) map.set(String(o.id), o); });
        }
      }
      if (Array.isArray(dp.default)) dp.default.forEach(o => { if (o && o.id) map.set(String(o.id), o); });
    }
  }

  visitDp(scenario.dp1);
  if (scenario.dp2) {
    if (Array.isArray(scenario.dp2)) visitDp(scenario.dp2);
    else if (typeof scenario.dp2 === 'object') {
      for (const k of Object.keys(scenario.dp2)) visitDp(scenario.dp2[k]);
    }
  }
  if (scenario.dp3) {
    if (Array.isArray(scenario.dp3)) visitDp(scenario.dp3);
    else if (typeof scenario.dp3 === 'object') {
      for (const k of Object.keys(scenario.dp3)) visitDp(scenario.dp3[k]);
    }
  }

  return map;
}

function applyHeuristicScore(opt, metric_weights) {
  // conservative numeric defaults based on DecisionQuality weight
  const dq = metric_weights && typeof metric_weights.DecisionQuality === 'number'
    ? metric_weights.DecisionQuality
    : null;

  let score, ideal_confidence;
  if (dq === null) {
    const anyWeight = metric_weights && Object.keys(metric_weights).length > 0;
    if (anyWeight) {
      score = 60; ideal_confidence = 60;
    } else {
      score = 50; ideal_confidence = 60;
    }
  } else if (dq >= 2) {
    score = 85; ideal_confidence = 80;
  } else if (dq === 1) {
    score = 70; ideal_confidence = 70;
  } else if (dq === 0) {
    score = 55; ideal_confidence = 60;
  } else {
    score = 40; ideal_confidence = 40;
  }

  if (typeof opt.score !== 'number') {
    opt.score = score;
    opt.todo_beth = true;
  }
  if (typeof opt.ideal_confidence !== 'number') {
    opt.ideal_confidence = ideal_confidence;
    opt.todo_beth = true;
  }
}

function mergePublicIntoCanonical(canonical, pub) {
  if (!canonical || !pub) return false;
  let modified = false;

  if (pub.metric_weights && typeof pub.metric_weights === 'object') {
    if (!canonical.metric_weights || JSON.stringify(canonical.metric_weights) !== JSON.stringify(pub.metric_weights)) {
      canonical.metric_weights = pub.metric_weights;
      modified = true;
    }
  }

  const publicMap = collectOptionsMap(pub);
  const canonicalMap = collectOptionsMap(canonical);

  for (const [id, opt] of canonicalMap.entries()) {
    if (!opt) continue;
    const p = publicMap.get(String(id));
    if (p && p.metric_weights && typeof p.metric_weights === 'object') {
      if (!opt.metric_weights || JSON.stringify(opt.metric_weights) !== JSON.stringify(p.metric_weights)) {
        opt.metric_weights = p.metric_weights;
        modified = true;
      }
      applyHeuristicScore(opt, opt.metric_weights);
      modified = true;
    } else {
      if (!opt.metric_weights && canonical.metric_weights && typeof canonical.metric_weights === 'object') {
        applyHeuristicScore(opt, canonical.metric_weights);
        modified = true;
      } else {
        applyHeuristicScore(opt, opt.metric_weights || {});
        modified = true;
      }
    }
  }

  return modified;
}

function processFiles() {
  const publicFiles = listJson(PUBLIC_DIR);
  if (publicFiles.length === 0) {
    console.log('No public scenario files found in', PUBLIC_DIR);
  }
  const dataFiles = listJson(DATA_DIR);

  let mergedCount = 0;
  for (const pubFile of publicFiles) {
    const canonicalPath = path.join(DATA_DIR, pubFile);
    const publicPath = path.join(PUBLIC_DIR, pubFile);
    if (!fs.existsSync(canonicalPath)) {
      console.warn('Canonical file missing for public:', pubFile, ' — skipping.');
      continue;
    }

    const pubObj = safeParse(publicPath);
    const canObj = safeParse(canonicalPath);
    if (!pubObj || !canObj) {
      console.warn('Parse failed for', pubFile, ' — skipping.');
      continue;
    }

    const changed = mergePublicIntoCanonical(canObj, pubObj);
    if (changed) {
      writeJson(canonicalPath, canObj);
      mergedCount++;
      console.log('Merged metric_weights and scores into', canonicalPath);
    } else {
      console.log('No changes required for', canonicalPath);
    }
  }

  console.log(`Merge complete. ${mergedCount} canonical files updated.`);
}

if (require.main === module) {
  processFiles();
}

Final notes to Codex operator / human

This process is intentionally conservative: backup branch is created and public files moved there before deleting from main.

All generated numeric fields are flagged "todo_beth": true.

If the validator finds issues after the merge, stop and paste the results here. I will triage any remaining validation errors quickly.

After this runs, the canonical scenario files in data/scenarios/ should contain both narrative and scoring intent; the website will serve full scenarios only via /api/scenario/<id>. 

