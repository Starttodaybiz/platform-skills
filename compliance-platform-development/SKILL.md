---
name: compliance-platform-development
description: >-
  Development norms, style guide, deployment workflow, and platform architecture for the Start Today™ compliance SaaS. Use this skill whenever building, styling, or deploying any UI component, dashboard, page, modal, API route, RPC, or edge function for any Start Today app — including hr.starttoday.biz, prohr.starttoday.biz, legal.starttoday.biz, admin.starttoday.biz, finance.starttoday.biz, and all other subdomains. Covers the full stack: Next.js/Vercel frontend conventions, Supabase patterns, color palette, enterprise aesthetic, API route patterns, RPC patterns, and git/deploy workflow. Trigger on any platform build task, styling question, component creation, or deployment step.
---

# Start Today™ Platform Development

Last updated: Jul 25 2026 — v3: bank app added to deployment manifest, PFS PROD alignment case study incorporated.

## Stack (Current — Softr has been fully removed)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js App Router (Node 24) | One repo per subdomain |
| Hosting | Vercel (team: j-1168s-projects) | Auto-deploy on git push to main |
| Database | Supabase PostgreSQL (ptgtliwllimkswtajcmy) | Project: Start Today Live |
| DEMO database | Supabase PostgreSQL (tbihmlnqpwdeiethgwaf) | Project: Start Today Demo |
| Auth | Custom JWT (jose) + TOTP MFA | Cookie: `hr_session`, `JWT_SECRET` env var |
| AI | Anthropic Claude API + Voyage AI (voyage-law-2) | Embeddings for law_records, knowledge_base |
| Edge functions | Supabase Deno edge functions | hr-dashboard-data, carl-*, etc. |

**CRITICAL — Softr is NOT part of the stack.** Never reference Softr, iframe embeds, or the `window.logged_in_user` pattern. That was the old architecture and has been completely removed.

---

## Deployment Manifest

| App | Domain | Vercel Project ID | GitHub Repo |
|-----|--------|------------------|-------------|
| HR Dashboard | hr.starttoday.biz | prj_vOK2S92gkl1lz3Vo2YG5gAIKUtTM | Starttodaybiz/HR |
| Pro HR | prohr.starttoday.biz | prj_3Eia7K4L2JVkBzhENbadGbF2yjwZ | Starttodaybiz/ProHR |
| Attorney | legal.starttoday.biz | prj_sczZV0Y6EmonWmfHZSxttTwbXZCs | Starttodaybiz/attorney-dashboard |
| STVerify | stverify.starttoday.biz | prj_m8gd7DrEpLLoydfG4jDQvmAlAlSM | Starttodaybiz/stverify |
| Finance | finance.starttoday.biz | prj_etyUAsXqQD6aqD8kmeU3rfE6TxeD | Starttodaybiz/finance |
| Bank (treasury) | bank.starttoday.biz | prj_pbqQ7003ZUEPFxTh6rv1YM9x79mq | Starttodaybiz/bank |

**Team ID:** `team_7hbKJDeZuvbjZ7aTxXxUnFv4`
**Git identity:** `Starttodaybiz <Starttodaybiz@users.noreply.github.com>` (finance) or `j@starttoday.biz` (HR/legacy)
**Deploy:** `git push origin main` → Vercel auto-deploys. Only push when Jason approves.

### Required Env Vars (ALL apps)

```
NEXT_PUBLIC_SUPABASE_URL=https://ptgtliwllimkswtajcmy.supabase.co
# ↑ CRITICAL: Must be the full URL ending in .supabase.co — never truncated
SUPABASE_SERVICE_ROLE_KEY=<legacy JWT from Supabase → Settings → API Keys → Legacy tab>
JWT_SECRET=<session signing secret>
NEXT_PUBLIC_APP_URL=<app's own domain>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## PROD DDL Checklist (READ BEFORE ANY PROD SCHEMA CHANGE)

Before ANY schema change on PROD (`ptgtliwllimkswtajcmy`):

### 1. Snapshot advisors
```
Supabase:get_advisors(project_id='ptgtliwllimkswtajcmy', type='security')
```
Save the count. This is the pre-migration baseline for delta comparison.

### 2. DEMO/PROD parity check for the target table
Run on BOTH ptgtliwllimkswtajcmy AND tbihmlnqpwdeiethgwaf:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '<Target>'
ORDER BY ordinal_position;
```
Compare column lists. Note any drift. **DEMO is not always the source of truth** — sometimes DEMO has experimental columns that shouldn't propagate to PROD.

### 3. DEMO/PROD parity check for the app's API SELECT clauses
BEFORE deploying frontend code that reads new columns:
```bash
grep -n "select=" app/api/data/route.js  # or equivalent route file
```
Every column in the SELECT must exist on PROD. Silent 400 errors from PostgREST when a column is missing → `q()` returns `[]` → user sees empty data. **LIVE PRODUCTION BUG PATTERN** discovered Jul 24 2026 on Finance app.

### 4. Apply the migration
Use `Supabase:apply_migration` (not `execute_sql`), so it's recorded in the migration history.

Include `NOTIFY pgrst, 'reload schema';` at the end of DDL so PostgREST picks up new columns immediately without waiting for its polling cycle.

Example:
```sql
ALTER TABLE "Financial_Statements"
  ADD COLUMN IF NOT EXISTS "Cash" numeric,
  ADD COLUMN IF NOT EXISTS cf_operating numeric;

NOTIFY pgrst, 'reload schema';
```

### 5. Post-migration verification
- Re-snapshot advisors. Verify delta is intentional (usually 0 for schema additions).
- Verify column exists via `information_schema.columns` query.
- Run the relevant TC (e.g. TC-015 for Financial_Statements).
- Update `platform-dev-test-ontology` Schema Ontology entry IN THE SAME SESSION.

### 6. API mapper follow-up
If the DDL adds columns that will be exposed via an API route with a `stmts.map(s => ({...}))` reshape, update the mapper output object in the same commit as the SELECT change. `grep -n "\.map(s => ({" app/api/data/route.js` to find the pattern.

### Approval requirements
- **Michael sign-off required** for schema changes touching:
  - Compliance data
  - Legal reference data
  - Evidence rules
  - Policy conflicts
- **NOT required** for pure data-model alignment (e.g. adding standard financial statement columns to bring PROD in line with DEMO).

When in doubt, ask.

---

## Standard API Route Pattern

Every server-side route follows this exact pattern:

```typescript
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // validate...

  const res = await fetch(`${SB_URL}/rest/v1/rpc/your_rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_SVC,
      Authorization: `Bearer ${SB_SVC}`,
    },
    body: JSON.stringify({ p_org_id: session.org_id, ...params }),
  });

  const raw = await res.json();
  // ALWAYS unwrap — PostgREST wraps RETURNS JSONB in array for some versions
  const data = Array.isArray(raw) ? raw[0] : raw;

  if (!res.ok || !data?.ok) {
    return NextResponse.json({ ok: false, error: String(data?.error || 'Failed') }, { status: 422 });
  }
  return NextResponse.json({ ok: true, ...data });
}
```

**Key rules:**
- Always check session first
- Always use `SB_SVC` (service role) for server-side calls — never anon key
- Always unwrap with `Array.isArray(raw) ? raw[0] : raw`
- Always return `{ ok: true }` on success, `{ ok: false, error }` on failure

### GET-with-explicit-mapper Pattern (Finance app, PostgREST direct)

When a route reads from PostgREST directly (not via RPC) and reshapes the response:

```typescript
const stmts = await q(`Financial_Statements?...&select=col1,col2,cf_operating&order=...`)
return Response.json({
  statements: Array.isArray(stmts) ? stmts.map(s => ({
    id: s.Financial_statements_id,
    col1: s.col1,
    col2: s.col2,
    cf_operating: s.cf_operating,
    // ... more fields
  })) : []
}, { headers: { 'Cache-Control': 'no-store' } })
```

**CRITICAL: Adding a column to the SELECT is a TWO-STEP change** — the mapper must also be updated. Adding to SELECT alone silently drops the field before serialization. Grep for `.map(s => ({` in the same file after every SELECT change.

---

## Standard RPC Pattern

```sql
CREATE OR REPLACE FUNCTION your_function(p_org_id UUID, p_param TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- always SET search_path = public to avoid security_definer_view advisor finding
  INSERT INTO "YourTable" (org_id, col) VALUES (p_org_id, p_param);
  RETURN jsonb_build_object('ok', true, 'id', gen_random_uuid());
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
```

**Key rules:**
- Always `SECURITY DEFINER SET search_path = public`
- Always wrap in `EXCEPTION WHEN OTHERS THEN` returning `{ok: false, error: SQLERRM}`
- Return `JSONB` — PostgREST returns it directly (not wrapped in row object)
- Use `p_` prefix for all parameters

---

## Install Script Pattern (for shipping code changes)

All finance app code changes ship via install scripts run on Jason's iMac. Standard pattern:

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO=~/Downloads/<app>
FILE="path/to/target.js"
export GIT_PAGER=cat  # CRITICAL — prevents `git diff` from blocking on `less`

cd "$REPO"

echo "==> Preconditions"
git status --porcelain | grep -q . && { echo "ERROR: working tree not clean."; git status --short; exit 10; }

echo "==> Fetch + fast-forward main"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Backup"
cp "$FILE" "/tmp/$(basename $FILE).pre-<fix-name>.bak"

echo "==> Apply patch"
python3 << 'PYEOF'
# Idempotency check FIRST
# Anchor-based replacement
# Post-patch validation
# Bracket balance sanity check
# Verify prior fixes still intact
# Write file
PYEOF

echo "==> WRITE OK, PROCEEDING TO COMMIT"  # visibility marker — catches silent script exits

echo "==> Post-write verification"
grep -q "expected-pattern" "$FILE" && echo "OK" || { echo "ERROR"; exit 20; }

echo "==> Diff"
git --no-pager diff --stat "$FILE"
git --no-pager diff "$FILE"

echo "==> Commit + push"
git -c user.name=Starttodaybiz -c user.email=Starttodaybiz@users.noreply.github.com \
    add "$FILE"
git -c user.name=Starttodaybiz -c user.email=Starttodaybiz@users.noreply.github.com \
    commit -m "<detailed commit message>"
git push origin main
```

**Locked lessons (Jul 24 2026 L series):**
- Always `export GIT_PAGER=cat` — prevents pager blocking
- Always use `git --no-pager diff` in scripts
- Print "WRITE OK, PROCEEDING TO COMMIT" between write and commit for visibility
- Include idempotency check with SKIP path — allows re-running safely
- Include bracket-balance sanity check before writing to disk
- Include "verify prior fixes still intact" check to prevent regression

**Locked lessons v2 (Jul 24-25 2026 install script hardening):**

- **Cross-platform base64 decode:** always `base64 -d < file`, NEVER `base64 -d file`.
  macOS base64 rejects the positional-filename form (`invalid argument`); stdin
  redirect works on both macOS and Linux. Discovered when yesterday's
  install_platform_skills_update.sh (v1) failed on Jason's iMac.

- **`grep -c pattern file | grep -q "^0$"` is broken under `set -o pipefail`:**
  when the first grep finds zero matches, it exits with status 1 even though
  it prints "0" to stdout. Pipefail catches that and propagates the failure.
  So a passing check (zero matches confirmed) reports as an ERROR. Correct
  forms:
    * `! grep -q "pattern" file && echo "not found"` (idiomatic negation)
    * `[ "$(grep -c "pattern" file)" = "0" ]` (subshell captures the count)
  Discovered when L-fix9's "L-fix8 remnants gone" check falsely errored
  despite Python's forbidden-pattern check having already verified success.

- **SIGPIPE + pipefail interaction:** `git diff | head -100` under pipefail
  will kill the script when git produces more output than head reads. git
  gets SIGPIPE on its next write, pipe fails, `set -e` triggers exit. This
  happened right before the commit step on install_platform_skills_update
  yesterday — files were correctly patched but the commit never ran. Fixes:
    * `{ git --no-pager diff X | head -100; } || true` (swallow the failure)
    * Or drop pipefail for the specific line: `set +o pipefail; ...; set -o pipefail`

- **PostgREST within-period ordering is undefined:** if your ORDER BY has
  ties, the tie-breaker is arbitrary. Under first-wins dedup, this makes
  the "winner" effectively random. If you need deterministic dedup, add
  explicit tiebreaker columns to `order=`. Better: filter to relevant rows
  BEFORE dedup so any winner is acceptable.

- **Shared-state dedup for context-divergent views (L-fix8→12 case study):**
  Do NOT solve conflicting per-view winners with a shared dedup that picks
  one row per key — you'll break whichever view didn't win. Correct pattern:
    STEP 1: Filter raw source to matching scope
    STEP 2: Filter to non-null metric FOR THE CURRENT VIEW
    STEP 3: Sort by key
    STEP 4: Dedup per key (first-wins within already-filtered set)
  Each view runs its own STEP 2→4 with its own metric getter. No shared
  intermediate structure. Full write-up in platform-dev-test-ontology
  under "Shared-state dedup for context-divergent views".

---

## Auth Pattern

```typescript
// src/lib/auth.ts — JWT session via jose, cookie: hr_session
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');
const COOKIE = 'hr_session';

export async function getSession(req?: NextRequest): Promise<SessionUser | null> {
  // reads hr_session cookie, verifies JWT, returns {id, email, org_id, role, name}
}
```

**Login flow:** POST `/api/auth/login` → `verify_admin_password` RPC → MFA check → return `{mfa_required, auth_id, factor_id, org_id}` → TOTP → set cookie

**CRITICAL — Fail-closed getSecret pattern:**
```typescript
// WRONG — fail-open, silently returns empty encoder if missing
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '');

// RIGHT — fail-closed, throws if missing
function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET missing');
  return new TextEncoder().encode(s);
}
```

Fail-open patterns silently accept empty session tokens. Discovered in chamber Jul 2026, must be checked in every app during security remediation.

---

## UI Component System

The HR app has a shared component library at `src/components/ui/`:

```typescript
import { Card, CardHeader, Chip, Btn, C } from '@/components/ui';

// C is the color constants object — always use these, never hardcode hex
C.blue, C.green, C.amber, C.red, C.text, C.textMuted, C.textSec
C.bg, C.surface, C.surface2, C.border, C.navy
C.blueBg, C.greenBg, C.amberBg, C.redBg
```

**Chip variants:** `color="blue" | "green" | "amber" | "red" | "gray"`
**Btn variants:** `variant="primary" | "ghost" | "green" | "danger"`

### Modal Pattern (locked — CENTERED modals only)

**Finance app + all newer apps:** Centered modals only, NOT right-slide drawers.
- Dark backdrop
- Center align
- Max-width ~720px
- Rounded 14px
- Rise+fade entrance (translateY+scale, NOT translateX)
- ESC + backdrop close
- No color emoji; monochrome glyphs only (◈ ◊ ↻ → ⚠ ↩)
- CARL glyph: ◈

**HR app legacy** uses right-side drawer pattern:
- Fixed right-side drawer: width 680, height 100vh, zIndex 1000
- Use ModalWrap + ModalHead from QuickModals.tsx pattern
- Always: onClick={e => e.stopPropagation()} on inner panel
- Tabs: border-bottom indicator, no background

---

## Platform Style Guide

### Status Color Palette

| Status | Color | Hex | CSS var |
|--------|-------|-----|---------|
| Good / Compliant | Green | `#059669` | `C.green` |
| Pending / Medium | Amber | `#D97706` | `C.amber` |
| Overdue / At Risk | Red | `#DC2626` | `C.red` |
| Info / Entity | Blue | `#2563EB` | `C.blue` |
| Navy header | Navy | `#0F172A` | `C.navy` |
| Page background | Slate-50 | `#F8FAFC` | `C.bg` |
| Card surface | White | `#FFFFFF` | `C.surface` |
| Border | Slate-200 | `#E2E8F0` | `C.border` |

**Never use `#10B981` (bright green) — use `#059669` instead.**

### Design Principles
- **Muted, enterprise-weight** — nothing pops or feels consumer/playful
- **Card borders:** 1px solid `C.border`, subtle box-shadow at 0.04 opacity
- **Typography:** Font weights slightly dialed down — refined, not bold
- **Progress bars:** Slate grays only (`#64748B` → `#CBD5E1`), never purple
- **Score numbers:** Neutral text color, never colored values
- **Backgrounds:** Softened pastel tints, never competing with content

### Score Band Colors
```
🟢 Compliant       → green   (85-100)
🟡 Needs Review    → amber   (70-84)
🟠 Needs Attention → amber   (55-69)
🔴 At Risk         → red     (40-54)
⚫ Critical        → red     (0-39)
```

### Vendor separation (locked)
- Twilio = SMS only
- Resend = email
- Internal escalation/alerts = Work Hub (work.starttoday.biz)
- **Never propose Slack** anywhere — not in specs, alert paths, or escalation designs

---

## Score System Architecture

```
Score_Card (source of truth, per entity, daily compute)
  ↓ sync_scores_from_score_card()
entity_start_scores_table (gamification reads this)
  ↓ get_gamification_profile(entity_id)   ← takes entity_id NOT org_id
Entity_Score_Pillars (11 pillars, per entity)
```

**Daily cron (6AM UTC):**
```sql
SELECT calculate_start_scores();    -- writes to Score_Card
SELECT sync_scores_from_score_card(); -- syncs to entity_start_scores_table
```

**Start Score™ is proprietary IP:** Methodology, weights, parameters are NEVER user-configurable. Never write "configurable via admin panel" or "adjustable weights." Scoring is real-time + nightly 6 AM UTC — never "monthly." Use `calculate_start_scores_v4` — `recompute_entity_score_v2` writes NULL and must not be used.

---

## Known Schema Gotchas (see platform-dev-test-ontology for full registry)

These column names have burned us — always verify before writing RPCs. Full list in platform-dev-test-ontology under "Column Name Gotchas."

Quick reference for the top 10:

```
Employees.Work_email (not Email)
HR_Compliance_Issues.CreatedAt is TEXT
Compliance_Items has 7 NOT NULL FK columns — SELECT defaults first
G_Departments.Departments_id (PK, not G_Departments_id)
Entities.sos_entity_type (text, not FK)
Financial_Statements — cf_operating/investing/financing only on 'Cash Flow' rows
Financial_Statements — DEMO/PROD schema drift possible; verify parity
Organizations.Organizations_id (PK, not id)
Score_Card — filter WHERE "Computed By" = 'calculate_start_scores_v2'
get_gamification_profile() takes entity_id NOT org_id
```

---

## Supabase MCP Best Practices

- **Multi-statement gotcha:** `execute_sql` returns only the last result set. Split queries into separate calls when multiple results needed.
- **DDL vs reads:** `apply_migration` for DDL (append `NOTIFY pgrst, 'reload schema'`); `execute_sql` for reads.
- **RPC surgical edit pattern:** `pg_get_functiondef` → verify anchor uniqueness → `replace()` → `EXECUTE`. Never re-emit full function bodies.

---

## Security Baseline

After any DDL change, check security advisors. See `platform-dev-test-ontology` TC-016 for the rolling-baseline approach (the static "22 findings" number is stale as of Jul 24 2026).

Approach: snapshot before DDL, snapshot after DDL, verify delta is intentional.

Categories accepted at PROD as of Jul 2026:
- Many `anon_security_definer_function_executable` WARN findings (accepted, tracked for future auth work)
- 20 SECURITY DEFINER views (intentional)
- 2 extensions in public schema (vector, pg_net)
- 2 service-role bypass policies (address_verification_log, pfs_submissions)

**Alert if:**
- New RPC missing `SET search_path = public`
- New table missing RLS

---

## See Also

- `platform-page-audit` — QA sweep methodology, login fixes, write-back test scripts
- `platform-dev-test-ontology` — feature ontology, test cases, FF log, schema registry
- `platform-security-audit` — comprehensive security audit report generator
- `platform-security-remediate` — security finding remediation playbook
- `platform-responsive-design` — responsive design recipes and useCompact viewport
- `mfa-implementation` — TOTP MFA integration pattern
