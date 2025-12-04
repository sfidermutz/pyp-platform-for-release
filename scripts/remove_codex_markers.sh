#!/usr/bin/env bash
set -euo pipefail

echo "Searching for files with the marker..."
PAT_PART1="codex"
PAT_PART2="/confirm"
PAT="$PAT_PART1$PAT_PART2"

FILES=$(git grep -l "$PAT" || true)
if [ -z "$FILES" ]; then
  echo "No files found with pattern $PAT"
  exit 0
fi

echo "Files to clean:"
echo "$FILES"

read -p "Remove lines with '$PAT' and standalone 'main' from these files? (y/N) " RESP
if [[ "$RESP" != "y" && "$RESP" != "Y" ]]; then
  echo "Aborting; no files modified."
  exit 0
fi

for f in $FILES; do
  echo "Cleaning $f (backup -> $f.bak)"
  cp "$f" "$f.bak"
  # remove lines containing the pattern and lines that are just 'main'
  awk -v pat="$PAT" '!index($0, pat) && !/^[[:space:]]*main[[:space:]]*$/' "$f.bak" > "$f"
  # collapse extra blank lines
  awk 'NF{p=1; print; next} p{print; p=0}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

echo "Done. Backups saved as *.bak"
