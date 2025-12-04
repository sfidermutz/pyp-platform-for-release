// Usage:
// node scripts/add_changelog_entry.js "2025-12-04" "Added MASTER_REQUIREMENTS.md" "Assistant" "docs/MASTER_REQUIREMENTS.md"

const fs = require('fs');
const [,, date, title, author, files] = process.argv;
if (!date || !title) {
  console.error('Usage: node add_changelog_entry.js DATE "TITLE" AUTHOR FILE1,FILE2');
  process.exit(1);
}
const entry = `\n## ${date} — ${title}\n**Author:** ${author || 'unknown'}\n**Files:** ${files || ''}\n\n`;
fs.appendFileSync('06_CHANGELOG/CHANGELOG.md', entry);
console.log('Added changelog entry.');
