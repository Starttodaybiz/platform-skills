---
name: platform-state-snapshot
description: "Use this skill at the start of any non-trivial Start Today™ platform work session to ground in the current state of the production database — live counts (tables, cron jobs, orgs, entities, compliance items), active scheduled jobs, storage buckets, locked platform conventions from platform_ontology, the most recent SOC 2 evidence run, and the most recent security audit run. Triggers on: 'what's the current state', 'what does the platform look like now', 'how many X exist', 'what's running', 'sprint status', 'what's locked in ontology', 'recent SOC 2 results', 'what crons are active'. Refreshed nightly at 10:00 UTC. Always read this before quoting platform numbers from memory or assuming what's deployed."
---

# Platform State Snapshot

The authoritative current-state snapshot of the Start Today™ platform, regenerated nightly from production. **Read it before answering questions about platform metrics, cron jobs, conventions, or recent compliance/security state.**

## How to read it

The current snapshot is at `platform-docs/skills/platform-state-snapshot.md` in the production Supabase storage bucket.

To read the latest copy:

```sql
SELECT public.fn_generate_platform_state_snapshot();
```

This returns the markdown directly. Use it to answer questions like:
- How many active cron jobs are there?
- What does the platform_ontology say about C2C?
- When was the last SOC 2 evidence run?
- What size limit does the platform-docs bucket have?

## What's in it

1. **Live counts table** — production tables, cron jobs, orgs, entities, employees, compliance items, documents, storage buckets, SOC 2 controls, internal policies, jurisdiction rules, security/SOC 2 run counts, plus pricing plans, master metrics, pipeline stages, SBA programs, report templates.

2. **Active cron jobs** — schedule, name, active status for every row in `cron.job`.

3. **Storage buckets** — bucket id, public flag, allowed mime types, size limit for every row in `storage.buckets`.

4. **Locked platform conventions** — most recent 25 entries from `platform_ontology` where `is_active IS NOT FALSE` and `locked_at IS NOT NULL`. This includes C2C patterns (corporate books modal, evidence chain, security layer, doc verification state machine), SBA 504 closing patterns (authorization-driven closing, regulatory terminology, opinion letter, form auto-population), CDC operating model, lender demo seat model, chamber regional intelligence map, and TIF buffer pattern.

5. **SOC 2 evidence — most recent run** — start time and PASS / PARTIAL / FAIL / controls_checked summary from `soc2_evidence_runs`.

6. **Security audit — most recent run** — start time and findings count by severity from `platform_security_audit_runs`.

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

Or call the underlying RPC directly:

```sql
SELECT public.fn_generate_platform_state_snapshot();
```

## Source

- **RPC**: `public.fn_generate_platform_state_snapshot()` (PL/pgSQL, SECURITY DEFINER, granted to service_role)
- **Edge function**: `platform-skills-refresh` (verify_jwt: false, token-gated)
- **Cron**: `platform-skills-refresh-daily` (`0 10 * * *` UTC)
- **Storage path**: `platform-docs/skills/platform-state-snapshot.md`
- **Backed up to**: `github.com/Starttodaybiz/platform-skills`
