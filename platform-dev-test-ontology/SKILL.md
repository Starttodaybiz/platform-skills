---
name: platform-dev-test-ontology
description: >-
  Comprehensive development test framework, ontology, and regression suite for the Start Today™ platform. Use this skill whenever starting a new feature sprint, running regression tests, defining test cases for new functionality, auditing the platform schema, checking what exists before building, or establishing what "done" means for any feature. Triggers on: "what tables exist for X", "has this been built before", "define done for this feature", "run regression tests", "add this to the test ontology", "what should I test", "what's the schema for", "check if this feature is already built", "define the test cases for". This skill prevents duplicate work, catches regressions, and keeps the development ontology current.
---

# Start Today™ Platform Dev Test Ontology

Last updated: Jul 25 2026 — v5: Phase 1c enabling schema shipped (Sprints 0.1-0.4) + DocuSign central infrastructure + PFS bank RPCs + 9 new locked lessons.

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
