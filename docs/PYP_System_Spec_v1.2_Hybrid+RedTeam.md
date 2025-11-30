# PYP: STRATEGIC EDGE – SYSTEM SPECIFICATION (v1.2 – Hybrid + Red Team Lens)

**Product:** Pick Your Path: Strategic Edge  
**Version:** 1.2 (Hybrid module TRL-4; Red-Team Awareness lens integrated)  
**Owner:** Beth (Design Authority)  
**Engineering:** Steven (Engineering Lead)  
**Content/Logic Authority:** ChatGPT (PYP)

---

## 1. SYSTEM OVERVIEW

PYP: Strategic Edge is a **scenario-based cognitive readiness engine** designed for NATO / partner defence and civilian leaders.

- 30 **modules**, each with **10 scenarios**.
- Each module:
  - Has a **single Module Learning Outcome (Module LO)**.
  - Scenario 10 LO = Module LO (direct assessment).
  - Scenarios 1–9 build toward Scenario 10 in complexity and LO level.
- Each scenario:
  - Has 3 decision points (DP1–DP3).
  - Each DP has 3 options → **27 unique decision paths** per scenario.
  - Includes a 5-point confidence slider on DP3.
  - Includes 2 reflection prompts at the end.

PYP operates on **anonymous tokens** (no PII):

- Tokens are issued to institutions; institutions manage mapping tokens ↔ individuals externally.
- Tokens can be constrained by:
  - Module access list.
  - Expiration date.
  - Optional cohort / unit / organization tags.

---

## 2. ARCHITECTURE – HIGH LEVEL

### 2.1 Modules and Scenarios

- Modules are identified by a short code (e.g., `HYB` for Hybrid & Gray Zone).
- Scenarios are identified as `MOD-PHASE-XX`, e.g.:
  - `HYB-PRE-01`, `HYB-PRE-02` (baseline)
  - `HYB-PRAC1-03` … `HYB-PRAC7-09` (practice)
  - `HYB-POST-10` (capstone)

Each scenario object includes:

- Metadata:
  - `scenario_id`
  - `module_id`
  - `operation_name` (user-facing "Operation" title)
  - `year` (future-dated, ≥ 2028)
  - `rank_header` (e.g., `"OF-4"`, `"OR-8"`, `"Civilian (OF-4 equiv)"`)
  - `region_aor_header` (short, user-facing)
  - `role_metadata` (longer description; NOT necessarily shown directly)
- Learning outcomes:
  - `scenario_lo_id`
  - `scenario_lo_text`
  - `bloom_primary_level` (e.g., `Analyze`, `Evaluate`, `Create`)
  - `krathwohl_secondary_level` (e.g., `Valuing`, `Organizing`, `Characterizing`)
- Content:
  - `scenario_intro` (single block, 80–140 words; no acronyms unexplained)
  - `dp1`, `dp2`, `dp3` (see schemas below)
  - `reflection1`, `reflection2`

### 2.2 Decision Points

#### DP1

- One stem: either:
  - Embedded as the final part of `scenario_intro`, or
  - A short "lead-in" (12–22 words).
- Three options; each:
  - 12–22 words.
  - Clearly distinct in intent and risk profile.
  - Tagged with metric & bias weights (see Metrics & Scoring spec).

#### DP2

- DP2 is **conditional on DP1 choice**.
- For each DP1 option (A/B/C):
  - One DP2 stem (30–50 words) describing consequences and new information for that path.
  - Three options (12–22 words each).

#### DP3

- DP3 is **conditional on DP1 and DP2** (9 paths: AA, AB, AC, BA, BB, BC, CA, CB, CC).
- For each DP1–DP2 combination:
  - One DP3 stem (30–50 words).
  - Three DP3 options (12–22 words each).
- After selecting DP3 option:
  - User sets a **5-point confidence slider**:
    - Anchors: `Low` ←→ `High` (no numeric labels on UI; numeric values in backend).
    - Slider must be set before NEXT; otherwise prompt.

---

## 3. SESSION AND TOKEN MODEL

### 3.1 Tokens

Token object (server-side):

```json
{
  "token_id": "string",
  "expires_at": "2029-12-31T23:59:59Z",
  "allowed_modules": ["HYB", "..."],
  "cohort_tags": ["NSOU-2025", "SOF", "Pilot-1"],
  "is_active": true
}
