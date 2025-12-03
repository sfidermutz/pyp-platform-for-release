// scripts/generate-scenario-stubs.js
// Generates scenario skeletons for HYB-PRE-02 -> HYB-POST-10 and writes to data/scenarios/*.json
// Uses conservative numeric placeholders and flags all placeholder values with todo_beth:true.
//
// Run: node scripts/generate-scenario-stubs.js

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'scenarios');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const biasCatalog = [
  "AnchoringBias","AvailabilityBias","AuthorityBias","ConfirmationBias","OptimismBias",
  "StatusQuoBias","SunkCostBias","Groupthink","OverconfidenceBias","FramingBias","CulturalBias","HierarchicalBias"
];

function makeOption(id) {
  return {
    id,
    text: "TODO: BETH - option text",
    metric_weights: { DecisionQuality: 1, InformationAdvantage: 1 },
    score: 50,
    ideal_confidence: 60,
    todo_beth: true
  };
}

function makeDp1() {
  return {
    stem: "TODO: BETH - DP1 stem",
    options: [ makeOption("1A"), makeOption("1B"), makeOption("1C") ]
  };
}

function makeDp2() {
  return {
    "1A": [ makeOption("2A1"), makeOption("2A2"), makeOption("2A3") ],
    "1B": [ makeOption("2B1"), makeOption("2B2"), makeOption("2B3") ],
    "1C": [ makeOption("2C1"), makeOption("2C2"), makeOption("2C3") ]
  };
}

function makeDp3() {
  const result = {};
  const dp2Keys = ["2A1","2A2","2A3","2B1","2B2","2B3","2C1","2C2","2C3"];
  dp2Keys.forEach(k => {
    result[k] = [
      makeOption(`${k}_3a`),
      makeOption(`${k}_3b`),
      makeOption(`${k}_3c`)
    ];
  });
  return result;
}

function makeScenario(sid) {
  return {
    scenario_id: sid,
    module: "HYB",
    title: "TODO: BETH - title",
    role: "TODO: BETH - role",
    year: null,
    primary_domain: "TODO: BETH",
    primary_level: "TODO: BETH",
    scenario_lo: "TODO: BETH - scenario learning outcome",
    metric_weights: { DecisionQuality: 1, InformationAdvantage: 1 },
    biasCatalog,
    situation: "TODO: BETH - scenario situation/setting (75-125 words)",
    dp1: makeDp1(),
    dp2: makeDp2(),
    dp3: makeDp3(),
    reflection_pre: { prompt: "TODO: BETH - reflection pre prompt", min_words: 50, todo_beth: true },
    reflection_post: { prompt: "TODO: BETH - reflection post prompt", min_words: 50, todo_beth: true },
    meta: { auto_generated: true, todo_beth: true }
  };
}

const scenarioIds = [
  "HYB-PRE-02","HYB-PRE-03","HYB-PRE-04","HYB-PRE-05","HYB-PRE-06","HYB-PRE-07","HYB-PRE-08",
  "HYB-PRAC-01","HYB-PRAC-02","HYB-PRAC-03","HYB-PRAC-04","HYB-PRAC-05","HYB-PRAC-06","HYB-PRAC-07",
  "HYB-POST-10"
];

scenarioIds.forEach(id => {
  const outPath = path.join(OUT_DIR, `${id}.json`);
  if (fs.existsSync(outPath)) {
    console.log(`Skipping existing file ${outPath}`);
    return;
  }
  const scenario = makeScenario(id);
  fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2), 'utf8');
  console.log(`Wrote stub ${outPath}`);
});
