-- sql/migrations/2025-12-02_add_meta_to_scenario_metrics.sql
-- Safe add of meta jsonb column to scenario_metrics

ALTER TABLE IF EXISTS scenario_metrics
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- Add a simple index to speed queries that check for presence of meta
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'idx_scenario_metrics_meta'
  ) THEN
    CREATE INDEX idx_scenario_metrics_meta ON scenario_metrics ((meta IS NOT NULL));
  END IF;
END
$$;
