#!/usr/bin/env node
//
// generate-capability-matrix.js
//
// Walks each in-scope app's local clone and scores it against the canonical
// 8-capability security envelope (see references/canonical-envelope.md).
//
// Emits:
//   --out-json=<path>           Machine-readable gap matrix for remediate skill
//   --out-docx-fragment=<path>  Section 14 content for generate-report.js to consume
//
// Detection is heuristic — file presence, grep patterns, key string hits.
// Scoring is one of: PRESENT | PARTIAL | MISSING | N/A-ASSUMPTION
//
// Run:
//   node scripts/generate-capability-matrix.js \
//     --apps-root=/home/claude \
//     --out-json=/mnt/user-data/outputs/security-audit-$(date +%Y-%m-%d).json \
//     --out-docx-fragment=/home/claude/audit-output/section-14-fragment.json

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ───────────────────────────────────────────────────────────────────────────
// In-scope app catalog. KEEP IN SYNC WITH SKILL.md "Applications In Scope"
// table. The remediate skill reads this same list via the JSON sidecar.
// ───────────────────────────────────────────────────────────────────────────

const APPS = [
  { dir: 'c2c-repo',          repo: 'C2C',                 domain: 'c2c.starttoday.biz',          router: 'app',   canonical: true,
    note: 'Canonical reference baseline' },
  { dir: 'pa-repo',           repo: 'Platform-Admin',      domain: 'admin.starttoday.biz',        router: 'app',
    note: 'Reference port. csrfGate warn/enforce mode is a backport candidate for C2C.' },
  { dir: 'atty-repo',         repo: 'attorney-dashboard',  domain: 'legal.starttoday.biz',        router: 'app' },
  { dir: 'admin-user',        repo: 'Admin-User',          domain: 'admin (legacy)',              router: 'pages' },
  { dir: 'client-dashboard',  repo: 'Client-Dashboard',    domain: 'client.starttoday.biz',       router: 'app',
    note: 'Largest user-facing surface' },
  { dir: 'compliance-user',   repo: 'compliance-User',     domain: 'compliance.starttoday.biz',   router: 'pages' },
  { dir: 'client-ep',         repo: 'Client-EP',           domain: 'starttoday.estate',           router: 'app' },
  { dir: 'hr-repo',           repo: 'HR',                  domain: 'hr.starttoday.biz',           router: 'app' },
  { dir: 'prohr-repo',        repo: 'ProHR',               domain: 'prohr.starttoday.biz',        router: 'app' },
  { dir: 'employee-repo',     repo: 'employee',            domain: 'employee.starttoday.biz',     router: 'app' },
  { dir: 'bank-repo',         repo: 'Bank',                domain: 'bank.starttoday.biz',         router: 'app' },
  { dir: 'lender-repo',       repo: 'Lender',              domain: 'lender.starttoday.biz',       router: 'app' },
  { dir: 'mga-repo',          repo: 'MGA',                 domain: 'mga.starttoday.biz',          router: 'app' },
  { dir: 'mylegal-repo',      repo: 'mylegal',             domain: 'mylegal.starttoday.biz',      router: 'app' },
  { dir: 'plan-repo',         repo: 'plan',                domain: 'plan.starttoday.biz',         router: 'app' },
  { dir: 'marketplace-repo',  repo: 'marketplace',         domain: 'marketplace.starttoday.biz',  router: 'app' },
  { dir: 'work-repo',         repo: 'Work',                domain: 'work.starttoday.biz',         router: 'app' },
  { dir: 'property-repo',     repo: 'Property',            domain: 'property.starttoday.biz',     router: 'app' },
  { dir: 'accounting-repo',   repo: 'Accounting',          domain: 'accounting.starttoday.biz',   router: 'app' },
  { dir: 'finance-repo',      repo: 'Finance',             domain: 'finance.starttoday.biz',      router: 'app' },
];

const OUT_OF_SCOPE = [
  { repo: 'stverify', reason: 'Separate Supabase account (ewfahugybiaizfurlyop). Different envelope.' },
  { repo: 'chamber',  reason: 'Per-app TOTP MFA pattern, not the canonical shared-cookie pattern.' },
  { repo: 'carl',     reason: 'LLM service / API gateway, not a user-facing authenticated app. Verify before adding.' },
];

// ───────────────────────────────────────────────────────────────────────────
// CLI args
// ───────────────────────────────────────────────────────────────────────────

const args = {};
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--([^=]+)=(.+)$/);
  if (m) args[m[1]] = m[2];
}

const APPS_ROOT       = args['apps-root']         || '/home/claude';
const OUT_JSON        = args['out-json']          || `/mnt/user-data/outputs/security-audit-${new Date().toISOString().slice(0,10)}.json`;
const OUT_DOCX_FRAG   = args['out-docx-fragment'] || '/home/claude/audit-output/section-14-fragment.json';

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function fileContains(p, needles) {
  if (!exists(p)) return false;
  let content;
  try { content = fs.readFileSync(p, 'utf8'); } catch { return false; }
  return needles.every(n => n instanceof RegExp ? n.test(content) : content.includes(n));
}

function fileContainsAny(p, needles) {
  if (!exists(p)) return false;
  let content;
  try { content = fs.readFileSync(p, 'utf8'); } catch { return false; }
  return needles.some(n => n instanceof RegExp ? n.test(content) : content.includes(n));
}

function grepCount(dir, pattern, includes = ['*.js', '*.jsx']) {
  if (!exists(dir)) return 0;
  try {
    const includeArgs = includes.map(i => `--include="${i}"`).join(' ');
    const cmd = `grep -rl ${includeArgs} -- ${JSON.stringify(pattern)} "${dir}" 2>/dev/null | grep -v node_modules | grep -v ".next" | wc -l`;
    return parseInt(execSync(cmd, { encoding: 'utf8' }).trim(), 10) || 0;
  } catch { return 0; }
}

function findFile(dir, candidates) {
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (exists(p)) return c;
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Assumption profile detection
// ───────────────────────────────────────────────────────────────────────────

function detectAssumptions(appDir) {
  const result = {
    supabase_project: 'unknown',
    auth_pattern:     'unknown',
    router:           'unknown',
    helpers_present:  [],
    shared_db_rpcs_available: 'unknown',
    cloned: exists(appDir),
  };
  if (!result.cloned) return result;

  // Router
  if (exists(path.join(appDir, 'app')))   result.router = 'app';
  if (exists(path.join(appDir, 'pages'))) result.router = result.router === 'app' ? 'mixed' : 'pages';

  // Auth pattern
  const middlewarePath = ['middleware.js', 'middleware.ts', 'src/middleware.js', 'src/middleware.ts']
    .map(p => path.join(appDir, p)).find(exists);
  if (middlewarePath) {
    const mw = fs.readFileSync(middlewarePath, 'utf8');
    if (/jose|jwtVerify/.test(mw))                       result.auth_pattern = 'custom_jwt';
    else if (/@supabase\/auth-helpers|createServerClient/.test(mw)) result.auth_pattern = 'supabase_gotrue';
    else if (/next-auth/.test(mw))                       result.auth_pattern = 'next_auth';
  }
  // Fallback if no middleware
  if (result.auth_pattern === 'unknown') {
    if (grepCount(appDir, 'jwtVerify', ['*.js', '*.ts']))                     result.auth_pattern = 'custom_jwt';
    else if (grepCount(appDir, '@supabase/auth-helpers', ['*.js', '*.ts']))   result.auth_pattern = 'supabase_gotrue';
  }

  // Supabase project hint — search env-var defaults or hardcoded URL fragments
  const candidates = ['lib/supabase.js', 'lib/supabase.ts', 'lib/db.js', 'next.config.js'];
  for (const c of candidates) {
    const p = path.join(appDir, c);
    if (!exists(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    if (txt.includes('ptgtliwllimkswtajcmy')) { result.supabase_project = 'canonical'; break; }
    if (txt.includes('ewfahugybiaizfurlyop')) { result.supabase_project = 'stverify';  break; }
  }
  // If we didn't find a hardcoded URL but env vars are referenced, mark as 'env-driven'
  if (result.supabase_project === 'unknown' && grepCount(appDir, 'NEXT_PUBLIC_SUPABASE_URL', ['*.js', '*.jsx', '*.ts'])) {
    result.supabase_project = 'env-driven';
  }

  // Helpers
  const helperCandidates = [
    { name: 'requireSession', patterns: ['requireSession'] },
    { name: 'sbRpc',          patterns: ['function sbRpc',  'export function sbRpc',  'export const sbRpc', 'export async function sbRpc'] },
    { name: 'writeAudit',     patterns: ['writeAudit',      'logAuthEvent'] },
    { name: 'rateLimit',      patterns: ['function rateLimit', 'export function rateLimit', 'export async function rateLimit'] },
    { name: 'verifyCsrf',     patterns: ['verifyCsrf',      'csrfGate'] },
    { name: 'secureFetch',    patterns: ['function secureFetch', 'export function secureFetch'] },
  ];
  for (const h of helperCandidates) {
    if (h.patterns.some(p => grepCount(appDir, p, ['*.js', '*.jsx', '*.ts']) > 0)) {
      result.helpers_present.push(h.name);
    }
  }

  // Shared-DB RPC availability is mostly a function of supabase_project. If
  // canonical, the shared RPCs (mfa_backup_codes_*, admin_reset_user_mfa, etc.)
  // are reachable. If separate, they're not. If env-driven, we can't tell from
  // source alone — flag as 'unknown'.
  result.shared_db_rpcs_available =
    result.supabase_project === 'canonical' ? true :
    result.supabase_project === 'stverify'  ? false :
    'unknown';

  return result;
}

// ───────────────────────────────────────────────────────────────────────────
// Capability detection
//
// Each detector returns { score, evidence, hint? }
// score: 'PRESENT' | 'PARTIAL' | 'MISSING' | 'N/A-ASSUMPTION'
// ───────────────────────────────────────────────────────────────────────────

function detectAuditLog(appDir, assumptions) {
  const helperPath = findFile(appDir, [
    'lib/security/audit.js', 'lib/security/audit.ts',
    'lib/audit.js', 'src/lib/security/audit.js',
  ]);
  if (!helperPath) return { score: 'MISSING', evidence: 'No lib/security/audit.js helper found' };

  // Calls in login route
  const loginRoutes = [
    'app/api/auth/login/route.js', 'app/api/auth/login/route.ts',
    'pages/api/auth/login.js', 'pages/api/auth/login.ts',
  ];
  const loginPath = findFile(appDir, loginRoutes);
  if (!loginPath) {
    return { score: 'PARTIAL', evidence: `${helperPath} exists but no login route found to verify calls` };
  }
  const loginCallsAudit = fileContainsAny(path.join(appDir, loginPath), ['writeAudit', 'logAuthEvent']);
  if (!loginCallsAudit) {
    return { score: 'PARTIAL', evidence: `${helperPath} exists but ${loginPath} doesn't call it` };
  }
  return { score: 'PRESENT', evidence: `${helperPath} + called from ${loginPath}` };
}

function detectRateLimit(appDir, assumptions) {
  const helperPath = findFile(appDir, [
    'lib/security/rate-limit.js', 'lib/security/rate-limit.ts',
    'lib/rate-limit.js',
  ]);
  if (!helperPath) return { score: 'MISSING', evidence: 'No lib/security/rate-limit.js helper found' };

  const loginRoutes = ['app/api/auth/login/route.js', 'pages/api/auth/login.js'];
  const loginPath = findFile(appDir, loginRoutes);
  if (!loginPath) {
    return { score: 'PARTIAL', evidence: `${helperPath} exists but no login route found` };
  }
  const loginCallsRateLimit = fileContains(path.join(appDir, loginPath), ['rateLimit']);
  if (!loginCallsRateLimit) {
    return { score: 'PARTIAL', evidence: `${helperPath} exists but ${loginPath} doesn't call it` };
  }
  return { score: 'PRESENT', evidence: `${helperPath} + called from ${loginPath}` };
}

function detectHeaders(appDir, assumptions) {
  // The canonical pattern is applySecurityHeaders() called from middleware
  // on every NextResponse exit. The function may be either:
  //   - extracted to lib/security/headers.js (padmin's pattern)
  //   - inlined into middleware.js itself (C2C's pattern)
  // Either is acceptable. What matters is reachability + coverage of all
  // exit branches.
  const helperPath = findFile(appDir, ['lib/security/headers.js', 'lib/security/headers.ts']);
  const middlewarePath = findFile(appDir, ['middleware.js', 'middleware.ts', 'src/middleware.js']);

  if (!middlewarePath) {
    const cfgHasHeaders = fileContainsAny(path.join(appDir, 'next.config.js'), ['Strict-Transport', 'X-Content-Type-Options']);
    if (cfgHasHeaders) {
      return { score: 'PARTIAL', evidence: 'next.config.js has headers but no middleware (misses runtime-built responses)' };
    }
    return { score: 'MISSING', evidence: 'No middleware and no next.config.js header block' };
  }

  const mwContent = fs.readFileSync(path.join(appDir, middlewarePath), 'utf8');
  const mwHasInlineFn   = /function\s+applySecurityHeaders|const\s+applySecurityHeaders\s*=/.test(mwContent);
  const mwImportsHelper = /import.*applySecurityHeaders.*from/.test(mwContent);
  const mwSetsHeaders   = /headers\.set\(['"](?:Strict-Transport|X-Content-Type|X-Frame-Options|Referrer-Policy)/.test(mwContent);

  if (!helperPath && !mwHasInlineFn && !mwSetsHeaders) {
    return { score: 'MISSING', evidence: 'No headers helper file, no inline function, no header-set calls in middleware' };
  }

  // Verify the helper is actually invoked (not just defined)
  const invokedCount = (mwContent.match(/applySecurityHeaders\s*\(/g) || []).length;
  // (definitions also count as matches; subtract 1 if function is defined inline)
  const callSites = mwHasInlineFn ? Math.max(0, invokedCount - 1) : invokedCount;

  if (callSites === 0 && !mwSetsHeaders) {
    return {
      score: 'PARTIAL',
      evidence: `applySecurityHeaders defined but never invoked from middleware exit branches`,
    };
  }

  if (helperPath && mwImportsHelper) {
    return { score: 'PRESENT', evidence: `${helperPath} + imported by ${middlewarePath} (${callSites} call sites)` };
  }
  if (mwHasInlineFn) {
    return { score: 'PRESENT', evidence: `applySecurityHeaders inlined in ${middlewarePath} (${callSites} call sites)` };
  }
  return { score: 'PRESENT', evidence: `${middlewarePath} sets security headers directly` };
}

function detectDashboard(appDir, assumptions) {
  const candidates = [
    'app/admin/login-attempts/page.jsx',
    'app/admin/login-attempts/page.js',
    'pages/admin/login-attempts.js',
    'pages/admin/login-attempts.jsx',
  ];
  const pagePath = findFile(appDir, candidates);
  if (!pagePath) return { score: 'MISSING', evidence: 'No /admin/login-attempts page found' };

  const apiCandidates = [
    'app/api/admin/security/login-attempts/route.js',
    'app/api/c2c/admin/login-attempts/route.js',
    'pages/api/admin/security/login-attempts.js',
  ];
  const apiPath = findFile(appDir, apiCandidates);
  if (!apiPath) {
    return { score: 'PARTIAL', evidence: `${pagePath} exists but no backing API route found` };
  }
  const summaryRpcCalled = fileContainsAny(path.join(appDir, apiPath), ['login_attempts_summary']);
  if (!summaryRpcCalled) {
    return { score: 'PARTIAL', evidence: `${pagePath} + ${apiPath} exist but RPC call not detected` };
  }
  return { score: 'PRESENT', evidence: `${pagePath} + ${apiPath} + summary RPC` };
}

function detectMfaEnforcement(appDir, assumptions) {
  // If app uses Supabase GoTrue, the canonical custom-JWT pattern doesn't apply
  if (assumptions.auth_pattern === 'supabase_gotrue') {
    return { score: 'N/A-ASSUMPTION', evidence: 'App uses Supabase GoTrue native MFA — different detection rule' };
  }

  const loginRoutes = [
    'app/api/auth/login/route.js',
    'app/api/c2c/auth/login/route.js',
    'pages/api/auth/login.js',
  ];
  const loginPath = findFile(appDir, loginRoutes);
  if (!loginPath) return { score: 'MISSING', evidence: 'No login route found' };

  const loginContent = fs.readFileSync(path.join(appDir, loginPath), 'utf8');
  const hasMfaRequired = /mfa_required|mfa_pending/.test(loginContent);
  const hasMfaSetup    = /mfa_setup_required|MFA_SETUP_COOKIE/i.test(loginContent);

  const mfaChallengePath = findFile(appDir, [
    'app/mfa-challenge/page.jsx', 'app/mfa-challenge/page.js',
    'app/(auth)/mfa-challenge/page.jsx',
    'pages/mfa-challenge.js',
  ]);
  const mfaEnrollPath = findFile(appDir, [
    'app/mfa-enroll/page.jsx', 'app/mfa-enroll/page.js',
    'app/(auth)/mfa-enroll/page.jsx',
    'pages/mfa-enroll.js',
  ]);

  if (!hasMfaRequired && !hasMfaSetup) {
    return { score: 'MISSING', evidence: 'Login route returns no MFA outcomes (Mode B not even partially implemented)' };
  }
  if (hasMfaRequired && hasMfaSetup && mfaChallengePath && mfaEnrollPath) {
    return { score: 'PRESENT', evidence: `Mode A — forced enrollment lane: login + ${mfaChallengePath} + ${mfaEnrollPath}` };
  }
  if (hasMfaRequired && mfaChallengePath && mfaEnrollPath && !hasMfaSetup) {
    // Mode B — admin must self-enroll. PRESENT-but-weaker.
    return {
      score: 'PARTIAL',
      evidence: 'Mode B — manual enrollment (no forced lane). Admin without factor can log in once. Backport Mode A from padmin Sprint N.',
      hint: 'mode_b_backport_n',
    };
  }
  return {
    score: 'PARTIAL',
    evidence: `Incomplete MFA wiring — required=${hasMfaRequired} setup=${hasMfaSetup} challenge=${!!mfaChallengePath} enroll=${!!mfaEnrollPath}`,
  };
}

function detectBackupCodes(appDir, assumptions) {
  if (assumptions.shared_db_rpcs_available === false) {
    return { score: 'N/A-ASSUMPTION', evidence: 'App on separate Supabase — shared backup-code RPCs not available; needs own deployment' };
  }

  const mfaHelperPath = findFile(appDir, ['lib/security/mfa.js', 'lib/security/mfa.ts']);
  if (!mfaHelperPath) return { score: 'MISSING', evidence: 'No lib/security/mfa.js helper' };

  const helperHasBackup = fileContainsAny(path.join(appDir, mfaHelperPath), [
    'generateBackupCodes', 'looksLikeBackupCode',
  ]);
  if (!helperHasBackup) {
    return { score: 'PARTIAL', evidence: `${mfaHelperPath} exists but no backup-code helpers` };
  }

  const verifyRoute = findFile(appDir, [
    'app/api/auth/mfa-verify/route.js',
    'pages/api/auth/mfa-verify.js',
  ]);
  if (!verifyRoute) return { score: 'PARTIAL', evidence: 'Helpers exist but no mfa-verify route' };

  const verifyHandlesBackup = fileContains(path.join(appDir, verifyRoute), ['looksLikeBackupCode']);
  if (!verifyHandlesBackup) {
    return { score: 'PARTIAL', evidence: `Helpers + ${verifyRoute} exist but verify doesn't dispatch on backup code` };
  }

  const backupCodesApi = findFile(appDir, [
    'app/api/auth/mfa-backup-codes/route.js',
    'pages/api/auth/mfa-backup-codes.js',
  ]);
  if (!backupCodesApi) {
    return { score: 'PARTIAL', evidence: 'Verify dispatches but no mfa-backup-codes API for self-service regen' };
  }
  return { score: 'PRESENT', evidence: `${mfaHelperPath} + ${verifyRoute} dispatch + ${backupCodesApi}` };
}

function detectSettingsPage(appDir, assumptions) {
  const candidates = [
    'app/settings/security/page.jsx', 'app/settings/security/page.js',
    'pages/settings/security.js', 'pages/settings/security.jsx',
  ];
  const pagePath = findFile(appDir, candidates);
  if (!pagePath) return { score: 'MISSING', evidence: 'No /settings/security page found' };

  // Check for low-codes banner — optional but a common gap
  const bannerExists = grepCount(appDir, 'LowBackupCodesBanner', ['*.jsx', '*.js']) > 0
                    || grepCount(appDir, 'low_backup_codes',     ['*.jsx', '*.js']) > 0;
  return {
    score: bannerExists ? 'PRESENT' : 'PARTIAL',
    evidence: bannerExists ? `${pagePath} + low-codes banner` : `${pagePath} exists but no low-codes dashboard banner`,
  };
}

function detectAdminReset(appDir, assumptions) {
  if (assumptions.shared_db_rpcs_available === false) {
    return { score: 'N/A-ASSUMPTION', evidence: 'App on separate Supabase — fn_admin_reset_user_mfa not available' };
  }

  const pagePath = findFile(appDir, [
    'app/admin/mfa-reset/page.jsx', 'app/admin/mfa-reset/page.js',
    'pages/admin/mfa-reset.js',
  ]);
  if (!pagePath) return { score: 'MISSING', evidence: 'No /admin/mfa-reset page' };

  const apiPath = findFile(appDir, [
    'app/api/admin/security/mfa-reset/route.js',
    'app/api/admin/mfa-reset/route.js',
    'app/api/c2c/admin/mfa-reset/route.js',
    'app/api/legal/admin/mfa-reset/route.js',
    'pages/api/admin/security/mfa-reset.js',
    'pages/api/admin/mfa-reset.js',
  ]);
  if (!apiPath) return { score: 'PARTIAL', evidence: `${pagePath} exists but no API route` };

  const apiContent = fs.readFileSync(path.join(appDir, apiPath), 'utf8');
  const hasSelfGuard = /self_reset_forbidden|admin_user_id\s*===?\s*target_user_id|admin_user_id\s*!==?\s*target_user_id/.test(apiContent);
  if (!hasSelfGuard) {
    return { score: 'PARTIAL', evidence: `${pagePath} + ${apiPath} exist but no self-reset guard rail detected` };
  }
  return { score: 'PRESENT', evidence: `${pagePath} + ${apiPath} + self-guard` };
}

function detectCsrf(appDir, assumptions) {
  const helperPath = findFile(appDir, [
    'lib/security/csrf.js', 'lib/security/csrf.ts',
  ]);
  if (!helperPath) return { score: 'MISSING', evidence: 'No lib/security/csrf.js helper', stage: 0 };

  const middlewarePath = findFile(appDir, ['middleware.js', 'middleware.ts']);
  const mwAttachesCookie = middlewarePath && fileContainsAny(path.join(appDir, middlewarePath), ['attachCsrfCookie', 'ensureCsrfCookie', 'csrf_cookie', 'CSRF_COOKIE']);
  if (!mwAttachesCookie) {
    return { score: 'PARTIAL', evidence: `${helperPath} exists but middleware doesn't attach cookie`, stage: 0 };
  }

  // Count routes calling verifyCsrf or csrfGate
  const routesGated = grepCount(appDir, 'verifyCsrf', ['*.js']) + grepCount(appDir, 'csrfGate', ['*.js']);
  if (routesGated === 0) {
    return { score: 'PARTIAL', evidence: 'Helper + cookie attached but no routes call verifyCsrf', stage: 0 };
  }

  // Detect enforce mode. Two patterns count as "enforce":
  //   1. csrfMode() default-flipped to 'enforce' (padmin Sprint W pattern)
  //   2. withSecurity({ requireCsrf: true, ... }) flag set (C2C pattern)
  // Either alone is sufficient.
  const helperContent = fs.readFileSync(path.join(appDir, helperPath), 'utf8');
  const enforceFlipDetected = /return\s+'enforce'|PA_CSRF_DISABLE|C2C_CSRF_DISABLE/.test(helperContent);
  const requireCsrfFlagUsed = grepCount(appDir, 'requireCsrf:\\s*true', ['*.js']) > 0
                           || grepCount(appDir, 'requireCsrf: true', ['*.js']) > 0;

  if (routesGated < 5) {
    return { score: 'PARTIAL', evidence: `${routesGated} route(s) gated — Stage 1 (curated)`, stage: 1 };
  }
  if (!enforceFlipDetected && !requireCsrfFlagUsed) {
    return { score: 'PARTIAL', evidence: `${routesGated} routes gated — Stage 2 (warn-only suspected)`, stage: 2 };
  }
  const enforceVia = enforceFlipDetected ? 'csrfMode()-default-enforce' : 'requireCsrf:true flag';
  return { score: 'PRESENT', evidence: `${routesGated} routes gated + enforce via ${enforceVia} — Stage 3`, stage: 3 };
}

const DETECTORS = [
  { key: 'audit_log',       fn: detectAuditLog },
  { key: 'rate_limit',      fn: detectRateLimit },
  { key: 'headers',         fn: detectHeaders },
  { key: 'dashboard',       fn: detectDashboard },
  { key: 'mfa_enforcement', fn: detectMfaEnforcement },
  { key: 'backup_codes',    fn: detectBackupCodes },
  { key: 'settings_page',   fn: detectSettingsPage },
  { key: 'admin_reset',     fn: detectAdminReset },
  { key: 'csrf',            fn: detectCsrf },
];

// ───────────────────────────────────────────────────────────────────────────
// Sprint mapping for gap → playbook (the remediate skill consumes this)
// ───────────────────────────────────────────────────────────────────────────

const PLAYBOOK_SPRINT = {
  audit_log:       'R',
  rate_limit:      'R',
  headers:         'R',
  dashboard:       'R',
  mfa_enforcement: 'R',
  backup_codes:    'S',
  settings_page:   'S',
  admin_reset:     'T',
  csrf:            'U+V+W',
};

// ───────────────────────────────────────────────────────────────────────────
// Score one app
// ───────────────────────────────────────────────────────────────────────────

function resolveAppDir(rootDir, app) {
  // Try the canonical dir name first, then a few common aliases. This lets
  // the script work in sandboxes where repos were cloned with shorter names
  // (e.g. 'padmin' vs 'pa-repo', 'c2c' vs 'c2c-repo').
  const aliases = {
    'c2c-repo':         ['c2c-repo', 'c2c', 'C2C'],
    'pa-repo':          ['pa-repo', 'padmin', 'platform-admin', 'Platform-Admin'],
    'atty-repo':        ['atty-repo', 'attorney-dashboard'],
    'admin-user':       ['admin-user', 'Admin-User'],
    'client-dashboard': ['client-dashboard', 'Client-Dashboard'],
    'compliance-user':  ['compliance-user', 'compliance-User'],
    'client-ep':        ['client-ep', 'Client-EP'],
    'hr-repo':          ['hr-repo', 'HR', 'hr'],
    'prohr-repo':       ['prohr-repo', 'ProHR', 'prohr'],
    'employee-repo':    ['employee-repo', 'employee'],
    'bank-repo':        ['bank-repo', 'bank', 'Bank'],
    'lender-repo':      ['lender-repo', 'lender', 'Lender'],
    'mga-repo':         ['mga-repo', 'mga', 'MGA'],
    'mylegal-repo':     ['mylegal-repo', 'mylegal'],
    'plan-repo':        ['plan-repo', 'plan'],
    'marketplace-repo': ['marketplace-repo', 'marketplace'],
    'work-repo':        ['work-repo', 'work', 'Work'],
    'property-repo':    ['property-repo', 'property', 'Property'],
    'accounting-repo':  ['accounting-repo', 'accounting', 'Accounting'],
    'finance-repo':     ['finance-repo', 'finance', 'Finance'],
  };
  for (const candidate of (aliases[app.dir] || [app.dir])) {
    const p = path.join(rootDir, candidate);
    if (exists(p)) return p;
  }
  return path.join(rootDir, app.dir); // returns non-existent path; caller checks via .cloned
}

function scoreApp(app) {
  const appDir = resolveAppDir(APPS_ROOT, app);
  const assumptions = detectAssumptions(appDir);

  if (!assumptions.cloned) {
    return {
      name: app.dir,
      repo: app.repo,
      domain: app.domain,
      in_scope: true,
      canonical: !!app.canonical,
      assumptions,
      capabilities: {},
      gaps: [],
      notes: ['App directory not cloned — clone with `git clone https://github.com/Starttodaybiz/' + app.repo + '.git ' + app.dir + '` then re-run'],
      blocked: true,
    };
  }

  const capabilities = {};
  const gaps = [];

  for (const d of DETECTORS) {
    const result = d.fn(appDir, assumptions);
    capabilities[d.key] = result;
    if (result.score === 'MISSING' || result.score === 'PARTIAL') {
      gaps.push({
        capability: d.key,
        current: result.score,
        playbook_sprint: PLAYBOOK_SPRINT[d.key],
        evidence: result.evidence,
      });
    }
  }

  const notes = [];
  if (app.note) notes.push(app.note);
  if (assumptions.supabase_project === 'env-driven') {
    notes.push('Supabase project not hardcoded — verify project ID before remediating shared-DB capabilities');
  }

  return {
    name: app.dir,
    repo: app.repo,
    domain: app.domain,
    in_scope: true,
    canonical: !!app.canonical,
    assumptions,
    capabilities,
    gaps,
    notes,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const apps = APPS.map(scoreApp);

  const matrix = {
    schema_version: '1.0',
    audit_date: today,
    canonical_reference: 'c2c-repo',
    apps,
    discovered_out_of_scope: OUT_OF_SCOPE,
  };

  // Ensure output dirs exist
  fs.mkdirSync(path.dirname(OUT_JSON),      { recursive: true });
  fs.mkdirSync(path.dirname(OUT_DOCX_FRAG), { recursive: true });

  fs.writeFileSync(OUT_JSON,      JSON.stringify(matrix, null, 2));
  fs.writeFileSync(OUT_DOCX_FRAG, JSON.stringify(matrix, null, 2));

  // Console summary
  console.log(`\nCapability matrix written:`);
  console.log(`  JSON sidecar: ${OUT_JSON}`);
  console.log(`  Docx fragment: ${OUT_DOCX_FRAG}`);
  console.log(`\nApps audited: ${apps.length}`);
  console.log(`Out-of-scope (deferred): ${OUT_OF_SCOPE.length}`);

  console.log(`\n${'App'.padEnd(20)} ${'audit'.padEnd(8)} ${'rate'.padEnd(8)} ${'hdrs'.padEnd(8)} ${'dash'.padEnd(8)} ${'mfa'.padEnd(8)} ${'bkup'.padEnd(8)} ${'sett'.padEnd(8)} ${'rset'.padEnd(8)} ${'csrf'.padEnd(8)}`);
  console.log('-'.repeat(110));
  for (const a of apps) {
    if (a.blocked) {
      console.log(`${a.name.padEnd(20)} (not cloned)`);
      continue;
    }
    const cells = DETECTORS.map(d => {
      const s = a.capabilities[d.key]?.score || '?';
      return s === 'PRESENT' ? '✓' :
             s === 'PARTIAL' ? '~' :
             s === 'MISSING' ? '✗' :
             s === 'N/A-ASSUMPTION' ? 'n/a' : '?';
    });
    console.log(`${a.name.padEnd(20)} ${cells.map(c => c.padEnd(8)).join('')}`);
  }
  console.log('\n  ✓ PRESENT   ~ PARTIAL   ✗ MISSING   n/a N/A-ASSUMPTION\n');
}

main();
