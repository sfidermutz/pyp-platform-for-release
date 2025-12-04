#!/usr/bin/env node
// scripts/generate_synthetic_personas.js
// Usage: node scripts/generate_synthetic_personas.js 120
const fs = require('fs');
const path = require('path');

const seedPath = path.join('data','PYP_Synthetic_Personas_v1.0.json');
if (!fs.existsSync(seedPath)) { console.error('seed file missing', seedPath); process.exit(1); }
const seed = JSON.parse(fs.readFileSync(seedPath,'utf8'));
const seeds = seed.seed_personas || [];
const target = Number(process.argv[2] || 120);

function jitterNumeric(mean, sd) {
  // simple gaussian jitter
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
  return Math.max(0, mean + z*sd);
}

function sampleFromSeed(s) {
  const p = JSON.parse(JSON.stringify(s));
  // jitter numeric behavioural params slightly
  if (p.behavioural_parameters) {
    for (const k of ['dp_option_change_rate','use_back_button_rate','reflection_wordcount_mean']) {
      if (typeof p.behavioural_parameters[k] === 'number') {
        p.behavioural_parameters[k] = Math.max(0, jitterNumeric(p.behavioural_parameters[k], p.behavioural_parameters[k]*0.2));
      }
    }
  }
  // toggle small random categorical adjustments
  if (p.metric_sensitivity) {
    for (const m of Object.keys(p.metric_sensitivity)) {
      p.metric_sensitivity[m] = Math.max(0, Math.min(1, p.metric_sensitivity[m] + (Math.random()-0.5)*0.1));
    }
  }
  // set unique persona_id
  p.persona_id = p.persona_id + '_' + Math.random().toString(36).slice(2,7);
  return p;
}

const out = [];
for (let i=0;i<target;i++) {
  const base = seeds[i % seeds.length];
  out.push(sampleFromSeed(base));
}

fs.writeFileSync(path.join('data','synthetic_personas.json'), JSON.stringify(out, null, 2)+'\n');
console.log('Wrote data/synthetic_personas.json with', out.length, 'personas');
