---
name: platform-security-remediate
description: >
  Generate guided sprint plans to close security envelope gaps on Start Today™
  platform apps. Companion to platform-security-audit — consumes its JSON
  sidecar (security-audit-<date>.json) and produces an ordered sprint plan
  per app, mapping each gap to the canonical sprint that closed it on
  C2C/platform-admin (Sprints R/S/T/U/V/W/X). Default mode is read-only
  plan-generation: writes a markdown plan, does NOT mutate code. With
  explicit per-sprint approval ("run sprint R on atty-repo", "go", etc.)
  the skill executes the canonical playbook for that one sprint, then
  stops at the next sprint boundary and waits for the next approval.
  Use this skill for: "remediate <app>", "fix the gaps on <app>", "close
  the security gaps", "run the playbook on <app>", "what does <app> need",
  "plan the sprints for <app>", "remediation plan", "fix security on <app>".
  Always start by reading the JSON sidecar — refuse to plan without it.
---

# Platform Security Remediation — Start Today™

## What This Skill Produces

For each app being remediated:

1. **A markdown sprint plan** at `/mnt/user-data/outputs/<app>-remediation-plan.md`,
   ordered by canonical sprint sequence. Each sprint section includes:
   - The capability gaps it closes
   - Assumption-violation checks (does the canonical playbook apply, or
     does this app need the alternate pattern?)
   - The exact files to create/modify
   - The validation checklist (brace count, JSX parse, full build)
   - The deploy verification steps (Vercel build → READY → runtime log check)
   - A "READY for approval" boundary marker

2. **Execution-on-approval**: when the operator says "run sprint R on
   <app>" (or just "go" after the plan is presented), the skill executes
   that one sprint following the plan, then stops and waits for the next
   approval.

The skill never auto-runs multiple sprints in sequence — every sprint
boundary is a human decision point.

## Inputs Required

- **JSON gap matrix** from `platform-security-audit` (Step 5 sidecar).
  Default location: `/mnt/user-data/outputs/security-audit-<YYYY-MM-DD>.json`
  or any path the operator provides.
- **Target app name**: must match a `name` field in the JSON. Refuse to
  proceed if app is `out_of_scope`, `not cloned`, or canonical (no gaps).

## Skill Dependencies

This skill is a **thin orchestrator**. It does NOT duplicate mechanics
that other skills already handle. It calls into:

- `compliance-platform-development` — for the deploy workflow, style guide,
  branch-balance + JSX-parse + Next.js build validation, git/deploy
  conventions. Read its SKILL.md when an operator asks "how do I deploy
  this?" — defer to it.
- `platform-dev-test-ontology` — for registering regression test cases
  for each gap closed. After a sprint executes, the skill writes a test
  ontology entry covering the new capability so it doesn't regress.

If either skill is missing or has changed since this skill was written,
flag the operator before proceeding.

## Workflow

### Phase 1 — Plan (always read-only)

1. **Read the JSON sidecar.** Refuse if missing or older than 7 days
   (stale audit data leads to wrong plans).

2. **Pick the app.** Confirm with the operator if not specified. Refuse
   on out-of-scope or canonical apps.

3. **Read `references/playbook.md`.** This is the source of truth for what
   each canonical sprint contains. Each sprint section maps capability
   gaps to file changes, RPC requirements, and validation steps.

4. **Read `references/assumption-overrides.md`.** This catalogs the
   non-canonical paths — what to do when an app uses Supabase GoTrue
   instead of custom JWT, when it's on a separate Supabase project,
   when it uses Pages Router, etc.

5. **For the target app's gap list, walk it sprint-by-sprint:**
   - Identify which canonical sprint(s) close each gap (see
     `PLAYBOOK_SPRINT` map in the audit script's source for the
     canonical mapping)
   - For each sprint, check if the app's `assumptions` profile means
     the canonical pattern applies as-is OR needs an override
   - Order sprints by dependency (R must precede S; U must precede V/W)

6. **Generate the markdown plan** at
   `/mnt/user-data/outputs/<app>-remediation-plan.md` and present it
   via `present_files`. The plan ends with:

   > **READY for sprint <X>.** When you're ready, say "run sprint <X> on <app>"
   > or "go" to execute. To skip or reorder, say so. To exit, just stop.

### Phase 2 — Execute one sprint (only on explicit approval)

Triggered by: "run sprint X on <app>", "go", "yes proceed", or similar
approval from the operator AFTER the plan has been shown.

For the sprint being executed:

1. **Sync the app's local clone.** `git pull origin main` in the local dir.
2. **Apply the canonical pattern** as written in the plan, with any
   assumption-override substitutions. This typically means:
   - Creating `lib/security/*` helper files
   - Modifying `middleware.js` and `app/api/auth/*` route handlers
   - Adding/calling Supabase RPCs (or noting if the app's separate
     Supabase needs them deployed first)
   - Adding/modifying frontend components for new dashboards/pages
3. **Validate locally:** brace/paren balance, `node -e "require('@babel/parser').parse(...)"`,
   then `npx next build` with stub env vars. (See
   `compliance-platform-development` for the canonical env-var stub set.)
4. **Commit + push** with the canonical message format
   `feat(<app-tag>,sprint-<X>): <description>`. Long messages via
   `-F /tmp/sprint_X_msg.txt` to avoid shell parsing issues.
5. **Wait for Vercel deploy** (~90s) and verify state=READY.
6. **Check runtime logs** for errors and warnings in the 5-10min window
   after deploy.
7. **Register regression test cases** via `platform-dev-test-ontology`
   covering the new capability.
8. **Stop at the next sprint boundary.** Print the next sprint's heading
   and the approval prompt. Do NOT auto-continue.

### Phase 3 — Re-audit (recommended after each sprint)

After a sprint completes successfully, the operator may want to re-run
`platform-security-audit` to confirm the gap is now closed in the matrix.
This skill suggests but does not force it.

## Sprint Mapping Reference (quick lookup)

| Capability gap     | Canonical sprint | Notes |
|--------------------|------------------|-------|
| audit_log          | R                | Foundational — must precede dashboard. Shared if same Supabase. |
| rate_limit         | R                | Same lib, same sprint as audit_log. |
| headers            | R                | Same sprint. Either inline in middleware (C2C) or extract to lib (padmin). |
| dashboard          | R                | Depends on audit_log being PRESENT. |
| mfa_enforcement    | R (Mode A) / N (backport) | Sprint R lays groundwork; Sprint N upgrades Mode B → Mode A. |
| backup_codes       | S                | Depends on mfa_enforcement. RPCs free if shared Supabase. |
| settings_page      | S                | Same sprint as backup_codes. |
| admin_reset        | T                | Depends on backup_codes (regen flow uses TOTP step-up). |
| csrf (any stage)   | U → V → W        | Three-stage rollout. Cannot be compressed into one. |

## Refusal Rules

- **Refuse to plan** for an app marked `out_of_scope` in the JSON. Direct
  the operator to handle stverify/chamber separately.
- **Refuse to plan** for the canonical app (`c2c-repo` per default JSON).
  The canonical IS the playbook source. If C2C has a gap (e.g., the
  Mode A backport currently flagged), that's a separate "canonical
  improvement" sprint, not a remediation.
- **Refuse to execute** without explicit per-sprint approval. The plan
  ends at the first READY boundary; subsequent sprints require their
  own approvals.
- **Refuse to proceed** if the JSON sidecar is older than 7 days. Re-run
  `platform-security-audit` first.
- **Pause and ask** if the app's `assumptions` profile contains `unknown`
  fields critical to the sprint being planned (e.g., shared_db_rpcs_available
  is unknown when planning Sprint S backup-codes).

## Reference Files

- `references/playbook.md` — Complete sprint-by-sprint canonical patterns.
  What files to create, what RPCs need to exist, what the imports look
  like, what the validation checklist is. **Source of truth for execution.**
- `references/assumption-overrides.md` — Alternate patterns for when the
  canonical assumption profile doesn't apply (GoTrue auth, separate
  Supabase, Pages Router, etc.).
- `scripts/generate-plan.js` — Reads JSON sidecar + playbook, emits the
  markdown sprint plan for a target app.

