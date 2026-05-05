#!/usr/bin/env node
//
// generate-plan.js
//
// Reads the JSON gap matrix from platform-security-audit (Step 5 sidecar)
// and produces a guided remediation plan in markdown. The plan is ordered
// by canonical sprint sequence with hard dependencies respected, and ends
// each sprint section with a READY-for-approval boundary marker.
//
// Run:
//   node scripts/generate-plan.js \
//     --json=/mnt/user-data/outputs/security-audit-2026-05-05.json \
//     --app=atty-repo \
//     --out=/mnt/user-data/outputs/atty-repo-remediation-plan.md

const fs   = require('fs');
const path = require('path');

// ───────────────────────────────────────────────────────────────────────────
// CLI args
// ───────────────────────────────────────────────────────────────────────────

const args = {};
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--([^=]+)=(.+)$/);
  if (m) args[m[1]] = m[2];
}

const JSON_PATH = args['json'] || `/mnt/user-data/outputs/security-audit-${new Date().toISOString().slice(0,10)}.json`;
const APP_NAME  = args['app'];
const OUT_PATH  = args['out']  || (APP_NAME ? `/mnt/user-data/outputs/${APP_NAME}-remediation-plan.md` : null);

if (!APP_NAME) {
  console.error('Usage: node generate-plan.js --json=<path> --app=<app-name> [--out=<path>]');
  process.exit(2);
}
if (!OUT_PATH) {
  console.error('--out path could not be derived; provide --out=<path>');
  process.exit(2);
}

// ───────────────────────────────────────────────────────────────────────────
// Load JSON sidecar
// ───────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(JSON_PATH)) {
  console.error(`JSON sidecar not found: ${JSON_PATH}`);
  console.error('Run platform-security-audit first to produce the gap matrix.');
  process.exit(2);
}

const matrix = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

// Staleness check
const auditDate = new Date(matrix.audit_date + 'T00:00:00Z');
const ageMs = Date.now() - auditDate.getTime();
const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
if (ageDays > 7) {
  console.error(`JSON sidecar is ${ageDays} days old (> 7-day staleness threshold).`);
  console.error('Re-run platform-security-audit before generating a plan.');
  process.exit(2);
}

// ───────────────────────────────────────────────────────────────────────────
// Find target app
// ───────────────────────────────────────────────────────────────────────────

const app = matrix.apps.find(a => a.name === APP_NAME);
if (!app) {
  console.error(`App "${APP_NAME}" not found in JSON sidecar.`);
  console.error(`Available apps: ${matrix.apps.map(a => a.name).join(', ')}`);
  console.error(`Out-of-scope (will refuse): ${matrix.discovered_out_of_scope.map(o => o.repo).join(', ')}`);
  process.exit(2);
}

// Refusal rules
if (matrix.discovered_out_of_scope.some(o => o.repo === app.repo)) {
  console.error(`Refusing: ${APP_NAME} (${app.repo}) is marked out_of_scope. Audit separately.`);
  process.exit(2);
}
if (app.canonical) {
  console.error(`Refusing: ${APP_NAME} is the canonical reference. The canonical IS the playbook.`);
  console.error(`If the matrix flagged a gap on the canonical (e.g., Mode A backport), that's a "canonical improvement" sprint, not a remediation. Plan it manually.`);
  process.exit(2);
}
if (app.blocked) {
  console.error(`Refusing: ${APP_NAME} is not cloned. Run the audit's clone step first.`);
  process.exit(2);
}

// ───────────────────────────────────────────────────────────────────────────
// Sprint sequencing
//
// Sprints have hard dependencies. R must precede S; S must precede T;
// U must precede V must precede W.
//
// Each sprint closes a SET of capability gaps. We emit a sprint section
// only if at least one of its gaps applies to the target app.
// ───────────────────────────────────────────────────────────────────────────

const SPRINT_DEFINITIONS = [
  {
    sprint: 'R',
    title: 'Security infrastructure foundation',
    closes: ['audit_log', 'rate_limit', 'headers', 'dashboard', 'mfa_enforcement'],
    depends_on: [],
    summary: 'Lays down `lib/security/*` helpers, audit log + rate-limit DB infra, security headers, login-attempts dashboard, and MFA enforcement (Mode A or Mode B). Foundational — every other sprint depends on its scaffolding.',
  },
  {
    sprint: 'S',
    title: 'Backup recovery codes + self-service settings',
    closes: ['backup_codes', 'settings_page'],
    depends_on: ['R'],
    summary: 'Adds 10 single-use recovery codes (hashed at rest), the `/settings/security` page where admins can see/regenerate them, and the low-codes warning banner.',
  },
  {
    sprint: 'T',
    title: 'Admin MFA reset workstation',
    closes: ['admin_reset'],
    depends_on: ['S'],
    summary: 'First-class lockout-recovery tool: `/admin/mfa-reset` page + 6-gate API route + RPCs with self-reset guard. Replaces the SQL-by-hand pattern.',
  },
  {
    sprint: 'U',
    title: 'CSRF infrastructure + curated enforcement (Stage 1)',
    closes: ['csrf'],
    csrf_stage_min: 0,
    csrf_stage_max: 0,
    depends_on: [],
    summary: 'Adds `lib/security/csrf.js` + `lib/client/secure-fetch.js`, attaches CSRF cookie via middleware, gates the 10 highest-value auth-grade endpoints (login, signout, MFA, admin actions). Other routes still bare.',
  },
  {
    sprint: 'V',
    title: 'Bulk CSRF gate rollout (Stage 2 — warn-only)',
    closes: ['csrf'],
    csrf_stage_min: 1,
    csrf_stage_max: 1,
    depends_on: ['U'],
    summary: 'Mass-applies `csrfGate(request)` to every remaining state-changing route in warn-only mode. Backend infrastructure-ready while frontend migration runs in parallel.',
  },
  {
    sprint: 'W',
    title: 'Frontend migration + flip to enforce (Stage 3)',
    closes: ['csrf'],
    csrf_stage_min: 2,
    csrf_stage_max: 2,
    depends_on: ['V'],
    summary: 'Mass-migrates frontend `fetch()` calls to `secureFetch()`, then flips `csrfMode()` default from warn to enforce. Kill-switch via `<APP>_CSRF_DISABLE=1` env var for emergency rollback.',
  },
];

// Backport sprints — only included if a specific hint was emitted
const BACKPORT_SPRINTS = [
  {
    sprint: 'N',
    title: 'Mode A backport (forced enrollment lane)',
    triggered_by_hint: 'mode_b_backport_n',
    summary: 'Upgrades MFA enforcement from Mode B (manual self-enrollment) to Mode A (forced enrollment lane). Closes the window where a newly-provisioned admin without a factor could be impersonated by anyone with the password.',
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Determine which sprints apply to this app
// ───────────────────────────────────────────────────────────────────────────

function sprintApplies(sprintDef, gaps, capabilities) {
  // Pull all gaps for capabilities this sprint closes
  let matchingGaps = gaps.filter(g => sprintDef.closes.includes(g.capability));

  // Special case: if mfa_enforcement is PARTIAL with the mode_b_backport_n
  // hint, Sprint N handles it — drop it from Sprint R's matches so we don't
  // duplicate guidance.
  if (sprintDef.sprint === 'R') {
    const mfaCap = capabilities.mfa_enforcement;
    if (mfaCap?.hint === 'mode_b_backport_n') {
      matchingGaps = matchingGaps.filter(g => g.capability !== 'mfa_enforcement');
    }
  }

  if (matchingGaps.length === 0) return null;

  // CSRF-stage filtering: each CSRF sprint only applies if the current
  // stage is below its target.
  if (sprintDef.csrf_stage_max !== undefined) {
    const csrfCap = capabilities.csrf;
    const currentStage = csrfCap?.stage !== undefined ? csrfCap.stage : 0;
    if (currentStage > sprintDef.csrf_stage_max) {
      return null;  // already past this stage
    }
  }

  return matchingGaps;
}

const applicableSprints = [];
for (const def of SPRINT_DEFINITIONS) {
  const matchingGaps = sprintApplies(def, app.gaps, app.capabilities);
  if (matchingGaps) {
    applicableSprints.push({ ...def, gaps: matchingGaps });
  }
}

// Backport sprints — appended after main sequence
const applicableBackports = [];
for (const bp of BACKPORT_SPRINTS) {
  const triggered = Object.values(app.capabilities).some(c => c.hint === bp.triggered_by_hint);
  if (triggered) applicableBackports.push(bp);
}

// ───────────────────────────────────────────────────────────────────────────
// Assumption-violation callouts
// ───────────────────────────────────────────────────────────────────────────

function assumptionCallouts(app) {
  const callouts = [];
  const a = app.assumptions;

  if (a.auth_pattern === 'supabase_gotrue') {
    callouts.push({
      severity: 'PAUSE',
      heading: 'Auth pattern: Supabase GoTrue',
      body: 'This app uses GoTrue native auth, not the canonical custom JWT. Sprint R MFA enforcement and Sprint S backup codes need the override pattern from `references/assumption-overrides.md`. **Verify before proceeding.**',
    });
  }
  if (a.auth_pattern === 'next_auth') {
    callouts.push({
      severity: 'PAUSE',
      heading: 'Auth pattern: NextAuth',
      body: 'NextAuth has its own MFA plugin. Canonical RPC pattern is preferred for parity. See `references/assumption-overrides.md`.',
    });
  }
  if (a.supabase_project === 'separate') {
    callouts.push({
      severity: 'PAUSE',
      heading: 'Supabase project: separate (not canonical)',
      body: 'Shared RPCs (`fn_mfa_backup_codes_*`, `fn_admin_reset_user_mfa`, etc.) are NOT available. Sprints S and T must include their own DB migration steps. The canonical Supabase MCP cannot reach this project — workaround: SQL files in repo, paste into separate project SQL editor manually.',
    });
  }
  if (a.supabase_project === 'env-driven' || a.shared_db_rpcs_available === 'unknown') {
    callouts.push({
      severity: 'VERIFY',
      heading: 'Supabase project not detected from source',
      body: 'The matrix builder could not determine which Supabase project this app uses. Before proceeding with Sprints S or T, confirm the value of `NEXT_PUBLIC_SUPABASE_URL` in the Vercel project env. If it points to canonical (ptgtliwllimkswtajcmy), shared RPCs are available. If separate, deploy them first.',
    });
  }
  if (a.router === 'pages') {
    callouts.push({
      severity: 'INFO',
      heading: 'Pages Router (not App Router)',
      body: 'File-path translations apply: `app/api/foo/route.js` → `pages/api/foo.js`. Middleware uses different request/response shape. See `references/assumption-overrides.md`.',
    });
  }
  if (a.router === 'mixed') {
    callouts.push({
      severity: 'INFO',
      heading: 'Mixed App + Pages Router',
      body: 'Both `app/` and `pages/` directories exist. Treat each by its own router rules. Critical: same auth helpers must serve both — do not fork implementations.',
    });
  }
  if (!a.helpers_present.includes('requireSession') || !a.helpers_present.includes('sbRpc')) {
    callouts.push({
      severity: 'PAUSE',
      heading: 'Foundational helpers missing',
      body: `Detected helpers: ${a.helpers_present.join(', ') || '(none)'}. Sprint R assumes \`requireSession\` and \`sbRpc\` exist on the target. If not, fixing those is its own pre-sprint work (extract from inlined route handlers, or build from scratch). May be 2 commits instead of 1.`,
    });
  }
  return callouts;
}

// ───────────────────────────────────────────────────────────────────────────
// Markdown plan emitter
// ───────────────────────────────────────────────────────────────────────────

function emitPlan() {
  const lines = [];
  const today = new Date().toISOString().slice(0, 10);

  // Header
  lines.push(`# Security Remediation Plan — ${app.name}`);
  lines.push('');
  lines.push(`**Repo:** \`${app.repo}\``);
  lines.push(`**Domain:** \`${app.domain}\``);
  lines.push(`**Plan generated:** ${today}`);
  lines.push(`**Source matrix:** \`${path.basename(JSON_PATH)}\` (audit date ${matrix.audit_date}, age ${ageDays}d)`);
  lines.push(`**Canonical reference:** \`${matrix.canonical_reference}\``);
  lines.push('');

  // Assumption profile
  lines.push('## Assumption profile');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  for (const [k, v] of Object.entries(app.assumptions)) {
    lines.push(`| \`${k}\` | \`${JSON.stringify(v)}\` |`);
  }
  lines.push('');

  // Assumption-violation callouts (if any)
  const callouts = assumptionCallouts(app);
  if (callouts.length > 0) {
    lines.push('## Assumption callouts');
    lines.push('');
    for (const c of callouts) {
      const icon = c.severity === 'PAUSE' ? '⛔' : c.severity === 'VERIFY' ? '⚠️' : 'ℹ️';
      lines.push(`### ${icon} ${c.severity} — ${c.heading}`);
      lines.push('');
      lines.push(c.body);
      lines.push('');
    }
  }

  // Current capability state
  lines.push('## Current capability state');
  lines.push('');
  lines.push('| Capability | Score | Evidence |');
  lines.push('|---|---|---|');
  for (const [cap, info] of Object.entries(app.capabilities)) {
    lines.push(`| ${cap} | **${info.score}** | ${info.evidence} |`);
  }
  lines.push('');

  // Gap summary
  if (app.gaps.length === 0) {
    lines.push('## ✅ No gaps detected');
    lines.push('');
    lines.push('All capabilities are PRESENT or N/A-ASSUMPTION. No remediation sprints needed.');
    lines.push('');
    lines.push('If you believe a capability is mis-scored, re-run `platform-security-audit` and inspect the evidence string for that capability. Detection signals are heuristic — false PRESENT scores are possible if the implementation is unconventional.');
    return lines.join('\n');
  }

  lines.push(`## Gap summary (${app.gaps.length} open)`);
  lines.push('');
  lines.push('| Capability | Current | Closed by sprint |');
  lines.push('|---|---|---|');
  for (const g of app.gaps) {
    lines.push(`| ${g.capability} | ${g.current} | ${g.playbook_sprint} |`);
  }
  lines.push('');

  // Sprint plan
  lines.push('## Sprint plan');
  lines.push('');
  lines.push('Sprints are ordered by hard dependencies. Each sprint section ends with a `READY` boundary — explicit approval required before execution. The skill will not auto-continue past a boundary.');
  lines.push('');

  let sprintIdx = 1;
  for (const s of applicableSprints) {
    lines.push(`### Sprint ${sprintIdx}/${applicableSprints.length + applicableBackports.length} — Sprint ${s.sprint}: ${s.title}`);
    lines.push('');
    lines.push(s.summary);
    lines.push('');

    if (s.depends_on.length > 0) {
      lines.push(`**Depends on:** ${s.depends_on.map(d => `Sprint ${d}`).join(', ')}`);
      lines.push('');
    }

    // If only some of this sprint's gaps apply to this app, note that
    // explicitly. The scaffold-rest is already in place.
    const totalCloses = s.closes.length;
    const matchingCount = s.gaps.length;
    if (matchingCount < totalCloses) {
      const alreadyDone = s.closes.filter(c => !s.gaps.find(g => g.capability === c));
      lines.push(`**Partial application:** This sprint normally lays down all of \`${s.closes.join('`, `')}\`, but \`${alreadyDone.join('`, `')}\` already PRESENT on this app. Execute only the parts touching the open gaps below; reuse existing helpers/middleware.`);
      lines.push('');
    }

    lines.push('**Closes gaps in this app:**');
    for (const g of s.gaps) {
      lines.push(`- \`${g.capability}\` (currently ${g.current}): ${g.evidence}`);
    }
    lines.push('');

    lines.push('**Canonical pattern:** see `references/playbook.md` § Sprint ' + s.sprint);
    lines.push('');

    // Override hints from assumptions
    const sprintCallouts = callouts.filter(c => {
      if (s.sprint === 'R' && (c.heading.includes('Auth pattern') || c.heading.includes('helpers'))) return true;
      if ((s.sprint === 'S' || s.sprint === 'T') && c.heading.includes('Supabase project')) return true;
      if (c.heading.includes('Pages Router') || c.heading.includes('Mixed')) return true;
      return false;
    });
    if (sprintCallouts.length > 0) {
      lines.push('**Overrides apply for this sprint:**');
      for (const c of sprintCallouts) {
        lines.push(`- ${c.heading} — see \`references/assumption-overrides.md\``);
      }
      lines.push('');
    }

    lines.push(`> **READY for Sprint ${s.sprint}.** Say "run sprint ${s.sprint} on ${app.name}" or "go" to execute. To skip, say so. To exit, just stop.`);
    lines.push('');
    lines.push('---');
    lines.push('');
    sprintIdx++;
  }

  // Backport sprints
  for (const bp of applicableBackports) {
    lines.push(`### Sprint ${sprintIdx}/${applicableSprints.length + applicableBackports.length} — Sprint ${bp.sprint} (BACKPORT): ${bp.title}`);
    lines.push('');
    lines.push(bp.summary);
    lines.push('');
    lines.push('**Canonical pattern:** see `references/playbook.md` § Sprint ' + bp.sprint);
    lines.push('');
    lines.push(`> **READY for Sprint ${bp.sprint}.** Say "run sprint ${bp.sprint} on ${app.name}" or "go" to execute.`);
    lines.push('');
    lines.push('---');
    lines.push('');
    sprintIdx++;
  }

  // Wrap-up
  lines.push('## After all sprints');
  lines.push('');
  lines.push('Re-run `platform-security-audit` to confirm gaps are now PRESENT in the matrix. Register regression test cases via `platform-dev-test-ontology` if not already done by each sprint\'s execution phase.');
  lines.push('');
  lines.push('Optional: Sprint X (wrap-up polish) — adds histogram visualisation to the login-attempts dashboard and cleans up dead files. Not required for envelope coverage; nice-to-have.');
  lines.push('');

  return lines.join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Write output
// ───────────────────────────────────────────────────────────────────────────

const planMd = emitPlan();
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, planMd);

console.log(`\nRemediation plan written: ${OUT_PATH}`);
console.log(`  App:        ${app.name} (${app.repo})`);
console.log(`  Gaps:       ${app.gaps.length}`);
console.log(`  Sprints:    ${applicableSprints.length} main + ${applicableBackports.length} backport`);
console.log(`  Callouts:   ${assumptionCallouts(app).length}`);
console.log(`\nNext: present_files with the plan path, then wait for explicit per-sprint approval.`);
