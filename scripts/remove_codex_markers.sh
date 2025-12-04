#!/usr/bin/env bash
set -euo pipefail

echo "Finding files with 'codex/confirm'..."
FILES=$(git grep -l "codex/confirm" || true)

if [ -z "$FILES" ]; then
  echo "No codex markers found."
  exit 0
fi

echo "Found these files:"
echo "$FILES"

read -p "Remove codex lines and standalone 'main' lines from these files? (y/N) " RESP
if [[ "$RESP" != "y" && "$RESP" != "Y" ]]; then
  echo "Aborted by user. No files changed."
  exit 0
fi

for f in $FILES; do
  echo "Processing $f..."
  cp "$f" "$f.bak"
  awk '!/codex\/confirm/ && !/^[[:space:]]*main[[:space:]]*$/' "$f.bak" > "$f"
  awk 'NF{p=1; print; next} p{print; p=0}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  echo "Backed up to $f.bak and cleaned $f"
done

echo "Done. Please inspect the *.bak files if you want to restore any content."
