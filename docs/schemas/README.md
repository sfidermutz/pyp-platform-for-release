# PYP Scenario Schema v2

This directory contains the canonical JSON Schema for Pick-Your-Path scenarios and supporting validation tooling.

## Schema
- `pyp_scenario_schema_v2.json` implements Beth's MASTER_REQUIREMENTS (decision points, metric weights, reflections, provenance, AI audit stubs).
- Draft 2020-12 compatible schema consumed by AJV validators.

## Validation
Run the validator to check every scenario in `data/scenarios`:

```bash
node scripts/validate_scenarios.js
```

Auto-fix legacy keys and metric weights (records to `data/CHANGELOG.md`):

```bash
node scripts/validate_scenarios.js --fix
```

## Migration
Convert legacy scenarios to v2 payloads:

```bash
node scripts/migrate_scenarios_to_v2.js --dry-run
node scripts/migrate_scenarios_to_v2.js --overwrite
```

Converted files are written to `data/scenarios_v2/` when `--overwrite` is used. Review `data/CHANGELOG.md` for any auto-changes and manual review notes.
