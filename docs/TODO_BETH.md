# TODO_BETH.md
Authoring checklist — exact keys and copy needed for each scenario.
All placeholder values are `TODO: BETH` and every auto-inserted numeric field is `todo_beth: true`.

--- How to use
For each scenario (below), replace `TODO: BETH` placeholders with final copy.
Use exact keys shown. For each option ensure:
- `id` (string)
- `text` (string)
- `metric_weights` (object with numeric weights, e.g. { "DecisionQuality": 2, "InformationAdvantage": 1 })
- `score` (number 0-100)
- `ideal_confidence` (number 0-100)
- `todo_beth` (remove or set to false once finalized)

If you prefer scenario-level metric_weights, include top-level `metric_weights` and confirm whether per-option weights are required.

---

## Scenarios to finalize
The following scenarios were auto-generated with skeleton keys. Fill each item below.

### HYB-PRE-02 ... HYB-PRE-08
**Location:** `data/scenarios/HYB-PRE-02.json` (and HYB-PRE-03 .. HYB-PRE-08)

Required keys:
- `scenario_id` (e.g., "HYB-PRE-02")
- `module` (should be `"HYB"`)
- `title` (string)
- `role` (string, e.g., "Task Force Commander")
- `year` (YYYY or null)
- `primary_domain` (e.g., "Maritime")
- `primary_level` (e.g., "Operational")
- `scenario_lo` (learning outcome string)
- `metric_weights` (scenario-level object, optional but recommended)
- `biasCatalog` (array)
- `situation` (long narrative paragraph)
- `dp1.stem` (short stem question)
- `dp1.options[*].text` (each option text)
- `dp2.<dp1id>[*].text` (each dp2 option text)
- `dp3.<dp2id>[*].text` (each dp3 option text)
- `reflection_pre.prompt` / `reflection_post.prompt` (strings)
- `assets` (optional): list of asset paths (e.g., `"public/assets/figure1.png"`)

Repeat for HYB-PRE-03 .. HYB-PRE-08.

### HYB-PRAC-01 .. HYB-PRAC-07
**Location:** `data/scenarios/HYB-PRAC-01.json` .. `HYB-PRAC-07.json`

Same keys as above. These are practice scenarios — ensure `scenario_id` matches file name.

### HYB-POST-10
**Location:** `data/scenarios/HYB-POST-10.json`

Same keys; post-phase scenario.

---

## Exact per-option fields (example)
