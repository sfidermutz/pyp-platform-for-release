#!/usr/bin/env node
// scripts/check_markers.js
// Scan tracked files for conflict markers or stray codex markers that can break builds.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function listFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

const patterns = [
  { name: 'conflict-start', regex: /^<{7}/ },
  { name: 'conflict-mid', regex: /^={7}/ },
  { name: 'conflict-end', regex: /^>{7}/ },
  { name: 'codex-marker', regex: /codex\/confirm/ },
 codex/confirm-repository-access-permissions-08od5l
  { name: 'stray-main-line', regex: /^\s*main\s*$/ },

 codex/confirm-repository-access-permissions-hkc44l
  { name: 'stray-main-line', regex: /^\s*main\s*$/ },

 main
 main
];

let issues = [];
for (const file of listFiles()) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    // Skip files we can't read as utf8 (likely binary)
    continue;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const pat of patterns) {
      if (pat.regex.test(line)) {
        issues.push({ file, line: line.trim(), lineNumber: idx + 1, type: pat.name });
        break;
      }
    }
  });
}

if (issues.length) {
  console.error('Found markers that should be removed:');
  for (const i of issues) {
    console.error(`- ${i.file}:${i.lineNumber} [${i.type}] ${i.line}`);
  }
  process.exit(1);
}

console.log('No conflict or codex markers found.');
