# Fixing scenario JSON files

Use the automated fixer to normalize scenario JSON files so they pass strict validation.

## Quick run locally

```bash
node scripts/fix_all_scenarios.js
```

## Typical branch and PR flow

```bash
git checkout -b chore/fix-scenarios
node scripts/fix_all_scenarios.js
git status
git add .
git commit -m "chore: fix scenario JSON files"
git push --set-upstream origin chore/fix-scenarios
# Open a PR from the pushed branch
```

## GitHub Actions option

You can also run the fixer via the reusable workflow:

- Trigger **Fix scenario JSON files** in the **Actions** tab.
- Optionally supply a custom commit message; the default is `chore: auto-fix scenario JSON files`.
