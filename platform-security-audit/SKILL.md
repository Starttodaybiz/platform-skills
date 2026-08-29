---
name: platform-security-audit
version: 2
description: >
  Perform a comprehensive security and code quality audit of the Start Today™
  platform. Produces (1) a unified Word document with 14 sections and (2) a
  machine-readable state file (`security-remediation-state.json`) that persists
  the open remediation queue between audit runs. Sections 1-13 cover Master
  Security & Code Quality, Source Code Audit Addendum, and SOC 2 Assessment.
  Section 14 (NEW in v2) records the remediation program lifecycle with diffs
  against the prior state file. Use this skill for: "security audit", "run the
  audit", "re-run the audit", "audit the platform", "check security", "audit
  report", "security report", "how secure is the platform", "current findings",
  "SOC 2 readiness", "certification gap", "vulnerability scan", "code quality
  audit", "where did we leave off". Always generate the complete combined
  report even if only one part is requested.
---

# Platform Security Audit — Start Today™ (v2)

## BEFORE YOU BUILD — read what the platform already knows

The database records what exists, what has already gone wrong, and why things
were built the way they are. **None of it is consulted unless you ask.** Four
queries, under a minute, and they routinely prevent rebuilding something that
exists or repeating a failure already solved.

```sql
-- Which tables implement a concept? (140 mapped concepts)
SELECT * FROM where_does_this_live('registered agent');

-- Has this gone wrong before? Each row carries a PREVENTION RULE.
SELECT title, symptom, prevention_rule, fix_pattern
FROM code_landmines_registry WHERE embed_text ILIKE '%<topic>%';

-- Why is it built this way? Includes alternatives REJECTED and why.
SELECT title, decision_summary, alternatives_considered, tradeoffs_accepted
FROM ai_decisions_log WHERE embed_text ILIKE '%<topic>%' ORDER BY decided_at DESC;

-- Has it been discussed? 201 past sessions, NEWEST FIRST — a later session
-- often reverses an earlier conclusion.
SELECT * FROM search_session_history('<topic>', 10);
```

**Unconfirmed rows in the table map are LEADS, not facts** — proposed by name
matching. Verify, then set `confirmed = true` with a note; that is how the map
improves.

**Two habits worth more than any single lookup.** Never trust
`pg_stat_user_tables.n_live_tup` — it is an ESTIMATE and reported ZERO for four
populated tables in one session, nearly causing a rebuild of what already
existed; use `count(*)`. And verify the PATH, not the artefact — a green build,
a passing `node --check` and a correct SQL result do not execute the component or
the route.

**When you finish**, record what you learned or the next session repeats it: a
new failure mode into `code_landmines_registry` with a `prevention_rule`, an
architectural choice into `ai_decisions_log` with `alternatives_considered`, a
confirmed table mapping into `ontology_cluster_tables`. Both registries embed
hourly and become semantically searchable on their own.

Full detail: the `compliance-platform-development` skill, STEP ZERO.

---


## What v2 adds over v1

- **`security-remediation-state.json`** written alongside the docx. Machine-
  readable lifecycle record of every finding (open, closed, verified clean).
  Committed to the `platform-skills` GitHub repository so it persists across
  Claude sessions.
- **Section 14 — Remediation Program Ledger.** Renders the state file
  contents in the docx with `newly_opened / still_open / newly_closed /
  regressed` diff summary at the top.
- **Step 0.5 — read prior state file if present.** On each run, the skill
  reads the previous state file first, computes diffs, and marks findings
  with `first_seen` / `last_verified` timestamps.
- **Extended app catalog: 25 apps** (was 6). See "Fleet reference" below.
- **Hardened `gh-*` proxy tooling.** GitHub reads and searches proxied via
  `gh-read`, `gh-read-repo`, `gh-search` edge functions on the Supabase PROD
  project, gated by `AUDIT_PROXY_SECRET` (`x-audit-token` bearer, fail-closed
  on missing env var).

## Producing the report

### Step 0.5 (v2 NEW) — Read prior state file

Before collecting new data, check for a prior state file in the
`platform-skills` repo (or provided by the operator):

```
GET https://ptgtliwllimkswtajcmy.supabase.co/functions/v1/gh-read-repo
Body: { "repo": "platform-skills", "path": "audit-state/security-remediation-state.json", "raw": true }
Headers: x-audit-token: <AUDIT_PROXY_SECRET>
```

If found, load the `open` array as the "prior findings" baseline.
Every finding detected in this run will be marked:
- `still_open` — was in prior state, still detected here
- `newly_opened` — not in prior state, detected here for the first time
- `newly_closed` — in prior state, NOT detected here (needs human
  verification that it was intentionally remediated, not just missed by the
  scan)
- `regressed` — was in prior `closed` list but detected again here

If NO prior state file exists, this run is the baseline. Note it in the
state file's `run.prior_state_ref = "baseline"`.

### Step 1 — Collect live data

**Database (Supabase MCP):**
```
Supabase:get_advisors(project_id="ptgtliwllimkswtajcmy", type="security")
Supabase:get_advisors(project_id="ptgtliwllimkswtajcmy", type="performance")
Supabase:list_edge_functions(project_id="ptgtliwllimkswtajcmy")
```

**DB verification SQL (issue one execute_sql per query — the tool returns
only the last result of multi-statement blocks):**

```sql
-- 1. Schema and MFA counts
SELECT
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public') as tables,
  (SELECT COUNT(*) FROM pg_views WHERE schemaname='public') as views,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public') as functions,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=true) as rls_on,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false) as rls_off,
  (SELECT COUNT(DISTINCT user_id) FROM auth.mfa_factors WHERE status='verified') as mfa_verified,
  (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as auth_users;

-- 2. Tables with RLS+no policy
SELECT tablename FROM pg_tables t
WHERE t.schemaname='public' AND t.rowsecurity=true
AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename);

-- 3. Always-true policies with scope breakdown
WITH always_true AS (
  SELECT tablename, policyname, roles, cmd
  FROM pg_policies
  WHERE schemaname='public' AND (qual='true' OR qual IS NULL)
)
SELECT
  CASE
    WHEN roles::text ILIKE '%service_role%' AND roles::text NOT ILIKE '%anon%' AND roles::text NOT ILIKE '%authenticated%' THEN 'service_role_only'
    WHEN roles::text ILIKE '%anon%' THEN 'anon_exposed'
    WHEN roles::text ILIKE '%authenticated%' THEN 'authenticated_exposed'
    WHEN roles::text = '{public}' THEN 'public_exposed'
    ELSE 'other'
  END as scope,
  cmd, COUNT(*) as n
FROM always_true GROUP BY scope, cmd ORDER BY scope, cmd;

-- 4. Storage bucket exposure
SELECT id, public, allowed_mime_types FROM storage.buckets ORDER BY public DESC;

-- 5. Function mutable search_path count
SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='public'
AND NOT EXISTS (SELECT 1 FROM pg_options_to_table(p.proconfig) WHERE option_name='search_path');
```

**Edge function secret verification via canary:**
Deploy or invoke `secrets-canary` (endpoint) and probe via `pg_net`:
```sql
SELECT net.http_get('https://ptgtliwllimkswtajcmy.supabase.co/functions/v1/secrets-canary');
```
Then read from `net._http_response`. Extend the canary body to include any
new secret names being audited (`PDF_INTERNAL_SECRET`, `SHARE_SECRET`,
`AUDIT_PROXY_SECRET`, etc.).

**Per-repo scan (via gh-search / gh-read-repo):**

Use `gh-search` for cross-cutting queries (hardcoded fallback secrets,
env var references, magic_link mentions) — **NOTE**: GitHub's classic
code-search API does not index most private repos. Use `gh-read-repo`
with `list_dir:true` for reliable per-repo enumeration; fall back to
`gh-search` only for repos known to be indexed (verified by a control
query returning >0 results).

For each repo, probe:
- `package.json` (Next.js version, jose version, package name)
- `middleware.js` OR `middleware.ts` OR `src/middleware.js` OR `src/middleware.ts`
- `next.config.js` OR `next.config.mjs` OR `next.config.ts`
- `app/api/auth/login/route.js` OR `pages/api/auth/login.js` OR `src/app/api/auth/login/route.js`
- `lib/auth.js` OR `src/lib/auth.js`

Persist request-id → repo mapping to a table (`public._audit_pass2_requests`)
so responses can be joined back cleanly. Do NOT rely on temp tables between
`execute_sql` calls (connections don't persist).

### Step 2 — Classify findings

Assign severity from `references/severity-guide.md`. Standard severities:

DB findings:
- `rls_disabled_in_public` → CRITICAL
- `rls_enabled_no_policy` → HIGH (was CRITICAL in v1 — refined: deny-all-by-default is functional)
- `qual=true policy on public/anon` → HIGH (real, not just service_role_only)
- `function_search_path_mutable` → MEDIUM
- `security_definer_view` → MEDIUM
- `qual=true policy on authenticated` → HIGH if sensitive tables, MEDIUM otherwise
- `sensitive_columns_exposed` → HIGH
- `extension_in_public` → LOW

App findings:
- Live-exploitable auth bypass → CRITICAL
- Below-CVE-fix Next.js version pinned in package.json → CRITICAL
- Hardcoded JWT fallback secret in source → HIGH per repo
- No MFA on password-only portal → HIGH
- Missing security headers → MEDIUM per repo
- No CSP → LOW per repo
- Hardcoded team PII in source → LOW

### Step 3 — Generate report

Read `scripts/generate-report.js` for the canonical structure. Adapt with
findings from `findings.json`. In v2, the script also writes
`security-remediation-state.json`.

### Step 4 — Deliver

```
cp /home/claude/audit-out/StartToday_Security_Audit_<DATE>.docx /mnt/user-data/outputs/
cp /home/claude/audit-out/security-remediation-state.json /mnt/user-data/outputs/
```

Present all outputs via `present_files`. Commit state file to
`platform-skills` repo under `audit-state/security-remediation-state.json`
for the next run to pick up.

## Fleet reference (v2)

Full-scan targets — 23 apps:
```
Client-Dashboard, Client-EP, sales, chamber, C2C, compliance-User,
attorney-dashboard, property, finance, accounting, plan, work, mylegal,
marketplace, hr, prohr, bank, lender, Brokers, mga, Platform-Admin,
Admin-User, insure
```

Light-scan (headers only) — 2 apps:
```
carl, website
```

Skip (out of org / marketing / other):
```
stverify (separate GitHub org)
entity-mind-map (legacy, archive candidate)
```

## Audit tone rules

1. **First-person, present-tense.** "This route has no authentication guard,"
   not "This route had no authentication guard."
2. **Every number is live.** No cached or estimated values.
3. **Every finding includes exact file paths.** Full path from repo root.
4. **Clean findings get credit.** If a category is zero, say so with a green
   status.
5. **SOC 2 must be honest.** MET / PARTIAL / GAP without inflation.
6. **Never omit a section.** All 14 sections appear in every run.
7. **Section 14 opens with the diff summary.** Even if the diff is
   `baseline` (first run), state that explicitly.

## Reference files

- `references/report-template.md` — Finding descriptions, risk text, remediation guidance
- `references/soc2-criteria.md` — CC1–CC9 criterion descriptions
- `references/severity-guide.md` — Full severity scale
- `references/state-file-schema.md` (NEW in v2) — JSON schema for state file
- `scripts/generate-report.js` — Canonical generation script
- v2 note: the state file emission is embedded in `scripts/generate-report.js` (single-file design)
