---
name: platform-dev-test-ontology
description: >-
  Comprehensive development test framework, ontology, and regression suite for the Start Today™ platform. Use this skill whenever starting a new feature sprint, running regression tests, defining test cases for new functionality, auditing the platform schema, checking what exists before building, or establishing what "done" means for any feature. Triggers on: "what tables exist for X", "has this been built before", "define done for this feature", "run regression tests", "add this to the test ontology", "what should I test", "what's the schema for", "check if this feature is already built", "define the test cases for". This skill prevents duplicate work, catches regressions, and keeps the development ontology current.
---

# Start Today™ Platform Dev Test Ontology

Last updated: Jul 24 2026 — Finance app + session discipline added.

---

## Session Discipline (READ FIRST EVERY SESSION)

Every Claude session doing platform work MUST follow these steps. Historical failures documented at end of file.

### At session start
1. **Read all applicable skills.** Not just this one. Always read `compliance-platform-development` too. Read any user-uploaded skills. Read any skill named in the handoff doc.
2. **Snapshot the security advisor baseline** if ANY DDL work is anticipated:
   ```
   Supabase:get_advisors(project_id='ptgtliwllimkswtajcmy', type='security')
   ```
   Save the count as the pre-work baseline for delta comparison later.
3. **Verify DEMO/PROD parity** for tables the session will touch. Don't assume DEMO's schema equals PROD's. Verify.

### During ship
1. **DEMO/PROD parity check** BEFORE adding any column to an API SELECT clause:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = '<Target>' AND column_name = '<col>';
   ```
   Run on both ptgtliwllimkswtajcmy AND tbihmlnqpwdeiethgwaf.
2. **API mapper audit** when adding a column to any route with an explicit `stmts.map(s => ({...}))` reshape:
   ```
   grep -n "\.map(s => ({" app/api/data/route.js
   ```
   Update the mapper output object in the same commit as the SELECT change.
3. **Verify data in Supabase** BEFORE hypothesizing about frontend logic. When symptoms suggest "filter matches nothing," run the actual query first.

### Live updates (must NOT be deferred to end of session)
- **Column Name Gotchas**: after any bug root-caused to a column-name, dedup, or null-handling pattern
- **Schema Ontology**: after any DDL change (ADD COLUMN, CREATE TABLE, ALTER, etc.)
- **Session Discipline**: after any process gap that caused rework in the current session

### Session-close updates (can batch at handoff time)
- **Feature Ontology**: new dashboard pages or major UI features
- **Test Case Registry**: new regression-worthy behavior
- **FF Log**: numbered feature-flag items completed

### Failure modes this discipline prevents
- Silent production bugs (missing PROD columns, DEMO working fine)
- Stale ontology (which historically drives duplicate work and rework)
- Vercel build cache confusion (locked lesson: empty commit forces new SHA)
- Multi-fix chains that would have been one fix if root cause traced upstream first (locked lesson: L series was 8 commits, actual root cause was line 803 dedup, discovered at fix8)

---

## Deployment Manifest

| App | Domain | Vercel Project ID | GitHub Repo |
|-----|--------|------------------|-------------|
| HR Dashboard | hr.starttoday.biz | prj_vOK2S92gkl1lz3Vo2YG5gAIKUtTM | Starttodaybiz/HR |
| Pro HR | prohr.starttoday.biz | prj_3Eia7K4L2JVkBzhENbadGbF2yjwZ | Starttodaybiz/ProHR |
| Attorney | legal.starttoday.biz | prj_sczZV0Y6EmonWmfHZSxttTwbXZCs | Starttodaybiz/attorney-dashboard |
| STVerify | stverify.starttoday.biz | prj_m8gd7DrEpLLoydfG4jDQvmAlAlSM | Starttodaybiz/stverify |
| Finance | finance.starttoday.biz | prj_etyUAsXqQD6aqD8kmeU3rfE6TxeD | Starttodaybiz/finance |

**Team ID:** `team_7hbKJDeZuvbjZ7aTxXxUnFv4`
**Git identity:** `Starttodaybiz <Starttodaybiz@users.noreply.github.com>`
**Deploy:** `git push origin main` → Vercel auto-deploys. Only push when Jason approves.
**PROD Supabase:** ptgtliwllimkswtajcmy (Start Today Live)
**DEMO Supabase:** tbihmlnqpwdeiethgwaf

---

## Feature Ontology

### HR Dashboard — hr.starttoday.biz (all live)

| Page | Route | Data Source | Status |
|------|-------|-------------|--------|
| Main Dashboard | `/dashboard` | edge fn + CARL | ✅ |
| Employees | `/dashboard/employees` | edge fn | ✅ |
| Start Score™ Health | `/dashboard/score-health` | `get_hr_score_health()` | ✅ |
| HR Compliance | `/dashboard/compliance` | edge fn | ✅ |
| Policies | `/dashboard/policies` | edge fn | ✅ |
| I-9 & Work Auth | `/dashboard/i9` | edge fn | ✅ |
| Training | `/dashboard/training` | edge fn + SHRMRecertWidget | ✅ |
| Benefits & Estate | `/dashboard/benefits` | `get_benefits_data()` RPC | ✅ |
| Compensation | `/dashboard/compensation` | edge fn | ✅ |
| Onboarding | `/dashboard/onboarding` | `get_onboarding_data()` RPC | ✅ |
| Offboarding | `/dashboard/offboarding` | `useHRLiveData` hook | ✅ |
| PEO / Contractors | `/dashboard/peo` | `get_peo_contractor_data()` RPC | ✅ |
| STVerify™ | `/dashboard/stverify` | `/api/hr/stverify` | ✅ |
| Professional Network | `/dashboard/professionals` | `get_professional_network()` RPC | ✅ |
| Subscription Profile | `/dashboard/subscription-profile` | `get_subscription_profile()` RPC | ✅ |

### Finance — finance.starttoday.biz (all live)

| Page | Route | Data Source | Status |
|------|-------|-------------|--------|
| CFO Dashboard | `/dashboard` | `/api/data?tab=overview` | ✅ |
| Financial Statements | `/dashboard/statements` | `/api/data?tab=statements` | ✅ |
| Metrics Deep Dive | `/dashboard/metrics` | `/api/data?tab=metrics` | ✅ |
| Depreciation Schedule | `/dashboard/depreciation` | `/api/data?tab=depreciation` | ✅ |
| Entities | `/dashboard/entities` | `/api/data?tab=entities` | ✅ |
| Compliance Items | `/dashboard/compliance` | `/api/data?tab=compliance` | ✅ |
| Deployment Studio | `/dashboard/deployment` | RPC-based | ✅ |
| PFS (DocuSign v1) | `/dashboard/pfs` | DocuSign API + PROD | ✅ |

**Financial Statements card variants** (locked Jul 23 2026 via batches K, L, L.fix1–8):
- **Balance Sheet**: Total Assets / Liabilities / Equity tiles + Capital Structure bar + 3-line Assets/Liab/Equity trend
- **Income Statement / P&L**: Revenue / EBITDA / Net Income tiles + Revenue trend
- **Cash Flow**: Operating CF / Investing CF / Financing CF / Δ Cash tiles + 3-line Op/Inv/Fin trend
- **Combined / Annual**: P&L headline tiles + Capital Structure (if BS data present)

**TrendModal drill-in** (locked Jul 23 2026):
- BS: 3-line MultiLineChartBS with Total Assets navy, Total Liabilities amber, Total Equity green. Modal title 'Balance Sheet'.
- CF: 3-line MultiLineChartBS with Operating CF green, Investing CF amber, Financing CF navy. Modal title 'Cash Flow'.
- IS: single-line Revenue chart with crosshair. Modal title 'Revenue'.
- Modal title is driven by `trendCfg.metric`, NOT `trendCfg.label`. The `.label` drives the card body caption ("ASSETS TREND", "CASH TREND", "REVENUE TREND").

### Modal Write-Backs (all tested ✅)

| Modal | Route | RPC | Table |
|-------|-------|-----|-------|
| Add Employee | `/api/hr/add-employee` | `create_employee` | `Employees` |
| Log Issue | `/api/hr/log-issue` | `log_hr_compliance_issue` | `HR_Compliance_Issues` |
| Pay Change | `/api/hr/pay-change` | `log_pay_change` | `Compensation_History` |
| New Position | `/api/hr/new-position` | `create_job_title` | `G_Employment_job_titles` |
| New Department | `/api/hr/new-department` | `create_department` | `Departments` |
| I-9 Section 3 | `/api/hr/i9-section3` | `complete_i9_section3` | `Employee_I9` |
| Open Enrollment | `/api/hr/open-enrollment` | `launch_open_enrollment` | `Compliance_Items` |
| STVerify Issue | `/api/hr/stverify` POST | `stverify_issue_certificate` | `stverify_compliance_certificates` |

---

## Schema Ontology — Tables

### HR Core

```
Employees              — Work_email, "Full Name (from FirstName)", Hire_date,
                         Employment_type_id (UUID FK→G_Employment_types), G_Departments_id
HR_Compliance_Issues   — CreatedAt is TEXT → NOW()::TEXT; Status_id (not G_Statuses_id)
Compensation_History   — org_id, Employee_id, Effective Date, Base Pay (Annual), Pay Type, Reason
G_Employment_job_titles — job_title, department, flsa_status, Job_title_id
Departments            — org_id, Name, Departments_id (PK)
Employee_I9            — Employee_I9_id, ReverificationDueDate, ComplianceStatus
```

### HR New Tables (built Mar 2026 sprint)

```
HR_Benefit_Plans       — Plan_id, org_id, Plan_name, Provider (TEXT), Plan_type,
                         Enrolled_count, Employer_cost_mo, Eligibility, Status, Low_enrollment
Employee_Onboarding    — Onboarding_id, org_id, Employee_id, Full_name, Email, Start_date,
                         Job_title, Department, Status, Progress_pct, Invited_at, Completed_at
PEO_Agreements         — PEO_agreement_id, org_id, PEO_name, Entity_ids (TEXT[]),
                         Employee_count, Expiry_date, Status
Contractor_Workers     — Contractor_id, org_id, Worker_name, Worker_type,
                         Entity_name, Engagement_start, Engagement_end, Has_SOW, Single_client,
                         Company_equipment, Risk_level, Risk_flag, Status
Professional_Network   — Provider_id, org_id, Name, Organization, Role, Category,
                         Email, Phone, Credentials, Notes, Status, Since
stverify_compliance_certificates — id, subject_org_id, cert_number, cert_type, cert_tier, ...
professional_subscription_profiles — id, user_auth_id, org_id, has_westlaw, has_shrm, ...
```

### Finance Core (documented Jul 24 2026)

```
Financial_Statements — DUAL SCHEMA (snake_case writable + Airtable-style read-only)

  Snake_case columns (use for INSERT, PROD schema post Jul 24 2026):
    Financial_statements_id (uuid PK), org_id (uuid), Statement_type (text),
    Period_end (date), Period_start (date), Revenue (numeric),
    Net_income (numeric), Total_assets (numeric), Total_liabilities (numeric),
    Total_equity (numeric), Cash (numeric), cf_operating (numeric),
    cf_investing (numeric), cf_financing (numeric), EBITDA (numeric),
    DSCR (numeric), LTV (numeric), Gross_profit (numeric), COGS (numeric),
    Operating_expenses (numeric), Accounting_basis (text), Notes (text)

  Airtable-generated (read-only, PostgREST access with quotes):
    "Statement Type", "Period End", "Period Start", "Net Income",
    "Total Assets", "Total Liabilities", "Total Equity", "FS Key",
    "Accounting Basis", "Entity", "Cash", "Revenue", "EBITDA", "DSCR", "LTV"

  API pattern (app/api/data/route.js line 97): Quoted columns pass through
  PostgREST verbatim as JSON keys. Unquoted snake_case columns come through
  as snake_case JSON keys. The API mapper then reshapes both into snake_case
  output for the frontend.

Entities                — Entities_id, org_id, Entity_legal_name, sos_source_state,
                          sos_good_standing, EIN, sos_formation_date, sos_entity_type
Compliance_Items        — Brief Description, Due_date, Status, G_Compliance_Item_type
Score_Card              — org_id, Start_score, "Score Band", "Risk Flags", "Overdue Count"
```

### Column Name Gotchas (registry of bugs we've hit)

```
HR
  Employees: Work_email (not Email), "Full Name (from FirstName)" (writable), Hire_date
  HR_Compliance_Issues: CreatedAt is TEXT → NOW()::TEXT; Status_id (not G_Statuses_id)
  Compliance_Items: 7 NOT NULL FK columns — always SELECT defaults from existing org row first
    G_Compliance_item_status_id (not G_Statuses_id); Created + Last_modified TIMESTAMPTZ NOT NULL
  G_Departments: Departments_id (PK), Departments_name
  Entities: sos_entity_type (text, not Entity_type_id FK)
  Score_Card: filter WHERE "Computed By" = 'calculate_start_scores_v2'
  get_gamification_profile(): takes entity_id NOT org_id
  Organizations: PK is Organizations_id (NOT id) — caused stverify bug
    !! In plpgsql, bare "id" after querying "Organizations" resolves to the
       surrounding INSERT table's id column — always use table aliases !!
  Employee_benefit_Plans: Plan_provider is UUID FK (not text)
  G_Employee_benefit_types: PK is Employee_benefit_id
  professional_subscription_profiles: PK/unique on user_auth_id (not org_id)

Finance (added Jul 24 2026 from L series lessons)
  Financial_Statements — cf_operating / cf_investing / cf_financing:
    Only populated on rows where "Statement Type" = 'Cash Flow'. All other
    statement types (Annual, Annual P&L, QBO Sync, Tax-Annual, etc.) have
    NULL for these fields. Any frontend filter must either check stype OR
    preserve null through stNum() — stNum(null) returns 0, which silently
    breaks value != null filters.

  Financial_Statements — dedup collisions at (Entity, Period_end, Basis):
    Multiple statements can share the same period_end for the same entity
    and basis family. seriesMap builder must be rank-aware. Prefer the
    Cash Flow statement (richest data) when multiple share a key. First-wins
    ordering loses CF statements to Annual/P&L variants.
    Root-caused Jul 24 2026 as commit 88c2423 (L-fix8).

  Financial_Statements — DEMO/PROD schema drift:
    DEMO (tbihmlnqpwdeiethgwaf) has more columns than PROD sometimes carries.
    Pre-Jul 24 2026 PROD was missing: Cash, Gross_profit, COGS,
    Operating_expenses, cf_operating, cf_investing, cf_financing.
    Silent 400 errors from PostgREST when column missing on PROD → q()
    returns [] → user sees empty statements. LIVE PRODUCTION BUG PATTERN.
    Applied add_missing_financial_statements_columns_v1 Jul 24 2026.

  API mapping — .map(s => ({...})) reshape pattern:
    When an API route explicitly reshapes SELECT output like:
      return Response.json({ statements: stmts.map(s => ({ id: s.id, ... })) })
    Adding a column to SELECT is a TWO-STEP change — the mapper must be
    updated too. Adding to SELECT alone silently drops the field before
    serialization. Grep for `.map(s => ({` or `.map(row => ({` in the
    same file after every SELECT change. Cost of missing this: extra ship
    (L-fix3 required L-fix4 as follow-up).

  Vercel build cache — stale bundles despite READY state:
    Vercel occasionally serves stale JS bundles even when the deployment
    shows READY and the correct commit SHA. Symptom: source contains fix,
    git log shows the commit, Vercel dashboard confirms it, but the
    deployed bundle doesn't contain the changed identifier/logic. Cure:
    empty commit to force new SHA and bypass the build cache:
      git commit --allow-empty -m "chore: force rebuild to bust cache"
      git push origin main
    Root-caused Jul 24 2026 during L series debugging.

  stNum(null) coercion:
    stNum(null) returns 0, not null. Any downstream filter using
    `value != null` will NOT exclude these values. Two remedies:
    1. Preserve null at data boundary: `x != null ? stNum(x) : null`
    2. Use categorical filter upstream: `.filter(p => p.stype === 'Cash Flow')`
    For Financial_Statements this matters because many columns are populated
    ONLY on specific statement types.
```

---

## Test Case Registry

| TC | What | Assertion |
|----|------|-----------|
| TC-001 | Login | `{mfa_required:true, auth_id, org_id}` |
| TC-002 | Dashboard | `{ok:true, data.score.total >= 70}` |
| TC-003 | Score Health | `summary.total_entities >= 1, summary.avg_score > 50` |
| TC-004 | Add Employee | `{ok:true, employee_id: UUID}` |
| TC-005 | Log Issue | `{ok:true, issue_id: UUID}` |
| TC-006 | Open Enrollment | `{ok:true, compliance_id: UUID, eligible_count > 0}` |
| TC-007 | PEO Data | `{data.peos.length >= 2, data.contractors.length >= 6}` |
| TC-008 | Security (HR-app slice, historical) | ~22 findings baseline as of Mar 2026 (see TC-016 for current) |
| TC-009 | STVerify Issuance | `{ok:true, certificate.cert_number: "STV-EC-..."}` |
| TC-010 | Benefits | `{ok:true, data.plans.length: 5, data.summary.total_monthly_cost: 1240}` |
| TC-011 | Onboarding | `{ok:true, data.hires.length: 5, data.summary.in_progress: 3}` |
| TC-012 | Professional Network | `{ok:true, data.providers.length: 6}` |
| TC-013 | Subscription Profile | `{ok:true, profile.has_westlaw:true, profile.shrm_certification: "SHRM-SCP"}` |
| TC-014 | Financial Statements CF path | Cash Flow filter → 9 cards → 3-line sparkline. Click → modal with 3-line hero (Op green, Inv amber, Fin navy) + crosshair + legend + period table with 3 CF rows. Backbeat 2023/2024/2025 CF values: 310K/-90K/-155K, 395K/-45K/-35K, 605K/-120K/-275K. |
| TC-015 | DEMO/PROD Financial_Statements column parity | `information_schema.columns` for Financial_Statements on ptgtliwllimkswtajcmy contains every column listed in `app/api/data/route.js` line 97 SELECT clause. Regression guard against "silent 400 on missing column" pattern. |
| TC-016 | Security advisor delta check | Snapshot advisor count before any DDL work. After DDL, re-check and assert delta is intentional (usually 0 for pure schema additions). Do NOT rely on a static count — capture at session start. |

---

## Security Baseline (updated Jul 24 2026)

The historical **"22 findings" baseline was for the HR-app slice at Mar 28 2026**. Platform-wide the number is currently much higher due to accumulated RPCs from finance, sales, legal, admin, marketing, and STVerify apps — each with SECURITY DEFINER functions callable by anon role.

**Current approach:**
- Capture advisor count at session start as pre-work baseline
- Verify no unintentional delta after DDL
- Do NOT rely on a static target count — it drifts as the platform grows

**Pre-existing findings categories (all WARN level, all pre-existing before Jul 24 2026):**
- `anon_security_definer_function_executable` — SECURITY DEFINER functions callable by anon role. Most Start Today RPCs. Accepted for now, tracked for future auth work.
- SECURITY DEFINER views (~20, intentional)
- Extensions in public schema (vector, pg_net — 2, accepted)
- Service-role bypass policies (address_verification_log, pfs_submissions — 2, accepted)

**Alert if:**
- New RPC missing `SET search_path = public`
- New table missing RLS
- New public exposure of a private table

---

## FF Log

### FF Log A ✅ (Mar 2026)
A1 PEO module · A2 Contractor compliance · A3 Benefits live data ·
A4 STVerify cert detail · A5 Worker classification modal

### FF Log B ✅ (Mar 2026)
B1 Professional Network · B2 SHRM Recertification · B3 Start Score™ doc · B4 Subscription deep links

### FF Log C ✅ (Jul 2026 — Finance)
C1 Financial Statements type-aware cards (batch K)
C2 Cash Flow activity breakdown + BS multi-line + CF-aware dedup (batch L series, 8 fixes total)
C3 PROD Financial_Statements schema parity (Cash, Gross_profit, COGS, Operating_expenses, cf_operating, cf_investing, cf_financing)
C4 DocuSign PFS v1 integration (finance app, Jul 23)

### Next Phase
- Bank → Finance consolidation (Phases 1-5, plan drafted Jul 24)
- Mobile Ecosystem: Phase 1 PWA hardening · Phase 2 CARL Companion · Phase 3 Start Today Verify · Phase 4 HR employee self-service

---

## How to Update This Skill

**Live (during session, cannot defer):**
- Column Name Gotchas: after any bug root-caused to a column pattern
- Schema Ontology: after any DDL change (ADD COLUMN, CREATE TABLE, etc.)
- Session Discipline: after any process gap that caused rework
- Feature Ontology: schema/route changes that alter data source paths

**Session-close (batch at handoff):**
- Feature Ontology: after new dashboard page or major UI feature
- Test Case Registry: after new regression-worthy behavior
- FF Log: after completing a numbered feature-flag item

**Repo:** `github.com/Starttodaybiz/platform-skills`
**Runtime:** `/mnt/skills/user/` (read-only in sandbox — changes must be pushed to repo, sandbox rebuild picks them up)

**The ontology is the source of truth.** DEMO can drift, PROD can drift, the ontology should never drift — it's the anchor by which drift is measured.

---

## Historical Session Failures (learn from these)

**Jul 24 2026 — L series discipline gaps** (this session):
- Skipped reading skills at session start
- Shipped 8 code commits + 1 DEMO migration + 1 PROD migration with zero ontology updates
- Chased root cause through 7 downstream fixes when line 803 dedup was the actual bug (fixed as L-fix8)
- Missed API mapper follow-up on SELECT expansion (L-fix3 required L-fix4)
- Didn't catch DEMO/PROD schema drift until PROD alignment step revealed 7 missing columns
- Vercel build cache confusion cost hours of debugging
- Install script git-pager blocking cost time (fix: `GIT_PAGER=cat`)

**Recovery actions from that session (now codified above):**
- Session Discipline section added as first item
- 6 new Column Name Gotchas
- TC-014, TC-015, TC-016 added
- Finance app added to Feature Ontology
- Financial_Statements Schema Ontology entry added
- Security baseline reframed as rolling snapshot
- FF Log C section added
