#!/usr/bin/env node
'use strict';

/**
 * scripts/check_markers.js
 * Robust prebuild checker that:
 *  - Lists tracked files (git ls-files)
 *  - Scans for merge conflict markers, codex markers (built at runtime), and standalone "main" lines
 *  - Reports findings and exits non-zero if any found
 *
 * This implementation avoids containing the literal "codex/confirm" in the file text,
 * so the checker won't flag itself during the scan.
 */

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

// Build the codex marker at runtime so this file does not contain the literal.
const codexLeft = 'codex';
const codexRight = '/confirm';
const codexMarkerString = codexLeft + codexRight;

const patterns = [
  { name: 'merge-conflict-start', rex: /^<{7}/ },
  { name: 'merge-conflict-middle', rex: /^={7}/ },
  { name: 'merge-conflict-end', rex: /^>{7}/ },
  // codex-marker is constructed at runtime
  { name: 'codex-marker', rex: new RegExp(codexMarkerString) },
  { name: 'main-standalone', rex: /^\s*main\s*$/ },
];

let totalFound = 0;

for (const file of gitFiles()) {
  // skip big/binary and node_modules
  if (file.startsWith('node_modules/') || /\.png$|\.jpg$|\.jpeg$|\.lock$/i.test(file)) continue;
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    // unreadable, skip
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.rex.test(line)) {
        console.error(`${file}:${idx + 1} [${p.name}] ${line.trim()}`);
        totalFound += 1;
        break;
      }
    }
  });
}

if (totalFound > 0) {
  console.error(`\nFound ${totalFound} marker(s). Please remove them before build.`);
  process.exit(1);
}

console.log('No markers found.');
process.exit(0);
