# TODO_BETH.md
Author: Automated audit for HYB module
Purpose: Exact list of missing copy, assets, and configuration Beth must provide
Date: 2025-12-01

## How to use this file
This document lists, per scenario, every final text, asset, and numeric weight Beth must provide.
Where copy is missing in the scenario JSONs we will include `TODO: BETH` placeholders but please use the exact key names listed here when submitting final text.

---

## Canonical authoring schema (fields we expect in each scenario JSON)
- id: string (e.g., "HYB-PRE-01")
- module: string ("Hybrid Threats")
- phase: string ("PRE" | "PRAC" | "POST")
- title: string (2 words, operational)
- role: string (e.g., "Senior Officer")
- year: number (e.g., 2034)
- situation: string (75–125 words)
- module_lo: string (the Module LO — **Scenario 10 LO == Module LO**)
- scenario_lo: string (scenario-level LO)
- ECTS: number (0.1)
- DP1:
  - prompt: string (<20 words)
  - options: array of 3 objects:
    - id: string (DP1-A|B|C)
    - text: string (20–40 words)
    - score: number (0–100)  <-- used by compute-debrief
    - ideal_confidence: number (0–100)
    - bias_tags: array of strings (use canonical bias list in this doc)
    - metric_weights: object mapping metric_name -> weight (e.g., { "decision_quality": 0.5, "trust_calibration": 0.2 })
- DP2:
  - stems: object keyed by DP1 option id, each value is stem text (30–50 words)
  - options: object keyed by DP1 option id, each value is array of 3 option objects:
    - id: string (DP2-A1, DP2-A2, etc.)
    - text: 20–40 words
    - score: number
    - ideal_confidence: number
    - bias_tags: []
    - metric_weights: {}
- DP3:
  - stems: object keyed by DP2 option id, each value is stem text (30–50 words)
  - options: object keyed by DP2 option id, each value is array of 3 option objects:
    - id: string (DP3-A1a etc.)
    - text: 20–40 words
    - score
    - ideal_confidence
    - bias_tags
    - metric_weights
- reflection_pre: object:
  - prompt: string (scenario-level reflection; nudge: "Minimum 50 words; aim 75–125")
  - min_words: 50
  - max_words: 250
- reflection_post: object:
  - prompt: string (module-level reflection that embeds the Module LO — **do not say 'learning objective'**)
  - min_words: 50
  - max_words: 250
- debrief: object:
  - core_metrics: [ "Decision Quality", "Trust Calibration", "Information Advantage", "Bias Awareness", "Cognitive Adaptability" ]
  - sub_metrics: array (module-specific)
  - outcome_narrative_max_words: 25
  - performance_narrative_range_words: [75, 100]
- assets: object:
  - hero_img: url or filename (optional)
  - any additional media: "TODO: BETH"
- bias_tags: canonical list must use one of:
  - Confirmation Bias, Authority Bias, Availability Bias, Optimism Bias, Status Quo Bias, Deferral Bias, Action Bias, Procedural Bias, Automation Bias, Escalation Bias, Pattern Bias, Coalition In-group Bias, Risk Aversion Bias, Risk Seeking Bias, Anchoring, Framing Bias, Overconfidence Bias, Recency Bias, Narrative Anchoring Bias, Causal Oversimplification Bias, Threat Inflation Bias

---

## Per-scenario TODO checklist
_Note: HYB-PRE-01 is the only scenario that must be fully complete with all DP3 branches. Scenarios 2–10 in PRE/PRAC/POST will be created as full files with TODO placeholders unless final copy is provided._

### HYB-PRE-02.json (example)
- title: TODO: BETH
- situation: TODO: BETH (75–125 words)
- scenario_lo: TODO: BETH
- DP1.prompt: TODO: BETH
- DP1.options[*].text: TODO: BETH
- DP1.options[*].score: TODO: BETH
- DP1.options[*].ideal_confidence: TODO: BETH
- DP1.options[*].bias_tags: TODO: BETH
- DP2.stems: TODO: BETH (3 stems keyed by DP1 choice)
- DP2.options: TODO: BETH (3×3 options)
- DP3.stems: TODO: BETH (9 stems keyed by DP2 choices)
- DP3.options: TODO: BETH (27 options)
- reflection_pre.prompt: TODO: BETH
- reflection_post.prompt: TODO: BETH
- metric_weights for each option: TODO: BETH
- assets: list filenames or urls: TODO: BETH

### HYB-PRE-03 → HYB-POST-10
- Same checklist as HYB-PRE-02 — for each scenario create the keys above.
- Mark for priority (we recommend HYB-PRE-02 and HYB-POST-10 be prioritized editorially).

---

## Additional editorial asks (exact keys)
1. **Module LO (module-level)**  
   Key: `module_lo` — Please supply a single sentence that embeds the module outcome (e.g., "Synchronize effects across domains under hybrid pressure by evaluating trade-offs in tempo, information integrity, and coalition trust"). Avoid using the words "learning objective" in copy; instead, use the LO language exactly.

2. **Scenario LOs (per scenario)**  
   Key: `scenario_lo` — 1 sentence. Tag with primary_domain and primary_level below.

3. **Domain & level tagging**  
   - `primary_domain`: "cognitive" | "affective"  
   - `primary_level`: Bloom level (Remember / Understand / Apply / Analyze / Evaluate / Create)  
   - `secondary_domain`: "cognitive" | "affective"  
   - `secondary_level`: Krathwohl level (Receiving / Responding / Valuing / Organizing / Characterizing)  

4. **Metric weights**  
   For each option, provide `metric_weights` mapping metric_name -> numeric weight (sum does not have to be 1; we will normalize). Example:
   `"metric_weights": { "decision_quality": 0.6, "trust_calibration": 0.3, "escalation_tendency": -0.1 }`

5. **Reflection text**  
   - `reflection_pre.prompt` (scenario-level) — nudge “Minimum 50 words; aim 75–125.”
   - `reflection_post.prompt` (module-level) — embed Module LO in plain language (do not say "learning objective").

6. **Assets**  
   Provide logo/hero images in `public/assets/` as SVG or PNG, 2x and 3x sizes. Provide `public/demo_certificate.pdf` final asset if you want the nicer demo certificate used.

7. **ECTS**  
   For each module add `ECTS: 0.1` (we will include validity 24 months only on the certificate/verification metadata).

---

## Delivery formats we accept
- Plain text files with final copy.
- A Google Doc export with headings mapping to the keys above.
- A CSV is fine for option tables, but preference is a JSON export (we will merge directly).

---

## Priority items — deliver first
1. HYB-PRE-02 final copy (title, situation, DP1..DP3 options fully authored)
2. HYB-POST-10 final copy (since Scenario 10 == Module LO)
3. All metric_weights for options and bias_tags
4. Asset pack (logo, coin, hero images)
5. Module LO (single canonical sentence for the module)
6. Certificates / verification metadata (if different from defaults)

---

## Notes for Beth about microcopy style
- CEFR B2 readability
- Use NATO ACT terminology (use "orchestrate" only for activities; use "synchronize" for effects/actors/instruments of power)
- Keep DP stems 30–50 words; option text 20–40 words
- Reflection prompts should not say "learning objective"; they should embed the LO directly
- Use exact bias tag terms from the canonical list above

End of TODO_BETH.md
