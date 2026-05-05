---
name: compliance-platform-development
description: >-
  Development norms, style guide, deployment workflow, and platform architecture for the Start Today™ compliance SaaS. Use this skill whenever building, styling, or deploying any UI component, dashboard, page, modal, API route, RPC, or edge function for any Start Today app — including hr.starttoday.biz, prohr.starttoday.biz, legal.starttoday.biz, admin.starttoday.biz, and all other subdomains. Covers the full stack: Next.js/Vercel frontend conventions, Supabase patterns, color palette, enterprise aesthetic, API route patterns, RPC patterns, and git/deploy workflow. Trigger on any platform build task, styling question, component creation, or deployment step.
---

# Start Today™ Platform Development

## Stack (Current — Softr has been fully removed)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js App Router (Node 24) | One repo per subdomain |
| Hosting | Vercel (team: j-1168s-projects) | Auto-deploy on git push to main |
| Database | Supabase PostgreSQL (ptgtliwllimkswtajcmy) | Project: Start Today Live |
| Auth | Custom JWT (jose) + TOTP MFA | Cookie: `hr_session`, `JWT_SECRET` env var |
| AI | Anthropic Claude API + Voyage AI (voyage-law-2) | Embeddings for law_records, knowledge_base |
| Edge functions | Supabase Deno edge functions | hr-dashboard-data, carl-*, etc. |

**CRITICAL — Softr is NOT part of the stack.** Never reference Softr, iframe embeds, or the `window.logged_in_user` pattern. That was the old architecture and has been completely removed.

---

## Deployment Manifest

| App | Domain | Vercel Project ID | GitHub Repo |
|-----|--------|------------------|-------------|
| HR Dashboard | hr.starttoday.biz | prj_vOK2S92gkl1lz3Vo2YG5gAIKUtTM | Starttodaybiz/HR |
| Pro HR | prohr.starttoday.biz | prj_3Eia7K4L2JVkBzhENbadGbF2yjwZ | Starttodaybiz/ProHR |
| Attorney | legal.starttoday.biz | prj_sczZV0Y6EmonWmfHZSxttTwbXZCs | Starttodaybiz/attorney-dashboard |
| STVerify | stverify.starttoday.biz | prj_m8gd7DrEpLLoydfG4jDQvmAlAlSM | Starttodaybiz/stverify |

**Team ID:** `team_7hbKJDeZuvbjZ7aTxXxUnFv4`  
**Git identity:** j@starttoday.biz  
**Deploy:** `git push origin main` → Vercel auto-deploys. Only push when Jason approves.

### Required Env Vars (ALL apps)

```
NEXT_PUBLIC_SUPABASE_URL=https://ptgtliwllimkswtajcmy.supabase.co
# ↑ CRITICAL: Must be the full URL ending in .supabase.co — never truncated
SUPABASE_SERVICE_ROLE_KEY=<legacy JWT from Supabase → Settings → API Keys → Legacy tab>
JWT_SECRET=<session signing secret>
NEXT_PUBLIC_APP_URL=<app's own domain>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## Standard API Route Pattern

Every server-side route follows this exact pattern:

```typescript
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // validate...

  const res = await fetch(`${SB_URL}/rest/v1/rpc/your_rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_SVC,
      Authorization: `Bearer ${SB_SVC}`,
    },
    body: JSON.stringify({ p_org_id: session.org_id, ...params }),
  });

  const raw = await res.json();
  // ALWAYS unwrap — PostgREST wraps RETURNS JSONB in array for some versions
  const data = Array.isArray(raw) ? raw[0] : raw;

  if (!res.ok || !data?.ok) {
    return NextResponse.json({ ok: false, error: String(data?.error || 'Failed') }, { status: 422 });
  }
  return NextResponse.json({ ok: true, ...data });
}
```

**Key rules:**
- Always check session first
- Always use `SB_SVC` (service role) for server-side calls — never anon key
- Always unwrap with `Array.isArray(raw) ? raw[0] : raw`
- Always return `{ ok: true }` on success, `{ ok: false, error }` on failure

---

## Standard RPC Pattern

```sql
CREATE OR REPLACE FUNCTION your_function(p_org_id UUID, p_param TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- always SET search_path = public to avoid security_definer_view advisor finding
  INSERT INTO "YourTable" (org_id, col) VALUES (p_org_id, p_param);
  RETURN jsonb_build_object('ok', true, 'id', gen_random_uuid());
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
```

**Key rules:**
- Always `SECURITY DEFINER SET search_path = public`
- Always wrap in `EXCEPTION WHEN OTHERS THEN` returning `{ok: false, error: SQLERRM}`
- Return `JSONB` — PostgREST returns it directly (not wrapped in row object)
- Use `p_` prefix for all parameters

---

## Auth Pattern

```typescript
// src/lib/auth.ts — JWT session via jose, cookie: hr_session
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');
const COOKIE = 'hr_session';

export async function getSession(req?: NextRequest): Promise<SessionUser | null> {
  // reads hr_session cookie, verifies JWT, returns {id, email, org_id, role, name}
}
```

**Login flow:** POST `/api/auth/login` → `verify_admin_password` RPC → MFA check → return `{mfa_required, auth_id, factor_id, org_id}` → TOTP → set cookie

---

## UI Component System

The HR app has a shared component library at `src/components/ui/`:

```typescript
import { Card, CardHeader, Chip, Btn, C } from '@/components/ui';

// C is the color constants object — always use these, never hardcode hex
C.blue, C.green, C.amber, C.red, C.text, C.textMuted, C.textSec
C.bg, C.surface, C.surface2, C.border, C.navy
C.blueBg, C.greenBg, C.amberBg, C.redBg
```

**Chip variants:** `color="blue" | "green" | "amber" | "red" | "gray"`  
**Btn variants:** `variant="primary" | "ghost" | "green" | "danger"`

### Modal Pattern (slide-in drawer)
```typescript
// Fixed right-side drawer: width 680, height 100vh, zIndex 1000
// Use ModalWrap + ModalHead from QuickModals.tsx pattern
// Always: onClick={e => e.stopPropagation()} on inner panel
// Tabs: border-bottom indicator, no background
```

---

## Platform Style Guide

### Status Color Palette

| Status | Color | Hex | CSS var |
|--------|-------|-----|---------|
| Good / Compliant | Green | `#059669` | `C.green` |
| Pending / Medium | Amber | `#D97706` | `C.amber` |
| Overdue / At Risk | Red | `#DC2626` | `C.red` |
| Info / Entity | Blue | `#2563EB` | `C.blue` |
| Navy header | Navy | `#0F172A` | `C.navy` |
| Page background | Slate-50 | `#F8FAFC` | `C.bg` |
| Card surface | White | `#FFFFFF` | `C.surface` |
| Border | Slate-200 | `#E2E8F0` | `C.border` |

**Never use `#10B981` (bright green) — use `#059669` instead.**

### Design Principles
- **Muted, enterprise-weight** — nothing pops or feels consumer/playful
- **Card borders:** 1px solid `C.border`, subtle box-shadow at 0.04 opacity
- **Typography:** Font weights slightly dialed down — refined, not bold
- **Progress bars:** Slate grays only (`#64748B` → `#CBD5E1`), never purple
- **Score numbers:** Neutral text color, never colored values
- **Backgrounds:** Softened pastel tints, never competing with content

### Score Band Colors
```
🟢 Compliant       → green   (85-100)
🟡 Needs Review    → amber   (70-84)
🟠 Needs Attention → amber   (55-69)
🔴 At Risk         → red     (40-54)
⚫ Critical        → red     (0-39)
```

---

## Score System Architecture

```
Score_Card (source of truth, per entity, daily compute)
  ↓ sync_scores_from_score_card()
entity_start_scores_table (gamification reads this)
  ↓ get_gamification_profile(entity_id)   ← takes entity_id NOT org_id
Entity_Score_Pillars (11 pillars, per entity)
```

**Daily cron (6AM UTC):**
```sql
SELECT calculate_start_scores();    -- writes to Score_Card
SELECT sync_scores_from_score_card(); -- syncs to entity_start_scores_table
```

---

## Known Schema Gotchas

These column names have burned us — always verify before writing RPCs:

```
Employees:
  ✓ Work_email (not Email)
  ✓ Full Name (from FirstName)  ← writable despite Airtable-style name
  ✓ Hire_date (not Start Date)
  ✓ Employment_type_id UUID FK → G_Employment_types
  ✓ G_Departments_id UUID FK → G_Departments (PK is Departments_id there)

HR_Compliance_Issues:
  ✓ CreatedAt is TEXT type → use NOW()::TEXT
  ✓ Status_id (not G_Statuses_id)

Compliance_Items:
  ✓ Has 7 NOT NULL FK columns with no defaults
  ✓ Always SELECT existing row for org to get default FK values before INSERT
  ✓ G_Compliance_item_status_id (not G_Statuses_id)
  ✓ Created and Last_modified are TIMESTAMPTZ NOT NULL

G_Departments:
  ✓ PK is Departments_id (not G_Departments_id)

Entities:
  ✓ sos_entity_type is the type column (text, not a UUID FK)

Score queries:
  ✓ Always filter: WHERE "Computed By" = 'calculate_start_scores_v2'
```

---

## Security Baseline

After any DDL change, check security advisors. Baseline is **22 findings** (all accepted):
- 20 SECURITY DEFINER views (intentional)
- 2 extensions in public schema (vector, pg_net)
- 2 service-role bypass policies (address_verification_log, pfs_submissions)

If count > 22: new RPC missing `SET search_path = public`, or new table missing RLS.

---

## See Also

- `platform-page-audit` — QA sweep methodology, login fixes, write-back test scripts
- `platform-dev-test-ontology` — feature ontology, test cases, FF log, schema registry
- `platform-security-audit` — comprehensive security/SOC 2 audit (14 sections + JSON gap matrix)
- `platform-security-remediate` — guided sprint plans for closing security envelope gaps

**All Start Today™ Claude skills are versioned at https://github.com/Starttodaybiz/platform-skills.** Active runtime copies live under `/mnt/skills/user/`; the repo is the backup that survives sandbox loss.
