#!/usr/bin/env node
'use strict';

/**
 * scripts/check_markers.js
 * Minimal, robust checker used in prebuild step.
 * - Lists tracked files via `git ls-files`
 * - Scans for merge conflict markers, codex/confirm markers, and standalone "main" lines
 * - Reports findings and exits non-zero if any found (so CI fails early)
 *
 * This file intentionally avoids duplicate declarations and uses safe APIs.
 */

const child = require('child_process');
const fs = require('fs');

function listGitFiles() {
  try {
    const out = child.execSync('git ls-files', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('git ls-files failed:', e && e.message);
    process.exit(1);
  }
}

const patterns = [
  { name: 'merge-conflict-start', rex: /^<{7}/ },
  { name: 'merge-conflict-middle', rex: /^={7}/ },
  { name: 'merge-conflict-end', rex: /^>{7}/ },
  { name: 'codex-marker', rex: /codex\/confirm/ },
  { name: 'main-standalone', rex: /^\s*main\s*$/ },
];

let found = 0;

for (const file of listGitFiles()) {
  // Skip large/binary files and node_modules
  if (file.startsWith('node_modules/') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.lock')) {
    continue;
  }
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    continue;
  }
  const lines = text.split(/\r?\n/);
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
  console.error(`\nFound ${found} marker(s) that should be removed. Exiting with code 1.`);
  process.exit(1);
}

console.log('No conflict markers or codex markers found.');
process.exit(0);
