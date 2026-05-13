#!/usr/bin/env node
/**
 * Start Score™ drift check.
 *
 * Sentinel for self-skip: @start-score-drift-scanner
 *
 * Scans .js/.ts/.jsx/.tsx files in the current repo for hardcoded references
 * to Start Score pillar keys, weights, or percentages that should be coming
 * from /api/score-methodology instead.
 *
 * Usage: node scan.js              # exits 1 on drift, 0 if clean
 *        node scan.js --json       # JSON output for CI logs
 *        node scan.js --quiet      # exit code only
 *
 * Reads `.score-drift-allowlist.json` from the repo root if present:
 *   {
 *     "allowed_strings": ["sba_loans", "entity_compliance_view"],
 *     "allowed_paths":   ["pages/api/index-overview.js"]
 *   }
 *
 * Exit code 0 = clean, 1 = drift found, 2 = scanner error.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ───────────────────────────────────────────────────────────────────────────
// Canonical v1.1 pillar set. Update these when methodology changes.
// (Yes, this script itself contains canonical info — but it only validates,
// it doesn't compute scores. Keep in sync with Score_Methodology_Components.)
// ───────────────────────────────────────────────────────────────────────────
const CANONICAL_PILLARS = {
  entity_compliance:   20,
  filings_obligations: 14,
  state_tax:           14,
  risk_insurance:      11,
  hr_compliance:        9,
  kyc_aml:              7,
  licenses_permits:     6,
  governance:           5,
  ucc_liens:            5,
  financial_tax:        5,
  dataroom:             4,
};

const DEPRECATED_PILLARS = ['ownership_gov', 'sba_loans', 'documents', 'dataroom_readiness', 'ucc_liens_covenants', 'ownership_governance'];

// Short aliases that the codebase used to use as pillar keys. These are
// dangerous because they collide with non-pillar usage (e.g. `hr` could
// mean Human Resources in general). We only flag them in contexts that
// look like pillar key usage.
const DEPRECATED_SHORT_ALIASES = ['hr', 'insurance', 'tax', 'licenses'];

// Human-readable display names that frequently appear in hardcoded taglines.
// Used by the "percentage in tagline" check.
const PILLAR_DISPLAY_NAMES = [
  'Entity Compliance', 'Filings & Obligations', 'State Tax', 'State Tax Filings',
  'Risk & Insurance', 'HR Compliance', 'KYC / AML', 'KYC/AML',
  'Licenses & Permits', 'Ownership & Governance', 'Governance',
  'Liens & UCC', 'UCC / Liens', 'UCC/Liens', 'Financial & Tax', 'Dataroom',
  'Dataroom Readiness', 'Entity',
];

// ───────────────────────────────────────────────────────────────────────────
// Repo discovery + allowlist
// ───────────────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(REPO_ROOT, '.score-drift-allowlist.json');

let allowlist = { allowed_strings: [], allowed_paths: [] };
try {
  if (fs.existsSync(ALLOWLIST_PATH)) {
    allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    allowlist.allowed_strings = allowlist.allowed_strings || [];
    allowlist.allowed_paths   = allowlist.allowed_paths   || [];
  }
} catch (e) {
  console.error(`[drift-check] Could not parse ${ALLOWLIST_PATH}: ${e.message}`);
  process.exit(2);
}

const ARGS = new Set(process.argv.slice(2));
const JSON_MODE = ARGS.has('--json');
const QUIET = ARGS.has('--quiet');

// Skip these directories entirely
const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'out',
  '.vercel', '.turbo', 'coverage', '.cache', 'public',
  // The skill itself — don't scan it
  'start-score-drift-check', 'platform-skills',
]);

const SCAN_EXTS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);

// Sentinel: files containing this exact string are skipped (this is how
// the scanner skips itself when copied to scripts/start-score-drift-check.js
// inside a consuming repo).
const SCANNER_SENTINEL = '@start-score-drift-scanner';

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.score-drift-allowlist.json') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTS.has(ext)) yield full;
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Detection rules
// ───────────────────────────────────────────────────────────────────────────

const findings = [];

function addFinding(filePath, lineNo, lineText, rule, detail, suggestion) {
  // Allowlist by path
  const rel = path.relative(REPO_ROOT, filePath);
  if (allowlist.allowed_paths.some(p => rel === p || rel.endsWith('/' + p))) return;

  // Allowlist by string content
  if (allowlist.allowed_strings.some(s => lineText.includes(s) && detail.includes(s))) return;

  findings.push({
    file: rel,
    line: lineNo,
    text: lineText.trim(),
    rule,
    detail,
    suggestion,
  });
}

/**
 * Rule 1: Hardcoded pillar tagline with percentage.
 *
 * Matches patterns like "Entity (22%)" or "HR Compliance (10%)" and checks
 * whether the percentage matches canonical. Stale percentages → error.
 * Exact-match percentages → not flagged (still hardcoded, but at least correct
 * — those can be allowlisted as marketing copy if needed).
 */
function ruleHardcodedTaglinePercentage(filePath, lines) {
  const namesPattern = PILLAR_DISPLAY_NAMES
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const re = new RegExp(`(${namesPattern})\\s*\\(\\s*(\\d+)\\s*%\\)`, 'g');

  // Map display name → canonical key for lookup
  const displayToKey = {
    'Entity Compliance':     'entity_compliance',
    'Entity':                'entity_compliance',
    'Filings & Obligations': 'filings_obligations',
    'State Tax':             'state_tax',
    'State Tax Filings':     'state_tax',
    'Risk & Insurance':      'risk_insurance',
    'HR Compliance':         'hr_compliance',
    'KYC / AML':             'kyc_aml',
    'KYC/AML':               'kyc_aml',
    'Licenses & Permits':    'licenses_permits',
    'Ownership & Governance':'governance',
    'Governance':            'governance',
    'Liens & UCC':           'ucc_liens',
    'UCC / Liens':           'ucc_liens',
    'UCC/Liens':             'ucc_liens',
    'Financial & Tax':       'financial_tax',
    'Dataroom':              'dataroom',
    'Dataroom Readiness':    'dataroom',
  };

  lines.forEach((line, i) => {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      const pct = parseInt(m[2], 10);
      const displayName = m[1];
      const key = displayToKey[displayName];
      const canonicalPct = key ? CANONICAL_PILLARS[key] : null;

      if (canonicalPct == null) {
        // Unknown pillar name — still flag as suspicious hardcoded reference
        addFinding(filePath, i + 1, line, 'hardcoded_tagline_percentage',
          `"${displayName} (${pct}%)" — hardcoded percentage with unrecognized pillar name`,
          `Verify pillar name maps to a canonical pillar in Score_Methodology_Components.`);
      } else if (pct !== canonicalPct) {
        // STALE: percentage doesn't match canonical
        addFinding(filePath, i + 1, line, 'stale_tagline_percentage',
          `"${displayName} (${pct}%)" — STALE: canonical weight for ${key} is ${canonicalPct}%`,
          `Update the literal to (${canonicalPct}%) OR fetch from /api/score-methodology.`);
      }
      // exact match: not flagged. Still technically hardcoded, but right.
      // Allowlist the file path if you want to silence even exact matches.
    }
  });
}

/**
 * Rule 2: Hardcoded weight object literal.
 * Matches `entity_compliance: 0.20` or `entity_compliance: 20` where the
 * value looks like a weight (0-1 or 0-100). Limited to a tight pattern to
 * keep false positives down.
 */
function ruleHardcodedWeightLiteral(filePath, lines) {
  const pillarKeys = Object.keys(CANONICAL_PILLARS).concat(DEPRECATED_PILLARS);
  // pattern: <key>: <number> where number is a decimal or 0-100 integer
  const re = new RegExp(
    `\\b(${pillarKeys.join('|')})\\b\\s*:\\s*(0?\\.\\d+|[0-9]{1,3}\\.\\d+|[1-9][0-9]?)\\b`
  );
  lines.forEach((line, i) => {
    const m = line.match(re);
    if (!m) return;
    // Distinguish from "score" (which is also 0-100). If the line has
    // "score" or "value" in it, probably a per-entity score not a weight.
    if (/\b(score|value|points?|pts)\b/i.test(line)) return;
    const key = m[1];
    const val = parseFloat(m[2]);
    addFinding(filePath, i + 1, line, 'hardcoded_weight_literal',
      `Hardcoded weight literal: ${key}: ${val}`,
      `Replace with fetch from /api/score-methodology; weights live in Score_Methodology_Components.`);
  });
}

/**
 * Rule 3: Deprecated pillar key used.
 * Matches the deprecated keys when they appear as string literals (with quotes)
 * in plausible pillar-key contexts.
 */
function ruleDeprecatedPillarKey(filePath, lines) {
  for (const dep of DEPRECATED_PILLARS) {
    const re = new RegExp(`['"\`]${dep}['"\`]`, 'g');
    lines.forEach((line, i) => {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        // Exclude cases where it's clearly a data-table column ref:
        //   .from('Loans').select('sba_loans, …')   — table column
        //   sba_504_loans  — different field
        //   `sba_loans:` as an OBJECT KEY for a data response (not a pillar)
        //
        // Heuristic: if the line contains .from( or .select( or starts with
        // a SQL-ish word (FROM, SELECT, UPDATE, INSERT), it's a data ref.
        if (/\.(from|select)\s*\(/.test(line)) continue;
        if (/^\s*(FROM|SELECT|UPDATE|INSERT|JOIN|WHERE)/i.test(line)) continue;
        // Skip if this is just spelling the API/data field, not a pillar key.
        // We're only worried about pillar keyspace.
        // Suggest the canonical replacement.
        const replacement = {
          ownership_gov: 'governance',
          sba_loans: '(removed in v1.1 — pillar deactivated)',
          documents: 'dataroom',
          dataroom_readiness: 'dataroom',
          ucc_liens_covenants: 'ucc_liens',
          ownership_governance: 'governance',
        }[dep];
        addFinding(filePath, i + 1, line, 'deprecated_pillar_key',
          `Deprecated pillar key: '${dep}'`,
          `Replace '${dep}' with '${replacement}'.`);
      }
    });
  }
}

/**
 * Rule 4: Deprecated short aliases used as pillar keys.
 * Only flags when the alias appears as a property accessor with a 'score'-y
 * sibling pattern, to avoid false positives. e.g. `score.hr`, `pillars.hr`,
 * `{ hr: ... }` next to other known pillar keys.
 */
function ruleDeprecatedShortAlias(filePath, lines) {
  for (const alias of DEPRECATED_SHORT_ALIASES) {
    // Pattern: pillars.hr OR score.hr OR p.hr  (member access with hint)
    const re = new RegExp(`\\b(pillars|score|p)\\.${alias}\\b`, 'g');
    lines.forEach((line, i) => {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        const canonical = { hr: 'hr_compliance', insurance: 'risk_insurance', tax: 'state_tax', licenses: 'licenses_permits' }[alias];
        addFinding(filePath, i + 1, line, 'deprecated_short_alias',
          `Deprecated short pillar alias: ${m[0]}`,
          `Replace .${alias} with .${canonical}.`);
      }
    });
  }
}

/**
 * Rule 5: Pillar key array literal with fewer than 11 entries.
 * A pattern like `['entity_compliance','hr_compliance']` is suspicious —
 * if it's enumerating pillars, it should have all 11. We detect by finding
 * arrays that contain 3+ canonical pillar keys (so we know it's a pillar list)
 * and reporting if it has fewer than 11 unique canonical pillars.
 */
function ruleIncompletePillarArray(filePath, lines) {
  // Look for multi-line array literals containing pillar keys
  const fullText = lines.join('\n');
  const arrayRe = /\[\s*([\s\S]{1,2000}?)\s*\]/g;
  const pillarStringRe = new RegExp(`['"\`](${Object.keys(CANONICAL_PILLARS).join('|')})['"\`]`, 'g');

  let am;
  while ((am = arrayRe.exec(fullText)) !== null) {
    const arrayBody = am[1];
    const found = new Set();
    let pm;
    pillarStringRe.lastIndex = 0;
    while ((pm = pillarStringRe.exec(arrayBody)) !== null) {
      found.add(pm[1]);
    }
    if (found.size >= 3 && found.size < 11) {
      // Find the line number of this array start
      const before = fullText.slice(0, am.index);
      const lineNo = (before.match(/\n/g) || []).length + 1;
      const missing = Object.keys(CANONICAL_PILLARS).filter(k => !found.has(k));
      addFinding(filePath, lineNo, am[0].slice(0, 120).replace(/\n/g, ' '),
        'incomplete_pillar_array',
        `Pillar key array missing ${missing.length} of 11 canonical pillars: ${missing.join(', ')}`,
        `If this array is enumerating pillars, build it from /api/score-methodology instead of hardcoding.`);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Run
// ───────────────────────────────────────────────────────────────────────────

let filesScanned = 0;
for (const file of walk(REPO_ROOT)) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    continue;
  }
  // Skip files that are themselves a copy of the drift scanner — those
  // legitimately contain the canonical pillar table.
  if (text.includes(SCANNER_SENTINEL)) continue;
  filesScanned++;
  const lines = text.split('\n');
  ruleHardcodedTaglinePercentage(file, lines);
  ruleHardcodedWeightLiteral(file, lines);
  ruleDeprecatedPillarKey(file, lines);
  ruleDeprecatedShortAlias(file, lines);
  ruleIncompletePillarArray(file, lines);
}

// Deduplicate (same file/line/rule reported only once)
const seen = new Set();
const unique = findings.filter(f => {
  const key = `${f.file}:${f.line}:${f.rule}:${f.detail}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// ───────────────────────────────────────────────────────────────────────────
// Report
// ───────────────────────────────────────────────────────────────────────────

if (JSON_MODE) {
  console.log(JSON.stringify({
    repo_root: REPO_ROOT,
    files_scanned: filesScanned,
    findings_count: unique.length,
    findings: unique,
  }, null, 2));
} else if (!QUIET) {
  if (unique.length === 0) {
    console.log(`✓ Start Score™ drift check passed — scanned ${filesScanned} files, no drift found.`);
  } else {
    console.error(`✗ Start Score™ drift check FAILED — ${unique.length} finding${unique.length === 1 ? '' : 's'} across ${filesScanned} files scanned:\n`);
    const byFile = new Map();
    for (const f of unique) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file).push(f);
    }
    for (const [file, fs2] of byFile) {
      console.error(`  ${file}`);
      for (const f of fs2) {
        console.error(`    line ${f.line} [${f.rule}]`);
        console.error(`      ${f.text.slice(0, 140)}`);
        console.error(`      ${f.detail}`);
        console.error(`      → ${f.suggestion}`);
        console.error('');
      }
    }
    console.error('Fix the findings or add legitimate references to .score-drift-allowlist.json with a comment.');
  }
}

process.exit(unique.length === 0 ? 0 : 1);
