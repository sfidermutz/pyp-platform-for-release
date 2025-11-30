# SQL migrations

This directory contains SQL migration snippets used by the project.

Run order:
1. `sql/step2_core_tables.sql`  -- creates tokens, module_families, modules, reflections, scenario_metrics, certificates
2. `sql/step3.sql`             -- creates sessions, events, decisions and seeds modules (already present)

To apply (locally / dev Postgres / Supabase):
- Use psql, supabase CLI, or your DB management tool.

Example with psql (local Postgres):
  psql -h <host> -U <user> -d <db> -f sql/step2_core_tables.sql
  psql -h <host> -U <user> -d <db> -f sql/step3.sql

If using Supabase SQL editor, paste each file in the given order and run.

All statements are idempotent (CREATE TABLE IF NOT EXISTS), safe to run multiple times.
