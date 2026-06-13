---
name: platform-dev-test-ontology
description: >-
  Comprehensive development test framework, ontology, and regression suite for the Start Today™ platform. Use this skill whenever starting a new feature sprint, running regression tests, defining test cases for new functionality, auditing the platform schema, checking what exists before building, or establishing what "done" means for any feature. Triggers on: "what tables exist for X", "has this been built before", "define done for this feature", "run regression tests", "add this to the test ontology", "what should I test", "what's the schema for", "check if this feature is already built", "define the test cases for". This skill prevents duplicate work, catches regressions, and keeps the development ontology current.
---

# Start Today™ Platform Dev Test Ontology

Last updated: Jun 11 2026 — added Back-end Org Provisioning onboarding-skip playbook (seed_onboarding_complete) + TC-039.

---

## Feature Ontology — hr.starttoday.biz

### Dashboard Pages (all live)
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
| Worker Classification | (in-page modal) | `WorkerClassificationModal` component | read-only review |

### Shared Components
| Component | File | Purpose |
|-----------|------|---------|
| `WorkerClassificationModal` | `QuickModals.tsx` | IRS SS-8 6-factor IC vs W-2 checker |
| `CertDetailPanel` | `stverify/page.tsx` | STVerify cert detail slide-in panel |
| `SubscriptionDeepLinks` | `SubscriptionLinks.tsx` | Contextual jump links from subscription profile |
| `SHRMRecertWidget` | `SubscriptionLinks.tsx` | SHRM PDC tracking + recert deadline |

### /api/hr?section= Route Map
| section | Returns |
|---------|---------|
| `overview` | Dashboard score + counts |
| `score-health` | Score Health page data |
| `peo-data` | PEO + contractor data |
| `onboarding` | Onboarding hires + summary |
| `benefits` | Benefit plans + summary |
| `professional-network` | Provider list |
| `carl` | CARL™ HR Intelligence answer |
| `employee-detail` | Per-employee compliance detail |

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

### New Tables (built this sprint)
```
HR_Benefit_Plans       — Plan_id, org_id, Plan_name, Provider (TEXT), Plan_type,
                         Enrolled_count, Employer_cost_mo, Eligibility, Status, Low_enrollment
Employee_Onboarding    — Onboarding_id, org_id, Employee_id, Full_name, Email, Start_date,
                         Job_title, Department, Status (Invited/I-9 Section 1/Policy Acks/Benefits/Complete),
                         Progress_pct, Invited_at, Completed_at
PEO_Agreements         — PEO_agreement_id, org_id, PEO_name, Entity_ids (TEXT[]),
                         Employee_count, Expiry_date, Status
Contractor_Workers     — Contractor_id, org_id, Worker_name, Worker_type (1099/Agency/W-2 Contract),
                         Entity_name, Engagement_start, Engagement_end, Has_SOW, Single_client,
                         Company_equipment, Risk_level (High/Medium/Low), Risk_flag, Status
Professional_Network   — Provider_id, org_id, Name, Organization, Role, Category,
                         Email, Phone, Credentials, Notes, Status, Since
stverify_compliance_certificates — id, subject_org_id, cert_number, cert_type, cert_tier,
                         carl_findings (jsonb), verified_items (jsonb), applicable_laws (text[]),
                         status, compliance_score, risk_level, issued_at, expires_at,
                         cert_url, qr_code_data, cert_hash, issued_by
professional_subscription_profiles — id, user_auth_id, org_id, has_westlaw, has_shrm,
                         shrm_member_id, shrm_certification, shrm_recert_due,
                         has_irs_online, has_dol_elaws, has_eeoc_portal, has_osha_portal,
                         has_bls_access, show_deep_links, preferred_legal_source,
                         preferred_hr_source, preferred_tax_source
```

### Column Name Gotchas (registry of bugs we've hit)
```
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
```

---

## Test Case Registry (13 tests, all ✅)

| TC | What | Assertion |
|----|------|-----------|
| TC-001 | Login | `{mfa_required:true, auth_id, org_id}` |
| TC-002 | Dashboard | `{ok:true, data.score.total >= 70}` |
| TC-003 | Score Health | `summary.total_entities >= 1, summary.avg_score > 50` |
| TC-004 | Add Employee | `{ok:true, employee_id: UUID}` |
| TC-005 | Log Issue | `{ok:true, issue_id: UUID}` |
| TC-006 | Open Enrollment | `{ok:true, compliance_id: UUID, eligible_count > 0}` |
| TC-007 | PEO Data | `{data.peos.length >= 2, data.contractors.length >= 6}` |
| TC-008 | Security | exactly 22 advisor findings |
| TC-009 | STVerify Issuance | `{ok:true, certificate.cert_number: "STV-EC-..."}` |
| TC-010 | Benefits | `{ok:true, data.plans.length: 5, data.summary.total_monthly_cost: 1240}` |
| TC-011 | Onboarding | `{ok:true, data.hires.length: 5, data.summary.in_progress: 3}` |
| TC-012 | Professional Network | `{ok:true, data.providers.length: 6}` |
| TC-013 | Subscription Profile | `{ok:true, profile.has_westlaw:true, profile.shrm_certification: "SHRM-SCP"}` |

---

## FF Log — COMPLETE

### FF Log A ✅
A1 PEO module · A2 Contractor compliance · A3 Benefits live data ·
A4 STVerify cert detail · A5 Worker classification modal

### FF Log B ✅
B1 Professional Network · B2 SHRM Recertification · B3 Start Score™ doc · B4 Subscription deep links

### Next Phase — Mobile Ecosystem
Phase 1 PWA hardening · Phase 2 CARL Companion (React Native) ·
Phase 3 Start Today Verify (contractor QR) · Phase 4 HR employee self-service

---

## Deployment Manifest

| App | Vercel Project | GitHub Repo |
|-----|---------------|-------------|
| hr.starttoday.biz | prj_vOK2S92gkl1lz3Vo2YG5gAIKUtTM | Starttodaybiz/HR |
| prohr.starttoday.biz | prj_3Eia7K4L2JVkBzhENbadGbF2yjwZ | Starttodaybiz/ProHR |
| legal.starttoday.biz | prj_sczZV0Y6EmonWmfHZSxttTwbXZCs | Starttodaybiz/attorney-dashboard |

Team: team_7hbKJDeZuvbjZ7aTxXxUnFv4 · Supabase: ptgtliwllimkswtajcmy
Auth: j@starttoday.biz / Start2day! / org_id: cc5f3139-0a53-4e2d-9d72-1790bc891d0f

## Cron Schedule
| Job | Schedule |
|-----|----------|
| `daily-start-score-calculation` | 0 6 * * * — `SELECT calculate_start_scores(); SELECT sync_scores_from_score_card();` |
| `carl-morning-briefing-daily` | 0 6 * * * — fires `carl-morning-briefing` edge function |

## How to Update This Skill
After shipping a new feature: add to Feature Ontology, Schema Ontology, write a TC-NNN test case, update FF Log.
After a bug: document root cause in Column Name Gotchas.

---

## Feature Ontology — c2c.starttoday.biz · Brokerage Tier v1 (Sprint 7)

Business brokerage runs as a **role-gated tier** inside C2C — not a separate app. The tier activates when the session resolves to an active row in `Brokerage_Agents`. Mediated by `lib/brokerage.js#resolveBrokerageContext` with 30s cache; re-derived per request (same pattern as `lib/auth.js#isAdmin`).

### Sub-Sections (rendered by `components/c2c/BrokerageMode.jsx`)
| Section | Source | Status |
|---------|--------|--------|
| Dashboard | `get_brokerage_dashboard` RPC | ✅ |
| Listings | `Brokerage_Listings` table + CIM/Teaser via Anthropic | ✅ |
| Buyer Mandates | `Brokerage_Buyer_Mandates` table | ✅ |
| Valuations | `Valuations` + `compute_valuation` + `certify_valuation` | ✅ |
| Commissions | `Brokerage_Commission_Ledger` | ✅ |
| §15(b)(13) | `compute_15b13_eligibility` RPC | ✅ |

### API Routes (15 new under `/api/c2c/brokerage/`)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/dashboard` | Full payload + summary tiles |
| GET, POST | `/listings` | List + create |
| PATCH | `/listings/[id]` | Editable field whitelist |
| POST | `/listings/[id]/cim` | CARL Strategy CIM draft (Anthropic) |
| POST | `/listings/[id]/teaser` | Blind teaser draft (Anthropic) |
| GET, POST | `/mandates` | Buy-side searches |
| GET, POST | `/outreach` | Per-listing buyer outreach log |
| GET, POST | `/valuations` | Three-approach valuations |
| POST | `/valuations/[id]/compute` | Run compute_valuation engine |
| POST | `/valuations/[id]/certify` | Mint STCV-YY-NNNNN |
| GET | `/commissions` | Closed-deal ledger |
| POST | `/compliance/15b13` | Federal exemption gate |
| POST | `/onboard` | Broker-initiates client onboarding |
| GET | `/onboard-info` (PUBLIC) | Invite metadata for landing page |
| POST | `/consent-sign` (PUBLIC) | Client signs all engagement consents |

### Public Routes (added to middleware PUBLIC_PATHS)
- `/onboard/[token]` — client consent landing page
- `/api/c2c/brokerage/onboard-info` — invite inspection
- `/api/c2c/brokerage/consent-sign` — consent signing

### Schema — Brokerage Tier Tables
```
Brokerage                  — top-level brokerage org
  Brokerage_id (PK), org_id, name, legal_name, ein, formation_state, entity_type,
  principal_broker, principal_broker_email, jurisdictions TEXT[], licenses JSONB,
  mna_broker_exempt BOOL, sec_sro_disqualified BOOL, disqual_check_date DATE,
  status, default_commission_pct, default_engagement_months

Brokerage_Agents           — individual brokers under a brokerage
  Brokerage_agent_id (PK), Brokerage_id FK, org_id, user_auth_id,
  email, full_name, role ('principal'|'agent'|'associate'),
  license_number, jurisdictions TEXT[], credentials TEXT[],
  sec_sro_disqualified BOOL, nda_signed, commission_split_pct, status

Brokerage_Engagements      — time-bounded broker↔client link
  Brokerage_engagement_id (PK), Brokerage_id FK, Brokerage_agent_id FK,
  brokerage_org_id, client_org_id, client_entity_id,
  engagement_type ('sell_side'|'buy_side'|'valuation_only'|'mna_advisory'),
  exclusivity, fee_structure JSONB, commission_pct, retainer_amount, min_fee,
  engagement_start, engagement_end, status ('pending_consent'|'active'|'closed'),
  dual_rep BOOL, dual_rep_consent_id, listing_agreement_doc, closed_deal_id,
  closed_at, commission_earned

Brokerage_Client_Consents  — signed consents
  Brokerage_consent_id (PK), Brokerage_id FK, Brokerage_engagement_id FK,
  client_org_id, client_signer_name, client_signer_email, client_signer_title,
  consent_type ('platform_terms'|'brokerage_engagement'|'dual_representation'),
  scope JSONB, document_text, signed BOOL, signed_at, signed_ip, signed_user_agent,
  expires_at, revoked_at, revoked_reason

Brokerage_Listings         — sell-side listing
  Brokerage_listing_id (PK), Brokerage_id FK, Brokerage_engagement_id FK,
  brokerage_org_id, client_org_id, Deal_id,
  listing_title, industry, naics, state, city,
  asking_price, ebitda_ttm, revenue_ttm, multiple, reason_for_sale,
  business_description, blind_teaser_text, cim_url, cim_status,
  visibility ('private'|'qualified_buyers'|'public'),
  marketplace_listed BOOL, status ('active'|'under_loi'|'at_close'|'closed'|'off_market'),
  qualified_buyer_count, nda_count, loi_count, list_date, off_market_date

Brokerage_Buyer_Mandates   — buy-side searches
  Brokerage_mandate_id (PK), Brokerage_id FK, Brokerage_engagement_id FK,
  brokerage_org_id, buyer_org_id, buyer_contact_name, buyer_contact_email,
  mandate_title, buyer_type ('strategic_buyer'|'private_equity'|'family_office'|'other'),
  industries TEXT[], geographies TEXT[],
  ebitda_min, ebitda_max, revenue_min, revenue_max, check_size_min, check_size_max,
  deal_structure_pref, search_thesis, exclusivity BOOL, retainer, success_fee_pct,
  status, targets_approached, targets_in_diligence

Brokerage_Buyer_Outreach   — buyer outreach log
  Brokerage_outreach_id (PK), Brokerage_id FK, Brokerage_listing_id FK,
  Brokerage_mandate_id FK, buyer_name, buyer_contact_email, buyer_type,
  status ('sourced'|'qualified'|'under_loi'|'declined'|'closed'),
  nda_signed BOOL, qualified BOOL, outreach_log JSONB,
  last_contact_at, next_action, next_action_due,
  loi_received BOOL, loi_received_at, loi_amount, notes

Valuations                 — Start Today Certified Valuation™
  Valuation_id (PK), org_id, client_entity_id, client_entity_name,
  Brokerage_id FK, Brokerage_agent_id FK, Brokerage_engagement_id FK,
  valuation_date, valuation_purpose, valuation_standard,
  revenue_ttm, ebitda_reported_ttm, ebitda_normalized_ttm, addbacks JSONB,
  naics, industry_label, growth_rate_3yr, recurring_revenue_pct,
  customer_concentration, owner_dependency_score, working_capital_norm, net_debt,
  -- Three-approach output
  market_low_multiple, market_high_multiple, market_mid_multiple,
  market_low_value, market_high_value, market_mid_value,
  income_dcf_value, income_wacc, asset_book_value, asset_liquidation_value,
  conclusion_low, conclusion_high, conclusion_midpoint,
  conclusion_narrative, carl_commentary,
  -- Certification
  cert_eligible BOOL, cert_eligibility_reasons JSONB,
  certified BOOL, cert_number (STCV-YY-NNNNN), cert_issued_at, cert_hash, cert_pdf_url,
  stverify_inputs_pct, stverify_score_at_valuation,
  fee_amount, platform_fee, paid BOOL, paid_at, status

Brokerage_Commission_Ledger — per-deal commission accounting
  Brokerage_commission_id (PK), Brokerage_id FK, Brokerage_engagement_id FK,
  Brokerage_listing_id FK, Brokerage_agent_id FK, Deal_id,
  deal_value, gross_commission, commission_pct,
  listing_agent_pct, selling_agent_pct, house_split_pct,
  listing_agent_amount, selling_agent_amount, house_amount,
  platform_success_fee, net_to_brokerage,
  close_date, paid_to_brokerage BOOL, paid_to_agents BOOL, notes

Deals (extended)
  + "Brokerage_engagement_id" UUID FK→Brokerage_Engagements
  + "Brokerage_listing_id"   UUID FK→Brokerage_Listings
```

### RPCs
```
get_brokerage_dashboard(p_brokerage_id UUID) → JSONB
  Returns: brokerage + summary + agents + engagements + listings +
           mandates + valuations + commissions

broker_initiate_client_onboarding(
  p_brokerage_id, p_brokerage_agent_id, p_client_legal_name,
  p_client_signer_name, p_client_signer_email, p_client_signer_title,
  p_engagement_type, p_engagement_months, p_commission_pct,
  p_dual_rep, p_listing_terms JSONB
) → JSONB { ok, new_org_id, engagement_id, invite_token, invite_url, consents[] }

client_sign_brokerage_consents(
  p_invite_token TEXT, p_signer_ip TEXT, p_signer_user_agent TEXT
) → JSONB { ok, engagement_id, signed_count, org_id }

compute_valuation(p_valuation_id UUID) → JSONB
  NAICS-based baseline mults: 72/44/45=2-4x, 54=3.5-7x, 51=5-10x,
  23/22/21=3-5.5x, 31/32/33=4-7x, default=3-6x.
  Quality adj: owner_dep, customer_conc>20%, recurring_rev%, growth%.
  + 5-yr DCF with Gordon terminal at WACC 0.15.

certify_valuation(p_valuation_id UUID, p_issuer_email TEXT) → JSONB
  Gates: stverify_inputs_pct ≥ 80%, agent.credentials ∩ {ABV,CVA,ASA,CBA,CM&AA},
         agent not sec_sro_disqualified. Returns STCV-YY-NNNNN + sha256 cert_hash.

compute_15b13_eligibility(p_deal_id, p_revenue, p_ebitda) → JSONB
  Federal cap: $25M EBITDA AND $250M revenue. State per-deal rules still apply.
```

### Test Case Registry — Brokerage Tier (TC-014 → TC-021)

| TC | What | Assertion |
|----|------|-----------|
| TC-014 | Broker initiate onboarding | `{ok:true, engagement_id, invite_token, invite_url contains '/onboard/'}` |
| TC-015 | Client sign consents | `{ok:true, signed_count >= 2}`; engagement.status flips → 'active' |
| TC-016 | Brokerage dashboard load | `{ok:true, summary.pipeline_aum > 0, summary.agents_count >= 1}` |
| TC-017 | NAV gate (non-broker) | `whoami.brokerage === null` for non-broker session; `◇ Brokerage` not in NAV |
| TC-018 | NAV gate (broker) | `whoami.brokerage !== null` for demo.mna@; `◇ Brokerage` in NAV, default-lands on it |
| TC-019 | Valuation compute | `compute_valuation` returns 3 mults + DCF; status='draft' → 'computed' |
| TC-020 | Valuation certify (success) | issuer has ABV/CVA/ASA/CBA/CM&AA AND stverify_inputs ≥80% → `STCV-YY-NNNNN` |
| TC-021 | Valuation certify (block) | issuer lacks credentials OR stverify<80% → `{ok:false, error:'not_eligible', reasons[]}` |
| TC-022 | §15(b)(13) eligible | rev=$5M, ebitda=$1M → `federally_exempt:true` |
| TC-023 | §15(b)(13) blocked | rev=$300M, ebitda=$30M → `federally_exempt:false, issues:[exceeds_both_size_thresholds]` |
| TC-024 | Listing CIM draft | Anthropic responds with 6-section markdown; listing.cim_status='draft' |
| TC-025 | Listing teaser draft | <100 words anonymized text persisted to `blind_teaser_text` |

### Column Name Gotchas — Brokerage Tier
```
Most PKs use the Pascal-quoted form: "Brokerage_id", "Brokerage_agent_id",
  "Brokerage_engagement_id", "Brokerage_listing_id", "Brokerage_mandate_id",
  "Brokerage_outreach_id", "Brokerage_consent_id", "Brokerage_commission_id",
  "Valuation_id"
Deals link columns: "Brokerage_engagement_id", "Brokerage_listing_id"
  (both quoted — easy to forget in raw SQL)
Organizations.env: must be 'demo' for SCENE_7 seed; no Created/Last_modified
  columns on Organizations (table uses Postgres defaults)
Brokerage_Agents.credentials: TEXT[] array — use `credentials && ARRAY['ABV','CVA',...]`
  for overlap check, not `credentials = ANY(...)`
```

### Demo Footprint — SCENE_7_BROKERAGE (env tbihmlnqpwdeiethgwaf)

**SEAT LOCATION (locked):** All C2C demo seats live in **PROD** Supabase
(`ptgtliwllimkswtajcmy`), NOT the demo Supabase (`tbihmlnqpwdeiethgwaf`).
C2C authenticates against PROD via `verify_admin_password` RPC — so
broker seats (`demo.mna@`, `demo.mna.assoc@`) must exist as `auth.users`
rows in PROD, with matching `Users.Email`/`Users.Auth_id` rows so the
login route can attach `org_id` to the JWT. Easy regression: seeding
ONLY demo Supabase fails login on c2c.starttoday.biz with "Invalid
credentials." Demo Supabase still hosts the data for the other apps
(hr, lender, etc.) but C2C is PROD-only.

- Brokerage: Midwest M&A Partners, LLC · IL, EIN 88-3392041 · `b7000000-…-001`
- Brokerage org: `d7000000-0000-0000-0000-000000000007`
- Agent A (principal, demo.mna@): Eleanor Kessler · credentials [CBA, CM&AA, M&AMI]
- Agent B (associate, demo.mna.assoc@): Marcus Donnelly · credentials [CVA]
- Password: `StartToday2026!`
- Pipeline: $33.5M AUM across Bowie-Stardust ($14.5M, active), Riverside Precision ($6.8M, under_loi), Lakeshore Logistics ($12.2M, at_close)
- Valuations: 3 certified (STCV-26-04891, -04733, -04201) + 1 draft
- YTD commissions: $420K gross / $357K net across 2 prior closes
- Buyer mandates: 2 active (Apex Industrial roll-up, Great Lakes PE search)
- Active deals linked: 3

### Deployment Manifest Addition
| App | Vercel Project | GitHub Repo | Tier |
|-----|---------------|-------------|------|
| c2c.starttoday.biz | prj_LDUU472KXAlw4B0IHNW0d65S4fUO | Starttodaybiz/C2C | Brokerage Tier (Sprint 7) |


---

## Sprint 7.2 — Start Today Certified Valuation™ PDF generator

### What shipped
| Surface | Route | Status |
|---------|-------|--------|
| Cert PDF document | `components/c2c/StcvCertPdfDocument.jsx` | ✅ |
| PDF render route (PUBLIC) | `GET /api/c2c/brokerage/valuations/[id]/pdf` | ✅ |
| Certify response enrichment | `pdf_url` added to certify route response | ✅ |
| Middleware exception | regex match `^/api/c2c/brokerage/valuations/[^/]+/pdf$` GET only | ✅ |
| Download UI affordance | "⬇ Download cert PDF" + "📋 Copy verify URL" in ValuationDrawer certified state | ✅ |

### Route mechanics
- `runtime = 'nodejs'` (react-pdf needs Node, not Edge)
- Param `[id]` accepts UUID OR cert_number (STCV-YY-NNNNN); UUID-regex check picks the right column
- Joins `Brokerage` (issuing firm) + `Brokerage_Agents` (credentials, signature line)
- Only returns content for `certified=true` rows (404 otherwise)
- Cache-Control: `public, max-age=300`
- Mirrors `CertPdfDocument.jsx` design vocabulary — corner ornaments, DM Serif Display + DM Sans, navy + emerald palette, paper-stock background
- New `StcvSeal()` (Certified Valuation seal) and `ValuationRangeBar()` (low/mid/high visual)

### Test cases — TC-026 to TC-028
| TC | What | Assertion |
|----|------|-----------|
| TC-026 | PDF by UUID | `GET /api/c2c/brokerage/valuations/{uuid}/pdf` → 200 application/pdf |
| TC-027 | PDF by cert_number | `GET /api/c2c/brokerage/valuations/STCV-26-04891/pdf` → 200 application/pdf |
| TC-028 | PDF on uncertified draft | `GET .../{draft_uuid}/pdf` → 404 `cert_not_found` |

---

## Sprint 7.3 — Marketplace surface for businesses-for-sale

### What shipped — marketplace.starttoday.biz (repo `Starttodaybiz/marketplace`, Vercel `prj_BcngpdpBZ6fTr5i20qiyqLHN9UCK`)
| Surface | File | Status |
|---------|------|--------|
| Category type | `business_brokerage` added to `ProviderCategory` union | ✅ |
| Category maps | `PROVIDER_CATEGORY_LABELS`/`_COLORS` (#7C2D12)/`TAKE_RATES` (0.10) | ✅ |
| Browse banner | Gradient banner on `/browse` when `category=business_brokerage` | ✅ |
| Public page | `/listings` + `ListingsClient.tsx` | ✅ |
| Public API | `GET /api/listings` (state + price band + STCV filter) | ✅ |
| Middleware | Both routes added to public-routes allowlist | ✅ |

### DB layer
- `marketplace_providers.category` check constraint extended with `business_brokerage`
- `marketplace_projects.category` same extension (clients can post brokerage RFPs)
- Seeded `marketplace_users` + `marketplace_providers` row for Midwest M&A Partners (slug `midwest-mna-partners`, premium tier, STVerified)
- **NEW FK column**: `Brokerage.marketplace_provider_id UUID REFERENCES marketplace_providers(provider_id)` — explicit link, no more fragile name-matching

### API filtering
`Brokerage_Listings` WHERE `marketplace_listed=true` AND `visibility IN (qualified_buyers, public)` AND `status IN (active, under_loi)`. Joins:
- `Brokerage` (by `Brokerage_id`) → name + marketplace_provider_id
- `marketplace_providers` (by marketplace_provider_id) → slug for deep-link
- `Valuations` (by `Brokerage_engagement_id`, `certified=true`) → STCV badge + cert_number

### Test cases — TC-029 to TC-032
| TC | What | Assertion |
|----|------|-----------|
| TC-029 | Browse business_brokerage | Category pill visible, banner renders on selection |
| TC-029a | API surfaces listing | `GET /api/listings?state=IL` returns Bowie listing |
| TC-030 | STCV badge wiring | Same row has `has_stcv: true`, `stcv_cert_number: STCV-26-04891` |
| TC-031 | NDA-gated label | `visibility=qualified_buyers` row shows "🔒 NDA required for CIM" |
| TC-032 | Brokerage deep-link | `brokerage_slug=midwest-mna-partners` set via explicit FK |

---

## Sprint 7.4 — CARL Brokerage™ persona

### What shipped
| Surface | Source | Status |
|---------|--------|--------|
| Persona route | `POST /api/c2c/brokerage/carl` | ✅ |
| Inline panel | `components/c2c/BrokerageCarlPanel.jsx` | ✅ |
| Listings tab | New "◈ CARL" tab in `ListingDrawer` | ✅ |
| Valuations slot | Panel at bottom of `ValuationDrawer` body | ✅ |
| Mandates per-card | `MandateCard` component w/ "◈ Ask CARL" toggle | ✅ |
| Rate limit | `carl_brokerage_post: 15/min` in `lib/security/rate-limit.js` | ✅ |
| Persona lock | `platform_ontology.CARL_BROKERAGE_PERSONA_V1` | ✅ |

### 5 allowed kinds (server-side enum)
| kind | Context required | What it does |
|------|------------------|--------------|
| `closest_buyers` | `listing_id` | Ranks our active mandates top-3 against this listing |
| `valuation_defense` | `valuation_id` + optional `ask` | Defends the multiple range; can target a specific pushback |
| `comp_transactions` | `listing_id` | Narrates the market for this industry/size profile |
| `mandate_targets` | `mandate_id` | Describes ideal target profile + sourcing strategies |
| `objection_handling` | `listing_id` + `ask` | Buyer-objection response framing |

### Persona constraints (locked in ontology)
- Peer-level M&A advisory voice (25+ years experience); peer to a brokerage user, NOT to buyers or sellers
- Never fabricates comp multiples — widens ranges and says so
- Never opines on legal/tax/securities — points to attorney network
- Output: markdown, 250-word typical / 600-word ceiling, numbered lists preferred
- Visual: `#7C2D12` deep amber, ◈ glyph at 28px, thinking-state animation while in-flight

### Test cases — TC-033 to TC-038
| TC | What | Assertion |
|----|------|-----------|
| TC-033 | CARL invalid kind | `{kind:"foo"}` → 400 `invalid_kind` with allowed-list |
| TC-034 | CARL listing-scoped | `{kind:"closest_buyers", listing_id:…}` returns `{ok:true, response_markdown, persona:"CARL Brokerage™"}` |
| TC-035 | CARL missing context | `{kind:"closest_buyers"}` (no listing_id) → 400 `listing_id_required` |
| TC-036 | CARL not-your-listing | listing_id of another brokerage → 404 `listing_not_found` |
| TC-037 | CARL rate limit | 16th request within 60s → 429 |
| TC-038 | CARL no API key | `ANTHROPIC_API_KEY` unset → 503 `CARL not configured` |

### Cross-section column gotchas (Brokerage Tier + Marketplace + CARL)
```
Brokerage.marketplace_provider_id — new in 7.3; explicit FK for deep-linking
  brokerages to their marketplace provider profile. Always use this, NOT
  firm_name string match — platform stores "Midwest M&A Partners" but
  marketplace stores "Midwest M&A Partners, LLC" so name-match fails silently.

marketplace_providers.category check — extended to include 'business_brokerage'
  in 7.3. Adding a 7th category requires the same ALTER on both
  marketplace_providers AND marketplace_projects (clients can post RFPs).

Public middleware exceptions:
  Marketplace: /listings and /api/listings (no auth)
  C2C: GET /api/c2c/brokerage/valuations/[id]/pdf (regex; method-scoped to GET
    only — POSTs to /compute, /certify, etc still require session)
```

---

## Back-end Org Provisioning — Onboarding Skip Playbook

When a client org is seeded through the back end (bulk SQL/migrations) rather than the live interview/wizard, the provisioned user's **first** Client Dashboard login trips the onboarding gate. This is expected — two rows auto-create on first login — and must be pre-empted as part of seeding.

**The gate** (`app/page.js` → `shouldShowOnboarding`) reads two independent server-side signals; either one firing redirects to `/onboarding`:

| Signal | RPC | Fires when |
|--------|-----|-----------|
| 1 — active interview | `get_active_interview(org, email)` | `has_active = true` (an `onboarding_interview_state` row in status `active`/`in_progress`) |
| 2 — wizard | `get_onboarding_state(email)` | `status != 'completed'` (the 6-step `Onboarding_State` row) |

Both auto-create on first login: `get_onboarding_state` inserts an `in_progress` wizard row, and `InterviewClient.bootstrap` auto-starts an interview when none is active **and** `onboarding-state.completed` is false.

**Canonical fix — one call, idempotent.** Right after inserting the client `Users` row in any back-end provisioning, call:

```sql
select public.seed_onboarding_complete('user@email', '<org_uuid>');
```

It sets `Onboarding_State.status='completed'` (satisfies Signal 2 **and** stops the interview auto-start, because bootstrap sees `onboarding-state.completed=true` and routes straight to the dashboard) and closes any already-created `onboarding_interview_state` row to `complete`.

**Gotchas:**
- `onboarding_interview_state.status` terminal value is **`complete`** (valid set: `active|in_progress|complete|abandoned|guest|claimed`). `Onboarding_State.status` terminal value is **`completed`**. Easy to swap and hit the check constraint.
- Dismissing the wizard alone does **not** pass the gate — `page.js` re-checks `status` independently of `show_onboarding`.
- Both signals must clear; fixing only the wizard still leaves the interview redirect.

Ontology: `platform_ontology` → `BACKEND_ORG_PROVISIONING_ONBOARDING_SKIP_V1`.

### Test case — TC-039
| TC | What | Assertion |
|----|------|-----------|
| TC-039 | Back-end org skip | After `seed_onboarding_complete(email, org)`: `get_onboarding_state(email).show_onboarding=false` AND `get_active_interview(org,email).has_active=false` → dashboard loads with no redirect |

---

## Org Map (client.starttoday.biz / Client-Dashboard) — Layout & Design Constants

Locked 2026-06-12. Ontology: `platform_ontology` → `FRONTEND_CLIENT_DASHBOARD_ORGMAP_TUNING_V1` (full detail + dial meanings).

D3 force-directed org/portfolio map. File `app/components/ClientShell.js`, big D3 useEffect (deps `[fd,vm,rep]`). Final commit `4c451bb`. Deploy: Vercel `prj_Yx534JgZNoDwMqBKsNCSRAiezeFY`, repo `Starttodaybiz/Client-Dashboard`.

| Knob | Value | Where (grep anchor) | What it does |
|------|-------|---------------------|--------------|
| Family anchors | `Lx=W*0.10`, `Rx=W*0.96`, `Cx=W*0.5` | `Lx=W*0.10,Rx=W*0.96` | legal-left / financial-right separation; wider = more center gap |
| Within-cluster gap | `_FAMGAP=248` | `_FAMGAP=248` | radial gap per depth ring |
| Charge spread cap | `2.8` | `_spread=Math.min(2.8,` | `forceManyBody(-rep*_spread)`; higher = nodes pull apart |
| Vertical force | `forceY(fyT).strength(0.022)` ×2 | `forceY(fyT).strength(0.022)` | lower = looser vertical drift (edit BOTH occurrences) |
| Center-stack gravity | `_cRise=H*0.18`, `_cGap=160` | `_cyB=d=>` | non-hull center nodes rise (hub up); stack grows downward; `_cyB` feeds forceY + radial cy |
| Hull margin | `76` | `_hullD(mem,76)` | boundary breathing room |
| Hull smoothing | `curveCatmullRomClosed.alpha(0.8)` | `.alpha(0.8)` | higher = rounder/looser bulge |
| Node↔edge repulsion | `_co=0.45,_cap=34,_mrg=16` | `_mrg=16,_cap=34,_co=0.45` | `edgeoff` force; pushes nodes off non-incident links (samples renderer Bézier) |
| Label treatment | paper halo, no chip | `.attr("stroke","#F5F4F1").attr("stroke-width",4.5)` | `paint-order:stroke` casing on `#0F172A` text; chip rect removed; bbox stash kept for hull |

Notes: hub is in **no** hull (legal = entity/trust-except-hub, financial = investment +entity/trust-except-hub when legal off). `edgeoff` persists on the sim (drag-safe) and is **not** re-added in `reForce`. Label-over-busy-fill fallback = hybrid paper-halo + faint cluster tint (purple `#6D28D9` / teal `#0E7490`). Palette: navy `#1E3A5F`, paper `#F5F4F1`, teal `#0E7490`, purple `#6D28D9`, ink `#0F172A`, orange ring `~#E07B39`.

### Deployment Manifest Addition
| App | Vercel Project | GitHub Repo | Tier |
|-----|---------------|-------------|------|
| client.starttoday.biz | prj_Yx534JgZNoDwMqBKsNCSRAiezeFY | Starttodaybiz/Client-Dashboard | Client Tier |

## Finance App — finance.starttoday.biz · Certified CFO Workbench (Sessions 2026-06-12/13)

Locked 2026-06-13. Repo `Starttodaybiz/finance` · Vercel `prj_etyUAsXqQD6aqD8kmeU3rfE6TxeD` · Next.js 14.2.29 / node24 · main UI `components/FinanceShell.js`. SSO via `app/auth/launch/route.js` (shared `LAUNCH_TOKEN_SECRET`, `st_auth` cookie); org resolved by `get_org_id_for_email`. Final commits `d978ff3` (CFO + Debt), `5e82e07` (Real Estate + Estate + PFS).

**Design spine (locked):** "One engine, two lenses" — finance = deep inputs/planning workbench; client (`Client-Dashboard`, `prj_Yx534JgZNoDwMqBKsNCSRAiezeFY`) = 3000-ft certified read that SSO deep-links into finance via `POST /api/launch/finance` → `finance.starttoday.biz/auth/launch?token=…&next=<tab>` (whitelisted lowercase tab → `/dashboard?tab=`). Every figure derives from the client's own assumptions + a cited method, written to `Verified_Calc_Results` (provenance) keyed against `Calc_Library` (method registry). Compliance posture: education-not-advice, persistent not-advice disclaimers, "Start Today Certified Calculation™". Detail views = centered modals (max-w 720, rounded 14, dark backdrop) — never right-slide shelves.

### Modules — nav key · route · primary RPC (all SECURITY DEFINER, search_path public,extensions; grant authenticated,service_role)
| Nav key | Label | Route | Read RPC | Compute RPC(s) |
|---------|-------|-------|----------|----------------|
| clients | Client Portfolio | (in-shell) | — | — |
| cfo | CFO Dashboard | /api/cfo | `get_finance_cfo` | (composes the others) |
| investments | Investments | /api/investments | `get_finance_investments` | `compute_investment_valuation_run`, `compute_fund_deployment`, `compute_exit_tax` |
| tax | Tax Planning | /api/tax | `get_finance_tax` | `compute_tax_planning_run`, `fn_fed_ordinary_tax` |
| equity | Cap Table + Raise | /api/captable | `get_finance_equity` | `compute_capital_raise` |
| operating | Operating Model | /api/operating | `get_finance_operating` | `compute_operating_dcf` |
| debt | Debt & Loans | /api/debt | `get_finance_debt` | (amortization inline) |
| realestate | Real Estate | /api/realestate | `get_finance_realestate` | — |
| estate | Estate & Gifting | /api/estate | `get_finance_estate` | — |
| pfs | Personal Financials | /api/pfs | `get_finance_pfs` | — |
| (client lens) | Certified read | /api/investments/valuation | `get_client_investment_summary` | — |

### Calc_Library methods added (calc_key)
`vc_method_blended_ev` (IPEV/AICPA/ASC820), `qsbs_1202_exit_tax` (IRC §1202), `entity_structure_tax_compare` (IRC §199A/§1402/§11/§1411; 35 ILCS 5/201), `priced_round_dilution` (NVCA/SAFE), `operating_dcf_fcff` (ASC 820 income approach), `loan_amortization_dscr` (SBA SOP 50 10).

### Tables created (finance)
`investment_valuation_runs`, `investment_valuation_scenarios`, `portfolio_scenarios`, `portfolio_scenario_lines`, view `vw_portfolio_scenario_totals`, `fund_cohorts`, `fund_deployment_periods`, view `vw_fund_deployment_summary`, `investment_exit_tax_scenarios`, `tax_rate_config` (transparent 2025 statutory constants — nothing hardcoded in logic), `tax_planning_runs`, `tax_structure_results`, `capital_raise_scenarios`, `operating_model_runs`. Provenance/registry reused: `Verified_Calc_Results`, `Calc_Library`.

### Calibration tie-outs (regression anchors) — 10X org `e10b0000-0000-4000-a000-0000000000a0`
- **CFO Total EV = $89,426,753.77** = portfolio stake $78,506,127.44 + operating DCF $10,920,626.33 (must tie to the dollar).
- Portfolio EV base $148,204,561.42 across 6 holdings; QSBS §1202 benefit $14,143,124.77; fund AUM $260M (deployed $234M).
- Tax (on $400k net example): S-corp recommended total **$106,050.66**, savings_vs_max **$52,756.89** (sole-prop $106,227, c-corp $158,808).
- Cap table: 10XBeta Venture Studio LLC, FD **6,666,667** units, founders 90% / pool 10%. Raise $5M @ $20M pre → PPS **$2.916667**, investor 20%; SAFE converts at **$2.3333** for 428,571 sh.
- Debt: 220 S. Madison $4.5M @ 6.5% / 300mo → monthly **$30,384.32**, annual DS **$364,611.87**, total interest **$4,615,296.68**, **DSCR 1.91x** (NOI $696,332), +0.66x headroom vs 1.25x covenant.
- Real estate: 220 Madison value $6.5M, acq $1.2M, appreciation $5.3M, **equity $2.0M** (value − $4.5M debt), est tax $96K.
- Estate: lifetime exemption **$13,990,000/individual (2025)**, annual exclusion $19,000. Jason used $500K (rem $13.49M); Michael $750K (rem $13.24M) — exemption counted only on `"709 Filed?"='Yes'` gifts.
- PFS: combined net worth **$23,182,000** ($24,492,000 assets − $1,310,000 liab), 2 guarantors (SBA Form 413 categories).

### Column gotchas (finance — registry of bugs hit)
- `Loans."Term (months)"` is **TEXT** → cast `nullif(regexp_replace(col,'[^0-9.]','','g'),'')::numeric`. `Amount` / `Interest Rate (%)` / `Current_balance` ARE numeric.
- Airtable mixed-case PK columns are **case-sensitive**: `"Properties_id"`, `"Property_taxes_id"`, `"Estate_plans_id"`, `"Gifting_and_lifetime_transfers_id"`, `"Trust_profiles_id"` — MUST quote in INSERT or Postgres folds to lowercase → `column "properties_id" does not exist`. (`pfs_id` is already lowercase.)
- Text-typed money/score cols to parse: `Gifting."Asset / Amount"`, `Property_Taxes."Assessed Value"`/`"Estimated Tax"`/`"Mill Rate / Levy"`/`"Tax Year"`, `Estate_Plans."Estate Plan Readiness Score (Formula)"`, `Properties."Square Feet"`/`"Units"`/`"Year Built"`.
- `st_cfo_snapshots` has **NO org_id** (scenario/scene-keyed) — not used. DSCR/NOI come from `st_dscr_snapshots` (cols: snapshot_id, org_id, period, noi, total_debt_service, dscr_value, dscr_status, plaid_sourced, stverify_eligible, computed_at).
- `Start_Score` is org-scoped but 10X has no row → CFO `score` returns null (graceful — don't assume present).
- `execute_sql` returns only the LAST statement's result — run single queries when you need a specific row back.

### Seed footprint (10X demo)
`Loans` LN-220MAD; `Properties` "220 S. Madison" + `Property_Taxes` 2025; `Estate_Plans` EP-JW-001 / EP-MJS-001; `Trust_Profiles` Walker / Schirger Family Revocable Trust; `Gifting_and_Lifetime_Transfers` GFT-001…004; `st_personal_financial_statements` ×2 (Jason, Michael); `st_dscr_snapshots` (220 Madison, DSCR 1.91, stverify_eligible).

### Deploy learning (CRITICAL — reconfirmed)
Vercel BLOCKS any deploy whose git commit-author email isn't a recognized GitHub account (state BLOCKED, zero build events — NOT spend/concurrency). All finance commits use `git -c user.email="Starttodaybiz@users.noreply.github.com" -c user.name="Starttodaybiz"`. Per-change loop: edit → `npx esbuild components/FinanceShell.js --loader:.js=jsx --outfile=/dev/null` (expect parse=0) → commit (recognized email) → push `HEAD:main` → sleep ~95 → `list_deployments` confirm top `githubCommitSha` + `state=READY` (`lambdaRuntimeStats nodejs:N` confirms full build).

### Deployment Manifest Addition
| App | Vercel Project | GitHub Repo | Tier |
|-----|---------------|-------------|------|
| finance.starttoday.biz | prj_etyUAsXqQD6aqD8kmeU3rfE6TxeD | Starttodaybiz/finance | Finance / CFO Tier |
