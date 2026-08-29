---
name: mfa-implementation
description: >
  Implement TOTP (Time-based One-Time Password) two-factor authentication for
  Next.js App Router admin apps that use a custom JWT cookie session (jose) and
  Supabase as the database. Use this skill whenever adding MFA, 2FA, two-factor
  auth, or authenticator app support to any app in the Start Today ecosystem.
  Also triggers for: "add MFA to X app", "secure login with authenticator",
  "require TOTP on login", "protect admin with 2FA". Covers enrollment, login
  challenge, TOTP validation, and lockout recovery — all without relying on
  GoTrue admin APIs (which are unreliable on this project).
---

# MFA Implementation — Start Today Ecosystem

## Architecture Overview

This skill implements TOTP MFA **entirely without GoTrue admin APIs**, which are
unreliable on the Start Today Supabase project. All MFA state lives in
`auth.mfa_factors` accessed directly via SECURITY DEFINER RPCs. TOTP
validation uses the Web Crypto API (native, no libraries needed).

### Stack assumptions
- **Framework**: Next.js 14+ App Router
- **Auth**: Custom `pa_admin_session` cookie signed with `jose` (HS256)
- **DB**: Supabase (`ptgtliwllimkswtajcmy`)
- **Session cookie name**: varies per app — check `middleware.js` (e.g. `pa_admin_session`, `attorney_session`)

### Complete flow

```
Login → verify_admin_password RPC
      → check_user_has_mfa RPC
      → YES: issue pa_mfa_pending cookie (10min) → /mfa-challenge
             → enter TOTP → get_user_totp_secret RPC → validateTOTP()
             → issue full session cookie
      → NO: issue full session cookie immediately

/mfa-enroll (first-time setup):
  → admin_mfa_create_factor RPC → returns secret + factor_id
  → show QR code (api.qrserver.com)
  → user scans + enters code → validateTOTP()
  → admin_mfa_activate_factor RPC → factor status = 'verified'
```

---

## Step 1: Database RPCs

Apply these migrations to Supabase. They are SECURITY DEFINER and access
`auth.mfa_factors` directly (PostgREST cannot query the auth schema).

See `references/db-migrations.sql` for the full SQL.

Four RPCs needed:
| RPC | Purpose |
|-----|---------|
| `check_user_has_mfa(user_id)` | Returns bool — used at login |
| `get_user_totp_secret(user_id)` | Returns `{id, secret}` — used at challenge |
| `admin_mfa_create_factor(user_id, friendly_name)` | Creates unverified TOTP factor, returns `{factor_id, secret}` |
| `admin_mfa_activate_factor(factor_id)` | Sets factor status to 'verified' |

All four must be `GRANT`ed to `service_role`.

---

## Step 2: API Routes

Four route files to create. Adapt the cookie name and JWT secret env var
to match the target app.

### `app/api/auth/login/route.js` — update existing

After password verification via `verify_admin_password` RPC, add:

```js
const { data: hasMFA } = await supabase
  .rpc('check_user_has_mfa', { p_user_id: userId });

if (hasMFA) {
  const pendingToken = await new SignJWT({
    sub: userId, email: emailClean, name: userName, state: 'mfa_pending',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getSecret());

  const response = Response.json({ success: true, mfa_required: true, redirect: '/mfa-challenge' });
  response.headers.set('Set-Cookie',
    `${MFA_PENDING_COOKIE}=${pendingToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  return response;
}
// else fall through to full session cookie as before
```

See `references/api-routes.js` for all four complete route implementations.

### New routes to create:
- `app/api/auth/mfa-enroll/route.js`
- `app/api/auth/mfa-verify/route.js`

---

## Step 3: Pages

Two new pages matching the app's visual theme:

- `app/mfa-challenge/page.jsx` — 6-digit TOTP entry, auto-advance boxes
- `app/mfa-enroll/page.jsx` — QR code + 2-step confirmation

See `references/pages.jsx` for complete implementations styled to match
the dark admin theme (`#0D1F35` → `#1E3A5F` gradient background).

---

## Step 4: Middleware Update

Add `/mfa-challenge` and `/mfa-enroll` to the public routes list, and add
a check: if the request has a `pa_mfa_pending` cookie but no full session,
redirect to `/mfa-challenge`.

```js
const PUBLIC_PREFIXES = ['/login', '/api/auth', '/mfa-challenge', '/mfa-enroll'];

// After the no-token check:
const pending = request.cookies.get(MFA_PENDING_COOKIE)?.value;
if (pending) return NextResponse.redirect(new URL('/mfa-challenge', request.url));
```

See `references/middleware.js` for the complete updated middleware.

---

## Step 5: Login Page Update

The login page `fetch('/api/auth/login')` response now may include
`mfa_required: true`. Handle it:

```js
if (data.mfa_required) {
  router.push(data.redirect || '/mfa-challenge');
} else {
  router.push('/');
  router.refresh();
}
```

---

## Critical Implementation Notes

### Cookie parsing — DO NOT use decodeURIComponent on JWT values
JWT tokens contain `=` padding that gets mangled by URL decoding.
Use this parser in all API routes:

```js
function parseCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    if (trimmed.slice(0, eqIdx).trim() === name) return trimmed.slice(eqIdx + 1);
  }
  return null;
}
```

### Never use .schema('auth') with supabase-js
The `auth` schema is not exposed via PostgREST. Queries like
`.schema('auth').from('mfa_factors')` silently return empty results.
Always use SECURITY DEFINER RPCs instead.

### Never use .rpc(...).catch()
Supabase-js returns a PromiseLike (thenable), not a native Promise.
`.catch()` doesn't exist on it. Use `try/catch` instead:
```js
// ❌ Wrong
await supabase.rpc('my_fn', params).catch(() => {});

// ✅ Correct
try { await supabase.rpc('my_fn', params); } catch (_) {}
```

### GoTrue admin APIs are broken on this project
Do NOT use:
- `adminClient.auth.admin.generateLink()`
- `adminClient.auth.admin.createSession()`
- `adminClient.auth.admin.getUserById()`
- `supabase.auth.mfa.*` (requires a real GoTrue session)
- `supabase.auth.signInWithPassword()` for MFA detection

All of these return 500 or silently fail. Use DB RPCs instead.

### next/headers cookies() in route handlers
`cookies()` from `next/headers` does NOT work reliably for reading
`HttpOnly` cookies in Next.js App Router route handlers when called
server-to-server. Always read cookies from `request.headers.get('cookie')`.

### QR Code generation
Use `api.qrserver.com` — free, no API key, works as an `<img src>`:
```js
function buildQRCodeUrl(secret, email, issuer) {
  const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
}
```

---

## Adapting to Other Apps

When applying to a different app (e.g. `attorney-dashboard`, `client-portal`):

1. **Find the session cookie name** — check `middleware.js` for `SESSION_COOKIE`
2. **Find the JWT secret env var** — check login route for `process.env.ADMIN_JWT_SECRET` or similar
3. **Find the password verify RPC** — check login route (may differ per app)
4. **Apply the 4 DB RPCs** — they're universal, same SQL for every app
5. **Style the pages** — match the app's color scheme (check `login/page.jsx`)
6. **Update middleware** — add public routes for `/mfa-challenge` and `/mfa-enroll`

---

## Lockout Recovery

If a user is locked out (lost authenticator app):

**Option A — SQL Editor (fastest):**
```sql
DELETE FROM auth.mfa_factors
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com')
  AND factor_type = 'totp';
```

**Option B — Supabase Dashboard:**
Authentication → Users → find user → ⋯ → Unenroll MFA

---

## Env Vars Required

No new env vars needed — uses existing:
- `ADMIN_JWT_SECRET` (or app-specific equivalent)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Reference Files

- `references/db-migrations.sql` — All 4 RPCs, ready to apply
- `references/api-routes.js` — Complete login, mfa-enroll, mfa-verify routes
- `references/pages.jsx` — Complete mfa-challenge and mfa-enroll pages
- `references/middleware.js` — Updated middleware with MFA route handling
