// tools/generate_build_index.js
// Run: node tools/generate_build_index.js > BUILD_INDEX.md
const fs = require('fs');
const path = require('path');

function scan(dir, ext = '.md') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => path.join(dir,f));
}

const roots = [
  'docs',
  'data',
  'public/data/scenarios',
  'content/scenarios'
];

function fileMeta(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      path: filePath,
      mtime: stat.mtime.toISOString(),
      size: stat.size
    };
  } catch (e) {
    return { path: filePath, error: e.message };
  }
}

const files = [];
for (const r of roots) {
  const filesIn = fs.existsSync(r) ? fs.readdirSync(r) : [];
  for (const f of filesIn) {
    const full = path.join(r,f);
    if (fs.existsSync(full)) files.push(fileMeta(full));
  }
}

// Also include top-level repository files if present
['package.json','README.md','06_CHANGELOG/CHANGELOG.md'].forEach(f => {
  if (fs.existsSync(f)) files.push(fileMeta(f));
});

console.log(`# BUILD_INDEX\n\nGenerated: ${new Date().toISOString()}\n\n## Inventory\n`);
for (const f of files) {
  console.log(`- \`${f.path}\` — modified: ${f.mtime} — size: ${f.size}`);
}
