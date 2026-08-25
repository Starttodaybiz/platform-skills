---
name: platform-dev-test-ontology
description: >-
  Comprehensive development test framework, ontology, and regression suite for the Start Today™ platform. Use this skill whenever starting a new feature sprint, running regression tests, defining test cases for new functionality, auditing the platform schema, checking what exists before building, or establishing what "done" means for any feature. Triggers on: "what tables exist for X", "has this been built before", "define done for this feature", "run regression tests", "add this to the test ontology", "what should I test", "what's the schema for", "check if this feature is already built", "define the test cases for". This skill prevents duplicate work, catches regressions, and keeps the development ontology current.
---

# Start Today™ Platform Dev Test Ontology

Last updated: Aug 21 2026 — v10: L48 (measure rows not constraints — the Attorney_Matters consolidation was 950 fully-resolvable rows, not a multi-session migration), L49 (grouping keys determine the number you report; a duplication claim was overstated 3x), L50 (RETURNS void makes a caller's error handling unreachable). TC-025 added, plus the L44 third-recurrence note.

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
| Bank (treasury) | bank.starttoday.biz | prj_pbqQ7003ZUEPFxTh6rv1YM9x79mq | Starttodaybiz/bank |

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
| PFS | `/dashboard/pfs` | `/api/pfs` route → 11 PFS tables + `pfs_search_contacts` RPC + DocuSign envelopes | ✅ (PROD alignment closed Jul 25) |

**Financial Statements card variants** (locked Jul 23 2026 via batches K, L, L.fix1–8):
- **Balance Sheet**: Total Assets / Liabilities / Equity tiles + Capital Structure bar + 3-line Assets/Liab/Equity trend
- **Income Statement / P&L**: Revenue / EBITDA / Net Income tiles + Revenue trend
- **Cash Flow**: Operating CF / Investing CF / Financing CF / Δ Cash tiles + 3-line Op/Inv/Fin trend
- **Combined / Annual**: P&L headline tiles + Capital Structure (if BS data present)

**TrendModal drill-in** (locked Jul 23 2026):
- BS: 3-line MultiLineChartBS with Total Assets navy, Total Liabilities amber, Total Equity green. Modal title 'Balance Sheet'.
- CF: 3-line MultiLineChartBS with Operating CF green, Investing CF amber, Financing CF navy. Modal title 'Cash Flow'.
- IS: 2-line MultiLineChartBS with Revenue green, Total Expenses amber (L-fix11). Tooltip includes derived Net Income row (L-fix12). Modal title 'Revenue'.

### Bank — bank.starttoday.biz (treasury portal, pre-consolidation)

**Status: scheduled for consolidation into finance** (Bank Consolidation Phase 1, in progress Jul 25 2026)

| Route | Purpose | Data Source | Consolidation Plan |
|-------|---------|-------------|-------------------|
| `/banking` | Treasury dashboard | `st_personal_financial_statements` (LEGACY) + Loans + related | Migrate to `/finance/pfs` + `/finance/treasury` |
| `/banking/comms` | Communications | Various | Migrate to `/finance/comms` |
| `/api/pfs/submit-modal` (server-side, Jul 25) | PFSModal submission (Path B, now secure) | `pfs_submissions` via service_role client, session org_id | Consolidate with Path A in Phase 1c |
| `banking.js:save_pfs` (server-side, existing) | PFS write from bank dashboard (Path A) | `st_personal_financial_statements` via service_role client | Consolidate with Path B in Phase 1c |

Bank app package name: `banking-treasury-portal`. Uses `st_personal_financial_statements` (SBA Form 413-style single-table) and `pfs_submissions` (DocuSign envelope). Both are LEGACY relative to finance's newer schema. Slated for retirement in Phase 1c after schema consolidation.

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

PFS Schema (finance app, 11 tables, PROD-aligned Jul 25 2026)

  personal_financial_statements (7 cols) — header:
    pfs_id (uuid PK), contact_id (uuid, NOT NULL UNIQUE), spouse_contact_id (uuid),
    status ('draft'|'active'|'archived'), active_version_id (uuid FK→pfs_versions, DEFERRABLE),
    created_at, updated_at

  pfs_versions (20 cols) — revision history + DocuSign:
    version_id (uuid PK), pfs_id (uuid FK ON DELETE CASCADE), version_number (int),
    effective_date (date), status ('draft'|'reviewed'|'signed'|'shared'|'superseded'),
    signed_at, signed_by_contact_id, signature_method ('attestation'|'docusign'),
    attestation_text, docusign_envelope_id, docusign_envelope_status, docusign_envelope_uri,
    docusign_completed_at, docusign_signer_contact_id (FK→Contacts), docusign_sent_at,
    signed_pdf_path, prepared_by_contact_id, notes, created_at, updated_at
    UNIQUE (pfs_id, version_number)

  pfs_asset_lines — SBA Form 413 asset line items (16 cols)
    sba_category IN (cash_on_hand|savings|ira_retirement|accounts_receivable|
      life_insurance_csv|stocks_bonds|real_estate|automobiles|other_personal_property|other_assets)
    fair_market_value, cost_basis, ownership_pct (0<x≤1), joint_held, supporting_doc_ids uuid[]

  pfs_liability_lines — SBA Form 413 liability line items (19 cols)
    sba_category IN (accounts_payable|notes_payable|installment_auto|installment_other|
      loan_life_insurance|mortgages_real_estate|unpaid_taxes|other_liabilities)
    current_balance, monthly_payment, interest_rate_pct, maturity_date,
    linked_asset_line_id (FK→pfs_asset_lines ON DELETE SET NULL)

  pfs_income_lines — SBA Form 413 income (12 cols)
    sba_category IN (salary|net_investment_income|real_estate_income|other_income)
    annual_amount, source_entity_id, ownership_pct, joint_held

  pfs_contingent_liability_lines — contingent liabilities (9 cols)
    sba_category IN (as_endorser_comaker|legal_claims_judgments|provision_federal_tax|other_special_debt)

  pfs_supporting_docs — file attachments (12 cols)
    is_registry_link boolean + CHECK: either registry link with compliance_asset_id OR storage_path

  pfs_access_grants — grant-based access control (14 cols)
    grantee_type ('contact'|'org_role'|'external_email') + CHECK enforcing per-type nullability
    access_level ('view'|'suggest'|'edit'|'admin')

  pfs_access_requests — pending access requests (18 cols)
    status ('pending'|'approved'|'denied'|'withdrawn'|'expired'), auto-expires in 30 days,
    granted_grant_id (FK→pfs_access_grants ON DELETE SET NULL) if approved

  pfs_share_events — share history (20 cols)
    recipient_type ('bank'|'lender'|'attorney'|'other'), share_token UNIQUE,
    attached_to_loan_request_id, expires_at (default 90 days), link_opened_count

  pfs_action_log — audit trail (12 cols)
    action text, payload jsonb, signed_hash, ip_address inet, user_agent

  pfs_search_contacts(p_org_id, p_query, p_limit=10) — RPC, SECURITY DEFINER SET search_path
    Returns contact_id, first_name, last_name, full_name, email, primary_role
    ILIKE search on First Name || Last Name and Email columns of "Contacts" table

LEGACY PFS Tables (bank app, slated for Phase 1c retirement)

  st_personal_financial_statements (34 cols) — SBA Form 413 single-table
  pfs_submissions (22 cols) — DocuSign envelope tracking + JSON blob asset/liab/income/contingent

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
  Score_Card: filter WHERE "Computed By" = 'calculate_start_scores_v4'
    !! The long-documented 'calculate_start_scores_v2' here was WRONG and was
       actively causing the bug it looked like a precaution against. Of 92
       Score_Card rows, 85 are v4, 2 are v2, 5 are null, so the v2 filter
       returns ZERO rows for every real tenant. get_hr_score_health followed
       this instruction in nine predicates and served an empty Start Score
       Health page to everyone; sync_scores_from_score_card was frozen the same
       way. Corrected Aug 21 2026.
       The nightly cron runs calculate_start_scores_v6, but v6 delegates the
       calculation to v4 and then UPDATEs those rows in place WITHOUT changing
       "Computed By" -- so rows stay tagged v4 and v4 is the correct literal.
       Before trusting any version literal, check what is actually there:
         SELECT "Computed By", count(*) FROM "Score_Card" GROUP BY 1; !!
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
    and basis family (e.g. Backbeat Logistics 2024-12-31 has Annual, Annual
    P&L, AND Cash Flow all at the same date). This CANNOT be solved with
    shared-state dedup — see "Shared-state dedup for divergent views"
    below. Correct approach: filter raw stmts per view metric, dedup AFTER
    filter. Established by L-fix10 (commit 16ed268) after L-fix8 shared
    dedup regression was caught by sweep-first discipline (L-fix9→12 saga
    Jul 24-25 2026).

  Shared-state dedup for context-divergent views (L-fix8→12 case study):
    If multiple UI views need different projections from the same underlying
    rows, DO NOT solve conflicting winners with a shared dedup that picks
    one row per key. That pattern breaks whichever view didn't win.
    Example: L-fix8 preferred Cash Flow rows at dedup so multiSeriesCF
    would work — but Cash Flow rows have null Total Assets/Liab/Equity, so
    BS trend collapsed to <=1 point for entities with both statement types.
    Correct pattern (locked as L-fix10+):
      STEP 1: Filter raw source to matching scope (entity + basis)
      STEP 2: Filter to non-null metric FOR THE CURRENT VIEW
      STEP 3: Sort by key
      STEP 4: Dedup per key (first-wins within already-filtered set)
    Each view runs its own STEP 2→4 with its own metric getter. No shared
    intermediate. In FinanceShell.js this is _buildBsPoints(getter) closure.

  PostgREST within-period ordering is undefined:
    When multiple rows share a values in ORDER BY columns, PostgREST does
    NOT guarantee a stable secondary sort. Under first-wins dedup, this
    means the "winner" is effectively arbitrary — could be any row with
    the same period_end. Symptom: dedup picks different rows on different
    deploys without any data change. Discovered during L-fix9 debugging.
    If you need deterministic first-wins, add explicit tiebreaker to the
    API's order= clause. If you just need "some row with the metric",
    use filter-then-dedup (see above).

  PFS — dual-implementation state (Jul 25 2026 → resolves in Phase 1b/1c):
    Two parallel PFS implementations exist in the same database:
    * BANK app uses `st_personal_financial_statements` (34 cols, SBA
      Form 413 columns per line item) + `pfs_submissions` (DocuSign envelope)
    * FINANCE app uses `personal_financial_statements` (7 cols header) +
      10 satellite tables (`pfs_versions`, `pfs_asset_lines`,
      `pfs_liability_lines`, `pfs_income_lines`, `pfs_contingent_liability_lines`,
      `pfs_supporting_docs`, `pfs_access_grants`, `pfs_access_requests`,
      `pfs_share_events`, `pfs_action_log`)
    Bank's schema is simpler but hardcoded to Backbeat. Finance's schema
    is more sophisticated (versioning, granular access grants, share
    tracking, audit log). Bank consolidation Phase 1b migrates bank UI
    to finance's schema. Phase 1c retires the legacy tables. Until then,
    if you're touching PFS: verify which app you're in, use the right table set.

  DEMO/PROD schema drift is a systemic risk (Jul 24-25 2026 case studies):
    Yesterday closed Financial_Statements missing 7 columns on PROD (silent
    400 → q() returns []). Today closed PFS missing 11 tables + 1 RPC on
    PROD (same failure mode). Both bugs latent for weeks because nobody
    tested with real PROD data. There are almost certainly MORE tables
    with the same drift across bank/sales/lender/attorney apps. Session
    Discipline mandates DEMO/PROD parity check BEFORE any session touches
    a table — but the discipline was violated on both bugs (caught late,
    not up front). Consider a scheduled sweep: for every table referenced
    by app code, verify columns/existence match between projects.
    Migration name pattern for these fixes: `add_missing_{table_group}_v1`.

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
| TC-017 | PFS table parity check | `information_schema.tables` on PROD contains all 11 tables referenced by finance/app/api/pfs/route.js: `personal_financial_statements`, `pfs_versions`, `pfs_asset_lines`, `pfs_liability_lines`, `pfs_income_lines`, `pfs_contingent_liability_lines`, `pfs_supporting_docs`, `pfs_access_grants`, `pfs_access_requests`, `pfs_share_events`, `pfs_action_log`. Also verify `pfs_search_contacts` RPC exists. Regression guard against re-drift. |
| TC-018 | Cross-app schema drift audit | For every table imported by ANY app repo (`finance`, `bank`, `sales`, `lender`, `attorney`, `stverify`, `chamber`, `HR`, `ProHR`), verify the table exists on PROD. Automatable via grepping app repos for PostgREST calls (`from('table_name')` or `?rest/v1/table_name`) then verifying against `information_schema.tables`. Should be run at least monthly if not on every session that touches DB. |

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
C2 Cash Flow activity breakdown + BS multi-line (batch L series, 12 fixes total closed Jul 24-25)
  - L-fix1 through L-fix8: sequential BS/CF trend fixes culminating in root-cause CF-aware dedup
  - L-fix9 through L-fix10: reverted L-fix8 shared-state dedup regression; rebuilt BS/IS/CF trends from raw stmts using filter-then-dedup pattern
  - L-fix11: 2-line Revenue + Total Expenses chart for IS/P&L cards (definition: Expenses = Revenue - Net Income)
  - L-fix12: derived Net Income row in MultiLineChartBS tooltip on IS/P&L variant (label-match detection scoped to IS only)
C3 PROD Financial_Statements schema parity (Cash, Gross_profit, COGS, Operating_expenses, cf_operating, cf_investing, cf_financing) — closed live production bug where PROD customers were getting empty statements arrays
C4 DocuSign PFS v1 integration (finance app, Jul 23)

### FF Log D 🚧 (Jul 2026 — Finance/Bank consolidation)

D1 Bank → Finance consolidation Phase 1a: PROD PFS schema alignment ✅ (Jul 25)
   - Migrated 11 PFS tables from DEMO to PROD via `add_missing_pfs_tables_v1`
   - Follow-up: `add_missing_pfs_tables_v1_enable_rls` — RLS enabled on all
     11 tables to match DEMO's locked-down state (0 policies, service_role
     only). Missed in v1, caught by TC-016 advisor delta check (+11 ERROR
     findings after v1, resolved to +0 after RLS enable).
   - Closed live production bug: finance's /api/pfs was 400-erroring silently
     because `personal_financial_statements`, `pfs_versions`, `pfs_asset_lines`,
     `pfs_liability_lines`, `pfs_income_lines`, `pfs_contingent_liability_lines`,
     `pfs_supporting_docs`, `pfs_access_grants`, `pfs_access_requests`,
     `pfs_share_events`, `pfs_action_log` existed only on DEMO
   - Also created `pfs_search_contacts` RPC and 17 indexes
   - Zero data disruption (all tables were empty on both sides)

D2 Bank → Finance consolidation Phase 1b: PFSModal security fix ✅ (Jul 25, bank commit 13ad57b)
   - NEW pages/api/pfs/submit-modal.js: server-side API route replacing the
     insecure client-side POST at pages/index.jsx PFSModal.handleComplete
   - Fixes 3 security issues on Path B (Onboarding PFSModal):
     * anon key was being used as user auth (NEXT_PUBLIC_SUPABASE_ANON_KEY
       in both apikey and Authorization headers — browser-exposed)
     * hardcoded Bowie-Stardust demo org_id in POST body (real users' SBA
       413 data was cross-tenanting into demo org)
     * bypassed server-side validation
   - Multi-cookie session resolution matching banking.js pattern exactly
     (st_auth / st_bank_client / st_bank_session)
   - Uses getServiceClient() from lib/supabase.js for server-side writes
   - Same write target (pfs_submissions) — no schema change in 1b
   - Required 4 install script iterations; 4 locked lessons captured
     (see compliance-platform-development "Locked lessons v3")

D3 Bank → Finance consolidation Phase 1c: Schema consolidation + legacy retirement
   Design brief locked with 8 approved decisions (see phase_1c_amendment_docusign_platform_v3.md):
     1. Phase 1c/1d split — 1c enabling schema, 1d orchestration + RON
     2. DocuSign Notary as primary RON provider
     3. Both notary models (On-Demand + BYON) in Phase 1
     4. Option B — compliance app as meta-app, is_compliance_officer_for_org gate
     5. No Michael approval gate for envelope templates
     6. CA fallback via in-person scheduling helper (until 2030 RON)
     7. RON recording mirroring to Supabase Storage in Phase 1
     8. 25 compliance_owned purposes per approved list

D3.0 Sprint 0.1: Central DocuSign envelope infrastructure schema ✅ (Jul 25)
     - 8 new tables (121 cols, 34 indexes, RLS on all, matches DEMO baseline):
       docusign_envelope_purposes, docusign_envelopes, docusign_signers,
       docusign_envelope_events, docusign_envelope_templates, docusign_campaigns,
       docusign_notaries, docusign_notary_state_rules
     - Polymorphic FK pattern: docusign_envelopes(resource_type, resource_id)
       uses SOFT reference (no DB FK, RPC-validated). Non-polymorphic FKs
       (envelope_id, signer_id, purpose) get DB-enforced constraints.
     - PROD advisor: 1734 → 1753 (+19; +8 attributable INFO rls_enabled_no_policy
       expected pattern matching DEMO baseline)

D3.1 Sprint 0.2: Purpose registry seeded ✅ (Jul 25)
     - 167 purposes across 12 apps (legal 30, c2c 25, real_estate 20, finance 15,
       hr 15, compliance 13, sales 12, mylegal 11, insurance 10, marketplace 9,
       chamber 6, stverify 1)
     - 25 compliance_owned purposes match approved list exactly:
       access_request, annual_report, attestation, audit_representation,
       board_consent, boi_filing, code_of_conduct, compliance_attestation,
       conflict_of_interest, corp_resolution, dpa, fcpa_certification, i9,
       kyc_attestation, legal_hold, nda, non_compete, non_solicit_marketplace,
       policy_acknowledgment, records_retention, regulatory_filing,
       related_party_disclosure, training_completion, vendor_risk_assessment,
       whistleblower_ack
     - 33 requires_notary, 11 attorney_review_gate, 6 executive_review_gate,
       19 bulk_send_supported

D3.2 Sprint 0.3: Core DocuSign RPCs ✅ (Jul 25)
     Four RPCs, all SECURITY DEFINER with search_path = public,pg_temp,
     REVOKE PUBLIC + GRANT service_role:
     - create_docusign_envelope(...) — atomic envelope + signers, validates
       purpose registry, enforces minimum_signers via check_violation
     - record_docusign_event(...) — webhook receiver, idempotent (returns NULL
       for unknown envelope), captures ip_address/user_agent/signature_hash
       from payload
     - list_envelopes_for_resource(...) — read helper with signer counts +
       progress
     - is_compliance_officer_for_org(...) — Phase 1d permission gate (STUB
       returns false in 1c)
     End-to-end smoke tested on DEMO: create → sent → delivered →
     recipient-completed → envelope-completed. Status transitioned correctly,
     4 events logged in order, signer.status='signed' with IP captured. Edge
     cases verified: unknown purpose raises foreign_key_violation, below-min
     signers raises check_violation with atomicity, unknown envelope returns
     NULL. CASCADE FK integrity confirmed on cleanup.

D3.3 Sprint 0.4: PFS schema consolidation ✅ (Jul 25, with correction)
     Schema changes:
     - Added pfs_versions.envelope_id uuid REFERENCES docusign_envelopes ON
       DELETE SET NULL (partial index ix_pfs_versions_envelope)
     - INITIAL VERSION dropped 6 legacy inline docusign_* columns from
       pfs_versions
     - CORRECTION (Jul 25 same session): restored the 6 legacy columns because
       finance's deployed DocuSign Platform V1 (Jul 23 iterations 3.1a-3.1e)
       still writes to them. Dual-write pattern until Sprint 0.5 refactor
       ships and finance stops writing legacy columns.
     - Backfilled 1 DEMO envelope (Eddie Van Shredder, Bowie-Stardust) into
       central tables with metadata.backfilled=true,
       received_from='phase_1c_backfill'
     - PROD safety check confirmed 0 rows with legacy data before any DDL

     Three Bank PFS RPCs shipped (with one signature_method fix mid-flight):
     - resolve_bank_contact_for_org(org_id) → uuid — Phase 1c heuristic:
       first non-deleted Contact by "Contacts_id" sort. Full contact-picker
       UX is Phase 1c+.
     - save_pfs_from_bank(...) → jsonb — atomic write, 4 line-item tables,
       auto-increments version_number, updates active_version_id. Enforces
       CHECK constraints: signature_method ∈ {NULL,'attestation','docusign'},
       ownership_pct ∈ (0.0, 1.0], sba_category strictly enumerated per
       type.
     - get_pfs_for_bank(contact_id) → jsonb — read active version + all
       lines + computed totals (assets, liabilities, net_worth,
       annual_income, contingent).
     End-to-end smoke tested on DEMO (Eddie Van Shredder): saved version 3
     with 8 line items. Totals verified: assets 2.735M, liabilities 1.302M,
     net worth 1.433M, income 430K, contingent 850K.

D3.4 Sprint 0.5: App refactors (pending — requires finance + bank repos on iMac)
     1. Finance webhook (app/api/pfs/docusign-webhook/route.js) → add
        record_docusign_event(docusign_envelope_id, event_type, payload,
        signer_email) call alongside existing legacy sbPatch write
        (dual-write pattern)
     2. Finance PFS envelope creation → add create_docusign_envelope(...)
        call alongside existing pfs_versions.docusign_* INSERT (dual-write),
        then UPDATE pfs_versions.envelope_id with returned uuid
     3. Bank banking.js:save_pfs handler (line 565-644) → refactor to call
        save_pfs_from_bank RPC. Requires flat-to-line-items translation on
        server side (maps 9 asset fields / 7 liability fields / 5 income
        fields to correct sba_category values per line item).
     4. Bank banking.js:section=='pfs' read (line 249-259) → call
        get_pfs_for_bank(session_contact_id) instead of direct
        st_personal_financial_statements read
     5. Bank pages/api/pfs/submit-modal.js (Phase 1b commit 13ad57b) →
        route to save_pfs_from_bank RPC instead of pfs_submissions insert
     6. Bank pages/api/index-overview.js line 92 → replace
        pfs_submissions query with personal_financial_statements JOIN
     7. (Optional) Migrate PROD pfs_submissions row (Eddie Van Shredder,
        d0000000-...-01, 4.25M assets) → personal_financial_statements +
        pfs_versions + line items. Requires creating an Eddie Contact on
        PROD (Bowie-Stardust has 0 Contacts on PROD currently). Recommend
        deferring to Sprint 0.6 with pfs_submissions drop.

D3.5 Sprint 0.6: Cleanup (pending — after Sprint 0.5 verified in production)
     1. Verify PFS end-to-end on DEMO with non-demo test account
     2. DROP legacy tables on DEMO: st_personal_financial_statements,
        pfs_submissions
     3. DROP legacy pfs_versions.docusign_* columns on DEMO + PROD (safe
        once finance stops writing them via Sprint 0.5)
     4. PROD table drop deferred until confidence period passes

D3 Phase 1c current status: enabling schema fully shipped, code refactors
   awaiting finance + bank repo access on Jason's iMac. All Sprint 0.1-0.4
   migrations idempotent and DEMO/PROD parity verified.

### Phase 1d (planned ~28-35h)
- Sprint 1 (~8h): Compliance orchestration RPCs + Compliance_Items.envelope_id FK
- Sprint 2 (~10h): RON Model A (DocuSign Notary On-Demand) + state_rules
  seeded for 50 states + DC + CA fallback
- Sprint 3 (~10h): RON Model B (BYON) + MJS Law notary onboarding + recording
  mirroring to Supabase Storage
- Sprint 4 (~6h): Envelope templates + compliance dashboards + SLA escalation

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

**Jul 25 2026 — Phase 1c enabling schema (nine locked lessons + one near-miss):**

Near-miss caught mid-session: **premature column drop while deployed app still writes to them.**
Sprint 0.4a's initial migration dropped 6 legacy `pfs_versions.docusign_*` columns
in the same transaction as adding the new central `envelope_id` FK. Finance's
DocuSign Platform V1 (deployed Jul 23 iterations 3.1a-3.1e) was still writing
to those columns via its webhook handler. Next webhook would have 500'd with
"column does not exist". Caught before Sprint 0.5 started; rolled forward with
column restoration + backfill from central envelope, establishing the **dual-write
window pattern**. Lesson locked as #TC-017 below.

**Nine new locked lessons for skills v5:**

L23. **CHECK constraint discovery is mandatory before RPC write path design.**
     Sprint 0.4 hit two constraint failures mid-smoke-test:
     - `pfs_versions.signature_method` allows only NULL / 'attestation' / 'docusign'
       — my RPC default of 'bank_electronic' was rejected
     - `pfs_asset_lines.ownership_pct` is (0.0, 1.0] fractional, NOT 0-100 percentage
       — my test data 100 was rejected  
     - `pfs_*_lines.sba_category` strictly enumerated per line-item type
       — my test 'cash'/'mortgage'/'business' values were all invalid
     **Rule:** query `pg_constraint WHERE conrelid = 'table'::regclass AND contype='c'`
     BEFORE designing INSERT-shape RPCs, not after test failures.

L24. **Polymorphic FK design pattern (docusign_envelopes case study).**
     `docusign_envelopes(resource_type, resource_id)` uses SOFT reference
     (no DB FK); type varies (pfs_versions, deals, engagements, etc.). Enforced
     at RPC layer via `create_docusign_envelope`. Non-polymorphic FKs
     (envelope_id → envelopes, signer_id → signers, purpose → purposes)
     get DB-enforced constraints. Cross-app soft-ref pattern: contact_id,
     initiated_by_compliance_item_id, campaign_id, created_by_contact_id
     do NOT get DB FKs (cross-app cardinality varies).

L25. **RPC idempotency for webhooks: return NULL, don't RAISE.**
     `record_docusign_event` returns NULL when envelope not found rather than
     raising foreign_key_violation. Why: DocuSign retries webhook calls
     aggressively on 4xx/5xx. Raising means retries fail forever. Returning
     NULL means "we got it, nothing to do" and DocuSign moves on.
     Applies to any webhook-receiver RPC.

L26. **Backfill migration metadata pattern.** When migrating existing rows
     into new central tables, insert with:
     - `metadata->>'backfilled' = true`
     - `metadata->>'backfill_source' = 'source description'`
     - `metadata->>'backfill_migration' = migration_name`
     - `metadata->>'backfill_date' = now()`
     - `received_from = 'phase_XX_backfill'` (distinct from 'docusign_webhook')
     - Preserve original timestamps in sent_at/completed_at (not now())
     Enables later filtering: `WHERE received_from = 'docusign_webhook'`
     for real events vs backfill.

L27. **Purpose registry as centralized policy driver.** Instead of scattering
     `if purpose == 'x' then require_notary else ...` logic across app code,
     store all policy metadata on the purpose row itself:
     `requires_notary, requires_witness_count, minimum_signers,
     attorney_review_gate, executive_review_gate, compliance_owned,
     bulk_send_supported, recurring_supported, state_specific_notary,
     retention_years`. The RPC (`create_docusign_envelope`) looks up the
     purpose row and applies defaults. Adding a new purpose = INSERT one
     row; no code changes. 167 purposes shipped Jul 25.

L28. **Compliance-owned purpose gate (Option B locked).** Purposes flagged
     `compliance_owned=true` (25 total) require an authorized compliance
     officer to initiate the envelope on behalf of a target org. The
     `is_compliance_officer_for_org(caller_contact_id, target_org_id)`
     RPC is the single gate. Phase 1c stub returns false (compliance app
     doesn't exist yet); Phase 1d Sprint 1 replaces with real check
     against User_Entity_Access + compliance role.

L29. **Bowie-Stardust asymmetry between DEMO and PROD.** DEMO has 31 Contacts
     tied to Bowie-Stardust org (d0000000-0000-0000-0000-000000000001).
     PROD has 0 Contacts tied to that org — only the Organizations row and
     a legacy pfs_submissions row with `guarantor_name='Eddie Van Shredder'`
     (no contact_id column in that table's schema). Any migration touching
     "Eddie's PROD contact" must FIRST create the Contact row. This
     asymmetry surfaces when moving demo flows to production for the first
     time.

L30. **Airtable-origin Contacts schema quirks (reconfirmed).** No `created_at`
     column exists on `Contacts`. Use `"Contacts_id"` (quoted, mixed-case)
     for stable ordering when a chronological signal isn't available.
     Column names: `"First Name"`, `"Last Name"`, `"Email"`, `"Contacts_id"`
     all quoted mixed-case. Timestamp columns available: `deleted_at`,
     `archived_at`, `address_verified_at`. NO `created_at`.

L31. **Multi-statement gotcha reconfirmed for CREATE FUNCTION migrations.**
     `execute_sql` returns only the last result set. When running multiple
     `SELECT public.some_rpc(...)` calls in one query for smoke tests, only
     the last return value is visible. Split into separate calls, or use
     `WITH t1 AS (SELECT ...), t2 AS (SELECT ...) SELECT * FROM t1, t2`.
     `RAISE NOTICE` inside DO blocks doesn't appear in the query result —
     use RETURN-value patterns to verify PL/pgSQL branch execution.

**New TC in the Test Case Registry:**

TC-017: **Deployed-app column-drop guard.** Before dropping any column from
a table that a deployed app writes to, verify no live code writes to that
column via grep across all deployed repos. Prefer additive-then-drop
(add new mechanism, dual-write for a period, then drop legacy). Sprint 0.4
correction was: initial migration dropped 6 pfs_versions.docusign_* columns
same-transaction; rolled forward with restoration migration and dual-write
window pattern.

**Jul 25 2026 — Phase 1c Sprint 0.5 ship (five more locked lessons):**

L32. **Git push success ≠ Vercel deploy success.** After every commit to a
     Vercel-connected repo, verify deploy state via
     `Vercel:list_deployments` (or the dashboard). If it says ERROR, don't
     assume "shipped." Phase 1b commit 13ad57b was believed shipped for
     two weeks — in reality its Vercel deploy ERROR'd and prod continued
     serving the previous good build (b9026ba4, Jul 8 CVE bump). The
     userMemories "Phase 1b shipped" reflected git push completing, not
     production actually running the code. **Rule:** after any commit
     to a deployed repo, poll Vercel state and only mark the sprint
     shipped once state=READY. Applies especially to install-script
     driven changes where local success feels like ship-completion.

L33. **`@/` path alias in Next.js requires jsconfig.json or tsconfig.json.**
     Not implicit. Bank repo had no `jsconfig.json`, no `tsconfig.json`,
     and no webpack alias config in `next.config.js` — so
     `import x from '@/lib/supabase'` failed at build time with
     "Module not found." Before writing `@/foo` imports in any repo,
     grep for existing `@/` usage: if none exists AND no jsconfig,
     the alias isn't wired. Use relative imports instead
     (`../../../lib/supabase` from `pages/api/pfs/submit-modal.js`).
     Applies to any Next.js repo in the Start Today ecosystem — some
     have jsconfig (finance does), some don't (bank doesn't).

L34. **macOS `sha256sum` doesn't exist — use `shasum -a 256`.** Any
     install script that runs on Jason's Mac needs a portable wrapper:
     ```
     sha256() {
       if command -v sha256sum >/dev/null 2>&1; then
         sha256sum "$@" | awk '{print $1}'
       elif command -v shasum >/dev/null 2>&1; then
         shasum -a 256 "$@" | awk '{print $1}'
       else
         echo "ERROR: no sha256 tool found" >&2; exit 1
       fi
     }
     ```
     Same pattern applies for GNU-vs-BSD tool differences: `sed -i`
     (macOS wants `sed -i ''`), `base64 -w0` (macOS `base64` has no
     `-w`), `date -d` vs `date -f`, `readlink -f` (macOS needs
     `coreutils`' `greadlink`), `find -printf` (BSD find lacks it).

L35. **Zsh treats `#` as a literal, not a comment, in interactive
     copy-paste blocks.** Terminal instructions given to Jason must
     not include inline `# comment` lines — they get interpreted as
     arguments and cause "command not found: #" or "cd: too many
     arguments." Two safe patterns: (a) put comments as full lines
     starting with `#` (works because zsh sees them at line start
     as a no-op), or (b) omit comments entirely and split multi-step
     sequences into separate code blocks with prose explanation
     between. Also: `ls -d finance* bank*` with globbing in zsh will
     fail with "no matches found" if no matches; use `2>/dev/null` or
     `setopt NULL_GLOB` if silent-no-match is desired.

L36. **Install scripts must be tested on the target OS, not just the
     sandbox.** Linux-tested doesn't mean macOS-safe. Sprint 0.5
     installers passed every Linux sandbox test but failed on Jason's
     Mac at the very first `sha256sum` call — before touching a single
     file. Mitigation: simulate the target env via `PATH` restriction:
     create a fake `/tmp/mac_bin_only/` with only `shasum` (aliased to
     the BSD tool), then run installer with restricted `PATH`. Catches
     the class of bugs where a build works because a tool exists on
     Linux that isn't present on macOS (or vice versa).

**Additional TC in the Test Case Registry:**

TC-018: **Post-commit Vercel deploy verification.** After every commit
that touches app code (any repo with a Vercel integration), immediately
call `Vercel:list_deployments` and inspect the newest entry's `state`.
If state is BUILDING, wait 60-120s and re-poll. If state is ERROR,
call `Vercel:get_deployment_build_logs errorsOnly=true` to identify
the failure. Do not consider the sprint shipped until state=READY on
a deploy that carries the target commit SHA. Applies especially when
multiple commits land in quick succession — check that the final
deploy corresponds to the intended commit.

**Jul 25 2026 — Phase 1c post-ship hardening (one more locked lesson):**

L37. **SECURITY DEFINER RPCs need explicit REVOKE FROM anon, authenticated
     — not just PUBLIC.** Postgres's default privileges grant EXECUTE on
     new functions to PUBLIC AND to specific roles like `anon` and
     `authenticated` (Supabase's default roles). `REVOKE EXECUTE FROM
     PUBLIC` alone leaves anon/authenticated with direct grants, so
     Supabase's `anon_security_definer_function_executable` and
     `authenticated_security_definer_function_executable` advisors both
     fire. The canonical pattern:
     ```
     REVOKE EXECUTE ON FUNCTION public.my_rpc(...) FROM anon, authenticated, PUBLIC;
     GRANT  EXECUTE ON FUNCTION public.my_rpc(...) TO service_role;
     ```
     Discovered post-Sprint 0.4/0.5: all 7 new Phase 1c RPCs
     (create_docusign_envelope, record_docusign_event,
     list_envelopes_for_resource, is_compliance_officer_for_org,
     resolve_bank_contact_for_org, save_pfs_from_bank, get_pfs_for_bank)
     had REVOKE FROM PUBLIC applied at creation time but not the explicit
     revoke from anon+authenticated. Fixed on both DEMO and PROD via
     `phase_1c_rpcs_revoke_anon_authenticated_execute` migration.
     Verification via `information_schema.routine_privileges`: grantees
     should be exactly `{postgres, service_role}`. **Rule for all
     future SECURITY DEFINER RPC creation migrations:** include the
     explicit REVOKE from anon+authenticated in the same DDL block as
     CREATE FUNCTION, then GRANT to service_role.

L38. **DEMO and PROD schemas diverge — RPCs that touch quoted-name
     Airtable-origin tables must be schema-tolerant.** Two divergences
     bit Sprint 2.5 (`get_finance_debt` covenants extension) in
     sequence: (a) `Loans."Term (months)"` is `integer` on DEMO but
     `text` on PROD — the pre-existing regex `regexp_replace(coalesce(
     l."Term (months)",''),'[^0-9.]','','g')` implicitly relied on the
     column being text. Fix: cast to text first — `coalesce(l."Term
     (months)"::text, '')`. (b) `Loan_covenants_and_conditions` has
     entirely different optional columns per project: DEMO has
     `Covenant_language`, `Headroom_current`, `Headroom_threshold`;
     PROD has `Docs`, `extracted_from_doc_id`, `extraction_method`,
     `extraction_confidence`, `extraction_at`, `source_document_excerpt`,
     `validated_by_carl`, `carl_validation_notes`. Direct references
     (`c.source_document_excerpt`) work on PROD but fail on DEMO with
     `column does not exist`. Fix: read optional divergent columns
     via `to_jsonb(c) ->> 'column_name'` — returns null for absent
     columns instead of erroring. Guaranteed-present columns
     (`Covenants_and_conditions_id`, `Loan_id`, `Covenant Name`, `Type`,
     `Threshold`, `Frequency_id`, `Next Due`, `Status_id`, `Notes`) can
     still be dot-referenced. **Rule for all future cross-environment
     RPCs:** enumerate the required columns, verify they exist on both
     projects, and read optional/environment-specific columns
     defensively via `to_jsonb`. Test the RPC on DEMO immediately after
     the migration succeeds — do not assume "migration applied
     successfully" equals "RPC works" until an actual SELECT confirms
     the return shape.

**Jul 26 2026 — Phase 2 close-out (one more locked lesson, L38 recurrence):**

L39. **L38 confirmed on `Start_Score`. All legacy quoted-name tables must
     be assumed to diverge across DEMO/PROD — the default read pattern
     is `to_jsonb(row)->>'col'`, not direct dot access.** Sprint 2.1
     extending `get_finance_cfo` to include a cash summary block also
     needed to keep reading `Start_Score`. The pre-existing RPC used
     direct column reads on `overall_score / score_band / entity_score /
     compliance_score / financial_score / insurance_score / hr_score`
     which are the PROD columns. DEMO has an entirely different flat
     shape — `Score / Band / Pillar_scores (jsonb)` — with pillar
     values nested inside a JSON object. Direct references failed on
     DEMO with `column "overall_score" does not exist`. Notably: the
     pre-existing RPC was presumably working somehow (Bowie's CFO tab
     rendered), which means DEMO must have had a different function
     definition than PROD before my CREATE OR REPLACE overwrote it —
     surfacing a broader risk: **RPCs of the same signature may quietly
     diverge across projects.** Fix followed L38's pattern:
     ```sql
     select to_jsonb(ss) into v_score_row
       from public."Start_Score" ss
       where ss.org_id = p_org_id
       order by coalesce((to_jsonb(ss)->>'score_date')::timestamptz,
                         (to_jsonb(ss)->>'Calculated_at')::timestamptz)
                desc nulls last
       limit 1;
     v_score := jsonb_build_object(
       'overall',    coalesce((v_score_row->>'overall_score')::numeric,
                              (v_score_row->>'Score')::numeric),
       'band',       coalesce(v_score_row->>'score_band',
                              v_score_row->>'Band'),
       'entity',     coalesce((v_score_row->>'entity_score')::numeric,
                              (v_score_row->'Pillar_scores'->>'entity')::numeric),
       ...
     );
     ```
     Third confirmed occurrence of the pattern (Loans, Loan_covenants,
     Start_Score) in three consecutive sprints means this is not a
     quirk — it is the operating state of the schema. **Rules
     upgraded:**
     1. When touching ANY legacy quoted-name Airtable-origin table
        (`"Start_Score"`, `"Loans"`, `"Loan_covenants_and_conditions"`,
        `"Financial_Statements"`, `"Contacts"`, `"Employees"`, etc.),
        default to `to_jsonb(row)->>'col'` for every column read
        except the join key (`org_id`, PK). Direct references are only
        safe for the PK and org_id.
     2. Before `CREATE OR REPLACE FUNCTION`, dump the existing function
        definition on BOTH projects (`SELECT pg_get_functiondef(...)`)
        and diff them. If they differ, the new version must handle
        both call sites' schemas — do not silently replace a
        DEMO-specific version with a PROD-shaped one.
     3. Test on DEMO first EVERY time. Sprint 2.1 rediscovered this
        rule for a fourth time — the L23-locked "DEMO-first validation"
        discipline must not slip.

**Aug 20 2026 — attorney-dashboard trust RPC grant regression (one locked lesson):**

L40. **DROP FUNCTION + CREATE FUNCTION silently restores the default PUBLIC
     EXECUTE grant. L37's revoke is not sticky across a signature change.**
     L37 established the canonical revoke for *new* SECURITY DEFINER RPCs.
     What it did not say, and what cost a live hole in trust accounting:
     **changing an existing function's signature means DROP + CREATE, and the
     new function is a new object with default privileges.** Every revoke
     previously applied to the old signature is discarded with the old oid.
     (`CREATE OR REPLACE` reuses the oid and *does* preserve grants — the
     hazard is specific to a signature change.)

     Case: commit `b99a4f2` (legal, Aug 20) added `p_user_email` as the first
     argument to `post_trust_deposit`, `post_trust_disbursement`,
     `apply_invoice_to_trust` and `generate_invoice_from_wip` to close a
     cross-firm authorisation gap, dropping the unscoped signatures so they
     could not be called around the new guard. Correct fix, correctly reasoned.
     But the recreate carried no revoke, so all four came back granted to
     PUBLIC — and were then the **only** four attorney RPCs in the schema that
     `anon` could execute. Every sibling (`get_firm_context`, `create_matter`,
     `update_matter_details`, `set_worklist_item_done`, 76 others) was `false`.

     Why that was worse than the bug it fixed: the attorney app's entire
     authorisation model is `/api/rpc/[fn]` forcing `p_user_email` from the
     verified session (commit `2ba6f67`). The RPCs themselves authorise the
     *claimed* email — `_caller_firm_for_matter(email, work_item_id)` has no
     session binding. Anon EXECUTE therefore routes around the proxy entirely:
     the public anon key plus a discoverable firm address is a write path into
     the IOLTA ledger. The original bug needed an authenticated session and a
     second firm that does not exist yet; this one needed neither.

     **Rule:** any migration that changes an RPC's signature must re-apply the
     full L37 block in the same migration as the CREATE, not just on first
     creation:
     ```sql
     REVOKE EXECUTE ON FUNCTION public.my_rpc(<new arg types>)
       FROM anon, authenticated, PUBLIC;
     GRANT  EXECUTE ON FUNCTION public.my_rpc(<new arg types>) TO service_role;
     ```
     **Verification (do not skip — the advisor is the only thing that catches
     this, and it is one WARN among ~1900):**
     ```sql
     SELECT proname,
            has_function_privilege('anon', oid, 'EXECUTE') AS anon,
            has_function_privilege('authenticated', oid, 'EXECUTE') AS authed
     FROM pg_proc
     WHERE pronamespace='public'::regnamespace AND proname IN (...);
     ```
     Both must be `false`. Fixed Aug 20 via
     `legal_trust_rpcs_revoke_anon_authenticated_execute`; advisor count
     1946 → 1938, delta −8 (4 anon + 4 authenticated), all other categories +0.

     Corollary: `get_advisors` returns ~1946 findings on PROD, of which ~1272
     are the accepted `*_security_definer_function_executable` backlog. A
     4-function regression is a 0.2% movement in that number. **Do not baseline
     on the total.** Baseline per-category, and for any function touching
     money, identity or client data assert the privilege directly.

**Aug 20 2026 — Billing & Trust write surface dead on arrival (one locked lesson):**

L41. **`check_function_bodies = OFF` plus a GENERATED ALWAYS column is a
     silent-500 factory. Grep for assignments to generated columns after any
     migration that adds one.**
     `Matter_Invoices."Balance"` is `GENERATED ALWAYS AS ("Total" - "Paid")`.
     Three RPCs assign to it. Postgres rejects that with `428C9 column
     "Balance" can only be updated to DEFAULT` — but only at *execution*.
     With `check_function_bodies = OFF` all three created cleanly, deployed
     cleanly, and threw on every single call. None had an EXCEPTION handler,
     so they surfaced as raw 500s rather than `{ok:false}`.

     Affected: `apply_invoice_to_trust`, `record_invoice_payment`,
     `apply_trust_to_invoice`. That is the entire Billing & Trust *write*
     surface. It had never worked. This compounds the known read-side problem
     (`get_matter_billing` querying legacy `Matter_id` with a `work_item_id`):
     the tab was empty on read *and* broken on write, which is why neither
     symptom ever isolated the other.

     Worth noting how close this came to being missed: `apply_invoice_to_trust`
     was hardened the same night for a cross-firm authorisation gap. The
     authorisation fix was correct and verified. Nobody called the function
     afterwards, so nobody learned it could not run at all.

     **Rule:** after any migration that adds a generated column, sweep every
     function body for assignments to it:
     ```sql
     WITH gen AS (SELECT table_name, column_name FROM information_schema.columns
                  WHERE table_schema='public' AND is_generated='ALWAYS')
     SELECT p.proname, g.table_name||'."'||g.column_name||'"'
     FROM pg_proc p JOIN gen g
       ON p.prosrc ~* ('"'||g.column_name||'"[[:space:]]*=')
      AND p.prosrc ILIKE '%UPDATE%' AND p.prosrc ILIKE ('%'||g.table_name||'%')
     WHERE p.pronamespace='public'::regnamespace;
     ```
     **Removing the assignment is normally the entire fix** — the generated
     expression already computes the intended value. Check the clamp: a
     hand-written `GREATEST(x - y, 0)` differs from a bare `x - y` only in the
     overflow case, and usually the unclamped value is the more truthful one
     (it shows the credit).

     **Sequencing trap:** do not fix the crash on a function whose
     authorisation is also broken. `apply_trust_to_invoice` debits
     `Work_Items.trust_balance` with no firm predicate; it is only harmless
     today *because* the 428C9 aborts the statement first. Repairing the crash
     alone would convert a function that fails closed into a live cross-firm
     write. It was deliberately left erroring pending a drop, since
     `apply_invoice_to_trust` supersedes it.

**Additional TCs in the Test Case Registry:**

TC-019: **Post-signature-change grant assertion.** After any migration that
drops and recreates an RPC, assert `has_function_privilege('anon', oid,
'EXECUTE') = false` and the same for `authenticated`, for every function the
migration touched, in a statement separate from the migration itself. Extend
to a surface sweep where the app has a hardened baseline — e.g. for the
attorney app, every SECURITY DEFINER function whose body references
`Firm_Members`, `"Work_Items"`, `Matter_Invoices`, `Matter_Trust_Transactions`
or `Work_SOP_Instances` should be anon-unreachable. As of Aug 20 that sweep is
80 locked down / 1 reachable (`request_compliance_specialist`, pre-existing,
client-portal intake — triage separately, not a regression from this session).

TC-020: **Generated-column assignment sweep.** Run the L41 query after any
migration adding a generated column, and as a standing check. Zero rows
expected. Pairs with TC-019.

TC-021: **Exercise-the-write-path probe.** A function that returns a refusal
(`not_a_firm_member`, `invoice_not_found`) has not been proven to work — the
refusal returns before the UPDATE. To prove a write RPC actually executes,
call it against real data inside a `DO` block that `RAISE EXCEPTION`s at the
end, smuggling the result out in the error message. The statement is atomic,
so everything rolls back; verify the row is unchanged afterwards. This is how
the two Balance fixes were confirmed rather than assumed.

**Aug 21 2026 — install-script mechanics (one locked lesson):**

L42. **Write side artifacts before any step that can fail, and check bracket
     balance as a DELTA, not an absolute.**
     Two independent install-script defects in one session.
     (a) An installer wrote its commit message in a heredoc at the very end,
     after `npm run build`. `npm` was not on the PATH of a non-interactive
     shell, `set -e` exited, and the message file was never created — so the
     follow-up script that expected it failed too. Anything a later step depends
     on must be written before the first step that can fail.
     (b) The locked "bracket balance sanity check" rejects every patch to
     `AttorneyDashboard.jsx`: the pristine file already counts **-8** on parens
     because of parens inside string and regex literals. An absolute
     `count('(') == count(')')` check is invalid on any real JSX file. The
     correct invariant is that the patch must not CHANGE the delta:
     ```python
     before = src_before.count(op) - src_before.count(cl)
     after  = src_after.count(op)  - src_after.count(cl)
     if before != after: fail()
     ```
     Also: a non-interactive shell does not read `.zshrc`, so an nvm-managed
     node is invisible to a script even when `npm` works fine in the terminal.
     Build steps should source nvm, probe homebrew/volta/fnm, and degrade with a
     warning rather than exiting after the files are already patched.

**Aug 21 2026 — the two sweeps (one locked lesson):**

L43. **`cron.job_run_details` is authoritative and nobody reads it. Check it
     before believing any scheduled job works.**
     Two compliance jobs had never succeeded once:
     * `compliance-enrich-work-packets` (*/30, active) — **2,975 runs, 2,975
       failures, 0 successes** — called `fn_cron_enrich_compliance_items()`,
       which never existed. The worker `fn_enrich_compliance_items(p_limit,
       p_max_age_hours)` was fine; only the `fn_cron_*` wrapper was missing.
     * `compliance-deadline-tracking` (0 */6, active) — **247 runs, 247
       failures, 0 successes** — the `Platform_Alerts` INSERT named `alert_type`
       (real column `signal_type`) and omitted `org_id` and `suite`, both NOT
       NULL with no default.
     Both broke on **2026-06-20**, 79 minutes apart, in one deployment. Neither
     ran for 62 days. `compliance_item_readiness` sat at 260 rows with 3,279
     items queued; `compliance_deadline_tracking` held 8,177 rows all stamped
     2026-06-20. Live recompute showed **154 statutory filings overdue, 4
     critical** — the compliance position nobody could see, on a compliance
     product.
     The transaction detail is the trap: the cron command is one statement, and
     the failing INSERT came AFTER the function that does the real work, so the
     raise rolled back the computation too. A cron that "only fails to alert"
     may be discarding its entire run.
     **Rule:** after registering or editing any cron, and on any session
     touching scheduled work, run:
     ```sql
     SELECT j.jobname, count(*) FILTER (WHERE d.status='failed') AS failed,
            count(*) FILTER (WHERE d.status='succeeded') AS ok
     FROM cron.job j JOIN cron.job_run_details d ON d.jobid=j.jobid
     GROUP BY j.jobname HAVING count(*) FILTER (WHERE d.status='succeeded') = 0;
     ```
     Any row returned is a job that has never worked. Note a job with NO run
     history at all will not appear — check `cron.job` LEFT JOIN separately, and
     remember annual schedules legitimately never appear.
     Companion lesson: alert INSERTs belong in their own BEGIN/EXCEPTION block
     so a reporting failure cannot roll back the work, and every recurring alert
     needs a `dedup_key` with `ON CONFLICT DO NOTHING` — a 6-hourly job without
     one raises four duplicates a day.

**Additional TC in the Test Case Registry:**

TC-022: **Platform static health check.** `SELECT public.fn_platform_static_health_check();`
Returns dead_functions (plpgsql_check errors), dead_triggers (checked per
attached relation, with `blocks_writes` and `likely_false_positive` flags),
generated_col_writes (428C9 risks) and cron_health (never-succeeded and
recently-failing jobs). Run at session start for any DB work and after any
migration. Baseline at 2026-08-21 close: 1 generated_col_write
(`apply_trust_to_invoice`, left failing closed on purpose), 3 dead_triggers of
which 2 are known false positives from REFERENCING transition tables, and
`fn_c2c_evidence_from_kyc` which needs its intended join specified before it can
be fixed. Requires the `plpgsql_check` extension, installed in `extensions`
(deliberately not `public`, to avoid an extension_in_public advisor finding).

**Aug 21 2026 — surgical-edit failure modes (three locked lessons):**

L44. **A function body can mix aliased and unaliased references to the same
     table. A blanket string replace across it will compile and then throw.**
     `check_function_bodies = OFF` does not resolve aliases at creation, so the
     error appears on first call, not on deploy.
     Two instances in one session:
     * `get_hr_score_health` — 6 references to `sc."Start_score"`, of which only
       4 were the band predicates; the other 2 sat in genuinely aliased
       `FROM "Score_Card" sc` clauses. A blanket replace would have broken
       working code.
     * `get_firm_matters` — the matter list uses `FROM public.v_work_attorney wi`
       while the four stats counters use bare `FROM public."Work_Items"`. One
       replace put `wi.work_item_id` into all five and the counters threw
       `42P01 missing FROM-clause entry for table "wi"`.
     **Rule:** before replacing anything in a function body, count the target in
     each context separately, replace per context, and assert both counts after:
     ```sql
     n_aliased := (SELECT count(*) FROM regexp_matches(def, 'wi\.work_item_id', 'g'));
     n_bare    := (SELECT count(*) FROM regexp_matches(def, '\(p_user_email, work_item_id\)', 'g'));
     IF n_aliased <> 1 OR n_bare <> 4 THEN RAISE EXCEPTION '...'; END IF;
     ```

L45. **Anchor PLACEMENT must be asserted, not just anchor uniqueness.**
     A unique anchor can still be in the wrong place.
     * `create_matter`: the anchor `v_created := true;` is unique — and sits
       inside the branch that only runs when a NEW client org is created, and
       BEFORE the `Work_Items` INSERT. The inserted assignment block would have
       fired only for new-org matters, against a `work_item_id` with no row yet.
     * Second attempt bounded the block on `RETURN jsonb_build_object(` and
       matched the **first of seven** — an early error return at offset 2051,
       ahead of the target at 4014.
     **Rule:** after inserting, assert position relative to the statement that
     must precede it:
     ```sql
     IF position('Work_Members' in v_new) < position('INSERT INTO public."Work_Items"' in v_new) THEN
       RAISE EXCEPTION 'block landed before the row it references';
     END IF;
     ```
     Prefer bounding on the block's own terminator over a generic keyword, and
     count occurrences of any keyword anchor before trusting `position()`.

L46. **This schema contains legacy/live table PAIRS holding the same content.
     Confirm which one the application reads before building on either.**
     `Matter_Assignments` (170 rows, `Matter_id` keyed to the legacy
     `Attorney_Matters`, read by **no function at all**) and `Work_Members`
     (172 rows, keyed to `work_item_id`, read by `get_matter_detail`,
     `verify_org_access` and `v_work_attorney`) both held the same firm team.
     An hour of remapping, FK-ing, guard triggers and `create_matter` wiring went
     onto the dead one before the live one surfaced.
     The tell is not row count or column quality — it is **who reads it**:
     ```sql
     SELECT proname FROM pg_proc
     WHERE pronamespace='public'::regnamespace AND prosrc ILIKE '%<table>%';
     ```
     Zero readers means legacy, however healthy the data looks. Known pairs so
     far: Matter_Assignments/Work_Members, and the Attorney_Matters id space
     generally (Matter_Invoices, Matter_Time_Entries, Matter_Expenses,
     Matter_Tasks."Matter_id", get_firm_tasks, get_firm_calendar_tasks).

**Aug 21 2026 — security control width (one locked lesson):**

L47. **A security control is only as wide as the functions that consult it. An
     empty shadow log can mean "nothing is instrumented", not "nothing is denied".**
     Default-closed matter visibility was built, verified in both directions and
     correct — and was consulted by **1 of 30** allow-listed functions. Flipping
     to enforce at that point would have hidden a matter from its detail view
     while it still appeared in the list, its messages still opened, its billing
     still loaded, and a screened person could still write to it. A screen with
     one door locked and twenty open is worse than none, because it looks like
     protection.
     The empty shadow log would have read as evidence of safety.
     **Rule:** before trusting shadow evidence, count the call sites:
     ```sql
     SELECT CASE WHEN prosrc ILIKE '%<gate_fn>%' THEN 'gated' ELSE 'UNGATED' END,
            count(*), string_agg(proname, ', ')
     FROM pg_proc WHERE pronamespace='public'::regnamespace
       AND proname = ANY(<allow_list>) GROUP BY 1;
     ```
     Corollary: gate at the **shared helper** where one exists.
     `_caller_firm_for_matter` was already the guard for 10 functions, 9 of them
     writes including every trust path, so adding the check there covered all 10
     in a single change.

**Matter visibility model (as built 2026-08-21):**
```
matter_visibility_settings   mode = 'shadow' | 'enforce'  (one row)
                             unassigned_visible_to_attorneys (default true)
matter_visibility_shadow_log what enforcement WOULD deny
Work_Members                 canonical firm team. NOT Matter_Assignments.
_caller_can_see_matter(email, wi)      team membership. NO admin bypass, by decision.
_caller_may_act_on(email, kind, id)    resolves sop_instance | task | matter, fails closed
_work_item_for(kind, id)               id resolver
fn_log_matter_visibility(...)          logs; always permits while mode='shadow'
```
Flip with `UPDATE matter_visibility_settings SET mode='enforce'` — no deploy.
24 of 30 allow-listed functions gated. The 6 that are not are ALL blocked on the
Attorney_Matters consolidation, not skipped: `get_matter_billing`,
`record_invoice_payment`, `void_invoice`, `get_firm_calendar_tasks`,
`get_firm_billing`, `get_firm_expenses` (the last has 0 rows, so no exposure).
Three layers keep a matter from ever being unassigned: backfill, `create_matter`
assigning on creation, and a BEFORE DELETE trigger refusing removal of the last
responsible attorney from a live matter.

**Additional TCs in the Test Case Registry:**

TC-023: **Matter visibility shadow verification.** Before flipping to enforce,
run BOTH: (a) the per-member simulation — for every active firm member × every
live matter, count what `_caller_can_see_matter` would hide; expect 0 for anyone
who should see it; (b) the call-site count from L47; expect every allow-listed
function that touches matter data to be gated or explicitly listed as blocked.
A clean shadow log alone is not sufficient evidence — see L47.

TC-024: **Legacy/live pair check.** Before building on any table that looks like
a team, assignment, or join table, run the reader query from L46. Zero readers
means it is the legacy half of a pair and the live one must be found first.

**Aug 21 2026 — estimation and measurement (two locked lessons):**

L48. **Measure the scope of a migration before believing the estimate. Count
     ROWS, not constraints.**
     The `Attorney_Matters` consolidation was treated across a whole session as
     the central blocker — six ungated functions, Billing & Trust, the
     `Matter_Assignments` retirement, `get_firm_tasks` display fields — and as a
     multi-session data migration too risky to start. The estimate came from
     counting FK constraints (10) and noting that 150 of 230 FKs to
     `Organizations` are `ON DELETE CASCADE`.
     Measured properly:
     * **six of the ten FK tables are EMPTY** (Matter_Expenses,
       Matter_Trust_Transactions, Matter_Documents, Matter_Key_Dates,
       Matter_Activity_Log, Client_Portal_Invites);
     * the four with rows hold **950 rows total** — Time_Entries 545,
       Invoices 195, Assignments 170, Tasks 40;
     * **every row resolved** via `Work_Items.legacy_matter_id`, which is unique,
       so the mapping is 1:1;
     * the one "unmapped" legacy matter turned out to exist on BOTH sides under
       the **same uuid**, with `legacy_matter_id` never set — a one-row link, not
       a migration.
     Phase 1 was a single migration. Billing & Trust went from empty to 545 time
     entries and 195 invoices across 87 matters.
     **Rule:** before scoping any consolidation, run row counts and a
     resolvability check per dependent table. A constraint count describes the
     shape of the problem; only row counts describe its size.
     **Corollary:** Phase 1 (link + backfill + repoint readers) is separable from
     Phase 2 (drop legacy columns and FKs) and carries far less risk. Do Phase 1
     early; gate Phase 2 on real usage. Here 17 functions still read
     Attorney_Matters and **six would break outright** if the key were dropped —
     `get_hr_matters`, `get_portal_clients`, `get_firm_portal_users`,
     `toggle_task_done`, `create_matter_from_hr_issue`, `get_firm_expenses` —
     several of them cross-app.

L49. **The grouping key determines the number you report. State it, and check it
     matches the claim being made.**
     Reported: "8,403 identical notifications for one compliance item." That
     grouped by title and a **70-character body prefix, across 77 organisations** —
     so it counted rows that shared a title and an opening phrase, not duplicates
     of one item.
     Grouped by `(org_id, title, md5(body))`: **37,692 distinct notifications
     written 56,023 times** — roughly 33% excess, worst single case 76 repeats
     over 55 days. Of those, only **6,021 were same-day**; the rest were the same
     notice re-sent on different days, which may be intended behaviour.
     The corrected finding still justified a fix, but a third the size and a
     different fix: a same-day unique index, not a purge.
     **Rule:** when quantifying a data problem, group by the full natural key of
     the thing you are claiming is duplicated. If the claim is "duplicates of one
     item", the grouping must identify one item. Prefixes and cross-tenant
     aggregates inflate.

**Aug 21 2026 — error signalling (one locked lesson):**

L50. **`RETURNS void` makes a caller's error handling unreachable. Adding
     `if (!ok)` to the client does nothing if the function cannot say `false`.**
     `toggle_task_done` returned `void`. The frontend had already been fixed
     (cbf37ca) to route it through `rpcWrite` and roll back the optimistic tick on
     `!wr.ok` — correct client code, permanently dead branch, because a void
     return always reads as success. The task checkbox appeared to save whether or
     not it did.
     This is the silent-write family again, but inverted: previous instances had a
     correct server and a client that discarded the response. Here the client was
     right and the server had nothing to give it.
     **Rule:** every write RPC returns jsonb with at minimum `ok` and, on failure,
     `error`. Auditing for it:
     ```sql
     SELECT proname FROM pg_proc
     WHERE pronamespace='public'::regnamespace
       AND prorettype = 'void'::regtype
       AND (prosrc ILIKE '%INSERT%' OR prosrc ILIKE '%UPDATE %' OR prosrc ILIKE '%DELETE%');
     ```
     Changing a return type requires DROP + CREATE — so L37/L40 apply, and the
     grants must be re-issued in the same migration.

**L44 recurrence note (third instance, same session):**
The mixed-alias trap fired three times on 2026-08-21: `get_hr_score_health`,
`get_firm_matters`, and `get_firm_billing`. The third is the instructive one — the
clio join text was **byte-identical in two branches** with different aliases
(`te` and `i`), so a single `replace()` applied to both and put `i.work_item_id`
into the time-entries branch. The reason it recurred despite L44 being written
hours earlier: the string *looked* unique, and uniqueness of the string was
mistaken for uniqueness of the context. Assert a count per context, always, even
when the anchor appears distinctive.

**Additional TC in the Test Case Registry:**

TC-025: **Pre-consolidation measurement.** Before scoping any legacy-table
consolidation, produce for every table with an FK to the legacy table: row count,
count with the legacy key populated, and count resolvable to the new key. Then
count legacy rows with no counterpart in the new table. Only after that estimate
effort. Additionally list functions reading the legacy table and classify each as
legacy-only, both, or new-key-only — the legacy-only set is what Phase 2 breaks.

---

## Locked Lessons — 2026-08-24 session

### L51 — An error message that asserts a cause will send you the wrong way
`fn_carl_extract_document` reported *"source file not retrievable from storage
(HTTP 400); the document record exists but the file binary is missing —
re-upload the file"*. The binary was present, correctly sized, and fetchable. The
real cause was a signature invalidated by URL normalisation.

That sentence cost four wrong theories and an hour. **Error text should report
what was observed — status, endpoint, response — and stop.** A diagnosis embedded
in an error is a guess that outlives the person who made it.

Corollary: when you write the handler, resist explaining. `storage returned HTTP
400 for this object; check bucket, path and access mode` is more useful than any
theory about why.

### L52 — Read the response body on the FIRST failure, not the third
The same bug produced, in order: `400 InvalidKey`, then curl *"Malformed input to
a URL function"*, then `400 InvalidSignature`, then Anthropic's *"Unable to
download the file"*. Four distinct causes. Each was treated as a continuation of
the last, so each fix addressed the previous symptom.

**A new error message is new evidence, not a variant of the old one.** Fetch the
body before forming a hypothesis.

### L53 — A Supabase signed URL must be returned verbatim
The token signs the **exact path string** the Storage API produced, which is
partially encoded: `&` comes back as `%26`, spaces come back raw. Therefore:
- encoding the whole returned URL → `%2526` → `400 InvalidKey`
- leaving it alone → raw space → curl refuses to send it
- encoding only the space → `400 InvalidSignature`

There is no correct normalisation. Return it verbatim, or do not use signed URLs.
For server-to-server work use `/storage/v1/object/authenticated/<bucket>/<path>`
with a bearer token — no signature, no normalisation problem. Verified: the
authenticated endpoint returns 200 for paths that defeat signing entirely.

### L54 — Never do N network calls before responding in a serverless function
The classification queue endpoint signed a URL for all 86 rows before returning.
86 parallel storage round-trips exceeded the function timeout, the client's
`safeFetch` returned null, and the feature silently did nothing — while the route
answered 403 to unauthenticated probes and looked healthy.

**Sign, fetch and enrich on demand, one item at a time.** The list call went from
timing out to 11 ms. A short-lived URL minted at page load has also already spent
part of its life before anyone clicks it.

### L55 — A status column is a claim about the past
`Documents.storage_present` was true for 719 rows and last verified **2026-06-26**
— two months stale. It was treated as current fact in a summary given to the
user. It happened to still be accurate, which is luck, not method.

**Any boolean that records the result of a check needs its `*_verified_at`
consulted in the same query.** If the timestamp is old, the boolean is a memory.

### L56 — Deployment success is not deploy success
Four commits pushed cleanly to compliance-User. All four deployments were
`ERROR`. `npm install` had failed since 22 July on
`ssh://git@github.com/Starttodaybiz/platform-auth.git` — Vercel build machines
have no SSH key for a private repo — and production kept serving the last good
build from before the platform-auth migration.

Local assertions passed. `git push` succeeded. The site worked. **A month of
commits were invisible.**

Check `state` on the deployment, not the exit code of the push. A private git
dependency over SSH will never install on Vercel; use an install-command override:
```
git config --global url."https://$GITHUB_TOKEN@github.com/".insteadOf "ssh://git@github.com/" && npm install
```

### L57 — Names are unreliable guides to what things are (3rd and 4th recurrence)
- `compliance-User` was judged from `st_staff_tab_permissions` (analytics, okrs,
  revenue, pipeline) — a table belonging to a **different application**. Its real
  routes are evidence-review, control-queue, gap-alerts, formation-queue: a
  compliance workstation, exactly as its name says.
- `Entity_Ownership_Interests` (**0 rows**) sits beside `Ownership_Interests`
  (**120 rows**). `get_legal_structure` reads the empty one, which is why entities
  visibly connected on the org map return `role: standalone`.
- Earlier instances: `Matter_Assignments`/`Work_Members`,
  `conflict_resolution_rules` (data merges, not legal conflicts).

**Confirm what a table belongs to before inferring an application's purpose from
it.** One query on the repo's own routes settles it.

### L58 — When wiring actions onto a list, check the list's bounds
Preview/Download/Approve were wired onto rows from `/api/documents`, which returns
the **200 most recent by date**. The proposals spanned four months, so **37 of 86**
had a row to attach to and 49 were unreachable. The queue said 86.

**A join between a queue and a paged list silently drops whatever falls outside
the page.** Count the intersection before shipping.

### L59 — Legal content must be researched live, every time
CTA beneficial-ownership reporting was **permanently repealed for US entities on
2026-08-14** by FinCEN final rule — ten days before the session. Memory said it
was a live obligation. The platform held **463 open compliance items, 15 rules and
68 assertions** asserting it.

For a compliance product this is the worst failure class: telling a client to make
a filing they are exempt from. `compliance_rules` had `last_verified_date`,
`statute_effective_date` and `currency_status` columns — **171 of 1,110 populated,
most recent verification 2026-06-29, zero tied to a law change.**

Never state a legal requirement from memory. Search, cite, date it.

### L60 — Count the population before estimating the work
"413 documents need classification" was really **45**. The rest: 205 rows with no
bytes, 166 non-documents (logos, avatars, property photos, `theme1.xml` and other
Office-archive internals), and duplicates.

A queue that counts company logos as unclassified legal documents teaches people
to ignore it — which is how 140 proposals at 0.9 confidence sat undecided.
`fn_document_is_classifiable()` now draws that line once, in the database, so
every surface reads the same number.

Related: an overstated duplication figure earlier in the day (3× the real number)
came from grouping on the wrong key. **State the measurement, not the impression.**

### L61 — A queue with no owner is not a queue
Every stalled item found was stalled the same way: complete machinery, populated
data, and no surface where the person with authority would see it.
- 140 classification proposals, real confidence, undecided for months
- 379 assertions observed correctly, none carrying a rule
- 12 chain-of-title certifications reachable only from the client app
- 1,016 rules and assertions awaiting an attorney with no queue view

`get_work_queues(email, app)` now routes work by **authority**: attorney-only
queues are hidden from staff rather than shown as counts they cannot action.

**Placement principle: work goes where the authority to do it lives.** If it needs
a licence it is attorney; if it is operational correctness it is compliance;
client-facing apps surface state and requests, never firm work queues.

---

## Test Cases — 2026-08-24

| TC | Name | Expected |
|----|------|----------|
| TC-026 | Signed URL verbatim | `fn_carl_sign_url` output is byte-identical to the API's `signedURL` after the host prefix. Any re-encoding → `400 InvalidSignature`. |
| TC-027 | Queue endpoint latency | `get_classification_review_queue(100)` returns in <100 ms and the route performs **zero** storage calls. Signing happens only via `?sign=<id>`. |
| TC-028 | Document population | `fn_document_is_classifiable()` excludes asset buckets, archive internals, duplicates and rows with no bytes. Every surface reporting "unclassified" uses it. |
| TC-029 | Deploy actually deployed | After any push, assert the newest deployment for the project has `state: READY`. A clean `git push` proves nothing. |

## Rule currency — new invariant

`compliance_rules.currency_status` now permits `superseded` and `pending_review`,
and `compliance_law_changes` records dated, cited changes in law with a source URL
and retrieval timestamp. **A rule asserting repealed law must never read
`current`.** Rules whose law is in question are excluded from provisional
approval — the question there is not whether counsel has reviewed it, but whether
it is still the law.

---

## Locked Lessons — 2026-08-24, compliance model

### L62 — Search for the thing before building the thing
Four times in one session I built alongside something that already existed:

| Built | Already there |
|---|---|
| `G_Document_Extraction_Prompts` | `carl_extraction_profiles` — 34 profiles, correct insurance one |
| a recovery parser (3 of 8 right) | `_insurance_extractions` — all 8, with limits and deductibles |
| `Contract_Insurance_Requirements` | `carl_contract_obligations` — 758 extracted obligations |
| `carl-extract-binary` profile logic | `fn_carl_profile_for` / `fn_carl_extract_document` |

Every one was found by a query I could have run first. The platform's defining
problem is **built, populated, never surfaced** — and diagnosing that while adding
to it is the specific trap.

**Before creating a table, a prompt catalogue or an extractor, query
`information_schema.tables` and `pg_proc` for the concept.** One search costs
seconds; a parallel system costs a migration to unwind and leaves two sources of
truth in the meantime.

### L63 — ON CONFLICT does not constrain NULL columns
`UNIQUE (entity_id, requirement_slug, period_year, jurisdiction)` where the last two
are nullable **never fires**, because `NULL <> NULL` in Postgres. Three generation
runs produced three copies of every row: 12,616 where the truth was 5,124.

A client's compliance obligations were overstated **3x**, which is exactly the false
authority the whole workstream exists to prevent.

Fix: `COALESCE` sentinels in a unique *expression* index, and target that
expression in `ON CONFLICT`:
```sql
CREATE UNIQUE INDEX ... (entity_id, requirement_slug,
  COALESCE(period_year, -1), COALESCE(jurisdiction, '~'));
-- then: ON CONFLICT (entity_id, requirement_slug,
--   COALESCE(period_year,-1), COALESCE(jurisdiction,'~')) DO NOTHING
```
Then **verify idempotency by running twice and asserting the count is unchanged.**

### L64 — A match test and its ambiguity check must be equally strict
Attaching documents by filename: the match used
`position(full_name in filename)`, and the "is this ambiguous" count used the
*same* strict test. `10XHealth IF1 L.P.` appears in filenames as
`10XHealth IF1 L_P_`, so the strict test found **one** entity, the check agreed it
was unambiguous, and five two-party agreements were attached to a single party with
the counterparty silently dropped.

**If the match is fuzzy, the ambiguity check must be at least as fuzzy**, or it
passes on a technicality. Related: a document naming two parties is not ambiguous —
it belongs to both. `Documents.Entity_id` being singular is a modelling limit, not a
disambiguation problem.

### L65 — A fix applied to the data is not a fix
`carl-extract-binary` wrote its JSON into `embed_text` instead of `extraction_json`.
The data was corrected; the edge function was not. The next batch of eight documents
reproduced the bug exactly.

**When correcting bad data, fix the producer in the same session or the correction
is a cleanup, not a repair.** If the producer cannot be fixed immediately, hold the
queue rather than let it generate more of the same.

### L66 — Absence of findings is not absence of risk
The single most important reporting rule in this domain. Every count needs its
unexamined counterpart stated first:
- 7 of 11 pillars generate **no assertions** — so their requirements are assessed on
  document presence only
- 37 of 121 entities have **no formation date** — so no dated obligations generate
  for them at all
- 17 leases on record, **0 read** for insurance clauses — so no breach can be
  detected
- A requirement with **no source document** is inadmissible: telling a client they
  breach a clause nobody has read is worse than silence

A report showing three green pillars and omitting eight unexamined ones reads as
"no gaps found" when the truth is "not looked at", and that is the more dangerous
error.

### L67 — Recurrence has more dimensions than "annual"
A corporate record is not a checklist. 41 of 139 requirements described recurring
obligations as single snapshots — `annual_report_current` and
`annual_report_prior_year` were the model's way of saying "this year and last",
while one entity holds 13 annual reports and the oldest was formed in 1921.

Dimensions actually needed: `annual`, `quarterly`, `per_jurisdiction`,
`annual_per_jurisdiction`, `quarterly_per_jurisdiction`, `per_person`,
`per_property`, `annual_per_property`, `semiannual_per_property`,
`per_lease_document`, `per_record`.

Two that are easy to miss: **per_person** (a "Sample I-9 Forms" requirement is not a
corporate record — diligence asks for one per employee) and **semiannual_per_property**
(Illinois bills property tax in two instalments, which `Property_Taxes` already
modelled).

### L68 — The horizon comes from retention law, not from a number
How far back a record must reach is a legal fact per document type, not a policy
choice. A 2004 entity owes **16** quarterly Form 941s under the IRS 4-year rule
(26 CFR 31.6001-1), not 88 running to formation — but it owes **every** annual
report since 2004, because a gap in the standing series cannot be aged out.

`G_Record_Retention_Rules` carries authority, citation, source URL, verification
date and `review_due` per rule. Where a period is practice rather than statute —
formation documents kept permanently — the row says so instead of inventing a
citation.

### L69 — Never count an obligation that is not owed
Applicability was checked for singular requirements and skipped in the recurrence
loop, so a holding company with no employees generated quarterly SUTA, withholding
and 941 filings. `state_tax.sales_use_returns` was worse: `required` with **no
applicability condition at all**, asserting quarterly sales-tax returns against
every entity including pure holding companies — 27 fabricated obligations for one.

**A fabricated obligation is worse than a missing one.** A missing requirement is a
gap someone finds and closes; an invented failure appears in a client report as
real, and every number built on it — score, gap count, completeness percentage — is
wrong in a direction nobody checks.

Where liability turns on a fact the platform does not hold, gate on an observable
proxy and say so: sales-tax returns apply only where a sales-tax permit is on
record, because registration is the observable evidence the entity took on the
obligation.

---

## Evidence tiers — the vocabulary to use

Already present in `readiness_assertions` and now on expected instances. The
distinction that matters most is **unsubstantiated**: the platform holds a RECORD of
the thing without a document proving it.

| Tier | Means |
|---|---|
| `verified` | Document held, hashed, attorney-accepted |
| `asserted` | Document held and accepted, not attorney-reviewed. **Integration-sourced evidence lands here** — better provenance than a client email, but no attorney has looked |
| `under_review` | Submitted, not decided |
| `unsubstantiated` | A record exists (an `Insurance_policies` row, a `Leases` row) with no document. **Known, not proven** |
| `not_required` | Does not apply to this entity |

45 insurance policies and 20 leases exist as rows with **zero documents behind
them**. Reporting those as satisfied would repeat the 454-ghost-document failure.

## Test Cases — compliance model

| TC | Name | Expected |
|----|------|----------|
| TC-030 | Generation is idempotent | Running `generate_expected_evidence` twice adds **zero** rows. Assert the count, do not trust `ON CONFLICT`. |
| TC-031 | No fabricated obligations | An entity with no employees generates **zero** quarterly payroll instances; a holding company with no sales permit generates **zero** sales-tax returns. |
| TC-032 | Retention bounds the horizon | A 2004 entity has ~16 quarterly 941 instances (4-year rule) and ~23 annual report instances (permanent series). |
| TC-033 | Coverage is stated | Every gap report states pillars examined vs not examined, and contracts read vs unread, before any finding. |
| TC-034 | Profile routing | An operating agreement routes to `operating_agreement`, an insurance policy to `insurance` — not to `contract_insurance_clause` or `policy_handbook`. |
