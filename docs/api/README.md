# PYP Platform - API Overview (developer)

This document describes the newly added pages API endpoints to serve scenarios.

## Endpoints

### GET /api/module-scenarios?module=HYB
Returns `{ scenarios: [...] }` for the given module. Scans local `data/scenarios/` and falls back to GitHub if missing.

### GET /api/scenario/:id
Returns the full scenario JSON from `data/scenarios/<id>.json`.
Headers:
- `x-pyp-token` or `x-demo-token` (optional)
- `x-session-id` or `x-pyp-session` (optional)
Security:
- If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and `ALLOW_PUBLIC_SCENARIOS` is not `true`, the API will enforce token/session validation.
- For demos, set `ALLOW_PUBLIC_SCENARIOS=true` in environment variables.

### GET /api/scenarios/:moduleKey
Compatibility wrapper returning `{ module_title, scenarios }`.

### POST /api/admin/validate_scenario
Protected admin endpoint. Requires admin API key via `lib/adminAuth.checkAdminApiKey` or `ADMIN_API_KEY` env var. Body should be scenario JSON. Query `?fix=true` applies mechanical fixes and returns a `fixed` payload + changelog notes.

## Demo / Quick test

1. Generate the scenarios index:
   ```bash
   node scripts/generate-scenarios-index.js
```

2. Run local dev:

   ```bash
   npm run dev
   ```

3. Hit the endpoints:

   ```bash
   curl -v "http://localhost:3000/api/module-scenarios?module=HYB"
   curl -v "http://localhost:3000/api/scenario/HYB-01"
   ```

## Environment variables

* `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — enable validation
* `ALLOW_PUBLIC_SCENARIOS=true` — demo mode (serve scenarios without auth)
* `ADMIN_API_KEY` — admin validation fallback

