#!/usr/bin/env node
'use strict';

const child = require('child_process');
const fs = require('fs');

function gitFiles() {
  try {
    const out = child.execSync('git ls-files', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('git ls-files failed:', e && e.message);
    process.exit(2);
  }
}

// Construct the pattern at runtime to avoid embedding the full marker
const A = 'codex';
const B = '/confirm';
const MARKER = A + B;

const patterns = [
  { name: 'merge-start', rex: /^<{7}/ },
  { name: 'merge-mid', rex: /^={7}/ },
  { name: 'merge-end', rex: /^>{7}/ },
  { name: 'marker', rex: new RegExp(MARKER) },
  { name: 'main-only', rex: /^\s*main\s*$/ },
];

let found = 0;

for (const file of gitFiles()) {
  if (file.startsWith('node_modules/') || /\.png$|\.jpg$|\.jpeg$|\.lock$/i.test(file)) continue;
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
        console.error(`${file}:${idx + 1} [${p.name}] ${line.trim()}`);
        found += 1;
        break;
      }
    }
  });
}

if (found > 0) {
  console.error(`\nFound ${found} marker(s). Remove them before build.`);
  process.exit(1);
}

console.log('No markers found.');
process.exit(0);
