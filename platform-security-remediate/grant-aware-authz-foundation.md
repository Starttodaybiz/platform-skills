# Grant-Aware Multi-Party Authorization — Foundation (landed 2026-06-13)

Canonical record of the platform's multi-party access-control foundation: the resolver, capability
matrix, expansive logging, grant-aware RLS policies, and the repeatable parity/negative test harness.
Built to support three operator types against any client org's data — **Platform** (in-house team),
**Provider** (outside CPA/Law firm), **Client** (the org's own people) — with silo-level data gating.

Prod project `ptgtliwllimkswtajcmy`. All objects in `public`. **This phase is DB-layer only and additive
— the running apps still connect via service-role (which bypasses RLS), so nothing changed behavior.**

## Why this exists / what was found
- RLS is enabled platform-wide (1,265 / 1,346 tables) BUT the policy layer was an inconsistent patchwork
  of 5 patterns, three of which gave no real tenant isolation under authenticated access:
  - **A** `org_id = current_setting('app.current_org_id')` (GUC, single-org, app-asserted) — ~15 tables.
  - **B** `org_id = jwt_org_id()` (single-org from token) — Users, Organizations.
  - **C** service-role-only (`auth.role()='service_role'`) — incl. PFS, Verified_Calc_Results (deny under real login).
  - **D** `authenticated USING (true)` — **wide open to any logged-in user** — all 8 session-created finance tables.
  - **E** RLS on, no policy (deny-all under non-bypass) — Investments.
- None implemented the multi-party grant model. Finance + accounting connect with the **service-role key**,
  bypassing all of it; tenant isolation rested entirely on app code, and finance routes took `org_id` from
  the query string with no entitlement check (latent IDOR). The grant data already existed and was unused.

## Existing substrate this builds on (do not reinvent)
- `G_Security_access_scope` = **Client | Platform | Provider** (the three operator types).
- `G_Security_ranks` = Platform Admin `62644239-…` | Provider Admin `0be71cfd-…` | Client Admin `862abb93-…` | Client `a1b2c3d4-…0001`.
- `Users` — home identity: `org_id` (home org), `"Org (Employer)"`, `user_class` (`platform_operator`=internal), `G_Security_rank_id`, `"Is Active?"`, `Email`.
- `Role_Assignments` — **text-name** grants (`"User"`=email, `"Client (Org)"`/`"Scope Organization"`=org NAME, `"Scope Type"`, `"Role"`, `"Active?"`). Resolve org name→id via `Organizations."Organization Name"`.
- `User_Entity_Access` — entity-grained, **time-boxed** (`expires_at`), `Security_access_scope_id`; bridge `entity_id`→`Entities."Entities_id"`→`Entities.org_id`.

## What was built (migrations, in order)
1. **`st_role_capability`** — capability matrix: (scope, role_key) → silos `{accounting,capital,wealth}` + caps
   (view/edit/certify/efile/export/manage_users). 11 roles seeded. Wealth = owner/platform only.
2. **`app_principal_email()`** — identity from `request.jwt.claims.email` (PostgREST authenticated) or
   `current_setting('app.principal_email')` (trusted server context). Lowercased/trimmed.
3. **`app_normalize_role(scope, role_text)`** — maps legacy Role_Assignments text → canonical role_key.
4. **`app_resolve_access(email, org)` → jsonb** — most-permissive active grant across 4 sources, priority:
   (1) Platform/internal → any org, (2) explicit Role_Assignment (name-matched), (3) home-org member,
   (4) time-boxed entity grant. Returns `{has_access, scope, role_key, silos, capabilities, source, expires_at}`.
   SECURITY DEFINER, STABLE.
5. **`app_can_access(org, silo)` → boolean** — the single primitive used by BOTH RLS policies and the app
   layer. Deny-by-default. Reads identity via `app_principal_email()`.
6. **Logging (expansive):**
   - `st_access_log` — every authz decision (principal, scope, role, target_org/entity, silo, action,
     resource, decision allow/deny, reason, app, request_id, ip, ua, latency, meta). Append-only.
   - `st_usage_event` — product telemetry (event_type page_view/tab_open/modal_open/calc_run/cert_issued/
     export/search/switch/login…, props jsonb GIN-indexed) for ecosystem analytics. Append-only.
   - Writers `log_access(...)`, `log_usage(...)` (SECURITY DEFINER; called once per request by the app layer,
     NEVER inside RLS — policies are per-row).
7. **P0 — closed the 8 open `USING(true)` finance policies** → grant-gated on the Capital silo.
8. **Grant-aware `authenticated` policies added ADDITIVELY** (existing policies untouched → OR'd → running
   apps unaffected) across all finance/accounting sensitive tables:
   - capital: Investments, Loans, Properties, Property_Taxes, st_dscr_snapshots, Equity_classes, Share_Issuances + the 8 session tables.
   - wealth: Estate_Plans, Estate_Assets_and_Titling, Estate_Beneficiaries, Gifting_and_Lifetime_Transfers, Trust_Profiles, st_personal_financial_statements.
   - accounting: Financial_Statements, Fixed_assets, State_Tax_Filing_Obligations, st_tax_ytd, st_tax_estimates.
   - provenance: Verified_Calc_Results (any active org grant). Child tables w/o org_id gate via parent (e.g. tax_structure_results→tax_planning_runs.run_id).

## Test harness — run after EVERY change
`select * from public.run_access_parity_tests();`  → 15 cases, all must `pass=true`. Covers platform breadth,
owner same-spot, cross-tenant deny (×2), silo deny (×2 — bookkeeper blocked from capital+wealth), stranger/empty deny.
Test fixtures (removable): `10xbeta@starttoday.biz` (Client Admin→client_owner on 10X), `bookkeeper.test@10xbeta.example`
(TEST bookkeeper, accounting-only, no Auth_id so cannot log in), `j@starttoday.biz` (platform_operator).

### Parity proof captured (service-role baseline vs new authenticated/RLS path), 10X org:
| Principal | Capital (Loans,raises,inv,certs) | Wealth (pfs,estate,trusts,gifts) |
|---|---|---|
| baseline (service-role, today) | 1,1,7,22 | 2,2,2,4 |
| owner (new path) | 1,1,7,22 ✓ | 2,2,2,4 ✓ |
| bookkeeper (new path) | accounting only | **0,0,0,0** (wealth blocked) ✓ |
| stranger (new path) | 0,0,0,0 | 0,0,0,0 ✓ |

## REMAINING (not yet done — gated, do with care + run harness after each)
- **App-layer cutover** (the part that makes RLS actually engage in prod): connect finance + accounting as the
  **authenticated user** (mint a Supabase-signed JWT carrying `email` claim; needs `SUPABASE_JWT_SECRET` in each
  app's Vercel env), per-request `app_can_access` guard, and a transitional bridge `set_config('app.current_org_id', <verified org>, true)` so legacy Pattern-A tables keep working during migration. Wire `log_access`/`log_usage`.
- **SECURITY DEFINER RPC guards** — `get_finance_*` / `compute_*` / `get_financial_statements` bypass RLS by design;
  add `app_can_access` as the first statement (with backward-compat: allow when no principal asserted = current trusted
  service path, enforce once identity present). Remove the trusted-bypass path once cutover is complete.
- **Legacy policy cleanup** — once cutover verified, migrate Pattern A/B/C tables fully onto `app_can_access` and
  drop the GUC/service-only policies. Requires cross-app impact analysis first (other apps may rely on the
  `app.current_org_id` GUC pattern).
- **Provider/CPA-firm org type** — add alongside existing "Law Firm" (or generalize to "Professional Firm").
- Per-user capability overrides (day-one requirement) — layer onto `Permissions JSON` with a role→default matrix.

## Rollout safety rule
Nothing in production flips until the resolver + harness exist (they now do). Cut over ONE app first behind a flag,
run `run_access_parity_tests()` + manual RLS role-switch parity, then the second. Never issue an external
(Provider) credential before the cutover + negative tests pass on that surface.
