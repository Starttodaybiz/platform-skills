---
name: platform-dev-test-ontology
description: >-
  Comprehensive development test framework, ontology, and regression suite for the Start Today™ platform. Use this skill whenever starting a new feature sprint, running regression tests, defining test cases for new functionality, auditing the platform schema, checking what exists before building, or establishing what "done" means for any feature. Triggers on: "what tables exist for X", "has this been built before", "define done for this feature", "run regression tests", "add this to the test ontology", "what should I test", "what's the schema for", "check if this feature is already built", "define the test cases for", anything touching the legal lens, the compliance-rules engine, or CARL Legal™ restructuring guidance. This skill prevents duplicate work, catches regressions, and keeps the development ontology current.
---

# Start Today™ Platform Dev Test Ontology

Last updated: **June 22 2026** — legal lens live; compliance-rules restructuring engine live in prod + demo; IL/WI/CO/OH/IN at full restructuring parity; demo-seat RPC key moved to env.

---

## 0. Operating conventions — READ FIRST

These are locked working agreements. They have reverted before because they lived only in chat; they live here now so they survive sandbox resets.

### Environment banner on every turn
Lead every response that touches data or deploys with a one-line banner naming the working environment, project ref, and repo:
`🔴 PROD ptgtliwllimkswtajcmy` · `🟢 demo tbihmlnqpwdeiethgwaf` · repo `<name>`. Mark each DB action read-only vs read/write. Prod ref ends `cmy`, not `cwy`.

### Sync principle
Any **function or rule** change goes to **both** prod and demo, identically, or it forks. Schema (DDL) is applied identically to both. **Demo-only data** (the Bowie-Stardust family, demo seeds) never touches prod.

### Verify live state before building
Never trust a transcript or memory over the live DB. Session resets have caused divergence repeatedly (e.g., the compliance-rules engine was "scoped but not started" in memory but already 715 rows live). Query `information_schema` / `pg_proc` first, then build.

### Push workflow (Claude prepares, Jason pushes)
Claude never pushes, never touches the PAT. Claude hands files plus a `.sh`; Jason runs it. Canonical deploy: download files → `cp` to paths → `npm run build && git add <exact-paths> && git commit -m "…" && git push origin main`. Git author: `Starttodaybiz@users.noreply.github.com`.

Hard-won shell lessons (all have bitten us):
- **Run scripts as files, never paste:** `bash ~/Downloads/<file>.sh`. Pasting a script into interactive zsh triggers `!` history-expansion on the `#!/usr/bin/env` shebang → "event not found".
- **Browser stale-download trap:** re-downloading saves `file (1).sh` and leaves the old one; `bash ~/Downloads/file.sh` then runs the stale copy. Prefer pasting a short inline command, or have Jason confirm the freshly downloaded name.
- **BSD `sed` delimiter:** macOS `sed` chokes when the replacement contains the delimiter. Use `#` as the delimiter whenever the replacement contains `|` or `||` (e.g. `process.env.X || ''`).

### Authoritative-data discipline
Every externally-sourced number or legal citation is shown verbatim with its source, type, year, and retrieval date — authoritative, attributed, never computed. Client-facing legal rules are drafted `needs_attorney_review = true` pending MJS sign-off, never silently published. Stop and report when a premise proves false; never force a write (anti-hallucination). Additive-first: never lose functionality.

### Migration hygiene
`apply_migration` for all DDL; always append `NOTIFY pgrst, 'reload schema';`. `execute_sql` for reads and data writes needing row counts. Multi-statement `execute_sql` returns only the **last** result set — split when you need both. PostgREST schema-cache staleness is the first thing to check when a function works via `execute_sql` but fails through the REST API.

---

## 1. Platform map

| App | Domain | Vercel Project ID | GitHub Repo |
|-----|--------|-------------------|-------------|
| Client Dashboard | client.starttoday.biz | `prj_Yx534JgZNoDwMqBKsNCSRAiezeFY` | Starttodaybiz/Client-Dashboard |
| Platform Admin | admin.starttoday.biz | `prj_Te3RWuuXtPmhuft6RZDj2CGUMbhG` | — |
| Sales | — | `prj_zFtXbAsmOYniLNevEzjJzbAFh66O` | — |
| compliance-User | — | `prj_AaVjzzdEiDncM6GTWFSE0Jz2Kud1` | — |
| C2C | — | `prj_LDUU472KXAlw4B0IHNW0d65S4fUO` | — |
| Chamber | — | `prj_M7ybwbnu0SH4UQvqXKQelDNS48XZ` | — |
| Attorney / Legal | legal.starttoday.biz | `prj_sczZV0Y6EmonWmfHZSxttTwbXZCs` | Starttodaybiz/attorney-dashboard |
| HR | hr.starttoday.biz | `prj_vOK2S92gkl1lz3Vo2YG5gAIKUtTM` | Starttodaybiz/HR |
| Pro HR | prohr.starttoday.biz | `prj_3Eia7K4L2JVkBzhENbadGbF2yjwZ` | Starttodaybiz/ProHR |
| Finance | — | repo `Starttodaybiz/finance` |
| Accounting | — | `prj_N36i5P0VTpnFndt5PEwQoDDYvioE` |
| Property | — | `prj_vQqxfV0ULcix4PdrFKnE72WgGn2A` |
| Employee | — | `prj_2rEZwmovx325zp2OdUf1cUPcLsB3` |

**Team:** `team_7hbKJDeZuvbjZ7aTxXxUnFv4` · **Prod Supabase:** `ptgtliwllimkswtajcmy` · **Demo Supabase:** `tbihmlnqpwdeiethgwaf` ($10/mo, separate). STVerify is a separate company (org `STVerify`, Supabase `ewfahugybiaizfurlyop`, MCP unreachable) — cross-company via public APIs only.

**Demo seats:** `clientdemo@starttoday.biz`, `demo.*@starttoday.biz`, `*@starttoday.estate` — pwd `StartToday2026!`. `isDemoSeat()` forces `env=demo`. Demo org: Bowie-Stardust `d0000000-0000-0000-0000-000000000001`.

---

## 2. Legal lens (Skills Platform)

The "legal entity management platform" lens inside the Client Dashboard. Pill switches Structure / Ownership / Planning.

### Aggregator RPCs (live in BOTH prod + demo, identical)
| RPC | Drives | Notes |
|-----|--------|-------|
| `get_legal_structure(p_entity_id uuid)` | Structure tree | parent/children, entity type, formation facts; "intermediate holding" classification |
| `get_legal_ownership(p_entity_id uuid)` | Ownership cap table | `basis` = `members` (individuals via `Ownership_Interests`) or `entity` (parent via `Entity_Ownership_Interests`, used only when no member rows); unwraps to `holders[]` with pct/kind/voting; concentration flag |
| `get_legal_standing(p_entity_id uuid)` | Planning standing | registrations, RA, calendar, decision queue; `ra_missing` danger; foreign-qual wrap degrades gracefully |

All three: `service_role` + `SECURITY DEFINER`, called through `/api/rpc/<fn>`. `GRANT EXECUTE` to **both** `anon` and `authenticated` explicitly. PostgREST wraps RPC results in an array — always unwrap (`Array.isArray(raw) ? raw[0] : raw`).

### Panels / wiring
`StructurePanel.jsx`, `OwnershipPanel.jsx`, `LegalPlanningPanel.jsx`; `legalView` wired into `ClientShell.js`. Detail views are **centered modals only** (never right-slide shelves): dark backdrop, center align, max-width ~720px, rounded 14px, translateY+scale entrance. Ref `PillarDeepDivePanel.jsx`.

### get_legal_standing renewal logic (fixed Jun 2026)
The renewal-due date must roll **past already-filed cycles** before flagging overdue. Earlier version flagged `danger` purely on `min(Renewal_due_date)` being past, so an entity that filed on time still showed "Renewal overdue." Fix applied identically to both projects. Regression guard: a genuinely overdue entity (past due, no filing for that cycle) must still fire `danger`.

### Demo family ownership model — "deep estate chain"
Individuals → Family Trust → Holdings → operating subs, so every tier reads 100% with no double-count:
- Operating subs (Capital, Downbeat, Staccato, Stage Left, Precision, Labs) → 100% **Holdings**
- Backbeat, Services Group, Fund → 100% **Capital** (the investment sub-holding)
- Holdings → 100% **The Bowie-Stardust Family Trust** (kind: trust)
- Family Trust → Eddie 60 (voting) / Bonnie 25 / Ziggy 15 beneficial (40% non-voting) — seeded in `Beneficial_Interests` (demo-only, 4 rows incl. Dynasty Trust → Ziggy)
- Implemented by clearing `Ownership_Interests` member rows on Holdings + subs so they fall to the entity branch; individuals live only at the trusts.

---

## 3. Compliance-rules engine (CARL Legal™ restructuring layer)

This is what lights up the Planning view's "consider this before you act" guidance.

### `public.compliance_rules` (715 rules, 54 jurisdictions)
Columns: `rule_id, rule_key, jurisdiction, entity_type_match (text[]), purpose_match (text[]), fact_predicates (jsonb), output_type, output_payload (jsonb), priority, upl_safe_language, source_citation, active, needs_attorney_review, created_at, updated_at`.

`output_type` values include `anti_recommendation` (the restructuring "change it" surface) and `flag` (informational). `output_payload` carries `title / what / why / what_to_do / severity / pillar_key`. `fact_predicates` is a predicate object (e.g. `{"tax_election":"S"}`, or `{"employee_band":{"op":"in","value":[...]},"existing_insurance":{"op":"not_contains","value":"wc"}}`).

### Engine functions (live in BOTH prod + demo)
| Function | Role |
|----------|------|
| `derive_obligations(p_facts jsonb, p_jurisdictions text[])` | pure-read matcher; returns obligations + anti-recs with UPL-safe language + citation |
| `st_generate_entity_obligations(...)` | entity wrapper; writes `Compliance_Items` + `Entity_Considerations` rows from matched rules |
| `materialize_compliance_due_dates(p_org_id uuid)` | fills `Due_date` on generated items from each rule's `due_rule`/`frequency`; returns `(items_updated, items_skipped)` |

Generator closure (must exist in target DB): `Entity_Considerations` table (anti-recs land here), `Compliance_Items.source` column, `G_Priority_levels` 'Normal' row, entity facts (`sos_entity_type`, `Formation Date`). All present in demo as of Jun 2026.

### State coverage status
- **Full restructuring parity** (6 anti-recs + 5 flags each): **IL, WI, CO, OH, IN, MN**. IL is the blessed reference template.
- The other ~48 jurisdictions have base `compliance_rules` but **no** anti-rec/flag restructuring layer yet. Extending it is per-state authoritative research (LLC Act, foreign-qual, WC penalty + threshold, data-breach law), drafted `needs_attorney_review=true`.
- The 6 patterns per state: `MM_LLC_NO_OA`, `MULTISTATE_NO_FOREIGN_QUAL`, `RE_HOLDING_S_ELECTION` (federal/portable), `SAAS_NO_CYBER`, `SM_LLC_S_ELECTION_LOW_REV` (federal/portable), `WC_VIOLATION`. The two S-election rules are federal-substance — identical text/citation across states (clone, no research). The other four carry state-specific citations.

### Attorney-review gate + workflow
All anti-recs ship `needs_attorney_review = true` (staged, silent). MJS clears the flag → rule serves as reviewed guidance. The pending-review packet is generated per-state with full text + triggers + UPL framing + citation + per-rule disposition. **Known modeling flag:** WI `WC_VIOLATION` predicate fires at the 5_to_14 band, but the WI statutory threshold is 3 employees (§ 102.04(1)); the band scheme has no discrete "3+" bucket. Decision pending before widening to `1_to_4`.

---

## 4. RPC route + demo-key pattern (Client-Dashboard)

`/api/rpc/<fn>/route.js` builds a server-side Supabase client. Prod key: `SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY`. **Demo key: `process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY`** (set in Vercel, Prod+Preview+Dev).

**Lesson (Jun 2026):** routes shipped with a **hardcoded** demo `service_role` JWT that was later rotated out of the demo project → every demo-seat RPC returned PostgREST "Invalid API key" (200 status, error in body, no JS console error — diagnose via Vercel `get_runtime_logs`, search `"Invalid API key"`). Fix moved the key to the env var across all routes. Never hardcode a `service_role` key in client source.

---

## 5. Schema gotchas registry

```
Entities:
  ✓ Entity_legal_name  (NOT "Entity Name")
  ✓ Entities_id (PK); Owning_entity_id; sos_entity_type (text, not FK)
  ✓ "Formation Date" (quoted, space)
Compliance_Items:
  ✓ "Entitiy_id"  (misspelled — quote it)
  ✓ Compliance_items_id (PK); "Due_date"; "Notes"; source; deleted_at; archived_at
  ✓ 7 NOT NULL FK cols — SELECT an existing org row for defaults before INSERT
  ✓ G_Compliance_item_status_id (not G_Statuses_id); Created/Last_modified TIMESTAMPTZ NOT NULL
G_Statuses:
  ✓ Status_id (PK), Status_name, Status_type  (e.g. "Filed"/Universal = 9d62cf51-…)
BOI_Filings:
  ✓ "Entity" (uuid FK), "Filed Date", "Effective Date", "Status" (loose uuid → G_Statuses, no enforced FK), "BOI Current?" (bool)
Beneficial_Interests: UUID FKs (Trust / Beneficiary / Class) — demo-only seed
Organizations: PK is Organizations_id (NOT id); alias tables in plpgsql to avoid bare-id resolution bugs
Score_Card: filter WHERE "Computed By" = 'calculate_start_scores_v2'
get_gamification_profile(): takes entity_id NOT org_id
Normalizer trap: normalize_entity_for_dedupe() ≠ normalize_owner_name() — use the right one per target column
```

SECURITY DEFINER RPCs using pgcrypto need `SET search_path = public, extensions` (extensions schema explicit). Otherwise `SET search_path = public`.

---

## 6. Score system

`Score_Card` (source of truth, per entity, daily) → `sync_scores_from_score_card()` → `entity_start_scores_table` → `get_gamification_profile(entity_id)` → `Entity_Score_Pillars` (11 pillars). Daily 6AM UTC cron: `calculate_start_scores(); sync_scores_from_score_card();`. Start Score™ methodology is proprietary IP — never user-configurable, never "adjustable weights"; real-time + nightly 6 AM UTC reconciliation only.

---

## 7. HR app ontology (condensed; see git history for full FF Log)

Dashboard pages all live (`/dashboard`, employees, score-health, compliance, policies, i9, training, benefits, compensation, onboarding, offboarding, peo, stverify, professionals, subscription-profile). Modal write-backs all tested (add-employee, log-issue, pay-change, new-position, new-department, i9-section3, open-enrollment, stverify, worker-classification). `/api/hr?section=` map: overview, score-health, peo-data, onboarding, benefits, professional-network, carl, employee-detail. Auth: custom JWT (jose) + TOTP MFA, cookie `hr_session`.

---

## 8. Test case registry

HR (all ✅): TC-001 login `{mfa_required}` · TC-002 dashboard score ≥70 · TC-004 add-employee · TC-005 log-issue · TC-006 open-enrollment · TC-007 PEO · TC-008 security advisors = 22 baseline · TC-009 STVerify issuance · TC-010 benefits · TC-011 onboarding · TC-012 professional-network · TC-013 subscription-profile.

Legal lens / engine (add as exercised):
| TC | What | Assertion |
|----|------|-----------|
| TC-L01 | `get_legal_structure` on Holdings | `ok:true`, "intermediate holding", children present |
| TC-L02 | `get_legal_ownership` on Holdings | 100% Family Trust, `basis:"entity"` |
| TC-L03 | `get_legal_ownership` on Family Trust | Eddie 60 / Bonnie 25 / Ziggy 15, nonvoting_pct 40 |
| TC-L04 | `get_legal_standing` filed-on-time entity | renewal info-only, no false `danger` |
| TC-L05 | `get_legal_standing` genuinely overdue | `danger` still fires |
| TC-L06 | 5-state parity | each of IL/WI/CO/OH/IN = 6 anti_recommendation + 5 flag |
| TC-L07 | `st_generate_entity_obligations` on a MM-LLC | items + ≥1 consideration; foreign-qual + no-OA anti-recs fire |
| TC-L08 | demo-seat RPC | runtime logs show no "Invalid API key" |

---

## 9. Security baseline

After DDL, check advisors. Baseline **22 findings** (accepted): 20 SECURITY DEFINER views, 2 extensions in public, 2 service-role bypass policies. Count > 22 → new RPC missing `SET search_path` or new table missing RLS.

---

## How to update this skill

After shipping a feature: add to the relevant section, write a TC, note coverage status. After a bug: add root cause to the gotchas registry. After a convention is agreed: add it to Section 0 so it survives resets. Back up to `github.com/Starttodaybiz/platform-skills`; runtime is `/mnt/skills/user/`.
