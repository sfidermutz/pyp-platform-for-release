#!/usr/bin/env bash
set -euo pipefail

# This script removes lines containing the target marker and lines that are only "main".
# It constructs the marker at runtime so the literal is not present in the script text.
LEFT="codex"
RIGHT="/confirm"
PAT="$LEFT$RIGHT"

echo "Looking for files containing the marker: $PAT"
FILES=$(git grep -l -- "$PAT" || true)

if [ -z "$FILES" ]; then
  echo "No files contain the marker $PAT"
  exit 0
fi

echo "Files found:"
echo "$FILES"
read -p "Remove lines with '$PAT' and standalone 'main' from these files? (y/N) " RESP
if [[ "$RESP" != "y" && "$RESP" != "Y" ]]; then
  echo "No changes made."
  exit 0
fi

for f in $FILES; do
  if [ ! -f "$f" ]; then
    echo "Skipping $f (not a regular file)"
    continue
  fi
  echo "Cleaning $f — backup -> $f.bak"
  cp "$f" "$f.bak"
  # Remove lines containing the marker and lines that are only 'main'
  awk -v pat="$PAT" '!index($0, pat) && !/^[[:space:]]*main[[:space:]]*$/' "$f.bak" > "$f.tmp"
  # Collapse multiple blank lines
  awk 'NF{p=1; print; next} p{print; p=0}' "$f.tmp" > "$f"
  rm "$f.tmp"
done

echo "Done. Backups saved as *.bak"
