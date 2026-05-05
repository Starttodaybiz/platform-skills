# platform-skills

Versioned home of Claude skills used to develop and operate the
Start Today™ platform.

These skills are not app code. They are not deployed. They describe *how
to work on* the platform — development norms, audit procedures, sprint
playbooks, validation checklists. The active source of truth runs from
the operator's local Claude environment under `/mnt/skills/user/`; this
repo is what survives sandbox loss.

## Skills in this repo

### `platform-security-audit/`
Produces the comprehensive security & SOC 2 audit (Word doc, 14 sections,
4 parts) plus a machine-readable JSON sidecar mapping each in-scope app
against the canonical 8-capability security envelope. The JSON sidecar
is the handoff to the remediate skill.

Key reference: `references/canonical-envelope.md` — source of truth for
what counts as PRESENT for each capability.

### `platform-security-remediate/`
Reads the JSON sidecar from the audit, produces a guided sprint plan in
markdown for any non-canonical app with open gaps. Plan generation is
read-only by default. Execution requires explicit per-sprint approval —
the skill stops at each `READY` boundary and waits.

Key references:
- `references/playbook.md` — sprint-by-sprint canonical patterns derived
  from C2C Sprints J-Q and platform-admin Sprints R-X (April-May 2026)
- `references/assumption-overrides.md` — alternate patterns for non-canonical
  apps (Supabase GoTrue auth, separate Supabase project, Pages Router, etc.)

## Future skills

Other user-skills that should land here over time:
- `compliance-platform-development` — development norms + style guide
- `platform-dev-test-ontology` — regression test framework
- `platform-page-audit` — page-by-page QA sweep
- `mfa-implementation` — TOTP MFA pattern recipe
- `tax-return-preparer` — tax workflow assistant

## How to use

Skills in this repo are reference material. To activate one in a Claude
session, copy its directory into the local sandbox at
`/mnt/skills/user/<skill-name>/`. The skill's front-matter description
tells Claude when to trigger it.

The relationship between this repo and runtime is **one-way**: edits to
the active sandbox copy should be backed up here via commit; this repo
is not auto-pulled into the runtime.

## Caveats worth knowing

- The `APPS` catalog in `platform-security-audit/scripts/generate-capability-matrix.js`
  contains best-guess entries for some repos that haven't been verified
  by name (`hr`, `prohr`, `mylegal`, `Property`, `Accounting`, `Finance`,
  `marketplace`, `Work`, `plan`, `employee`, `Bank`, `Lender`, `MGA`).
  Mismatches surface as "(not cloned)" — safe failure mode. Update names
  in the catalog as repos are confirmed.

- The remediate skill's "execute on approval" workflow is documented but
  hasn't been exercised end-to-end with a real target. First real run
  may surface rough edges in the orchestration around git/Vercel
  verification.

- Detection in `generate-capability-matrix.js` is heuristic (file presence
  + grep). False MISSING/PARTIAL scores are possible on apps with
  unconventional implementations. Section 14 of the audit doc is meant
  to be human-reviewable.

## History

These skills were ported here from `Starttodaybiz/Platform-Admin`'s
`docs/skills/` directory in May 2026 — that initial commit happened
because `api.github.com` is blocked from the dev sandbox so a new repo
couldn't be created end-to-end automatically. Once this repo existed,
skills moved here and the backup directory was removed from
platform-admin.
