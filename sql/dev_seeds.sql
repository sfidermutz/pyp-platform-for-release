-- sql/dev_seeds.sql
-- Developer seeds: creates demo tokens and module_families expected by step3.sql
-- Idempotent: safe to run multiple times.

-- Demo token for local/dev testing (use this token with /api/create-session)
INSERT INTO public.tokens (token, name, is_active)
VALUES ('demo-token-123', 'Demo token (dev)', true)
ON CONFLICT (token) DO NOTHING;

-- Module family seeds
-- These UUIDs match family_id references used in sql/step3.sql
INSERT INTO public.module_families (id, name, description)
VALUES
  ('3b415e0e-0720-4f5e-8227-09cc813095d6', 'Cognitive Studies Family', 'Family placeholder for cognitive/metacog modules'),
  ('e2241184-216b-4122-a358-1418035cc90d', 'Hybrid & Gray Zone Family', 'Family placeholder for hybrid/gray-zone modules'),
  ('f4f79b9c-73a0-495a-a428172dd0d3', 'Coalition & Mission Family', 'Family placeholder for coalition and mission modules'),
  ('b2d33610-0f2e-4934-861f-43c5d67fdd1e', 'Technical Resilience Family', 'Family placeholder for cyber/technical resilience modules'),
  ('aa859567-f87f-4001-b394-57d23cfd6e86', 'Command & Control Family', 'Family placeholder for command & control modules')
ON CONFLICT (id) DO NOTHING;

-- Optionally insert a friendly demo module (only if you want a guaranteed module record)
INSERT INTO public.modules (code, name, description, is_demo)
VALUES ('MOD_HYBRID_GRAY', 'Hybrid & Gray Zone Conflict', 'Demo module for Hybrid & Gray Zone', true)
ON CONFLICT (code) DO NOTHING;
