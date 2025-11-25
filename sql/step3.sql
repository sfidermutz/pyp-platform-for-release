-- ensure pgcrypto
create extension if not exists pgcrypto;

-- Sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.tokens(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Decisions
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  scenario_id uuid,
  decision_point int,
  selected_option_id text,
  confidence int,
  time_on_page_ms int,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Seed 12 demo modules (replace family ids with the user's families)
insert into public.modules (id, family_id, name, code, description, shelf_position, is_demo)
values
  ('d66d6d90-4ee1-4443-9c9b-36bcd662815e', '3b415e0e-0720-4f5e-8227-09cc813095d6', 'Cognitive Friction & Bias', 'MOD_COG_FRICTION', 'Identify and mitigate cognitive traps and adversarial influence.', 1, true),
  ('1cda239d-722a-4451-8b75-9c97e3535470', '3b415e0e-0720-4f5e-8227-09cc813095d6', 'Metacognition', 'MOD_METACOGNITION', 'Develop reflective practice and adaptive learning.', 2, true),
  ('cb825f5b-0387-45f5-b962-d9afdc76a22d', '3b415e0e-0720-4f5e-8227-09cc813095d6', 'Ethical Judgments Under Pressure', 'MOD_ETHICAL_PRESSURE', 'Ethical decision making under political and ROE constraints.', 3, true),
  ('46c71b87-aa32-4b57-8668-fbc1f2065bb9', 'e2241184-216b-4122-a358-1418035cc90d', 'Hybrid & Gray Zone Conflict', 'MOD_HYBRID_GRAY', 'Operate and decide under ambiguous, below-threshold attacks.', 4, true),
  ('52f1806b-cca1-41c6-9784-eae9eeb4ffe8', 'e2241184-216b-4122-a358-1418035cc90d', 'Information Warfare', 'MOD_INFO_WARFARE', 'Counter narrative and deception in contested information environments.', 5, true),
  ('c816debb-ccc4-4cec-bdcc-562e84d7ef94', 'e2241184-216b-4122-a358-1418035cc90d', 'Below-Threshold Air & Maritime Incursions', 'MOD_BELOW_THRESHOLD', 'Respond to drone and ambiguous air/maritime probes.', 6, true),
  ('cc0bccdd-9a55-4359-b498-b8c1fa35186e', 'f4f79b9c-73a0-495a-a428172dd0d3', 'Mission Command', 'MOD_MISSION_COMMAND', 'Decentralized execution and initiative at the edge.', 7, true),
  ('d398c6b2-901f-4f1c-95d3-e7c0fc14f201', 'aa859567-f87f-4001-b394-57d23cfd6e86', 'Command & Control (C2) Complexity', 'MOD_C2_COMPLEX', 'Manage multi-echelon and multinational C2 tensions.', 8, true),
  ('38e87714-88f4-4afb-a675-b13b94daeb9c', 'b2d33610-0f2e-4934-861f-43c5d67fdd1e', 'Cyber Resilience', 'MOD_CYBER_RES', 'Operate during cyber disruption and degraded comms.', 9, true),
  ('cca0109d-4242-46a1-aae0-723a3dc5235f', 'b2d33610-0f2e-4934-861f-43c5d67fdd1e', 'AI & Autonomy', 'MOD_AI_AUTONOMY', 'Human-machine teaming challenges and autonomy ethics.', 10, true),
  ('d9ebe44b-b557-462c-89fa-5092dfbc541a', 'f4f79b9c-73a0-495a-a428172dd0d3', 'Operational Resilience', 'MOD_OPERATIONAL_RES', 'Maintain mission under sustained pressure.', 11, true),
  ('a232f9a8-887d-47c4-a8ea-3ce554097e23', 'f4f79b9c-73a0-495a-a428172dd0d3', 'Risk Anticipation', 'MOD_RISK_ANTICIPATION', 'Anticipate escalation and signaling risks.', 12, true
)
on conflict (code) do nothing;
