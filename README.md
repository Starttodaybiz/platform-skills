# Start Today™ Platform Skills

Versioned backups of the Claude skills that live at `/mnt/skills/user/` in production Claude sessions.

## Active skills

| Skill | Purpose |
|---|---|
| `compliance-platform-development` | Development norms, style, deployment for the Start Today platform |
| `platform-security-audit` | Generates the master security + SOC 2 readiness audit Word doc |
| `platform-security-remediate` | Step-by-step remediation playbook |
| `platform-state-snapshot` | Live counts, cron jobs, buckets, ontology — refreshed nightly |
| `platform-schema-cheatsheet` | Column-by-column reference for every public table — refreshed nightly |

## Auto-refreshed skills

`platform-state-snapshot` and `platform-schema-cheatsheet` regenerate from prod nightly via cron `platform-skills-refresh-daily` (10:00 UTC). The edge function source is in `shared-edge-functions/platform-skills-refresh/`.

To manually refresh:

```sql
SELECT net.http_post(
  url := 'https://ptgtliwllimkswtajcmy.supabase.co/functions/v1/platform-skills-refresh?token=st-skills-refresh-2026-9k4m',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
```

Files land in `platform-docs/skills/{platform-state-snapshot,schema-cheatsheet}.md`.

## Adding a new skill

1. Create a new top-level directory matching the skill name.
2. Write a `SKILL.md` with frontmatter (name, description) at the top.
3. Reference: see other skills as templates.
4. Commit with a meaningful message.
5. Sync the live copy into `/mnt/skills/user/<skill-name>/` so future Claude sessions pick it up.
