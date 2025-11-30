-- sql/seed_families_and_module.sql
-- Idempotent seeds for module_families, demo module, and demo token.
-- Safe to run multiple times.

-- 1) Upsert module_families (idempotent using ON CONFLICT on code)
INSERT INTO public.module_families (code, name, description, sort_order, created_at)
VALUES
  ('COGNITIVE_STUDIES_FAMILY', 'Cognitive Studies Family', 'Family placeholder for cognitive/metacog modules', 100, now()),
  ('HYBRID_GRAY_ZONE_FAMILY', 'Hybrid & Gray Zone Family', 'Family placeholder for hybrid/gray-zone modules', 110, now()),
  ('COALITION_MISSION_FAMILY', 'Coalition & Mission Family', 'Family placeholder for coalition and mission modules', 120, now()),
  ('TECHNICAL_RESILIENCE_FAMILY', 'Technical Resilience Family', 'Family placeholder for cyber/technical resilience modules', 130, now()),
  ('COMMAND_CONTROL_FAMILY', 'Command & Control Family', 'Family placeholder for command & control modules', 140, now())
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = COALESCE(public.module_families.description, EXCLUDED.description),
      sort_order = EXCLUDED.sort_order,
      created_at = COALESCE(public.module_families.created_at, EXCLUDED.created_at);

-- 2) Ensure demo module exists and links to HYBRID_GRAY_ZONE_FAMILY
WITH fam AS (
  SELECT id FROM public.module_families WHERE code = 'HYBRID_GRAY_ZONE_FAMILY' LIMIT 1
)
INSERT INTO public.modules (family_id, name, code, description, is_demo, shelf_position, created_at)
SELECT fam.id, 'Hybrid & Gray Zone Conflict', 'MOD_HYBRID_GRAY', 'Demo module for Hybrid & Gray Zone', true, 1, now()
FROM fam
WHERE fam.id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.modules m WHERE m.code = 'MOD_HYBRID_GRAY');

-- 3) Upsert demo token (label, idempotent)
INSERT INTO public.tokens (token, label, is_active, created_at)
VALUES ('demo-token-123', 'Demo token (dev)', true, now())
ON CONFLICT (token) DO UPDATE
  SET label = EXCLUDED.label,
      is_active = EXCLUDED.is_active,
      created_at = COALESCE(public.tokens.created_at, EXCLUDED.created_at);

-- 4) Small verification selects (not executed by seed runner; included for manual checks)
-- SELECT id, code, name, sort_order, description FROM public.module_families WHERE code IN (
--   'COGNITIVE_STUDIES_FAMILY','HYBRID_GRAY_ZONE_FAMILY','COALITION_MISSION_FAMILY',
--   'TECHNICAL_RESILIENCE_FAMILY','COMMAND_CONTROL_FAMILY'
-- ) ORDER BY sort_order;
--
-- SELECT m.id, m.code, m.name, m.family_id, f.code AS family_code FROM public.modules m
-- LEFT JOIN public.module_families f ON f.id = m.family_id
-- WHERE m.code = 'MOD_HYBRID_GRAY';
--
-- SELECT id, token, label, is_active, created_at FROM public.tokens WHERE token = 'demo-token-123';
