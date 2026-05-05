# Assumption Overrides — Start Today™

When the canonical playbook (`playbook.md`) doesn't apply because the
target app diverges architecturally, this file documents the alternate
pattern.

The remediate skill reads each app's `assumptions` profile from the JSON
sidecar (produced by the audit skill) and substitutes the relevant
override before generating the plan.

---

## Assumption: auth_pattern

### Canonical: `custom_jwt`
The canonical pattern. Custom JWT in HttpOnly cookie, `jose` for
verification, custom RPCs for password+MFA. All sprints in `playbook.md`
assume this.

### Override: `supabase_gotrue`
App uses Supabase's native GoTrue auth (`@supabase/auth-helpers-nextjs`,
`createServerClient`, etc.).

**Per-sprint impact:**

- **Sprint R MFA enforcement:** GoTrue has its own `auth.mfa_*` API. On
  the canonical Supabase project (`ptgtliwllimkswtajcmy`) those APIs
  have been documented as non-functional (this is why custom_jwt is
  canonical). For an app stuck on GoTrue, two options:
  1. **Migrate auth pattern to custom_jwt first.** This is its own
     sprint and out of scope for the security envelope. Flag it and
     pause.
  2. **Use GoTrue MFA where it works** (separate Supabase project that
     doesn't share the constraint). The sprint becomes "configure
     GoTrue MFA settings + force enrollment via login redirect."
     Different code, same outcome.

- **Sprint S backup codes:** GoTrue MFA does NOT include backup codes
  natively. Even if MFA works, you still need the canonical
  `mfa_backup_codes` table + RPCs. The dispatch in `mfa-verify` route
  is rewritten to call GoTrue's `auth.mfa.verify()` for TOTP and the
  custom RPC for backup codes.

- **Sprint T admin reset:** GoTrue's admin API (`auth.admin.deleteFactor`)
  works for resetting factors but doesn't give you the audit trail or
  the self-reset guard. Use the canonical RPC even with GoTrue auth.

- **Sprints U/V/W CSRF:** GoTrue uses its own session cookie naming
  (`sb-<project>-auth-token`). The CSRF cookie is independent — same
  pattern works.

### Override: `next_auth`
Similar caveats to GoTrue. NextAuth has MFA via its own plugin system;
the canonical RPC pattern is preferred for parity.

---

## Assumption: supabase_project

### Canonical: `canonical` (`ptgtliwllimkswtajcmy`)
All shared RPCs reachable: `fn_mfa_backup_codes_*`,
`fn_admin_reset_user_mfa`, `fn_admin_users_with_mfa`,
`fn_platform_login_attempts_summary`, `fn_platform_rate_limit_check`.
Sprints S and T can skip the DB-create steps.

### Override: `separate` (e.g., stverify's `ewfahugybiaizfurlyop`)
Shared RPCs are NOT available. Sprints S and T must deploy the RPCs into
the separate project before the app code can use them.

**Note:** The canonical Supabase MCP can't reach a separate project.
Workaround: write migrations as SQL files in the repo, then paste into
the separate project's SQL editor manually. (Per the platform memory,
this is the established pattern for stverify-side work.)

### Override: `env-driven` (project ID not hardcoded)
The matrix builder couldn't determine which project the app uses.
**Pause and ask the operator** before proceeding with Sprint S/T.
The remediate plan should include a verification step:

```bash
echo $NEXT_PUBLIC_SUPABASE_URL  # in the Vercel project env
```

If the URL points to canonical → treat as `canonical`.
If it points to a separate project → treat as `separate`.

### Override: `none`
App has no Supabase backend. Audit log + rate-limit infra needs an
alternative store (Redis, Vercel KV, file-based for dev). Out of scope
for the canonical playbook — flag and treat as bespoke.

---

## Assumption: router

### Canonical: `app` (Next.js App Router)
Default. All file-path examples in `playbook.md` use App Router
conventions (`app/api/foo/route.js`, `middleware.js` at root).

### Override: `pages` (Next.js Pages Router)
File path translations:

| App Router | Pages Router |
|------------|--------------|
| `app/api/auth/login/route.js` | `pages/api/auth/login.js` |
| `app/admin/login-attempts/page.jsx` | `pages/admin/login-attempts.jsx` |
| `app/settings/security/page.jsx` | `pages/settings/security.jsx` |
| `middleware.js` (App Router intercept) | `middleware.js` (Pages Router uses different request shape) |

Middleware in Pages Router has subtly different request/response APIs.
The CSRF cookie attach pattern works the same way; the
`applySecurityHeaders` wrap works the same way; but the `requireSession`
helper needs a Pages-Router-aware implementation that reads cookies via
`req.cookies` instead of the `request.cookies.get()` Edge API.

The canonical apps that are on Pages Router (`Admin-User`,
`compliance-User` per the audit catalog) have local helper files that
already handle this — when remediating those apps, look for the existing
helper before writing a new one.

### Override: `mixed`
App has both `app/` and `pages/` directories. This usually means a
partial migration. Treat each directory by its own router rules.
Critical: the same auth helpers must work for both — don't fork
implementations.

---

## Assumption: helpers_present

The canonical playbook assumes these helpers exist on the target app:

- `requireSession(request)` — server-side session validator
- `sbRpc(name, args)` — Supabase RPC caller with service-role key
- `writeAudit({...})` — audit log writer (Sprint R adds this if missing)
- `rateLimit({...})` — rate-limit check (Sprint R adds this if missing)
- `verifyCsrf(request)` / `csrfGate(request)` — CSRF check (Sprint U adds)
- `secureFetch(url, opts)` — browser CSRF-aware fetch (Sprint U adds)

If `requireSession` or `sbRpc` is missing, the app has a more
foundational gap than the security envelope. **Pause and flag** —
fixing those is its own sprint and may require multiple commits.

A common case: the app has session validation inlined into every route
handler instead of via a helper. Sprint R becomes "extract session
helper, then add audit/rate-limit/headers using it." That's 2 commits,
not 1.

---

## Assumption: shared_db_rpcs_available

### `true`
Sprints S and T skip DB creation steps. Same effect as
`supabase_project: canonical`.

### `false`
Must deploy the RPCs as part of the sprint. Adds DB migration commits
before the app code commit.

### `unknown`
The matrix builder couldn't determine availability — usually because
the app uses env-var Supabase URLs and we couldn't verify the project.
**Pause and verify** before generating Sprint S/T plans. Same
verification step as `supabase_project: env-driven`.

---

## Assumption: route namespacing

C2C-style apps use `/api/<app>/admin/...` (e.g., `/api/c2c/admin/mfa-reset`).
Padmin-style apps use `/api/admin/security/...` (e.g.,
`/api/admin/security/mfa-reset`).

Both patterns are acceptable. The remediate plan should match whatever
the app already uses for other admin endpoints — don't mix conventions
inside one app. Detection signal:

```bash
ls app/api/<app>/admin/ 2>/dev/null && echo "C2C-style namespace"
ls app/api/admin/security/ 2>/dev/null && echo "padmin-style namespace"
```

If neither exists, the app is greenfield for admin routes — pick
padmin-style for new builds.

---

## Assumption: language (TypeScript vs JavaScript)

Most apps in the catalog are JS. If the target app is TS:

- Helper files become `.ts` not `.js`
- Add type imports: `NextRequest`, `NextResponse`, `User` from supabase-js
- The audit-log row shape gets a TS interface
- Build validation includes `tsc --noEmit` before `next build`

The canonical lib/security helpers should be portable — the C2C/padmin
versions don't use any TS-specific patterns that wouldn't translate.

---

## When in doubt: pause and ask

The whole point of the assumption profile is to make divergences
explicit. If the matrix builder marked an assumption as `unknown` or
the operator hasn't confirmed which override applies, the remediate
plan should include an explicit "VERIFY BEFORE PROCEEDING" callout
rather than guessing.

A wrong-assumption sprint can ship working-looking code that fails in
production (e.g., GoTrue MFA call paths that silently don't verify, or
an audit RPC that writes to a non-existent table). Pausing for a
1-message verification round is cheaper than rolling back a deploy.
