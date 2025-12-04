#!/usr/bin/env node
'use strict';

/**
 * scripts/check_markers.js
 * Minimal checker used in prebuild.
 * Reports occurrences of:
 *  - merge conflict markers (<<<<<<<, =======, >>>>>>>)
 *  - 'codex/confirm' patterns
 *  - standalone 'main' lines
 * Exits 1 if any found.
 */

const child = require('child_process');
const fs = require('fs');

function gitFiles() {
  try {
    return child.execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('git ls-files failed:', e && e.message);
    process.exit(1);
  }
}

const patterns = [
  { name: 'merge-start', rex: /^<{7}/ },
  { name: 'merge-mid', rex: /^={7}/ },
  { name: 'merge-end', rex: /^>{7}/ },
  { name: 'codex-marker', rex: /codex\/confirm/ },
  { name: 'main-standalone', rex: /^\s*main\s*$/ },
];

let count = 0;

for (const file of gitFiles()) {
  if (file.startsWith('node_modules/') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.lock')) continue;
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.rex.test(line)) {
        console.error(`${file}:${idx+1} [${p.name}] ${line.trim()}`);
        count++;
        break;
      }
    }
  });
}

if (count > 0) {
  console.error(`\nFound ${count} marker(s). Please remove them before build.`);
  process.exit(1);
}

console.log('No markers found.');
process.exit(0);
