# Report Template Reference

Canonical finding descriptions, risk statements, and remediation guidance for
all three parts of the Start Today™ Security Audit. Use this as the source of
truth for finding text when generating the Word document. Do not paraphrase
these descriptions — use them verbatim, substituting live counts and file paths
gathered in Step 1.

---

## TABLE OF CONTENTS
1. Cover & document metadata
2. Part 1 — Database finding descriptions
3. Part 1 — Auth & MFA finding descriptions
4. Part 1 — Infrastructure finding descriptions
5. Part 2 — Source code finding descriptions
6. Part 2 — Code quality observations
7. Part 3 — SOC 2 finding descriptions
8. Remediation roadmap items (all three priorities)

---

## 1. Cover & Document Metadata

| Field | Value |
|-------|-------|
| Audit Date | [date of audit run] |
| Auditor | Automated live system scan + manual code review of all repositories |
| Project ID | Supabase: ptgtliwllimkswtajcmy (Start Today Live, us-east-1) |
| Scope | Supabase database • 6 Vercel applications • 8 GitHub repositories • 28 edge functions |
| Classification | Confidential — Internal Use Only |
| Audit Status | OPEN — Findings Require Review & Remediation Action |

Report structure callout text:
> This initial security and code quality audit covers the complete Start
> Today™ technology stack. All data was collected live from the production
> Supabase database, deployed Vercel applications, and current GitHub source
> code at the time of this audit. No changes were made to any system during
> this audit. Report is structured in three parts: Part 1: Master Security &
> Code Quality Audit (Database + Infrastructure) / Part 2: Source Code Security
> Audit Addendum (Application-level findings) / Part 3: SOC 2 Certification
> Assessment & Gap Analysis

---

## 2. Part 1 — Database Finding Descriptions

### rls_disabled_in_public — CRITICAL
**Risk:** These tables are fully exposed via the PostgREST API with no row-level
access control. Any authenticated user — or unauthenticated user if using the
anon key — can read and potentially write all rows across all organizations.
This is the most severe finding in the audit.

**Affected:** Tables spanning entities, compliance items, HR data, financials,
documents, contacts, registrations, and more.

**Remediation:** Enable RLS immediately:
`ALTER TABLE public."TableName" ENABLE ROW LEVEL SECURITY;`
Then add appropriate SELECT/INSERT/UPDATE/DELETE policies using the
`_user_org_id()` and `_is_platform_admin()` helper functions.

---

### rls_enabled_no_policy — CRITICAL
**Risk:** RLS is enabled on these tables but no policies exist. ALL access is
implicitly denied — including for legitimate users. These tables are completely
inaccessible via PostgREST, causing silent failures throughout the application.

**Remediation:** Add appropriate RLS policies to each table. Use the existing
User_Entity_Access pattern for entity-scoped access, and `_is_platform_admin()`
for admin-only tables.

---

### function_search_path_mutable — HIGH
**Risk:** Functions without a fixed search_path can be exploited via search path
injection. An attacker with ability to create objects in any schema could shadow
standard functions or tables, causing the function to operate on malicious data.

**Remediation:**
`ALTER FUNCTION public.function_name(...) SET search_path = public;`

---

### security_definer_view — HIGH
**Risk:** Views using SECURITY DEFINER semantics execute as the view owner
(typically postgres/superuser) rather than the calling user, effectively
bypassing RLS on all underlying tables. Any user who can query the view sees
all rows regardless of their RLS policies.

**Remediation:**
`CREATE OR REPLACE VIEW view_name WITH (security_invoker = true) AS ...`

---

### rls_policy_always_true — MEDIUM
**Risk:** Policies using `USING (true)` grant access to all rows for every
authenticated user regardless of organization, role, or entity access level.
This negates the purpose of RLS.

**Affected tables:** [insert from live SQL query — G_ prefix tables, Platform_Settings,
entity_start_scores_table, etc.]

**Note:** G_ prefix lookup tables (G_Matter_Types, G_Matter_Statuses, etc.) and
Platform_Settings/Platform_Theme_Config may be intentionally public — verify
intent before changing. entity_start_scores_table warrants closer review as it
contains per-entity scoring data.

**Remediation:** For intentional public lookups, add an explicit comment
confirming intent. For entity_start_scores_table, replace open policies with a
single policy scoped to the user's accessible entities via User_Entity_Access.

---

### sensitive_columns_exposed — MEDIUM
**Risk:** A column containing sensitive data is accessible without appropriate
access controls, violating the principle of least privilege.

**Remediation:** Add a column-level RLS policy or remove the column from the
view/API surface.

---

### auth_leaked_password_protection — MEDIUM
**Risk:** The HaveIBeenPwned password check is disabled in Supabase Auth
settings. Users can set passwords known to be compromised, significantly
increasing vulnerability to credential-stuffing attacks.

**Remediation:** Supabase Dashboard → Authentication → Providers → Email →
enable "Protect against leaked passwords."

---

### extension_in_public — LOW
**Risk:** pg_net in the public schema has network egress capability accessible
to any role with USAGE on public. Best practice is a dedicated extensions schema.

**Constraint:** pg_net is a Supabase-managed system extension. Supabase may not
support relocation. Confirm with Supabase support.

**Remediation:** Confirm with Supabase support. If not moveable, document
acceptance. Ensure no user-written functions call `net.http_post()` with
sensitive data payloads.

---

### MFA Enrollment Gap — CRITICAL (when <100% enrolled)
**Evidence:** `SELECT COUNT(DISTINCT user_id) FROM auth.mfa_factors WHERE
status='verified'` → [N enrolled]. `SELECT COUNT(*) FROM auth.users WHERE
deleted_at IS NULL` → [total] users. [total - N] users have ZERO MFA factor.

**Context:** All 6 applications have MFA infrastructure deployed. The code-level
enforcement is present — login routes issue setup cookies, middleware enforces
/mfa-enroll redirect, pages exist. However the database confirms only [N] users
have actually completed enrollment.

**Risk:** The [unenrolled count] unenrolled users will be forced through
/mfa-enroll on next login. Until they complete enrollment and activate a TOTP
factor in auth.mfa_factors, their accounts are protected only by password. A
compromised password for any unenrolled user yields full account access.

**Impact:** Applies to all roles: clients, attorneys, compliance users, admins.
Whoever has not logged in since MFA enforcement was deployed remains
password-only.

**Remediation:** Conduct a force re-enrollment sweep: notify all unenrolled
users and direct them to log in. Monitor auth.mfa_factors until all users show
a verified TOTP factor. Do not launch publicly until admin and attorney accounts
are fully enrolled.

---

### send-magic-link Edge Function Active — MEDIUM
**Evidence:** Edge function slug: send-magic-link, status: ACTIVE, verify_jwt: true.

**Risk:** Magic link routes have been removed from application codebases but the
underlying Supabase Edge Function remains deployed. Any authenticated user who
knows the endpoint URL can trigger a magic link send. Depending on the function's
internal logic, this could generate unauthenticated login tokens, bypassing the
password + MFA login flow for the target account.

**Remediation:** If magic link login has been retired, delete this edge function
from the Supabase project immediately.

---

## 3. Part 1 — Auth & MFA Finding Descriptions

### requireSession() No JWT Verification — HIGH
**Location:** `app/api/admin/route.js` — shared helper used by all admin/* routes.

**Code:**
```js
export function requireSession(request) {
  const cookie = request.cookies.get('pa_admin_session')?.value;
  if (!cookie) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  return null;
}
```

**Risk:** This helper checks only that the pa_admin_session cookie exists and
has a value. It does NOT call jwtVerify() to validate the JWT signature, expiry,
or payload. A manually crafted cookie with any non-empty value passes
authentication. A forged, expired, or tampered token grants access to all [N]
admin routes.

**Contrast:** The middleware.js for platform-admin correctly calls jwtVerify()
with the secret. The per-route requireSession() gap means a direct API call
bypassing middleware is not JWT-validated.

**Remediation:** Import and call jwtVerify() from jose with ADMIN_JWT_SECRET.
Reject any request where the JWT signature fails or has expired.

---

## 4. Part 1 — Infrastructure Finding Descriptions

### Security Headers — MEDIUM (per-app)

**platform-admin:** Full suite deployed — X-Frame-Options: SAMEORIGIN,
X-Content-Type-Options: nosniff, Referrer-Policy, HSTS, Permissions-Policy. ✅

**attorney-dashboard:** Full suite deployed — CSP frame-ancestors * (intentional
for iframe embedding), X-Content-Type-Options, Referrer-Policy, HSTS,
Permissions-Policy. X-Frame-Options intentionally omitted (conflicts with
frame-ancestors). ✅

**Client-Dashboard:** X-Content-Type-Options present. X-Frame-Options set to
ALLOWALL (invalid value — not a W3C specification value; valid values are DENY
and SAMEORIGIN only). No HSTS. No Referrer-Policy. No Permissions-Policy. ⚠️

**compliance-User:** Only Synthesia CSP frame-src. No HSTS, no
X-Content-Type-Options, no Referrer-Policy, no Permissions-Policy. ❌

**Admin-User:** No security headers configured. ❌

**Client-EP:** No security headers configured. ❌

**Remediation for missing apps:** Add to next.config.js:
```js
{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
```
Remove X-Frame-Options: ALLOWALL from Client-Dashboard and rely on existing
CSP frame-ancestors * header.

### Vercel WAF Not Configured — MEDIUM
No Vercel Firewall rules are configured. Rate limiting on auth endpoints is not
enforced at the edge. Brute-force protection relies entirely on application-level
logic. No IP allowlisting on Supabase or Vercel admin consoles.

**Remediation:** Configure Vercel Firewall rules with rate limiting on
/api/auth/login across all 6 apps. Consider IP allowlisting for the Supabase
dashboard.

---

## 5. Part 2 — Source Code Finding Descriptions

### onboard/route.js Unprotected — HIGH (attorney-dashboard)
**Location:** `app/api/onboard/route.js`
**Access:** No session guard. Uses SUPABASE_SERVICE_ROLE_KEY internally. 60-second
Vercel Pro timeout budget.
**Exposure:** Processes bulk estate plan documents with the service role key.
Any caller can submit documents for processing and extraction without
authentication.
**Remediation:** Add JWT auth guard checking st_auth cookie.

### onboard/commit/route.js Unprotected — HIGH (attorney-dashboard)
**Location:** `app/api/onboard/commit/route.js`
**Access:** No session guard.
**Exposure:** Writes onboarded plan data to Supabase without authentication.
**Remediation:** Add JWT auth guard checking st_auth cookie.

### templates/process/route.js Unprotected — HIGH (attorney-dashboard)
**Location:** `app/api/templates/process/route.js`
**Access:** No session guard. Uses SUPABASE_SERVICE_ROLE_KEY.
**Exposure:** Receives a DOCX, calls Claude API to parse, uses service role key
for database operations.
**Remediation:** Add JWT auth guard checking st_auth cookie.

### documents/process/route.js Unprotected — HIGH (Client-EP)
**Location:** `app/api/documents/process/route.js`
**Access:** No session guard. Uses SUPABASE_SERVICE_ROLE_KEY.
**Exposure:** Receives a DOCX file, calls Claude API to classify and parse
document sections, uploads to Supabase Storage, writes structured estate plan
data. Hardcodes "mjs@mjs.law" as the `p_user_email` parameter to the
get_firm_integration_creds RPC. Any caller can upload documents and have them
processed and stored using service role credentials.
**Remediation:** Add JWT auth guard checking ep_session cookie. Replace
hardcoded email with authenticated user's email from the JWT payload.

### Multiple Unprotected Routes — HIGH (attorney-dashboard)
Additional routes lacking session guards:
- `app/api/invoice/pdf/route.js` — generates invoice PDF
- `app/api/report/pdf/route.js` — generates PDF reports
- `app/api/messages/attachment/route.js` — returns attachment data
- `app/api/integrations/ms365/auth/route.js` — MS365 OAuth callback
- `app/api/integrations/ms365/files/route.js` — returns MS365 file listings
- `app/api/esign/status/route.js` — returns eSign status

**Remediation:** Add JWT auth guard checking st_auth cookie to each route.

### Middleware-Only Route Protection — MEDIUM (client apps)
**Client-Dashboard:** 4 data routes (data, catalog, upload-logo, send-message)
have no per-route auth guards. Rely on middleware only.

**compliance-User:** 7 data routes (entities, orgs, client-health, documents,
training-videos, audit-log, work-items) have no per-route auth guards.

**Risk:** Middleware-only protection means a single middleware misconfiguration
or matcher gap exposes all routes simultaneously. Per-route guards provide
defense-in-depth.

**Remediation:** Add session validation at the start of each data route handler.

---

## 6. Part 2 — PII Finding Descriptions

### admin-user PlatformOpsV3.jsx — HIGH (52+ instances)
**File:** `components/PlatformOpsV3.jsx`
**PII Found:** Full user roster with emails: Jason K. (j@starttoday.biz),
Michael Schirger (mjs@starttoday.biz), Peter Provenzano (peter@supplycore.com,
(815) 555-0100), Jeff Fahrenwald (jeff@supplycore.com, (815) 555-0101), Rusty
Pugh, Sarah Essex; Attorney roster: Joseph Walker (jwalker@mjs.law), Michael
Schirger (mjs@mjs.law), Matt Schirger (mschirger@mjs.law); KYC/AML screening
data — OFAC/PEP screening results for named individuals with completion dates;
Failed login details tied to specific email addresses with timestamps; FinCEN ID
completion status per named individual.
**Risk:** Data is embedded in JS bundle files served to authenticated clients.
Cannot be selectively restricted. Any user who loads the page receives the
complete user roster, KYC screening status, login patterns, and compliance data
for real individuals.
**Remediation:** Replace all hardcoded personnel data with API calls to Supabase
RPCs that return only records the authenticated user is authorized to see.

### Client-EP EstatePlanApp.jsx — MEDIUM (10 instances)
**Files:** `app/components/EstatePlanApp.jsx`, `app/api/documents/process/route.js`
**PII Found:** Michael Schirger (mschirger@mjs.law, (312) 555-0101, bar: IL/WI),
William Schirger (wschirger@mjs.law, bar: IL), Danny Robinson (drobinson@mjs.law,
bar: IL); "mjs@mjs.law" hardcoded as p_user_email in API route body.
**Risk:** Estate plan clients see hardcoded attorney contact details regardless
of which firm is assigned to their engagement. Document processing is attributed
to mjs@mjs.law even for clients of other firms.
**Remediation:** Load attorney roster dynamically. Replace hardcoded p_user_email
with authenticated user's email from the session JWT.

### Client-Dashboard ClientShell.js — MEDIUM (3 instances)
**File:** `app/components/ClientShell.js`
**PII Found:** "Michael Schirger · mjs@mjs.law · Attorney" as search alias value;
"mjs@mjs.law mschirger@mjs.law jwalker@mjs.law info@mjs.law" as hardcoded email
alias strings in global search index construction (2 locations).
**Risk:** All clients see MJS Law contact information in search results regardless
of whether MJS Law is their assigned service provider.
**Remediation:** Build search aliases from assigned professional contacts fetched
from the database.

### compliance-User ComplianceWorkstation.jsx — LOW (2 instances)
**File:** `components/ComplianceWorkstation.jsx`
**PII Found:** "Jason C. Walker" and "Michael Harrison" as participants in a
hardcoded mock thread entry for "Ironwood Properties, LLC."
**Risk:** Low. Development seed data left in production. Visible to all
compliance users in thread listings.
**Remediation:** Remove mock thread data. Threads should load from the database.

---

## 7. Part 2 — Code Quality Observations

### Strengths
- Consistent session pattern: all apps use HttpOnly, Secure, SameSite=Lax cookies.
  No sensitive data in localStorage or sessionStorage.
- TOTP MFA three-cookie state machine (session / pending / setup) with Web Crypto
  API for validation. No external TOTP libraries.
- RLS uniformly applied across all 361 public tables. User_Entity_Access
  access control pattern is consistent.
- All SECURITY DEFINER RPCs have SET search_path = public. All edge functions
  have verify_jwt: true.
- No hardcoded secrets found in source code. All credentials reference
  process.env variables.
- platform-admin and attorney-dashboard have complete security header suites.

### Structural Concerns
- Inconsistent router pattern: 4 App Router, 2 Pages Router. Creates split auth
  guard patterns and split mental models.
- compliance-user uses custom HMAC cookie session instead of jose JWT. Two auth
  paradigms to maintain.
- No shared auth library: guard logic duplicated across 6 codebases. The
  requireSession() gap exists partly because each app reimplements auth
  independently.
- Monolithic component files: PlatformOpsV3.jsx, AttorneyDashboard.jsx,
  ClientShell.js, and EstatePlanApp.jsx are 1,000–10,000+ line single-file
  components. Makes auditing harder, increases PII risk.
- No error boundary standardization. Some routes return raw Supabase error
  objects to the client, leaking internal schema details.
- Hardcoded Supabase URL fallback in multiple routes:
  `process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ptgtliwllimkswtajcmy.supabase.co"`.
  Information disclosure risk if code is made public.

### GoTrue API Constraints (Known Platform Limitation)
The following Supabase GoTrue admin APIs are non-functional on this project
and must NEVER be called:
- `auth.admin.generateLink()` → "Database error finding user"
- `auth.admin.createSession()` → "not a function"
- `auth.admin.getUserById()` → 500 error
- `supabase.auth.mfa.*` → requires a real GoTrue session (unavailable)
- `supabase.auth.signInWithPassword()` → silently fails, last_sign_in_at stays null

All authentication and MFA operations must use direct DB access via SECURITY
DEFINER RPCs. This constraint is not formally commented in the codebase, creating
risk that future developers attempt to use GoTrue APIs and introduce silent failures.

---

## 8. Remediation Roadmap Items

### Priority 1 — Immediate (Before Public Launch)
1. Complete MFA enrollment for all unenrolled users — mandatory before launch
2. Upgrade requireSession() in platform-admin to verify JWT signature
3. Add auth guard to Client-EP /api/documents/process (uses service role key)
4. Add auth guards to attorney-dashboard: /api/onboard, /api/onboard/commit, /api/templates/process
5. Delete send-magic-link edge function from Supabase
6. Verify leaked password protection is enabled in Supabase Auth dashboard
7. Scope entity_start_scores_table RLS policies to user entity access

### Priority 2 — Short Term (30–60 Days)
1. Add full security header suite to Client-EP, compliance-User, Admin-User
2. Remove X-Frame-Options: ALLOWALL from Client-Dashboard (keep CSP frame-ancestors)
3. Configure Vercel WAF rate limiting on /api/auth/login across all 6 apps
4. Replace 52 hardcoded PII instances in admin-user PlatformOpsV3.jsx
5. Replace 10 hardcoded PII instances in Client-EP EstatePlanApp.jsx
6. Replace 3 hardcoded PII instances in Client-Dashboard ClientShell.js
7. Remove mock thread PII data from compliance-User ComplianceWorkstation.jsx
8. Add per-route auth guards to 7 compliance-User data API routes
9. Add per-route auth guards to 4 Client-Dashboard data API routes
10. Add session guards to remaining unprotected attorney-dashboard routes
11. Remove hardcoded Supabase URL fallback strings from API route files

### Priority 3 — Pre-SOC 2 Engagement (60–180 Days)
1. Write and publish Information Security Policy (ISP)
2. Write Incident Response Plan (IRP) with RTO/RPO definitions
3. Write Access Control Policy: user provisioning, access review, offboarding
4. Write Change Management Policy with mandatory security review gate
5. Assess all critical vendors (Supabase, Vercel, Anthropic, Resend, DocuSign) and obtain BAAs
6. Publish Privacy Policy and Terms of Service
7. Implement dependency vulnerability scanning in GitHub Actions CI/CD
8. Set up log aggregation and alerting (Datadog or equivalent)
9. Configure uptime monitoring with SLA targets
10. Document GoTrue API constraints formally as an architecture decision record

### Performance Backlog
1. Consolidate 746 multiple_permissive_policies into single policies per table
2. Wrap auth.uid() in (SELECT auth.uid()) for 282 auth_rls_initplan fixes
3. Add indexes to 278 unindexed foreign key columns
4. Review and drop 99 unused indexes
5. Add primary keys to 5 tables missing them
