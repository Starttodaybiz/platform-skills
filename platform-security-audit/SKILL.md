---
name: platform-security-audit
description: >
  Perform a comprehensive security and code quality audit of the Start Today™
  platform. Produces a Word document with 14 sections in four parts: (1) Master
  Security & Code Quality Audit — Supabase DB, RLS, edge functions, MFA
  enrollment, infrastructure; (2) Source Code Audit Addendum — API route
  auth coverage, hardcoded PII, security headers, code quality across all
  in-scope apps; (3) SOC 2 Assessment — Type I vs Type II readiness, CC1–CC9
  scoring, remediation roadmap to certification; (4) Per-App Capability Matrix
  — operational gap view scoring each app against the canonical 8-capability
  security envelope (audit log, rate-limit, headers, dashboard, MFA, backup
  codes, settings page, admin reset, CSRF). Also produces a JSON sidecar
  (security-audit-<date>.json) with the same gap data in machine-readable
  form for the platform-security-remediate skill to consume. Use this skill
  for: "security audit", "run the audit", "re-run the audit", "audit the
  platform", "check security", "audit report", "security report", "how secure
  is the platform", "current findings", "SOC 2 readiness", "certification
  gap", "vulnerability scan", "code quality audit", "capability matrix",
  "envelope coverage", "per-app gap matrix". Always generate the complete
  combined report even if only one part is requested.
---

# Platform Security Audit — Start Today™

## What This Skill Produces

Two output artifacts:

1. A professional Word document (`StartToday_Security_Audit_Initial.docx`)
   containing four parts, 14 sections, written as a **first-time audit** —
   all findings are open vulnerabilities in present tense, regardless of
   whether remediation has occurred since a previous run. Every number comes
   from a live scan at the time of the audit run.

2. A machine-readable JSON sidecar (`security-audit-<YYYY-MM-DD>.json`)
   with the per-app capability matrix in structured form. This is the
   handoff to the `platform-security-remediate` skill — that skill ingests
   this JSON to produce a guided sprint plan.

**Part 1 — Master Security & Code Quality Audit**
1. Audit Scope & Technology Stack
2. Database Security Findings
3. Authentication & MFA Assessment
4. Infrastructure Security
5. Finding Priority Matrix

**Part 2 — Source Code Security Audit Addendum**
6. API Route Authentication Coverage
7. Hardcoded PII & Sensitive Data in Source Code
8. Code Quality Assessment
9. Source Code Finding Priority Matrix

**Part 3 — SOC 2 Certification Assessment & Gap Analysis**
10. SOC 2 Framework Overview
11. SOC 2 Type I Readiness — CC1–CC9 Criterion Assessment
12. Type I vs Type II Certification Readiness Scoring
13. Master Remediation Roadmap

**Part 4 — Per-App Capability Matrix** (operational gap view)
14. Per-App Capability Matrix — scores each in-scope app against the
    canonical 8-capability security envelope (PRESENT / PARTIAL / MISSING /
    N/A-ASSUMPTION) plus assumption profile (Supabase project, auth pattern,
    router, helpers present, shared-DB RPC availability)

---

## Platform Reference

| Item | Value |
|------|-------|
| Supabase project | `ptgtliwllimkswtajcmy` (Start Today Live, us-east-1) |
| GitHub org | `Starttodaybiz` |
| GH token env | `GH_TOKEN` (ghp_…) |
| Vercel team | `team_7hbKJDeZuvbjZ7aTxXxUnFv4` |

### Applications In Scope

The canonical reference (most-protected, full envelope) is C2C. Every other
in-scope app is audited against the C2C baseline.

| Local dir | GitHub repo | Domain | Router | Notes |
|-----------|-------------|--------|--------|-------|
| `c2c-repo` | `C2C` | c2c.starttoday.biz | App Router | **Canonical reference** — full envelope (Sprints J-X) |
| `pa-repo` | `Platform-Admin` | admin.starttoday.biz | App Router | Full envelope (Sprints R-X). Padmin's CSRF kill-switch is a backport candidate for C2C. |
| `atty-repo` | `attorney-dashboard` | legal.starttoday.biz | App Router | |
| `admin-user` | `Admin-User` | admin portal | Pages Router | |
| `client-dashboard` | `Client-Dashboard` | client.starttoday.biz | App Router | Largest user-facing surface |
| `compliance-user` | `compliance-User` | compliance.starttoday.biz | Pages Router | |
| `client-ep` | `Client-EP` | starttoday.estate | App Router | Client-facing estate planning |
| `hr-repo` | `HR` | hr.starttoday.biz | App Router | Client HR (per Deployment Manifest in `compliance-platform-development`) |
| `prohr-repo` | `ProHR` | prohr.starttoday.biz | App Router | Provider HR (per Deployment Manifest in `compliance-platform-development`) |
| `employee-repo` | `employee` | employee.starttoday.biz | App Router | Mobile-first ESS |
| `bank-repo` | `Bank` | bank.starttoday.biz | App Router | Client-facing banking |
| `lender-repo` | `Lender` | lender.starttoday.biz | App Router | Bank/lender-facing |
| `mga-repo` | `MGA` | mga.starttoday.biz | App Router | |
| `mylegal-repo` | `mylegal` | mylegal.starttoday.biz | App Router | Start Suite Legal |
| `plan-repo` | `plan` | plan.starttoday.biz | App Router | Strategic Planning |
| `marketplace-repo` | `marketplace` | marketplace.starttoday.biz | App Router | |
| `work-repo` | `Work` | work.starttoday.biz | App Router | Internal ops |
| `property-repo` | `Property` | property.starttoday.biz | App Router | |
| `accounting-repo` | `Accounting` | accounting.starttoday.biz | App Router | |
| `finance-repo` | `Finance` | finance.starttoday.biz | App Router | Provider-facing (CPAs) |

### Discovered Repos NOT In Scope

These exist in the GitHub org but are deliberately excluded from this audit
sweep. Each gets a one-line reason — the list itself is auditable, so
exclusions are reviewable rather than silent.

| Repo | Reason for exclusion |
|------|---------------------|
| `stverify` | Separate Supabase account (`ewfahugybiaizfurlyop`). Different envelope, different MCP scope. Audit separately. |
| `chamber` | Per-app TOTP MFA pattern (not the canonical shared-cookie pattern). Different envelope. Audit separately. |
| `carl` | LLM service / API gateway, not a user-facing authenticated app. Verify whether envelope applies before adding. |

The remediate skill respects this list — it will refuse to plan sprints
against an out-of-scope app and ask the operator to confirm the architectural
assumption first.

---

## Step-by-Step Workflow

### Step 1 — Collect Live Data (run everything in parallel)

**Database:**
```
Supabase:get_advisors(project_id="ptgtliwllimkswtajcmy", type="security")
Supabase:get_advisors(project_id="ptgtliwllimkswtajcmy", type="performance")
Supabase:list_edge_functions(project_id="ptgtliwllimkswtajcmy")
```

**DB verification SQL (run all 4):**
```sql
-- 1. Schema counts
SELECT
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public') as tables,
  (SELECT COUNT(*) FROM pg_views WHERE schemaname='public') as views,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public') as functions,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=true) as rls_on,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false) as rls_off;

-- 2. Tables with RLS but zero policies
SELECT tablename FROM pg_tables t
WHERE t.schemaname='public' AND t.rowsecurity=true
AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename);

-- 3. Functions with mutable search_path
SELECT COUNT(*) as mutable FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='public'
AND NOT EXISTS (SELECT 1 FROM pg_options_to_table(p.proconfig) WHERE option_name='search_path');

-- 4. Always-true RLS policies
SELECT schemaname, tablename, policyname, qual FROM pg_policies
WHERE schemaname='public' AND (qual='true' OR qual IS NULL) ORDER BY tablename;

-- 5. MFA enrollment
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM auth.mfa_factors WHERE status='verified') as enrolled,
  (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as total_users;
```

**Pull/update all 6 repos:**
```bash
GH_TOKEN=<from env>
for ENTRY in "pa-repo:Platform-Admin" "atty-repo:attorney-dashboard" "admin-user:Admin-User" "client-dashboard:Client-Dashboard" "compliance-user:compliance-User" "client-ep:Client-EP"; do
  DIR=$(echo $ENTRY | cut -d: -f1)
  REPO=$(echo $ENTRY | cut -d: -f2)
  if [ -d "/home/claude/$DIR" ]; then
    cd /home/claude/$DIR && git pull "https://${GH_TOKEN}@github.com/Starttodaybiz/${REPO}.git" main 2>&1 | tail -1
  else
    git clone "https://${GH_TOKEN}@github.com/Starttodaybiz/${REPO}.git" /home/claude/$DIR &
  fi
done
wait
```

**Per-repo scan (run for ALL 6 repos):**
```bash
DIR=/home/claude/<repo_dir>

# Auth architecture
grep -h "SESSION_COOKIE\s*=" $DIR/middleware.js 2>/dev/null | head -1
grep -rh "process\.env\." $DIR/middleware.js 2>/dev/null | grep -i 'secret\|jwt' | grep -o 'process\.env\.[A-Z_]*' | head -1

# MFA enrollment mode (Mode A = forced; Mode B = optional)
grep -q "mfa_setup_required\|MFA_SETUP_COOKIE\|mfa_setup" $DIR/app/api/auth/login/route.js \
  $DIR/pages/api/auth/login.js 2>/dev/null && echo "Mode A" || echo "Mode B"

# Middleware setup cookie (confirms Mode A at middleware layer)
grep -q "mfa_setup\|SETUP" $DIR/middleware.js 2>/dev/null && echo "Setup cookie in middleware" || echo "MISSING"

# Security headers
cat $DIR/next.config.js | grep -E "'key'|Strict-Transport|X-Content|X-Frame|Referrer-Policy|Permissions-Policy|Content-Security" 2>/dev/null

# Magic link
grep -rl "magic_link\|verify_magic\|request_magic" $DIR --include="*.js" --include="*.jsx" 2>/dev/null | grep -v node_modules

# Debug/test routes
find $DIR -path "*debug*" -o -path "*test*" -name "*.js" 2>/dev/null | grep '/api/' | grep -v node_modules

# Hardcoded PII (exact count)
grep -rn "@mjs\.law\|mschirger\|wschirger\|Jason.*Walker\|j@starttoday\|Peter Provenz\|Jeff Fahren\|drobinson@mjs\|Rusty Pugh\|Sarah Essex" \
  $DIR --include="*.js" --include="*.jsx" 2>/dev/null | grep -v node_modules | grep -v "placeholder\|//\|mailto" | wc -l

# Unprotected routes
for f in $(find $DIR -path '*/api/*' -name '*.js' | grep -v node_modules | grep -v "mfa\|login\|logout\|signout\|session\|verify\|confirm\|callback"); do
  grep -q "jwtVerify\|getSessionFromCookie\|requireSession\|requireAuth\|parseCookie.*SESSION\|parseCookieFromHeader" "$f" 2>/dev/null \
    || echo "UNPROTECTED: $(echo $f | sed "s|$DIR/||")"
done

# X-Frame-Options invalid value
grep "ALLOWALL" $DIR/next.config.js 2>/dev/null && echo "INVALID X-Frame-Options: ALLOWALL"

# requireSession() JWT verification gap
grep -A5 "requireSession" $DIR/app/api/admin/route.js 2>/dev/null | grep -c "jwtVerify"
```

**Parse performance advisories:**
```python
import json
with open('<tool_result_file>') as f:
    raw = json.load(f)
for block in raw:
    if isinstance(block, dict) and block.get('type') == 'text':
        data = json.loads(block['text'])
        lints = data['result']['lints']
        print(f"Total: {len(lints)}")
        by_name = {}
        for l in lints:
            by_name[l['name']] = by_name.get(l['name'], 0) + 1
        for k,v in sorted(by_name.items(), key=lambda x: -x[1]):
            print(f"  {k}: {v}")
        break
```

### Step 2 — Classify Findings

See `references/severity-guide.md` for the complete severity scale and standard
severity assignments for every known finding type.

### Step 3 — Generate the Report

**Read before writing any code:**
- `references/report-template.md` — all finding descriptions, risk text, remediation guidance
- `references/soc2-criteria.md` — SOC 2 criterion descriptions and assessment language
- `scripts/generate-report.js` — the canonical docx generation script

**Adapt the script** — search for `// ADAPT:` comments and update:
- `// ADAPT: date` → set `const today`
- `// ADAPT: db-counts` → table/view/function counts from live SQL
- `// ADAPT: advisory-counts` → per-category counts from Supabase advisor
- `// ADAPT: always-true-policies` → count and table names from SQL query
- `// ADAPT: mfa-enrollment` → enrolled/total from auth.mfa_factors query
- `// ADAPT: edge-functions` → count and any JWT=false findings
- `// ADAPT: app-auth-table` → per-app cookie, JWT env, enrollment mode
- `// ADAPT: security-headers` → per-app header status from next.config.js scan
- `// ADAPT: unprotected-routes` → actual routes found per app
- `// ADAPT: pii-counts` → exact counts and file paths per app
- `// ADAPT: requireSession-gap` → confirmed or resolved
- `// ADAPT: soc2-criteria` → adjust MET/PARTIAL/GAP per live findings

**Run:**
```bash
npm install -g docx   # skip if already installed
mkdir -p /home/claude/audit-output
node scripts/generate-report.js
```

### Step 4 — Deliver

```bash
cp /home/claude/audit-output/StartToday_Security_Audit_Initial.docx \
   /mnt/user-data/outputs/StartToday_Security_Audit_Initial.docx
```
Then call `present_files` with the output path.

### Step 5 — Build the Per-App Capability Matrix (Section 14 + JSON)

The first 13 sections cover SOC 2 evidence and finding-level audit detail.
Section 14 is the **operational gap view** — for each in-scope app, score
each of the 8 canonical envelope capabilities (PRESENT / PARTIAL / MISSING /
N/A-ASSUMPTION) and capture the assumption profile (Supabase project, auth
pattern, router, helpers present, shared-DB RPC availability).

This step produces both:
- A new Section 14 docx block appended to the main report
- A machine-readable JSON sidecar consumed by the remediate skill

**Read first:**
- `references/canonical-envelope.md` — the 8-capability spec, detection
  signals per capability, common gaps, scoring legend, assumption profile
  schema. **This is the source of truth for what "PRESENT" means.**

**Run the matrix builder:**

```bash
node scripts/generate-capability-matrix.js \
  --apps-root=/home/claude \
  --out-json=/mnt/user-data/outputs/security-audit-$(date +%Y-%m-%d).json \
  --out-docx-fragment=/home/claude/audit-output/section-14-fragment.json
```

The script walks each in-scope app's local directory and runs the detection
signals from `canonical-envelope.md` against the cloned source. Output:

```json
{
  "schema_version": "1.0",
  "audit_date": "2026-05-05",
  "canonical_reference": "c2c-repo",
  "apps": [
    {
      "name": "c2c-repo",
      "repo": "C2C",
      "domain": "c2c.starttoday.biz",
      "in_scope": true,
      "assumptions": {
        "supabase_project": "canonical",
        "auth_pattern": "custom_jwt",
        "router": "app",
        "helpers_present": ["requireSession", "sbRpc", "writeAudit"],
        "shared_db_rpcs_available": true
      },
      "capabilities": {
        "audit_log":        {"score": "PRESENT", "evidence": "lib/security/audit.js + writeAudit() called from auth/login"},
        "rate_limit":       {"score": "PRESENT", "evidence": "lib/security/rate-limit.js + login_post:5/300s policy"},
        "headers":          {"score": "PRESENT", "evidence": "lib/security/headers.js + middleware applies"},
        "dashboard":        {"score": "PRESENT", "evidence": "/admin/login-attempts page exists"},
        "mfa_enforcement":  {"score": "PRESENT", "evidence": "Mode A forced enrollment lane"},
        "backup_codes":     {"score": "PRESENT", "evidence": "fn_mfa_backup_codes_* RPCs + UI"},
        "settings_page":    {"score": "PRESENT", "evidence": "/settings/security exists"},
        "admin_reset":      {"score": "PRESENT", "evidence": "/admin/mfa-reset + fn_admin_reset_user_mfa"},
        "csrf":             {"score": "PRESENT", "evidence": "Stage 3 enforce on every state-changing route", "stage": 3}
      },
      "gaps": [],
      "notes": ["Canonical reference baseline"]
    },
    {
      "name": "atty-repo",
      "repo": "attorney-dashboard",
      "domain": "legal.starttoday.biz",
      "in_scope": true,
      "assumptions": { ... },
      "capabilities": { ... },
      "gaps": [
        {"capability": "csrf", "current": "MISSING", "playbook_sprint": "U+V+W"},
        {"capability": "backup_codes", "current": "MISSING", "playbook_sprint": "S"}
      ],
      "notes": []
    }
  ],
  "discovered_out_of_scope": [
    {"repo": "stverify", "reason": "Separate Supabase account"},
    {"repo": "chamber", "reason": "Per-app TOTP MFA pattern"},
    {"repo": "carl", "reason": "LLM service — verify envelope applies"}
  ]
}
```

**Section 14 docx content** is generated from the same data in tabular form:
one row per app, columns for each of the 8 capabilities with the score, plus
an assumption-profile sub-table per app for non-canonical patterns.

The matrix builder's logic should match `references/canonical-envelope.md`
exactly. When the canonical doc is updated (new capability added, detection
signal changed), the script needs to reflect that change.

**Re-deliver after Step 5:**

```bash
# JSON sidecar already at /mnt/user-data/outputs/security-audit-<date>.json
# Re-run the docx generator to include Section 14, then re-copy to outputs
node scripts/generate-report.js  # picks up section-14-fragment.json
cp /home/claude/audit-output/StartToday_Security_Audit_Initial.docx \
   /mnt/user-data/outputs/StartToday_Security_Audit_Initial.docx
```

Call `present_files` with both the docx and the JSON sidecar.

### Step 6 — Hand off to remediate (optional)

If the operator wants a fix plan for any non-canonical app, invoke
`platform-security-remediate` with the JSON sidecar path. That skill produces
a guided sprint plan (read-only by default — execute on explicit approval).

---

## Severity Scale

| Level | Badge color | Definition |
|-------|-------------|-----------|
| CRITICAL | Red | Immediate exploitable exposure, data at risk, auth bypass |
| HIGH | Amber | Significant risk, likely exploitable, requires prompt fix |
| MEDIUM | Amber | Real risk, not immediately exploitable, fix soon |
| LOW | Blue | Best practice gap, minor exposure |
| INFO | Gray | Performance/quality — no direct security impact |

**Standard severities — do not change without cause:**

DB findings:
- `rls_disabled_in_public` → CRITICAL
- `rls_enabled_no_policy` → CRITICAL
- `function_search_path_mutable` → HIGH
- `security_definer_view` → HIGH
- `rls_policy_always_true` → MEDIUM
- `sensitive_columns_exposed` → MEDIUM
- `auth_leaked_password_protection` → MEDIUM
- `extension_in_public` → LOW

App findings:
- No MFA deployed → CRITICAL
- MFA deployed but <100% enrollment in DB → CRITICAL
- requireSession() no JWT verification → HIGH
- Unprotected route using service role key → HIGH
- Unprotected route triggering external paid action (DocuSign, invoice) → HIGH
- Test/debug routes in production → HIGH
- Magic link edge function still active → MEDIUM
- Always-true RLS policies → MEDIUM
- Missing security headers (4 of 6 apps) → MEDIUM
- X-Frame-Options: ALLOWALL (invalid value) → MEDIUM
- Hardcoded PII >10 instances including KYC/AML data → HIGH
- Hardcoded PII <10 instances → MEDIUM
- Hardcoded PII 1-2 instances (mock data) → LOW
- Middleware-only route protection (no per-route guards) → MEDIUM
- Vercel WAF not configured → MEDIUM
- No dependency vulnerability scanning → MEDIUM

---

## Audit Tone & Quality Rules

1. **Written as first-time, present-tense.** "This route has no authentication guard." Never "This route had no authentication guard."
2. **Every number is live.** Pull advisory counts, route lists, PII instance counts, MFA enrollment numbers from the actual scan. Never use cached or estimated values.
3. **Every finding includes exact file paths.** No vague references like "a route in attorney-dashboard." Use `app/api/onboard/route.js`.
4. **Clean findings get credit.** If a category is zero, say so with a green status. The report shows both open and resolved.
5. **SOC 2 must be honest.** Do not inflate readiness scores. MET = fully satisfies the criterion with evidence. PARTIAL = some evidence but gaps exist. GAP = no evidence or significant shortfall.
6. **Never omit a section.** All 14 sections appear in every run. If a section has no findings, state that explicitly. Section 14 always lists every in-scope app even when all capabilities are MISSING — empty rows are signal, not noise.

---

## Reference Files

- `references/report-template.md` — Finding descriptions (DB, App, SOC 2), risk text, remediation guidance
- `references/soc2-criteria.md` — Complete CC1-CC9 criterion descriptions and assessment patterns
- `references/severity-guide.md` — Full severity scale with all known finding types
- `references/canonical-envelope.md` — The 8-capability spec with detection signals,
  common gaps, scoring legend, and assumption profile schema. **Source of truth
  for Section 14 and the JSON sidecar.**
- `scripts/generate-report.js` — Canonical docx generation script (750+ lines, adapt and run)
- `scripts/generate-capability-matrix.js` — Section 14 matrix builder + JSON sidecar producer
