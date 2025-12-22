-- Adds provenance and AI audit columns per MASTER_REQUIREMENTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenarios' AND column_name = 'source_references'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN source_references JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN scenarios.source_references IS 'Supports SOT provenance for scenario authoring inputs';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenario_runs' AND column_name = 'ai_audit'
  ) THEN
    ALTER TABLE scenario_runs ADD COLUMN ai_audit JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN scenario_runs.ai_audit IS 'Stores AI audit entries for scenario runs';
  END IF;
END $$;
