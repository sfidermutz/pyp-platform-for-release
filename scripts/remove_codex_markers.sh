#!/usr/bin/env bash
set -euo pipefail

# This script removes codex/confirm markers and standalone "main" lines
# from any tracked files. It saves backups as filename.bak.
# It avoids containing the literal codex/confirm in this script by constructing it.

LEFT="codex"
RIGHT="/confirm"
PAT="$LEFT$RIGHT"

echo "Searching for files that contain the marker pattern ($PAT)..."
FILES=$(git grep -l --line-number -I -- "$PAT" || true)

if [ -z "$FILES" ]; then
  echo "No files found containing pattern $PAT"
  exit 0
fi

echo "Files found:"
echo "$FILES"
read -p "Remove lines with '$PAT' and lines that are only 'main' from these files? (y/N) " RESP
if [[ "$RESP" != "y" && "$RESP" != "Y" ]]; then
  echo "Aborted by user. No files changed."
  exit 0
fi

while IFS= read -r file; do
  # git grep returns lines as "path:linenumber:content" so only extract path
  # If file contains colon at other places, ensure we split only on first colon
  fpath=$(echo "$file" | awk -F: '{print $1}')
  if [ ! -f "$fpath" ]; then
    echo "Skipping $fpath (not a regular file)"
    continue
  fi
  echo "Cleaning $fpath (backup -> $fpath.bak)"
  cp "$fpath" "$fpath.bak"
  # Remove lines containing the pattern and lines consisting of only 'main'
  awk -v pat="$PAT" '!index($0, pat) && !/^[[:space:]]*main[[:space:]]*$/' "$fpath.bak" > "$fpath.tmp"
  # Collapse repeated blank lines
  awk 'NF{p=1; print; next} p{print; p=0}' "$fpath.tmp" > "$fpath"
  rm "$fpath.tmp"
done <<< "$FILES"

echo "Done. Backups are saved as *.bak next to each modified file."
