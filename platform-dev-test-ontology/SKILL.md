---
name: platform-dev-test-ontology
description: >-
  Comprehensive development test framework, ontology, and regression suite for the Start Today™ platform. Use this skill whenever starting a new feature sprint, running regression tests, defining test cases for new functionality, auditing the platform schema, checking what exists before building, or establishing what "done" means for any feature. Triggers on: "what tables exist for X", "has this been built before", "define done for this feature", "run regression tests", "add this to the test ontology", "what should I test", "what's the schema for", "check if this feature is already built", "define the test cases for". This skill prevents duplicate work, catches regressions, and keeps the development ontology current.
---

# Start Today™ Platform Dev Test Ontology

Last updated: Mar 28 2026 — all FF Log A + B items complete.

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

