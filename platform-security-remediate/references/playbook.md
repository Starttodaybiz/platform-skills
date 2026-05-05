# Canonical Sprint Playbook — Start Today™

Source of truth for what each canonical security sprint contains. Derived
from C2C Sprints J-Q and platform-admin Sprints R-X (April-May 2026).

Each sprint section here maps to one or more rows in the Sprint Mapping
Reference table in SKILL.md. When executing a sprint via this skill, follow
the section here exactly — substituting names per the target app's
namespace (e.g., `c2c_audit_log` → `<app>_audit_log` or shared
`auth_events`).

**Reading order:** Sprints have hard dependencies. Don't skip:
- R must precede S (S's backup codes depend on R's MFA infra)
- S must precede T (T's reset uses S's regen flow)
- U must precede V must precede W (the three CSRF stages cannot be compressed)

---

## Sprint R — Security infrastructure foundation

**Closes gaps:** `audit_log`, `rate_limit`, `headers`, `dashboard`,
`mfa_enforcement` (Mode A or Mode B groundwork)

**Why this is one sprint not five:** Every piece below depends on
`lib/security/*` existing and middleware being aware of it. Splitting
would either duplicate that scaffold across sprints or create
dependency cycles.

### Files to create (all under app's local clone)

```
lib/security/
  audit.js          (or audit.ts if app is TypeScript)
  rate-limit.js
  headers.js        (only for padmin pattern; C2C-style apps inline in middleware)
  mfa.js            (groundwork — Sprint S extends with backup-code helpers)
  index.js          (barrel)
```

### Database objects (skip if shared_db_rpcs_available=true)

Create per-app or use the shared canonical tables (`auth_events`,
`platform_rate_limit_buckets`). The shared pattern is preferred when the
app is on the canonical Supabase project.

Per-app schema:

```sql
CREATE TABLE <prefix>_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  app TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_email TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  success BOOLEAN,
  failure_reason TEXT,
  request_id TEXT
);

CREATE TABLE <prefix>_rate_limit_buckets (
  actor_key TEXT NOT NULL,
  app TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL,
  PRIMARY KEY (actor_key, app, action, window_start)
);

CREATE FUNCTION fn_<prefix>_login_attempts_summary(p_app TEXT, p_hours INT, p_top_n INT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER ...;

SELECT cron.schedule('<prefix>_rate_limit_cleanup', '35 3 * * *',
  $$DELETE FROM <prefix>_rate_limit_buckets WHERE window_start < now() - interval '7 days';$$);

NOTIFY pgrst, 'reload schema';
```

(See platform-admin Sprint R commit `96092c0` for the full RPC body — copy
verbatim, swap the table name.)

### Code patterns (copy verbatim from C2C lib/security/)

- **`lib/security/audit.js`** — exports `writeAudit({event_type, actor_email, success, failure_reason, request})`. Uses sha256 IP hash. Non-blocking via `void writeAudit(...).catch(() => {})`.
- **`lib/security/rate-limit.js`** — exports `rateLimit({actorKey, action})`. Calls the rate-limit RPC. Fail-open on RPC error.
- **`lib/security/headers.js`** — exports `applySecurityHeaders(response)`. Sets: nosniff, SAMEORIGIN, referrer-policy strict-origin-when-cross-origin, HSTS max-age=31536000 includeSubDomains, tight permissions-policy.
- **`middleware.js`** — wraps every `NextResponse.next()` / `NextResponse.redirect()` in `applySecurityHeaders(...)`.
- **`app/api/auth/login/route.js`** — opens with rate-limit check, writes audit on every code path (denial, invalid creds, success, server error).
- **`components/LoginAttemptsAdmin.jsx`** — admin dashboard component, reads from `/api/admin/security/login-attempts`. Sprint R version has stat tiles, by-reason pills, top IPs/emails, recent denied. Histogram comes in Sprint X.

### MFA enforcement (Mode A vs Mode B)

- **Mode A — forced enrollment lane** (canonical for new apps): login route detects "admin without factor", sets `<app>_mfa_setup` cookie (30min TTL), redirects to `/mfa-enroll`. Middleware enforces the cookie scope.
- **Mode B — manual enrollment** (older C2C pattern): admins self-enroll via settings; login refuses access until they have a factor but doesn't force the lane.

Mode A is more secure. New ports should ship Mode A from day one. Existing
apps on Mode B (currently just C2C) get Sprint N as a backport upgrade.

### Validation

```bash
# Brace + paren balance per touched file
o=$(grep -o "{" file | wc -l); c=$(grep -o "}" file | wc -l)
po=$(grep -o "(" file | wc -l); pc=$(grep -o ")" file | wc -l)
[ "$o" = "$c" ] && [ "$po" = "$pc" ] || echo BAD

# JSX/JS parse
node -e "require('@babel/parser').parse(require('fs').readFileSync('file', 'utf8'), {sourceType:'module', plugins:['jsx']})"

# Full Next.js build
NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x ADMIN_JWT_SECRET=12345678901234567890123456789012 npx next build 2>&1 | grep -iE "Compiled successfully|^.+error|Failed" | grep -v "Failed to minify"
```

### Deploy verification

After push: wait ~90s, check Vercel deploy is state=READY, runtime logs
have no errors/warnings in the 5-10min window.

---

## Sprint S — Backup recovery codes + self-service settings

**Closes gaps:** `backup_codes`, `settings_page`

**Depends on:** Sprint R (mfa.js helper exists, MFA is enforced)

### Files to create

```
lib/security/mfa.js                       (extend Sprint R helper)
app/api/auth/mfa-backup-codes/route.js    (GET = count, POST = regen with TOTP step-up)
app/settings/security/page.jsx
components/SettingsSecurity.jsx
components/LowBackupCodesBanner.jsx
```

### Database (skip if shared_db_rpcs_available=true)

```sql
CREATE TABLE mfa_backup_codes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  consumed_ip TEXT,
  consumed_ua TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, code_hash)
);

CREATE FUNCTION fn_mfa_backup_codes_regenerate(p_user_id UUID, p_codes TEXT[]) ...;
CREATE FUNCTION fn_mfa_backup_codes_consume(p_user_id UUID, p_code TEXT, p_ip TEXT, p_ua TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER ...;
-- Returns: {ok: bool, remaining: int, low: bool}

CREATE FUNCTION fn_mfa_backup_codes_count(p_user_id UUID) RETURNS jsonb ...;

NOTIFY pgrst, 'reload schema';
```

(See platform-admin Sprint S commit `367268e` for the full RPC bodies.)

### Code patterns

- `generateBackupCodes(count=10)` — returns 10 hex strings, 8 chars each, confusable-free alphabet (no `0/O`, `1/l/I`)
- `looksLikeBackupCode(s)` — heuristic: 8 chars, hex chars, looks unlike a TOTP code (which is 6 digits)
- `mfa-verify` route dispatches: if `looksLikeBackupCode(input)` → consume via RPC; else → TOTP check
- Settings page shows: MFA status pill, backup-code remaining count, amber warning at ≤2, regenerate button (requires TOTP step-up, NOT another backup code)
- LowBackupCodesBanner reads sessionStorage `<app>_low_backup_codes` set by mfa-challenge after successful backup-code login

### Validation + deploy: same as Sprint R

---

## Sprint T — Admin MFA reset workstation

**Closes gap:** `admin_reset`

**Depends on:** Sprint S (regen flow uses TOTP step-up established there)

### Files to create

```
app/admin/mfa-reset/page.jsx                (server-gated, admin-only)
components/AdminMfaReset.jsx                (the picker UI)
app/api/admin/security/mfa-reset/route.js   (POST handler)
```

### Database (skip if shared)

```sql
CREATE FUNCTION fn_admin_users_with_mfa()
RETURNS TABLE(user_id UUID, email TEXT, factor_count INT, last_used TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER ...;

CREATE FUNCTION fn_admin_reset_user_mfa(
  p_admin_email TEXT, p_admin_user_id UUID,
  p_target_user_id UUID, p_reason TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER ...;
-- 3 guard rails: missing_params, self_reset_forbidden, target_not_found
```

### The 6 gates on the API route (all required)

```js
export async function POST(request) {
  // 1. Session
  const authErr = await requireSession(request);
  if (authErr) return authErr;

  // 2. Admin allowlist
  const me = decodeJwtEmail(request);
  if (!ADMIN_EMAILS.includes(me)) return new Response('forbidden', { status: 403 });

  // 3. Rate-limit
  const rl = await rateLimit({ actorKey: me, action: 'admin_mfa_reset' });
  if (!rl.ok) return rateLimitResponse(rl);

  // 4. Body validation
  const { target_user_id, reason } = await request.json();
  if (!target_user_id || !reason || reason.length < 10) return badRequest;

  // 5. TOTP step-up
  const totp = request.headers.get('x-mfa-totp');
  if (!totp || !await validateStepUp(me, totp)) return new Response('totp required', { status: 401 });

  // 6. RPC (which has its own self-reset guard)
  const result = await sbRpc('fn_admin_reset_user_mfa', { ... });
  // result.error === 'self_reset_forbidden' → 403
  // result.error === 'target_not_found' → 404
  // success → audit + return ok
}
```

### Validation + deploy: same as Sprint R

---

## Sprint U — CSRF infrastructure + curated enforcement

**Closes gaps:** `csrf` (Stage 1)

**Depends on:** nothing (CSRF is independent of MFA infra)

### Files to create

```
lib/security/csrf.js          (verifyCsrf, attachCsrfCookie or ensureCsrfCookie, csrfFailureResponseRaw)
lib/client/secure-fetch.js    (browser wrapper auto-attaching X-<APP>-CSRF on POST/PATCH/PUT/DELETE)
```

### Middleware modification

```js
// In every NextResponse exit branch, wrap with attachCsrfCookie:
return applySecurityHeaders(attachCsrfCookie(request, NextResponse.next()));
```

### Curated route enforcement (Sprint U scope)

Manually add `verifyCsrf` (or `csrfGate`) check to the 10 highest-value
auth-grade endpoints:

- POST /api/auth/login
- POST /api/auth/signout
- POST /api/auth/mfa-verify
- POST /api/auth/mfa-enroll
- POST /api/auth/mfa-backup-codes
- POST /api/admin/security/mfa-reset
- POST /api/admin/security/revoke (if exists)
- POST /api/admin/users/deactivate (if exists)
- POST /api/admin/impersonate/start (if exists)
- POST /api/admin/impersonate/end (if exists)

Each handler opens with:

```js
const csrfResult = verifyCsrf(request);
if (!csrfResult.ok) return csrfFailureResponseRaw(csrfResult.reason);
```

### Frontend migration for these 10 routes only

Find every state-changing fetch in components that hits one of the 10
enforced endpoints, swap `fetch(...)` → `secureFetch(...)`. Sprint U
handles only these — bulk migration is Sprint V/W.

### Validation + deploy: same as Sprint R

---

## Sprint V — Bulk CSRF gate rollout (warn-only mode)

**Closes gaps:** `csrf` (Stage 2)

**Depends on:** Sprint U (csrfGate helper + middleware cookie attach exist)

### What this sprint adds

The `csrfGate(request)` helper from Sprint U gets invoked on **every
remaining state-changing route** but in **warn-only mode** — failures
log to stderr but don't block the request. This lets the backend ship
infrastructure-ready while the frontend (typically a large `AdminPanel.jsx`
or equivalent) still issues bare `fetch()` calls.

### Mass-migration script

Use a regex-based migration script. It should:
1. List all `app/api/**/route.js` (excluding Sprint U routes already gated, plus webhook routes with bearer-token auth)
2. For each, detect POST/PATCH/PUT/DELETE handler signatures
3. Compute the relative import path to `lib/security`
4. Insert `import { csrfGate } from '<rel>/lib/security';` at top
5. Insert `const __csrfDeny = csrfGate(request); if (__csrfDeny) return __csrfDeny;` at the top of every state-changing handler

### Mode flag

Sprint V's `csrfMode()` defaults to `warn`:

```js
export function csrfMode() {
  return process.env.<APP>_CSRF_ENFORCE === '1' ? 'enforce' : 'warn';
}
```

Sprint W flips this to `enforce` as default.

### Validation + deploy: same as Sprint R

---

## Sprint W — Frontend migration + flip default to enforce

**Closes gaps:** `csrf` (Stage 3)

**Depends on:** Sprint V (warn-mode infrastructure on every route)

### Two changes in one commit

1. **Frontend mass-migration** to `secureFetch` for every state-changing admin/auth fetch site. Use a regex-based script. Skip dead duplicate files; verify no stray bare-fetch state-changing sites remain.

2. **Flip `csrfMode()` default** from `warn` to `enforce`:

```js
export function csrfMode() {
  if (process.env.<APP>_CSRF_DISABLE === '1') return 'warn';
  if (process.env.<APP>_CSRF_ENFORCE === '0') return 'warn';  // legacy alias
  return 'enforce';
}
```

The kill-switch direction (enforce→warn via env-var) is what an emergency
needs. The legacy alias preserves any pre-existing settings.

### Comment sweep

Sprint V left `// CSRF gate (warn-only by default; ...)` comments on every
route. Update them all via `sed` to reflect Sprint W reality.

### Post-deploy verification

Watch Vercel runtime logs for:
- 403 responses on /api/admin/* — would indicate a missed call site
- `[csrf-warn]` entries — should be ZERO under enforce mode

### Validation + deploy: same as Sprint R

---

## Sprint X — Wrap-up (optional, polish)

**Closes gaps:** none (cleanup, not gap-closing)

This is the security-run wrap-up. After Sprints R-W ship the envelope:

- **Hourly histogram** on `/admin/login-attempts` — pure inline SVG, ~150 lines, no charting library. Reads from the `hourly` array already returned by the Sprint R summary RPC.
- **Dead file cleanup** — any duplicate components discovered during the Sprint W frontend migration.
- **Observation period note** — leave the warn-mode kill-switch in place for a week before considering Sprint Y removal.

This sprint isn't required for the gap matrix to read PRESENT — it's the
operational polish that makes the dashboard useful.

---

## Sprint N — Mode A backport (only for apps currently on Mode B)

**Closes gap:** `mfa_enforcement` upgrade from Mode B PARTIAL to Mode A PRESENT.

**Currently applies to:** C2C only (per audit findings as of 2026-05-05).

### What changes

C2C's login route currently returns `mfa_required` when an admin without
a factor tries to log in, refusing access. The admin must self-enroll
via settings before they can complete login.

Mode A upgrade:
- Login route detects "admin without factor", sets `c2c_mfa_setup` cookie (30min TTL) instead of refusing
- Redirects to `/mfa-enroll` (which already exists)
- Middleware grants only the enrollment lane (no other routes accessible while the setup cookie is active)
- After successful enrollment, setup cookie is replaced by full session

### Why backport

Mode B has a window where a newly-provisioned admin who hasn't yet
self-enrolled can be impersonated if an attacker also knows their
password. Mode A closes that window — the first valid login forces
enrollment.

### Files modified

```
app/api/auth/login/route.js        (replace 'mfa_required' branch with cookie+redirect)
middleware.js                       (add c2c_mfa_setup lane recognition)
app/mfa-enroll/page.jsx            (no change — page already works for self-enrollment)
```

### Validation + deploy: same as Sprint R
