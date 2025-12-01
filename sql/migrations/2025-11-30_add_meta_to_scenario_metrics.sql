-- sql/migrations/2025-11-30_add_meta_to_scenario_metrics.sql
-- Adds a jsonb 'meta' column to scenario_metrics so server code can persist metadata.
-- This mirrors the change already applied to the live DB; keeping it in repo for audit.

BEGIN;

ALTER TABLE public.scenario_metrics
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- Ensure existing rows have a column value (no-op if null)
UPDATE public.scenario_metrics
SET meta = NULL
WHERE meta IS NULL;

COMMIT;

-- Optional: create a GIN index if queries will filter into meta. Uncomment if needed.
-- CREATE INDEX IF NOT EXISTS idx_scenario_metrics_meta_gin ON public.scenario_metrics USING GIN (meta);
