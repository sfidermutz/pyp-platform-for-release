# SQL migrations & schema snapshots

This folder stores SQL migrations and (optionally) committed schema snapshots.

## Schema snapshot
To produce a current schema snapshot and commit it for review:

1. Run locally:
   DATABASE_URL="postgres://<user>:<pass>@<host>:<port>/<db>" ./scripts/dump_schema.sh

2. Commit the produced file: `sql/schema_snapshot.sql`.

3. Keep snapshots small and commit only when schema changes. This makes code review and debugging easier.

## Admin schema route
If you prefer a live view, deploy the route `app/api/admin/schema/route.ts` and call:

  curl -H "x-api-key: <ADMIN_API_KEY>" "https://<deploy>/api/admin/schema?tables=module_families,modules,tokens"

This requires:
- `SUPABASE_SERVICE_ROLE_KEY` present on the server.
- `ADMIN_API_KEY` set as a server env var to protect the route.

## Safety
- `scripts/dump_schema.sh` writes a local file and does not change DB.
- The admin schema route requires `ADMIN_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
