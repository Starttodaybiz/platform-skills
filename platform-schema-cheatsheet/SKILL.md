---
name: platform-schema-cheatsheet
description: "Use this skill any time you need to write SQL against the Start Today™ production database, look up the exact column name for a table, or sanity-check whether a column exists before querying. Triggers on any task involving: writing SQL queries against public schema, checking what columns a table has, whether a column is named with a typo or in PascalCase or with a space, looking up which table a foreign key points to, finding all G_ lookup tables, or any moment of uncertainty about exact column spelling. Especially use this for: Compliance_Items.Entitiy_id (typo), Annual_Report_Filings (Entity_id vs Entity2), Organizations (singular Organizations_id with s, 'Organization Name' with space), 'Formation Date' columns, G_Entity_types.G_Entity_type_name, Audit_Log capitalized. Refreshed nightly with every schema change."
---

# Platform Schema Cheatsheet

Literal column-name reference for every table in the `public` schema of the production Start Today™ database. **No prose, no explanations — just the exact strings you need to write SQL.** Refreshed nightly from `information_schema.columns`.

## When to use this

**Before writing any non-trivial SQL.** The Start Today schema has:

- Tables with capital letters and spaces in column names (`"Formation Date"`, `"Organization Name"`)
- Plural-suffix primary keys (`Organizations_id`, not `Organization_id`)
- A literal typo in production (`Compliance_Items.Entitiy_id`)
- Two FK columns on the same table where one is legacy (`Annual_Report_Filings.Entity2` legacy / `Entity_id` canonical)
- Mixed-case canonical names (`Audit_Log`, not `audit_log`)
- Lookup tables prefixed `G_` with non-obvious column names (e.g., `G_Entity_types.G_Entity_type_name`, NOT `label`)

A wrong guess costs a roundtrip. The cheatsheet eliminates them.

## How to read it

The current cheatsheet is at `platform-docs/skills/schema-cheatsheet.md` in production Supabase storage. To get the latest copy via SQL:

```sql
SELECT public.fn_generate_schema_cheatsheet();
```

Returns ~300KB of markdown. Format:

```
`Table_Name`: column1, column2, column3, ...
```

Tables grouped by domain:
- **Lookup tables (G_*)** — every `G_` prefixed table
- **Core data tables** — Entities, Organizations, Documents, Compliance_Items, etc.
- **Logs, history, audit, cache** — anything matching `_log|_history|_audit|_cache`
- **Chamber (chamber_*)** — chamber portal tables
- **SOC 2 (soc2_*)** — SOC 2 framework
- **Platform infrastructure (platform_*)** — security audit, ontology
- **Start Today internal (st_*)** — internal policies, ops
- **STVerify (STV_* / stverify_*)** — STVerify tables (note: most live in separate STVerify Supabase)
- **Demo (demo_* / Demo_*)** — demo-specific tables

## Quick gotchas (the typos that cost roundtrips)

These are baked into the top of the cheatsheet itself, but reproduced here for fast scanning:

- `Compliance_Items.Entitiy_id` — typo in prod, must use exact spelling
- `Annual_Report_Filings` uses `Entity_id` (canonical) AND `Entity2` (legacy) — use `Entity_id`
- `BOI_Filings.Entity` — singular, NOT `Entity_id`
- `Organizations.Organizations_id` (plural with s) and `Organizations."Organization Name"` (with space)
- `Entities."Formation Date"` — with space, requires quotes
- `G_Entity_types.G_Entity_type_name` — NOT `label`
- `Audit_Log` — capitalized canonical name (NOT `audit_log`)
- PostgREST: `.eq("org_id", val)` correct; `.eq('"org_id"', val)` returns zero rows
- All RPC results from PostgREST come wrapped in array: `Array.isArray(x) && x[0] ? x[0] : x`

## How to refresh on demand

The nightly cron `platform-skills-refresh-daily` runs at 10:00 UTC. To force a refresh:

```sql
SELECT net.http_post(
  url := 'https://ptgtliwllimkswtajcmy.supabase.co/functions/v1/platform-skills-refresh?token=st-skills-refresh-2026-9k4m',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
```

Or call the underlying RPC directly to get the markdown without persisting:

```sql
SELECT public.fn_generate_schema_cheatsheet();
```

## Source

- **RPC**: `public.fn_generate_schema_cheatsheet()` (PL/pgSQL, SECURITY DEFINER, granted to service_role)
- **Edge function**: `platform-skills-refresh` (verify_jwt: false, token-gated)
- **Cron**: `platform-skills-refresh-daily` (`0 10 * * *` UTC)
- **Storage path**: `platform-docs/skills/schema-cheatsheet.md`
- **Backed up to**: `github.com/Starttodaybiz/platform-skills`
