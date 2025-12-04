# MASTER_REQUIREMENTS — Pick-Your-Path (PYP) Strategic Edge
**Version:** v1.0 (canonical — merged Beth ChatGPT + mission-control)  
**Generated:** 2025-12-04  
**Owner:** Bethany Fidermutz — Learning Architecture

---

## Executive summary
PYP (Pick-Your-Path) is a scenario-based cognitive readiness engine for coalition & civilian leaders. This document is the canonical Source Of Truth (SOT) for scenario authoring, telemetry/metrics, persona testing, DIANA compliance, and debrief generation. It aggregates Beth’s final instructions, canonical Slack guidance and Dropbox master files.

---

## Precedence & provenance
**Precedence (highest → lowest):**
1. Beth ChatGPT final threads (end-of-thread) — authoritative for immediate decisions.  
2. Unpinned Slack threads (mission-control) — working decisions.  
3. Pinned Slack canonical packs — governance & canonical rule sets.  
4. Dropbox master files — templates and historical artifacts.  
5. Legacy drafts (archived).

**Canonical change rule:** Any canonical change must: update `MASTER_REQUIREMENTS.md`, create a `CHANGELOG.md` entry (field-level), and update `BUILD_INDEX.md` with provenance.

---

## Scope & goals
- Single-source SOT for site build and engine behavior.  
- Machine and human-readable templates & examples.  
- Full provenance for every field: `source_references` with file/Slack/thread + timestamp + author.

---

## Scenario architecture (authoritative)
**Scenario object (required fields):**
- `scenario_id` (UUID), `scenario_key`, `short_name`, `module`, `year`, `role`, `summary`, `tags[]`, `bloom_level`, `krathwohl_level`, `scenario_lo_id`, `scenario_lo_text`.

**Decision model:**
- Structure: `DP1 → DP2 → DP3` (DP3 branches = 9; each DP recommended 3 options = **27** DP outcomes).  
- Situation length: 100–200 words.  
- Option text: 12–22 words.  
- Recommended options per DP: 3 (authors may create 2–4 but validator expects 3).  
- Reflection 1 (pre-debrief): min 50 words. Reflection 2 (post-debrief): 50–250 words, must reference module LO.

**Authoring validation:**
- All options must include:
  - `id` (string), `text` (string), `metric_weights` (object), `score` (number), `ideal_confidence` (number), `bias_tags` (array).
- Top-level `metric_weights` object required for scenario-level defaults.

---

## Metadata & Tagging
- Use canonical `PYP_MASTER_TAG_REFERENCE.csv` as ground truth (stored in `/data/` or `/docs/`).  
- Required header fields: `scenario_id`, `scenario_key`, `short_name`, `module`, `year`, `role`, `summary`, `themes[]`, `tags[]`, `bloom_level`, `krathwohl_level`.

---

## Metrics & scoring (canonical)
**Core metrics:** DecisionQuality, TrustCalibration, InformationAdvantage, BiasAwareness, CognitiveAdaptability, MissionScore, CRI, RedTeamAwareness.  
**Per-decision contribution:** `contrib_M = option.metric_weights[M] * persona.metric_sensitivity[M]`.  
**Behavioural Adjustment Factor (BAF)** — derived from changed_before_next/time_on_decision/confidence_missing: multiplicative modifier.  
**Normalization:** raw sums normalized to 0–100.  
**MissionScore:** weighted composite (configurable; default DQ=0.4, IA=0.25, TC=0.15, CA=0.2).  
**CRI:** composite of CA, BA and decision-time-normalized resilience.

---

## Persona & synthetic testing
- Authoritative persona schema (see `/data/PYP_Synthetic_Personas_v1.0.json`).  
- Synthetic pilot spec: default cohort 120; five behavioral clusters.  
- Personas are zero-PII and flagged `is_synthetic:true`.

---

## Telemetry & logging
Per-decision `DecisionLogEntry` (fields):
- `decision_id`, `user_id|persona_id`, `session_id`, `scenario_id`, `dp_index`, `option_id_initial`, `option_id_final`, `changed_before_next`, `confidence_value`, `confidence_missing_initial`, `timestamp_opened`, `timestamp_next_clicked`, `time_on_decision_ms`.

Per-run `ScenarioRunLog` (fields):
- `scenario_run_id`, `user_id`, `session_id`, `scenario_id`, `decisions[]`, `reflection_1_text`, `reflection_2_text`, `reflection_1_wordcount`, `reflection_2_wordcount`, `started_at`, `finished_at`.

Storage: raw logs stored as immutable JSONB (or object store) + nightly aggregates.

---

## Red-Team integration
- 3–4 Red-Team scenarios per module: include `reflection1` with `type: "process_redteam"`.  
- `RedTeamAwareness` derived from selection of “adversary-aware” options + reflection quality NLP scoring.

---

## Security & DIANA compliance
- Zero-PII at rest, tokens only (institutions map token ↔ identity externally).  
- DIANA package export rules applied to all external deliverables.

---

## Implementation notes & workflows
- `scripts/validate_scenarios.js` enforces schema; any auto-fixes to be recorded & reviewed.  
- Authoring flow: author → run `validate_scenarios` locally or via CI → submit PR → content review (Beth) → merge.  
- All canonical updates produce a short `CHANGELOG` entry with `source_references`.

---

## Appendices
- Appendix A: persona schema (short excerpt)
- Appendix B: telemetry schema (short excerpt)
- Appendix C: authoring checklist

*(Appendices contain the exact JSON schema snippets and authoring checklist; include these programmatically via generator script.)*
