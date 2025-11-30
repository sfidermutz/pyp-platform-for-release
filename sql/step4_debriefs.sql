-- sql/step4_debriefs.sql
-- Create a persistent debriefs table for storing computed debriefs
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.debriefs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  scenario_id text,
  selections jsonb,
  reflection text,
  metrics jsonb,
  short_feedback jsonb,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_debriefs_session on public.debriefs(session_id);
create index if not exists idx_debriefs_scenario on public.debriefs(scenario_id);
