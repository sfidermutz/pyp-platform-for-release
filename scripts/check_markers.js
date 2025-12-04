#!/usr/bin/env node
'use strict';

/**
 * scripts/check_markers.js
 * Minimal, robust checker used during prebuild.
 * - Scans all tracked files for conflict markers and codex markers and
 *   reports them (exit code 1 if any found).
 * - Does NOT redeclare identifiers. Compatible with Node 18+.
 */

const child = require('child_process');
const fs = require('fs');

function listGitFiles() {
  // Use git ls-files for tracked files
  try {
    const out = child.execSync('git ls-files', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('git ls-files failed:', e && e.message);
    process.exit(1);
  }
}

const fileList = listGitFiles();

const patterns = [
  { name: 'merge-conflict-start', regex: /^<{7}/ },
  { name: 'merge-conflict-middle', regex: /^={7}/ },
  { name: 'merge-conflict-end', regex: /^>{7}/ },
  { name: 'codex-marker', regex: /codex\/confirm/ },
  { name: 'main-standalone', regex: /^\s*main\s*$/ },
];

let problemCount = 0;

for (const file of fileList) {
  // limit to text files of interest (skip node_modules etc.)
  if (file.startsWith('node_modules/') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.lock')) continue;

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    // skip unreadable files
    continue;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const pat of patterns) {
      if (pat.regex.test(line)) {
        console.error(`${file}:${idx+1} [${pat.name}] ${line.trim()}`);
        problemCount += 1;
      }
    }
  });
}

if (problemCount > 0) {
  console.error(`\nFound ${problemCount} problem(s). Please inspect the reported files or run the automated cleanup script.`);
  process.exit(1);
}

console.log('No conflict or codex markers found.');
process.exit(0);
