---
name: start-score-drift-check
description: >-
  Static analysis check that scans Start Today™ source code for hardcoded
  references to Start Score™ pillar keys, weights, or pillar names. Catches
  the kind of drift that PillarRadar, HR/score-health, and Work app/page.jsx
  had before reconciliation: stale percentages, deprecated short pillar
  aliases (hr/insurance/tax/licenses), or removed pillars (sba_loans). Use
  this skill whenever (a) building a new repo or page that touches Start
  Score, (b) reviewing a PR that mentions scoring/pillars/weights, or (c)
  the user asks "is anything still hardcoding pillar weights" or "find
  pillar drift". Includes a Node-based scanner script that exits non-zero
  on drift so it can be wired into CI as a build gate.
---

# Start Score™ Drift Check

## Why this exists

The canonical Start Score™ methodology lives in one place:

```
DB:  Score_Methodology_Components (Active = true rows)
RPC: get_canonical_pillars()  →  exposed via /api/score-methodology
```

When a new pillar is added, an existing pillar is renamed (e.g. `ownership_gov`
→ `governance`), or weights are renormalized (v1.1 made entity_compliance 20%,
not 22%), every consumer in every repo should pick up the change automatically
because they read the canonical RPC at request time.

But humans hardcode things. The 2026-05-13 reconciliation found drift in:

- **Work app/page.jsx** — Suite marketing tiles with hardcoded percentages
  (`Entity (22%)` when canonical was 20%)
- **HR/score-health** — old 6-pillar weight map labeled "v2" but mismatching v1.1
- **PillarRadar.jsx** — keyed off `ownership_gov` after rename to `governance`
- **mylegal/api/carl/route.js** — CARL context strings using deprecated short
  aliases `hr` / `insurance` / `tax` / `licenses`

This drift check catches all four classes before they hit prod.

## What the check looks for

The scanner flags four kinds of references in `.js` / `.ts` / `.jsx` / `.tsx`
files:

1. **Hardcoded pillar percentage taglines** — strings like `Entity (22%)`,
   `HR Compliance (10%)`, `Risk & Insurance (12%)`. Even if the percentage
   happens to be right today, hardcoding it means it'll silently drift the
   next time methodology changes. The fix is to fetch from
   `/api/score-methodology`.

2. **Hardcoded weight objects/maps** — patterns like
   `entity_compliance: 0.20`, `{ hr: 0.09 }`, `WEIGHTS = { ... }`. These
   should never exist outside `Score_Methodology_Components`.

3. **Deprecated short pillar aliases** — `'hr'`, `'insurance'`, `'tax'`,
   `'licenses'`, `'ownership_gov'`, `'sba_loans'` used as pillar keys
   (in object-key context, not data field context).

4. **Pillar arrays missing one or more canonical pillars** — e.g. an array
   like `['entity_compliance','hr_compliance','risk_insurance']` only has
   3 of 11. If you're rendering a pillar list, you should be rendering all
   11 from the canonical RPC.

## The 11 canonical pillars (v1.1, effective 2026-05-13)

```
entity_compliance     20%
filings_obligations   14%
state_tax             14%
risk_insurance        11%
hr_compliance          9%
kyc_aml                7%
licenses_permits       6%
governance             5%
ucc_liens              5%
financial_tax          5%
dataroom               4%
```

Total: 100%. Deactivated from v1.0: `documents`, `sba_loans`.

Renames from v1.0 → v1.1:
- `ownership_gov` → `governance`
- `dataroom_readiness` → `dataroom` (in some tables)
- `ucc_liens_covenants` → `ucc_liens` (in some tables)
- `ownership_governance` → `governance` (in some tables)

## How to use

### One-off scan (any repo)

```bash
node /path/to/platform-skills/start-score-drift-check/scan.js
```

Run from the repo root. Exits 0 if clean, 1 if drift is found. Prints each
finding with file path, line number, the offending text, and the suggested
fix.

### Add to CI (recommended for every repo with Start Score surfaces)

Add to `package.json`:

```json
{
  "scripts": {
    "drift-check": "node ./scripts/start-score-drift-check.js"
  }
}
```

Copy `scan.js` from this skill to `scripts/start-score-drift-check.js` in
the target repo. Then add a workflow step that runs `npm run drift-check`
before `npm run build` — it fails the build on drift.

GitHub Actions example:

```yaml
- name: Start Score drift check
  run: npm run drift-check
```

### Repo-specific allowlist

The scanner has false-positive territory: `sba_loans` is a legitimate
data-key for the `Loans` table (used in Bank and lender apps), and
`entity_compliance` is a legitimate knowledge-domain slug in Platform-Admin.
The scanner reads `.score-drift-allowlist.json` from the repo root if
present:

```json
{
  "allowed_strings": [
    "sba_loans",
    "entity_compliance_view"
  ],
  "allowed_paths": [
    "pages/api/index-overview.js",
    "components/AdminPanel.jsx"
  ]
}
```

Add only when the reference is unambiguously a data key (not a pillar key).
Document each entry with a comment in the JSON so future readers know why.

## What this skill is NOT

- It does NOT replace `/api/score-methodology` — that's the runtime source
  of truth.
- It does NOT enforce database-side drift (CHECK constraints on
  STVerify_Penalty_Reference, STVerify_ROI_Config, st_scoring_quality_rules
  already do that).
- It does NOT scan SQL migrations or DB function definitions — those are
  enforced by `is_canonical_pillar(text)` in the CHECK constraints.

Coverage matrix:

| Surface             | Enforcement              |
|---------------------|--------------------------|
| Frontend JS/TS      | This skill (CI gate)     |
| DB tables           | CHECK constraints        |
| DB functions        | Fetch from Methodology   |
| Marketing copy      | This skill (CI gate)     |
| Edge functions      | This skill if .js/.ts    |

## Files

- `SKILL.md` (this file)
- `scan.js` — Node 18+ scanner. Zero dependencies (uses only built-in fs/path).
- `example-allowlist.json` — annotated allowlist showing the format.
