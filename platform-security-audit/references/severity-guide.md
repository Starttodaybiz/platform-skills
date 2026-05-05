# Severity Guide

Complete severity scale with all known finding types for the Start Today™
Security Audit. Use these as the authoritative severities when classifying
findings. Do not change without documented justification.

---

## Severity Definitions

| Level | Badge | Hex | Definition |
|-------|-------|-----|-----------|
| CRITICAL | Red | B91C1C / FEE2E2 | Immediate exploitable exposure, data at risk, active auth bypass vector |
| HIGH | Amber | 92400E / FEF3C7 | Significant risk, likely exploitable, requires prompt fix within 30 days |
| MEDIUM | Amber | 92400E / FEF3C7 | Real risk, not immediately exploitable, fix within 60 days |
| LOW | Blue | 1E3A5F / D6E4F7 | Best practice gap, minor exposure, no immediate risk |
| INFO | Gray | 374151 / F9FAFB | Performance or quality issue with no direct security impact |

---

## Database Findings

| Advisory Category | Severity | Notes |
|-------------------|----------|-------|
| rls_disabled_in_public | CRITICAL | Data fully exposed |
| rls_enabled_no_policy | CRITICAL | All access denied — silent failures |
| function_search_path_mutable | HIGH | Search path injection vector |
| security_definer_view | HIGH | Bypasses RLS on underlying tables |
| rls_policy_always_true | MEDIUM | Over-permissive; review G_ tables for intent |
| sensitive_columns_exposed | MEDIUM | Column-level access control gap |
| auth_leaked_password_protection | MEDIUM | Enable in Auth dashboard |
| extension_in_public | LOW | pg_net system extension — accepted if unresolvable |
| MFA enrollment <100% | CRITICAL | Password-only accounts exist despite MFA enforcement |
| send-magic-link still active | MEDIUM | Requires auth to call, but alternative auth infrastructure |

---

## Application Authentication Findings

| Finding | Severity | Notes |
|---------|----------|-------|
| No MFA deployed on any app | CRITICAL | Password-only on all portals |
| MFA code present but <100% DB enrollment | CRITICAL | Password-only accounts exist |
| requireSession() no JWT verification | HIGH | Forged cookie bypasses all 27 admin routes |
| No middleware on app (admin-user historical) | MEDIUM | All protection was client-side redirect |
| Magic link routes still in app code | HIGH | Bypass vector for any future MFA |
| Magic link edge function still active | MEDIUM | Authenticated callers only, but infrastructure persists |

---

## Source Code Findings

| Finding | Severity | Notes |
|---------|----------|-------|
| Unprotected route using SUPABASE_SERVICE_ROLE_KEY | HIGH | Internal API calls with admin DB access |
| Unprotected route triggering DocuSign send | HIGH | Paid external action, no auth |
| Unprotected route generating/sending invoice | HIGH | Financial action, no auth |
| Unprotected route with Claude API call (templates/process) | HIGH | Paid AI call, no auth |
| Debug route in production | CRITICAL | Exposes session architecture to recon |
| Test routes in production | HIGH | Expose internal credential validation |
| Unprotected health route | HIGH | Exposes infrastructure topology |
| Middleware-only protection (no per-route guards) | MEDIUM | Defense-in-depth gap |
| Hardcoded PII >20 instances incl. KYC/AML data | HIGH | Cannot be selectively hidden |
| Hardcoded PII 5–20 instances | MEDIUM | Maintenance burden + disclosure risk |
| Hardcoded PII <5 instances (mock/seed data) | LOW | Cleanup needed |
| Hardcoded email fallback in API route body | MEDIUM | Silent misdirection of real operations |
| Hardcoded service URL in fallback | LOW | Information disclosure if code made public |
| X-Frame-Options: ALLOWALL invalid value | MEDIUM | Non-spec value; undefined browser behavior |

---

## Infrastructure Findings

| Finding | Severity | Notes |
|---------|----------|-------|
| Security headers missing (all 4 headers absent) | MEDIUM | Per app |
| Security headers partial (some present, some missing) | LOW | Per app |
| Vercel WAF not configured | MEDIUM | No edge-level rate limiting |
| Preview deployment access uncontrolled | LOW | Review if previews expose production data |
| No dependency vulnerability scanning | MEDIUM | CC6.8 SOC 2 gap |

---

## Code Quality Observations (Not Security Findings)

These are listed as observations, not findings with severity badges:
- Inconsistent router pattern (App Router + Pages Router)
- Two auth paradigms (jose JWT + custom HMAC)
- No shared auth library (duplicated guard logic)
- Monolithic component files (audit difficulty + PII risk)
- Raw Supabase error objects returned to client (schema leakage)
- GoTrue API constraints undocumented in codebase

---

## Performance Advisories (INFO level)

| Advisory | Typical Count | Remediation |
|----------|---------------|-------------|
| multiple_permissive_policies | 700+ | Consolidate to single policy per table |
| auth_rls_initplan | 280+ | Wrap auth.uid() in (SELECT auth.uid()) |
| unindexed_foreign_keys | 270+ | Add indexes as tables grow |
| unused_index | 90+ | Review and drop |
| no_primary_key | 5 | Add PKs |
| auth_db_connections_absolute | 1 | Switch to percentage-based pooling |
