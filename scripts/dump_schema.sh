#!/usr/bin/env bash
set -euo pipefail

# Usage:
#     DATABASE_URL="postgres://user:pass@host:5432/dbname" ./scripts/dump_schema.sh
# or:
#     ./scripts/dump_schema.sh "<connection_string>"

if [ $# -ge 1 ]; then
  CONN="$1"
elif [ -n "${DATABASE_URL:-}" ]; then
  CONN="${DATABASE_URL}"
else
  echo "Usage: DATABASE_URL=... ./scripts/dump_schema.sh  OR  ./scripts/dump_schema.sh \"postgres://...\""
  exit 1
fi

OUT="sql/schema_snapshot.sql"

echo "Dumping schema-only to $OUT ..."
pg_dump --schema-only --no-owner --no-privileges "$CONN" > "$OUT"
echo "Wrote $OUT"
