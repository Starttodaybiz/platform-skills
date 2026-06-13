# Ecosystem IDOR / Data-Scoping Sweep — 2026-06-12

Full-ecosystem leak sweep triggered by a request to find cross-tenant exposure
"anywhere else." Headline result: **no cross-tenant leak existed in the DB RPC
layer** — every sensitive RPC is bounded to the caller's org or entity grants.
All confirmed cross-tenant exposure lived in the **app-route layer**, where
routes trusted identity/ids from the query string instead of the session. Those
are now closed. The pattern only began surfacing as apps were exercised as
different users.

## New DB primitives (all SECURITY DEFINER, search_path=public)

- `can_access_record(p_user_email, p_kind, p_id)` — kinds: entity | employee |
  property | contact | org. True if the caller's entity grants cover the record
  (or platform_operator). The client-portal IDOR gate.
- `is_platform_user(p_user_email)` — Users.user_class = 'platform_operator'.
- `can_professional_access_org(p_user_email, p_org_id)` /
  `can_professional_access_entity(p_user_email, p_entity_id)` — true if the
  professional (attorney/HR pro) holds an ACTIVE `Professional_Assignments` row
  for that org (Contact resolved via Contacts.Email OR Users.Contact_id), or is
  platform. Used by attorney-dashboard + prohr.
- `get_professional_entity_ids(p_user_email)` — entities in the professional's
  assigned orgs (for "all my matters" list scoping).
- `st_staff_roles` table + `is_compliance_staff()`, `get_staff_role()`,
  `staff_role_at_least(email, min)` (analyst<manager<admin). Internal back-office
  staff model. Seeded: bwalker=analyst, wschirger=manager, j=admin.

Client-Dashboard `lib/auth.js` gained `requireRecordAccess(request, kind, id)`
returning `{ok, response}` — drop-in gate built on `can_access_record`.

## Fixed + deployed (cross-tenant IDORs closed)

- **Client-Dashboard** `/api/data` — (1) identity read from `?email=` (cookie
  fallback) → impersonation of any user's dashboard; (2) detail tabs
  (entity/employee/property/owner) took a client id with no entitlement check.
  Fixed: identity is session-authoritative (platform-only `?email=` override) +
  `can_access_record` gate on every detail id. Then 10 more id/org routes gated
  (hr, score-report, score-history, gamification, pillar-checklist, score-health
  +/cxi, data-state, professionals, auto-assign). w9/prefill already enforced
  org ownership; shared/* is intentional token-gated public; notifications-prefs
  is caller-email scoped.
- **accounting** `/api/data` — `?email=` impersonation exposing financial
  statements. Session-authoritative now (orgId already session-derived).
- **property** `/api/data` — `?email=` impersonation (properties/entities/deals/
  UCCs/loans/financials) + ungated `property_detail`. Both closed.
- **attorney-dashboard** (multi-professional portal) — `hr-matters` returned ALL
  orgs' HR-sourced matters with no org_id and never decoded the session;
  `sba504-closing` + opinion exposed/mutated any matter's SBA loan data by id.
  Now scoped to the professional's assigned clients (platform sees all).
- **prohr** (HR-pro portal) — pro/audit + pro/handbook GET defaulted to ALL
  orgs; pro/audit/handbook accepted any org_id. Gated via
  `can_professional_access_org`; no-org default returns empty for professionals.
- **compliance-User** (back-office staff portal) — login now requires a staff
  role (st_staff_roles) in production; staff_role carried in the session JWT
  through the MFA flow. Demo sessions exempt (sandboxed). Closes the cross-
  account view to non-staff at the door.

## Swept clean (no change needed)

bank, lender, HR, employee, Client-EP, insure, Brokers — all scope identity/org
from the **session**. C2C built its own `assertEntityAccess()` and uses it on
sensitive routes (e.g. corporate-books).

## Open follow-ups (precise)

1. **attorney `invoice/pdf`** — still reads `?email=` → get_invoice_pdf_data.
   Make identity session-authoritative (platform-only override).
2. **prohr `hr-pro-data` edge function** — the `pro` route now forwards
   `pro_email`; the edge fn must scope the portfolio section to assigned orgs
   (currently may return all). Edge-side change.
3. **compliance-User**: confirm whether `compliance@starttoday.biz` (a
   service_account) is ever an interactive login — if so add to st_staff_roles.
   Provision `bwalker@starttoday.biz` login (role already seeded). The
   admin↔manager capability boundary applies to **Admin-User** (account/role
   management), not compliance-User — wire `staff_role_at_least('admin')` there.
4. **Org-broad report class** (latent — correct for today's full-owner users,
   over-shares only under partial grants/providers):
   - `get_succession_plan_report` — **BROKEN independent of security**: references
     dropped columns (Entity_id/Plan_type/Status/Effective_date/Review_date/
     Successor_name/Created_at). Real schema: `Business_Succession_Plans` has
     "Entity (Operating Company) (Link)","Agreement Type","Triggers","Valuation
     Method","Funding Mechanism","Counterparties (Links)","Policy Links (Links)".
     Rebuild against current schema, THEN scope to
     `get_user_accessible_entity_ids`. (Restored verbatim for now.)
   - `get_trust_register_report`, `get_kyc_aml_report` — entity linkage is by
     **text name** (Trust_Profiles."Trust (Entity by legal name)",
     KYC_Profiles."Entity" = legal name), not uuid. Clean entity-grant scoping
     needs uuid-FK normalization first; silo-gating (wealth/kyc) risks breaking
     owners who lack the silo. Currently org-scoped (bounded to caller org).
   - ~36 "home-org" reports (financial_statements, equity_ledger,
     shareholder_register, lease_register, property_tax_summary, etc.) —
     `WHERE org_id = v_org_id`. Correct for full owners; tighten to entity+silo
     when the partial-grant/provider model goes live. Mechanical batch.
5. **Apps not yet route-swept** (lower-risk/specialized): chamber, work, plan,
   mga, sales, marketplace, mylegal, carl, stverify, platform-admin, admin-user,
   plus non-`/data` subroutes of apps already touched.

## Pattern to apply going forward

Identity ALWAYS from the verified session cookie; `?email=`/`?org_id=` honored
only for platform operators. Any route that takes an entity/employee/property/
contact/org/loan id from the client must call the matching entitlement primitive
(`can_access_record` for client portals, `can_professional_access_*` for
professional portals, `is_compliance_staff`/`staff_role_at_least` for back-office)
before returning or mutating the record. "All orgs when no filter is passed" is
the recurring leak shape — default to the caller's scope, never to everything.
