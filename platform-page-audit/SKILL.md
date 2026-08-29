---
name: platform-page-audit
description: >-
  Comprehensive page-by-page audit and QA sweep for the Start Today™ platform — covering hr.starttoday.biz, prohr.starttoday.biz, legal.starttoday.biz, and all other subdomains. Use this skill whenever the user asks to audit, QA, test, verify, sweep, or validate any Start Today app or page. Triggers on: "run the audit", "do a QA sweep", "check all pages", "audit the HR app", "verify the modals work", "test the write-backs", "run a full check", or any request to systematically validate platform functionality. Always use this skill before and after major feature sprints to establish a baseline and confirm nothing regressed.
---

# Start Today™ Platform Page Audit

A comprehensive, repeatable QA methodology for the Start Today platform. Run this after every major sprint, before client demos, and whenever something breaks unexpectedly.

## Audit Scope Definitions

Three audit levels — choose based on context:

| Level | Name | When to Use | Coverage |
|-------|------|-------------|----------|
| **L1** | Smoke | After every commit | Login + 1 page + 1 API call |
| **L2** | Page Sweep | After feature sprints | All pages, nav, no write-backs |
| **L3** | Full QA | Before demos / releases | All pages + all API write-backs + security |

---

## Pre-Audit Checklist

Run these before starting any audit:

```sql
-- 1. Confirm score calculation ran today
SELECT MAX("Computed At") FROM "Score_Card" 
WHERE "Computed By" = 'calculate_start_scores_v2';

-- 2. Confirm entity_start_scores_table is synced
SELECT COUNT(*), AVG(start_score) FROM entity_start_scores_table 
WHERE start_score IS NOT NULL;

-- 3. Check Vercel env vars are set (do this visually in Vercel dashboard)
-- Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, NEXT_PUBLIC_APP_URL
-- CRITICAL: NEXT_PUBLIC_SUPABASE_URL must be https://ptgtliwllimkswtajcmy.supabase.co (exact, no truncation)
```

Also verify:
- Latest deployment is READY in Vercel
- No 404 errors in edge function logs (process-document stub should silence them)
- Security advisors still at 22 (baseline — alert if higher)

---

## Login Verification

**App:** hr.starttoday.biz  
**Credential:** j@starttoday.biz / Start2day!  
**MFA:** TOTP via authenticator app

**Expected flow:**
1. POST `/api/auth/login` → 200 with `{mfa_required: true, auth_id, factor_id, org_id, name}`
2. TOTP entry → POST `/api/auth/mfa-verify` → 200 → redirect to `/dashboard`

**Common failures and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid email or password" | Password hash drifted OR `SUPABASE_SERVICE_ROLE_KEY` missing/wrong | Reset hash in `auth.users` via `extensions.crypt()`, verify Vercel env var |
| `TypeError: fetch failed` | `NEXT_PUBLIC_SUPABASE_URL` truncated or wrong | Check Vercel env vars — must end in `.supabase.co` (not `.supabase.c`) |
| 401 even with correct creds | `SUPABASE_SERVICE_ROLE_KEY` missing | Add to Vercel project env vars, redeploy |
| MFA page loops | `factor_id` not in session | Check `getUserMfaStatus` RPC result |

**Password reset (run in Supabase SQL editor):**
```sql
UPDATE auth.users 
SET encrypted_password = extensions.crypt('Start2day!', extensions.gen_salt('bf', 10))
WHERE email = 'j@starttoday.biz';

-- Verify:
SELECT encrypted_password = extensions.crypt('Start2day!', encrypted_password) as matches
FROM auth.users WHERE email = 'j@starttoday.biz';
```

---

## HR App — Page Audit Matrix (hr.starttoday.biz)

Run each page, take a screenshot, note status.

### Dashboard (`/dashboard`)

**Expected live data:**
- HR Compliance Score gauge (target: 80+ = Good Standing)
- Score by Pillar bars: Workforce Docs, Policy Ack, I-9, Training, Benefits, EEO
- Active Employees count, I-9 Compliance count, Training %, Open HR Issues count
- Compliance Clock: next 5 deadlines with days remaining
- CARL™ Morning Briefing widget (dark card, today's date, NEW badge)
- CARL™ HR Intelligence chat with 3 suggested questions
- Workforce Snapshot table (employees, dept, status, compliance)
- Compliance Alerts list (right column)

**Red flags:**
- "Loading…" stuck → API route error, check `/api/hr?section=overview`
- Score shows 0 → `calculate_start_scores()` hasn't run, trigger manually
- Briefing missing → CARL cron didn't fire, check `carl-morning-briefing-daily` at 6AM UTC
- Workforce table empty → `hr-dashboard-data` edge function issue

### Employees (`/dashboard/employees`)

**Expected:** Total count (84+), breakdown by FT/PT/Leave/Compliance gaps, searchable roster table with dept, FLSA, hire date, email, View button

### Departments (`/dashboard/departments`)

**Expected:** Department list with headcount, cost center codes

### Positions (`/dashboard/positions`)

**Expected:** Position catalog from `G_Employment_job_titles`

### Start Score™ (`/dashboard/score-health`)

**Expected live data:**
- Gauge: score / 100, band label (Compliant/Needs Attention/At Risk/Critical), delta pts
- 11 pillar bars with scores
- Summary cards: Total Entities, Avg Score, Compliant count, Needs Review count, Critical count
- Entity Scores table with band, overdue, key issues
- Score Methodology sidebar (weights)
- "Last computed [date]" footer

**Common failures:**
- All zeros → `sync_scores_from_score_card()` hasn't run → call it manually
- Gamification shows 0 → `get_gamification_profile()` called with org_id not entity_id
- Entity type null → `sos_entity_type` column (not `Entity_type_id` FK)

### HR Compliance (`/dashboard/compliance`)

**Expected:** Open issues count, critical count, overdue count, full HC-### table with employee, category, policy, jurisdiction, severity, due date, status

### Policies & Handbook (`/dashboard/policies`)

**Expected:** Active policies count, overall ack rate, pending signatures count, last update date, policy library table

### I-9 & Work Auth (`/dashboard/i9`)

**Expected:** Total I-9s, complete count, Section 2 pending, reverification due, E-verify status, full record table with View buttons

### Training (`/dashboard/training`)

**Expected:** 319 records, 87%+ completion, overdue count, mandatory by law count, IHRA deadline banner, 6 course cards with progress bars, full training records table

### Benefits & Estate (`/dashboard/benefits`)

**Expected:** Enrolled count, monthly employer cost, benefit provider count, open enrollment date, 5 active benefit plans with enrollment counts

### Compensation (`/dashboard/compensation`)

**Expected:** Total payroll, avg salary, median salary, FLSA at-risk count, pay bands by department with BLS benchmarks and vs-market %

### PEO / Contractors (`/dashboard/peo`)

**Expected:** 
- Risk banner if any High risk contractors
- 2 PEO agreements (TriNet Active, Insperity Up for renewal)
- 6 contractors in classification table with risk levels
- Summary cards: PEO count, 1099 count, agency count, overall risk level

**Data source:** `get_peo_contractor_data()` RPC → `PEO_Agreements` + `Contractor_Workers` tables

### STVerify™ (`/dashboard/stverify`)

**Expected:** Total/Active/Expired cert counts, avg score, issue modal opens with certificate type selector

### Subscription Profile (`/dashboard/subscription-profile`)

**Expected:** Professional subscription management UI (Westlaw, SHRM, etc.)

---

## API Write-Back Tests

Run these as direct fetch calls from the browser console (requires active session):

```javascript
// Add Employee
fetch('/api/hr/add-employee', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ firstName: 'QA', lastName: 'Test', 
    email: 'qa.delete@starttoday.biz', startDate: '2026-04-01' })
}).then(r=>r.json()).then(console.log);
// Expected: {ok: true, employee_id: "...", full_name: "QA Test"}

// Log Issue
fetch('/api/hr/log-issue', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ category: 'FLSA / Wage-Hour', severity: 'low', 
    description: 'QA test' })
}).then(r=>r.json()).then(console.log);
// Expected: {ok: true, issue_id: "..."}

// New Position (duplicate-safe)
fetch('/api/hr/new-position', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ title: 'QA Test Role', flsa: 'Exempt' })
}).then(r=>r.json()).then(console.log);
// Expected: {ok: true, job_title_id: "..."} or {ok: true, already_exists: true}

// New Department (duplicate-safe)
fetch('/api/hr/new-department', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ name: 'QA Test Department' })
}).then(r=>r.json()).then(console.log);
// Expected: {ok: true, department_id: "..."} or {ok: true, already_exists: true}

// Pay Change
fetch('/api/hr/pay-change', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ employee: 'Eddie Van Shredder', currentRate: 65000,
    newRate: 68000, effectiveDate: '2026-04-01', reason: 'Merit increase' })
}).then(r=>r.json()).then(console.log);
// Expected: {ok: true, record_id: "..."}

// Open Enrollment
fetch('/api/hr/open-enrollment', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ windowStart: '2026-05-01', windowEnd: '2026-05-31',
    eligibility: 'All full-time (30+ hrs/week)', autoEnroll: 'false', reminder: '3' })
}).then(r=>r.json()).then(console.log);
// Expected: {ok: true, compliance_id: "...", eligible_count: 42}
```

**After tests — clean up QA records:**
```sql
DELETE FROM "Employees" WHERE "Work_email" = 'qa.delete@starttoday.biz';
DELETE FROM "HR_Compliance_Issues" WHERE "Notes" ILIKE '%QA test%';
DELETE FROM "G_Employment_job_titles" WHERE job_title = 'QA Test Role';
DELETE FROM "Departments" WHERE "Name" = 'QA Test Department';
DELETE FROM "Compensation_History" WHERE "Reason" ILIKE '%QA test%';
DELETE FROM "Compliance_Items" WHERE "Notes" ILIKE '%QA%' AND "Compliance Issues" = 'Open Enrollment';
```

---

## CARL™ Intelligence Tests

```javascript
// Test CARL response from the dashboard chat widget
fetch('/api/hr?section=carl&q=Who+needs+I-9+reverification+in+the+next+60+days')
  .then(r=>r.json()).then(d=>console.log(d.data?.answer));
// Expected: Coherent answer referencing Bonnie Jettstream or actual employees
```

---

## Security Baseline

After every audit, run the security check and confirm no regressions:

```
Expected: exactly 22 findings
- 20 SECURITY DEFINER views (intentional)
- 2 extensions in public schema (vector, pg_net — accepted)
- 2 service-role bypass policies (address_verification_log, pfs_submissions)

If count > 22: a new RPC or table was added without SET search_path = public
Fix: ALTER FUNCTION <fn> SET search_path = public;
```

---

## Audit Report Template

Copy and fill in after each L3 audit:

```
## HR App Audit — [DATE]
**Auditor:** Claude  **Deployment:** [commit SHA]  **Duration:** [time]

### Login & Auth
- [ ] Login: [PASS/FAIL] — [notes]
- [ ] MFA: [PASS/FAIL]
- [ ] Session persists across pages: [PASS/FAIL]

### Pages
| Page | Status | Notes |
|------|--------|-------|
| Dashboard | ✅/❌ | |
| Employees | ✅/❌ | |
| Score Health | ✅/❌ | |
| HR Compliance | ✅/❌ | |
| Training | ✅/❌ | |
| I-9 | ✅/❌ | |
| Compensation | ✅/❌ | |
| Policies | ✅/❌ | |
| Benefits | ✅/❌ | |
| PEO / Contractors | ✅/❌ | |
| STVerify | ✅/❌ | |

### API Write-Backs (7/7)
| Modal | ok:true | record created |
|-------|---------|----------------|
| Add Employee | ✅/❌ | |
| Log Issue | ✅/❌ | |
| New Position | ✅/❌ | |
| New Department | ✅/❌ | |
| Pay Change | ✅/❌ | |
| I-9 Section 3 | ✅/❌ | |
| Open Enrollment | ✅/❌ | |

### Security
- [ ] Advisor count: [N] (baseline: 22)
- [ ] New findings: [list any]

### Issues Found
[List any bugs, errors, or regressions]

### Actions Taken
[List fixes applied during audit]
```

---

## Quick Reference: Critical RPCs

| RPC | Purpose | Key tables |
|-----|---------|------------|
| `verify_admin_password(email, pw)` | Login auth | `auth.users` |
| `get_hr_score_health(org_id)` | Score Health page | `Score_Card`, `Entity_Score_Pillars` |
| `get_gamification_profile(entity_id)` | Score pillar bars | `Entity_Score_Pillars`, `Entity_Verification_Profile` |
| `calculate_start_scores()` | Nightly scoring | `Score_Card` |
| `sync_scores_from_score_card()` | Sync to gamification | `entity_start_scores_table` |
| `get_peo_contractor_data(org_id)` | PEO/Contractors page | `PEO_Agreements`, `Contractor_Workers` |
| `create_employee(...)` | Add Employee modal | `Employees` |
| `log_hr_compliance_issue(...)` | Log Issue modal | `HR_Compliance_Issues` |
| `log_pay_change(...)` | Pay Change modal | `Compensation_History` |
| `create_job_title(...)` | New Position modal | `G_Employment_job_titles` |
| `create_department(...)` | New Department modal | `Departments` |
| `complete_i9_section3(...)` | I-9 Section 3 | `Employee_I9` |
| `launch_open_enrollment(...)` | Open Enrollment modal | `Compliance_Items` |

---

## See Also

- `compliance-platform-development` skill — style guide, color palette, deploy workflow
- `platform-dev-test-ontology` skill — full test framework, ontology, and regression test suite
