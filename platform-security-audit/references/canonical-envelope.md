# Canonical Security Envelope — Start Today™

Reference baseline for all per-app capability scoring.

**Canonical reference:** C2C (`Click-to-Close`, `c2c.starttoday.biz`).
Platform-admin (`Platform-Admin`, `admin.starttoday.biz`) is the reference port —
both apps achieved parity through Sprints J-X (May 2026). When platform-admin
diverges from C2C, it's noted as an *improvement* worth backporting (e.g.,
padmin's `csrfGate` warn/enforce mode is more sophisticated than C2C's
`requireCsrf` flag toggle).

## The 8 capabilities

Every authenticated app should have all 8. Each capability is independent —
an app can have headers without rate-limit, MFA without backup codes, etc.
The remediation playbook orders them so dependencies flow naturally.

### 1. Audit log
**What:** Every auth-relevant event (login attempt, MFA verify, MFA enroll,
admin reset, password change, signout) writes a row to a centralized audit
table with actor email, IP hash, user-agent, action, success/failure flag,
failure reason, request ID.

**C2C reference:** `c2c_audit_log` table, `fn_c2c_audit_write` RPC,
`writeAudit()` helper in `lib/security/audit.js`.

**Padmin reference:** `auth_events` table (same schema), `logAuthEvent()` helper.
*Different table* than C2C — Sprint X notes this as a candidate for unification.

**Detection signals (per app):**
- Server: `lib/security/audit.js` exists and exports a `writeAudit`/`logAuthEvent` function
- Server: at least the `login` route imports it and calls it on every code path (rate-limit denial, invalid creds, success, etc.)
- DB: target audit table exists with required columns

**Common gaps:**
- Helper defined but never called (Sprint R discovered this on platform-admin)
- Called only on success, not on failure paths
- Missing IP hash (PII concern if storing raw IP)

### 2. Rate-limit (login + MFA)
**What:** IP-keyed rate-limit on every state-changing auth endpoint, before
DB work. Burned bucket returns 429 with `Retry-After` header.

**C2C reference:** `c2c_rate_limit_buckets` table, `fn_c2c_rate_limit_check`
RPC, policies registered: `login_post: 5/300s`, `mfa_post: 5/300s`.

**Padmin reference:** `platform_rate_limit_buckets` table (separate from C2C
since Sprint R), `fn_platform_rate_limit_check` with `app` namespace param,
same policies. Cleanup cron: `platform_rate_limit_cleanup` 03:35 UTC daily.

**Detection signals:**
- Server: `lib/security/rate-limit.js` exists with `rateLimit()` export
- Server: login route calls `rateLimit({actorKey: ip, action: 'login_post'})` BEFORE auth check
- DB: rate-limit bucket table + cleanup cron exist

**Common gaps:**
- Email-keyed instead of IP-keyed (lets attacker burn victim's bucket)
- Rate-limit AFTER DB work (defeats the point)
- No cleanup cron (bucket table grows unbounded)

### 3. Defensive response headers
**What:** Every response — public, redirect, or authenticated — gets the same
header set: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin`, tight `Permissions-Policy`,
year-long `Strict-Transport-Security`. CSP deferred — needs audit phase per app.

**Reference impl:** `lib/security/headers.js` exports `applySecurityHeaders(res)`,
called by middleware on every NextResponse branch.

**Detection signals:**
- Server: `lib/security/headers.js` exists
- Server: `middleware.js` imports it and wraps every `NextResponse.next()` /
  `NextResponse.redirect()` / `NextResponse.json()` exit point
- HTTP: actual response headers contain all 5 expected values

**Common gaps:**
- Headers set in `next.config.js` only (misses middleware-injected responses)
- `X-Frame-Options: ALLOWALL` (invalid value, from old code)
- HSTS missing or `max-age` too short

### 4. Failed-login admin dashboard
**What:** Admin-only page displaying recent failed logins with hourly
histogram, failure-reason breakdown, top denied IPs (hashed), top targeted
emails, recent denied tail.

**C2C reference:** `/admin/login-attempts`, `LoginAttemptsAdmin.jsx`, calls
`/api/c2c/admin/login-attempts` → `fn_c2c_login_attempts_summary`.

**Padmin reference:** Same shape, app-namespaced RPC
`fn_platform_login_attempts_summary`. Hourly histogram added Sprint X (pure
inline SVG, no charting lib).

**Detection signals:**
- Server: `app/admin/login-attempts/page.jsx` (App Router) OR
  `pages/admin/login-attempts.js` (Pages Router) exists
- Server: dashboard component reads from a `*_login_attempts_summary` RPC
- DB: RPC exists and returns `{totals, by_reason, top_ips_denied, top_emails_denied, hourly[], recent_denied[]}`

**Common gaps:**
- Audit log written but no dashboard surfaces it
- Dashboard exists but no histogram (Sprint M / R / X gap)

### 5. MFA enforcement on admin login
**What:** TOTP MFA required for admin accounts. Forced enrollment on first
login if no factor exists (mfa_setup_required → /mfa-enroll). Existing factor
triggers /mfa-challenge before session is granted.

**Reference impl:** Custom RPCs `admin_mfa_create_factor`,
`admin_mfa_activate_factor`, `get_user_totp_secret`. Three cookies:
`pa_admin_session` (8h, post-MFA), `pa_mfa_pending` (10min, between
password-OK and TOTP-OK), `pa_mfa_setup` (30min, forced-enrollment lane).

**Detection signals:**
- Server: login route returns `mfa_required` or `mfa_setup_required` outcomes
- Server: `/mfa-challenge` and `/mfa-enroll` pages exist
- Server: middleware redirects pa_mfa_pending → /mfa-challenge,
  pa_mfa_setup → /mfa-enroll
- DB: `auth.mfa_factors` has rows for all admin user_ids in `ADMIN_EMAILS`

**Assumption:** Custom JWT auth pattern. Apps using Supabase GoTrue's native
`auth.mfa_*` APIs need a different detection rule (those APIs are documented
as non-functional on the canonical Supabase project — see
`docs/GOTRUE_CONSTRAINTS.md`).

**Common gaps:**
- MFA optional instead of required for admins
- No forced-enrollment lane (admin without factor can skip MFA forever)
- No setup-cookie expiry (lane stays open indefinitely)

### 6. Backup recovery codes
**What:** 10 single-use codes issued at MFA activation. Hashes stored
(sha256+per-row salt), plaintext returned ONCE. Consumed rows kept for audit
(consumed_at, consumed_ip, consumed_ua) — code_hash zeroed to defeat dump
replay. Login challenge accepts backup code in place of TOTP via dispatch on
`looksLikeBackupCode()`. Self-service regen requires TOTP step-up (backup
codes NOT accepted at regen).

**Reference impl:** `mfa_backup_codes` table (shared across all apps using
the canonical Supabase project), three RPCs:
- `fn_mfa_backup_codes_regenerate(user_id, codes[])`
- `fn_mfa_backup_codes_consume(user_id, code, ip, ua)` → `{ok, remaining, low}`
- `fn_mfa_backup_codes_count(user_id)`

**Detection signals:**
- Server: `lib/security/mfa.js` exports `generateBackupCodes`, `looksLikeBackupCode`
- Server: `mfa-verify` route dispatches on `looksLikeBackupCode()` for login
- Server: `/api/auth/mfa-backup-codes` route (GET count, POST regen)
- Server: enrollment confirmation generates codes and returns `backup_codes` array
- Server: enrollment page displays codes once with mandatory ack checkbox

**Shared-DB shortcut:** Apps on canonical Supabase get RPCs for free; apps on
separate Supabase need RPCs deployed there.

**Common gaps:**
- Codes stored plaintext (must be hashed)
- Codes accepted at regen (defeats anti-phish design)
- No "low remaining" signal to user

### 7. Self-service /settings/security
**What:** Admin can see MFA status, backup-code remaining count (with amber
warning at ≤2), regenerate codes (with TOTP step-up), see "low codes" banner
on dashboard after backup-code login.

**Reference impl:** `/settings/security` page, `SettingsSecurity.jsx` component,
`LowBackupCodesBanner.jsx` (self-positioning fixed bar reading sessionStorage
hint set by mfa-challenge).

**Detection signals:**
- Server: `app/settings/security/page.jsx` OR equivalent exists
- Server: GET `/api/auth/mfa-backup-codes` returns `{remaining, low}`
- Server: low-codes banner reads sessionStorage `pa_low_backup_codes` /
  `c2c_low_backup_codes`

**Common gaps:**
- Backup codes work but no UI to see them or regen
- No banner — user runs out without warning

### 8. Admin MFA reset workstation
**What:** First-class admin tool to wipe a locked-out user's MFA factor +
backup codes. Six gates: session, admin allowlist, rate-limit, body
validation, TOTP step-up, RPC self-check (refuse if admin == target). Audit
row on every code path.

**Reference impl:** `/admin/mfa-reset` page, `AdminMfaReset.jsx`,
`POST /api/admin/security/mfa-reset` route. RPCs:
- `fn_admin_users_with_mfa()` — picker source
- `fn_admin_reset_user_mfa(admin_email, admin_user_id, target_user_id, reason)`

**Detection signals:**
- Server: page + route exist
- Server: route has all 6 gates
- DB: RPCs exist with proper guard rails

**Shared-DB shortcut:** Same as #6 — RPCs free on canonical Supabase.

**Common gaps:**
- Lockout recovery requires SQL (no first-class tool)
- No audit row on reset
- No self-reset guard (admin can wipe own MFA → re-enroll into attacker control)

### 9. CSRF coverage on state-changing routes
*(Counted as one capability but enforced in 3 sub-stages)*

**What:** Double-submit cookie pattern. Cookie name `<app>_csrf`, header name
`X-<APP>-CSRF`. 32 random bytes hex-encoded, NOT HttpOnly (client must read
to echo). Constant-time compare. Bypasses for `x-vercel-cron` and
`X-Cron-Secret` env-var matched headers. Frontend uses `secureFetch` wrapper
auto-attaching header on POST/PATCH/PUT/DELETE.

**Reference impl:** `lib/security/csrf.js` with `verifyCsrf`, `attachCsrfCookie`,
`csrfFailureResponseRaw`, `csrfGate` (warn-or-enforce wrapper), `csrfMode`
(reads env). `lib/client/secure-fetch.js` browser wrapper. Middleware
attaches cookie on every response branch.

**Detection signals:**
- Server: `lib/security/csrf.js` exists with all expected exports
- Server: middleware calls `attachCsrfCookie` on every response
- Server: every POST/PATCH/PUT/DELETE handler calls `verifyCsrf` or `csrfGate`
- Frontend: state-changing fetches use `secureFetch` (or include the header)

**Sub-staging (per Sprints U/V/W):**
- **Stage 1 (Sprint U):** Curated enforcement on auth-grade routes only —
  every `/api/auth/*` POST plus security-adjacent admin endpoints (mfa-reset,
  revoke, deactivate, impersonate). Other routes: cookie attached but no check.
- **Stage 2 (Sprint V):** Bulk gate on remaining state-changing routes in
  warn-only mode. Logs `[csrf-warn]` but doesn't block. Frontend migration
  in flight.
- **Stage 3 (Sprint W):** Frontend migrated to secureFetch, default flipped
  to enforce. Kill-switch via `<APP>_CSRF_DISABLE=1` for emergency rollback.

**Common gaps:**
- No CSRF at all (most apps before Sprint U)
- Curated-only forever (Stage 1 done, V/W never shipped)
- Warn-only forever (Stage 2 done, W never shipped)

---

## Per-app scoring legend

For each capability, score one of:

- **PRESENT** — fully matches canonical pattern, all detection signals positive
- **PARTIAL** — some pieces present but not all (e.g., audit helper exists
  but never called)
- **MISSING** — no evidence of the capability
- **N/A-ASSUMPTION** — capability doesn't apply due to architectural divergence
  (e.g., #5 MFA on apps using Supabase GoTrue native APIs — different detection
  rule; or shared-DB shortcuts that don't apply to apps on separate Supabase)

PARTIAL is the most important state to detect because it's the easiest to
miss in a code review and the most dangerous in production (defense-in-depth
gap that looks like coverage).

## Assumption profile

For each app, also capture the architectural assumptions that determine
whether the canonical playbook applies:

```
{
  supabase_project: "canonical" | "separate" | "none",
  auth_pattern: "custom_jwt" | "supabase_gotrue" | "next_auth" | "other",
  router: "app" | "pages" | "mixed",
  helpers_present: ["requireSession", "sbRpc", "writeAudit", ...],
  shared_db_rpcs_available: true | false  // mfa_backup_codes_*, admin_reset_user_mfa, etc.
}
```

The remediation playbook reads this profile and substitutes alternative
patterns where the canonical doesn't apply.
