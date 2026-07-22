# State File Schema — `security-remediation-state.json`

**Purpose.** Machine-readable record of the remediation program lifecycle.
Written by the platform-security-audit skill on every run. Read by the next
run to compute diffs. Committed to `platform-skills/platform-security-audit/audit-state/`
so it persists across Claude sessions.

## Top-level shape

```json
{
  "$schema_version": "platform-security-audit-state/v1",
  "$purpose": "...",
  "run": { ... },
  "open": [ ... ],
  "closed": [ ... ],
  "clean_verified": [ ... ],
  "operational_notes": { ... }
}
```

## `run` block

Records this run's metadata and the diff against the prior state.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Run identifier, typically ISO date `YYYY-MM-DD` |
| `generated_at` | ISO datetime | When the audit run started |
| `prior_state` | ISO date or null | Run ID of the prior state file, if any |
| `prior_state_ref` | string | `"baseline"` for first run, else the prior run ID |
| `diff_summary` | object | See below |

### `diff_summary`

```json
{
  "newly_opened":                        [ "REM-XXX", ... ],
  "still_open":                          [ "REM-YYY", ... ],
  "newly_closed":                        [ "REM-ZZZ", ... ],
  "auto_closed_pending_verification":    [ "REM-AAA", ... ],
  "regressed": [
    { "id": "REM-BBB", "note": "why it's flagged as a regression" }
  ]
}
```

- **newly_opened** — finding IDs not in prior `open`. First-time detection.
- **still_open** — finding IDs in both prior `open` and this run's `open`.
  Update `last_verified` to current run date.
- **newly_closed** — finding IDs in prior `open` but NOT in this run.
  Moved to this run's `closed` array with `closed_at` = current run date
  and `closed_by` = current run ID.
- **auto_closed_pending_verification** — same as newly_closed but flagged
  because the detection signal is non-deterministic. Human should verify
  intentional remediation vs. missed-by-scan.
- **regressed** — finding IDs in prior `closed` but detected again this run.
  Human review required.

## `open` items

Each open finding is an object with these required fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | `REM-NNN` |
| `title` | string | yes | One-line summary |
| `severity` | enum | yes | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `status` | enum | yes | `LIVE_EXPLOITABLE` \| `OPEN` \| `PARTIAL` \| `BLOCKED` |
| `first_seen` | ISO date or string | yes | When first detected (`"prior audit"` if pre-baseline) |
| `last_verified` | ISO date | yes | Most recent run that confirmed the finding |
| `detection_signal` | object | recommended | See below — enables auto-detection next run |

Optional fields as needed: `evidence`, `impact`, `remediation`,
`affected_repos`, `affected_tables`, `affected_apps`, `affected_edge_fns`,
`notable_tables`, `blocked_on`, `prior_counts`, `note`.

### `detection_signal`

Structured directive for the next audit run to auto-detect whether this
finding still applies. Types:

**canary_probe** — call an endpoint and check a field
```json
{
  "type": "canary_probe",
  "endpoint": "https://.../functions/v1/secrets-canary",
  "expected_field": "PDF_INTERNAL_SECRET.set",
  "current_value": false,
  "expected_value": true
}
```

**package_json_version_probe** — check a repo's package.json version
```json
{
  "type": "package_json_version_probe",
  "repos": ["lender", "Brokers"],
  "path": "package.json",
  "field": "dependencies.next",
  "expected_min_version": "14.2.25",
  "current_values": { "lender": "14.2.5", "Brokers": "14.2.5" }
}
```

**sql_query** — run a SQL query, compare result
```json
{
  "type": "sql_query",
  "query": "SELECT COUNT(*) FROM pg_policies WHERE ...",
  "current_value": 5,
  "expected_value": 0
}
```

**regex_grep** — search source files for a pattern
```json
{
  "type": "regex_grep",
  "pattern": "process\\.env\\.[A-Z_]+\\s*\\|\\|\\s*['\"](...)",
  "paths": ["middleware.js", "..."],
  "current_hits": 12,
  "expected_hits": 0
}
```

**advisor_count** — Supabase advisor lookup
```json
{
  "type": "advisor_count",
  "advisor_names": ["authenticated_security_definer_function_executable"],
  "current_values": { "authenticated": 574 }
}
```

**github_repo_state** — GitHub repo metadata
```json
{
  "type": "github_repo_state",
  "repo": "entity-mind-map",
  "expected_archived": true
}
```

**github_search** — org-wide code search (note: sparse index coverage)
```json
{
  "type": "github_search",
  "query": "path:package.json \"@start-today/platform-auth\"",
  "expected_min_hits": 3
}
```

## `closed` items

Same shape as `open` items with additional fields:

| Field | Type | Notes |
|---|---|---|
| `closed_at` | ISO date | When closed |
| `closed_by` | string | Run ID that closed it |
| `closed_by_deploy` | array | Version/commit references, e.g. `["gh-read v23"]` |
| `verification` | string | How closure was verified |
| `commit` | string | Optional Git commit ref |
| `regression` | string | Optional note if scope was incomplete |

## `clean_verified`

Simple array of strings. Each is a positive statement about the platform
that was verified this run (e.g. "no magic_link references anywhere in
fleet"). These are not findings; they're the negative-space audit result.

## `operational_notes`

Free-form object for anchor references the next run needs:
- Supabase project IDs
- Vercel team ID
- GitHub org
- Audit proxy endpoints and auth header
- `resume_marker` — human-readable pointer to where the last session left off

## Reading in the next audit run

**Step 0.5** of the skill's workflow. Fetch via `gh-read-repo`:

```
POST https://ptgtliwllimkswtajcmy.supabase.co/functions/v1/gh-read-repo
Headers: x-audit-token: <AUDIT_PROXY_SECRET>
Body: {
  "repo": "platform-skills",
  "path": "platform-security-audit/audit-state/security-remediation-state.json",
  "raw": true
}
```

If not found: this run is the baseline (`prior_state_ref: "baseline"`).

If found: parse the `open` array and use each item's `detection_signal` to
determine whether the finding still applies. Populate the current run's
`diff_summary` accordingly.

## Schema versioning

`$schema_version` follows `<name>/vN` semver-ish. Increment the major
version if the top-level shape changes incompatibly. Add a
`schema_migration.md` note in this directory when incrementing.
