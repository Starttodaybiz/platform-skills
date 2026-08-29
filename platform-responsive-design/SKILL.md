---
name: platform-responsive-design
description: >-
  Responsive-design recipes, the useCompact viewport system, and the locked
  compact-mode inventory for the Start Today™ Client-Dashboard (client.starttoday.biz)
  and other shell-chrome apps. Use this skill whenever making any UI responsive,
  shrinking chrome for small/laptop screens, adjusting breakpoints or viewport
  thresholds, or debugging "why isn't this element resizing." Triggers on:
  "make this responsive", "shrink the header on laptop", "it's not resizing",
  "compact mode", "useCompact", "fit on a smaller screen", "the chrome is too big",
  "extend the canvas to the bottom", "add a breakpoint", "why won't this shrink",
  "lock in the viewport settings". Covers the zoom-proof detection hook, the
  compact?small:big gating idiom, the container-vs-inner-button trap, the on-screen
  debug-badge technique, the canvas-to-viewport-bottom pattern, and the deploy
  gotchas (latin-1 glyph edits, esbuild .jsx parse, single-line commit messages).
---

# Start Today™ Platform Responsive Design

## BEFORE YOU BUILD — read what the platform already knows

The database records what exists, what has already gone wrong, and why things
were built the way they are. **None of it is consulted unless you ask.** Four
queries, under a minute, and they routinely prevent rebuilding something that
exists or repeating a failure already solved.

```sql
-- Which tables implement a concept? (140 mapped concepts)
SELECT * FROM where_does_this_live('registered agent');

-- Has this gone wrong before? Each row carries a PREVENTION RULE.
SELECT title, symptom, prevention_rule, fix_pattern
FROM code_landmines_registry WHERE embed_text ILIKE '%<topic>%';

-- Why is it built this way? Includes alternatives REJECTED and why.
SELECT title, decision_summary, alternatives_considered, tradeoffs_accepted
FROM ai_decisions_log WHERE embed_text ILIKE '%<topic>%' ORDER BY decided_at DESC;

-- Has it been discussed? 201 past sessions, NEWEST FIRST — a later session
-- often reverses an earlier conclusion.
SELECT * FROM search_session_history('<topic>', 10);
```

**Unconfirmed rows in the table map are LEADS, not facts** — proposed by name
matching. Verify, then set `confirmed = true` with a note; that is how the map
improves.

**Two habits worth more than any single lookup.** Never trust
`pg_stat_user_tables.n_live_tup` — it is an ESTIMATE and reported ZERO for four
populated tables in one session, nearly causing a rebuild of what already
existed; use `count(*)`. And verify the PATH, not the artefact — a green build,
a passing `node --check` and a correct SQL result do not execute the component or
the route.

**When you finish**, record what you learned or the next session repeats it: a
new failure mode into `code_landmines_registry` with a `prevention_rule`, an
architectural choice into `ai_decisions_log` with `alternatives_considered`, a
confirmed table mapping into `ontology_cluster_tables`. Both registries embed
hourly and become semantically searchable on their own.

Full detail: the `compliance-platform-development` skill, STEP ZERO.

---


Last updated: Jun 24 2026 — Client-Dashboard OrgMap shell-chrome responsive sprint complete and locked.

This skill encodes the responsive system built for `client.starttoday.biz` (repo `Starttodaybiz/Client-Dashboard`, Vercel `prj_Yx534JgZNoDwMqBKsNCSRAiezeFY`). The same pattern transfers to any shell-chrome app.

---

## 1. Core principle — additive, big-screen-preserving

Every responsive value is a **ternary**: `compact ? <small> : <big>`. The `<big>` branch is always the original desktop value, untouched. Responsiveness is *additive* — we never change the desktop look, we only add a smaller branch that activates on constrained screens. Any time a request says "don't change the big screen," gate the new value behind `compact` and leave the `:big` side exactly as it was.

---

## 2. The `useCompact` viewport hook (LOCKED)

Compact mode is driven by a single hook. It is **zoom-proof**: browser zoom inflates `window.innerWidth`/`innerHeight`, which defeats a viewport-only threshold (a zoomed-in laptop reports a "big" viewport). The fix is to read the **smaller of the CSS viewport and the physical screen** — zoom cannot inflate `window.screen`.

```js
function useCompact(bp = 1500, hp = 900) {
  const calc = () => {
    if (typeof window === "undefined") return false;
    const s = window.screen || {};
    const w = Math.min(window.innerWidth  || 9999, s.width  || 9999);
    const h = Math.min(window.innerHeight || 9999, s.height || 9999);
    return w < bp || h < hp;
  };
  const [c, setC] = useState(calc);
  useEffect(() => {
    const f = () => setC(calc());
    f();
    window.addEventListener("resize", f);
    window.addEventListener("orientationchange", f);
    return () => {
      window.removeEventListener("resize", f);
      window.removeEventListener("orientationchange", f);
    };
  }, [bp, hp]);
  return c;
}
```

### Locked thresholds
| Param | Value | Meaning |
|-------|-------|---------|
| `bp` (width) | **1500** | compact if `min(innerWidth, screen.width) < 1500` |
| `hp` (height) | **900** | compact if `min(innerHeight, screen.height) < 900` |

`compact` is true if **either** dimension is under threshold (`w < bp || h < hp`).

### Where it lives (TWO copies, kept in sync)
1. **Hoisted inside `ClientShell.js`** (~L930), used by `OrgMap`, the main `ClientShell` component, `GlobalSearch`, `NotificationBell`, `RoleHeaderBadge`, `SecureMessageCenter`.
2. **Exported from `app/components/responsive.js`** so components *outside* ClientShell can import it: `import { useCompact } from './responsive'` (used by `SceneBar.jsx`).

Each component that renders its own chrome calls `const compact = useCompact();` at the top of its body. **Exception:** components rendered *into the header by ClientShell* should receive `compact` as a **prop** from ClientShell rather than recomputing it — see §4.

### Reference viewport (Jason's dev laptop)
Confirmed live via the debug badge (§5): **vw 1280 · vh 710 · screen 1280×828 · dpr 2 → compact = true** (height 710 < 900 triggers it; this machine is compact on the height axis).

---

## 3. The locked compact inventory (Client-Dashboard OrgMap)

Every shell-chrome element and its `compact ? small : big` values. This is the regression baseline — if any of these revert to a single hardcoded value, compact mode is broken for that element.

### Header (main `ClientShell` component)
| Element | compact | big |
|---------|---------|-----|
| Header padding | `"4px 14px"` | `"4px 28px"` |
| Logo height | `58` | `80` |
| "Welcome, …" fontSize | `13` | `17` |
| Date fontSize | `10` | `11` |
| Report / gear / Sign Out buttons | `26` | `34` |

### Tabs (Organizational Map / Start Suites™)
| Element | compact | big |
|---------|---------|-----|
| Tab padding | `"6px 10px"` | `"11px 16px"` |
| Tab fontSize | `12` | `14` |

### START THREAD™ sidebar
| Element | compact | big |
|---------|---------|-----|
| Wrapper transform | `"scale(0.86)"` + `transformOrigin:"top left"` | `undefined` |

Scaling the whole sidebar from its top-left corner keeps its top edge anchored at `top:14` (transform-origin top-left means scale doesn't move the top), which the narrative box aligns to.

### Map zoom toolbar (right rail)
| Element | compact | big |
|---------|---------|-----|
| 4 control buttons (w/h) | `26` | `38` |
| ADD (+) button width | `26` | `38` |
| ADD (+) button minHeight | `28` | `40` |

### Map search bar ("Search or ask CARL™…", in OrgMap)
| Element | compact | big |
|---------|---------|-----|
| Bar container width (lens open) | `504` | `580` |
| Bar container width (lens closed) | `376` | `440` |
| ◈ cell padding | `"7px 11px"` | `"11px 14px"` |
| ◈ glyph fontSize | `14` | `17` |
| Mic button padding | `"6px 9px"` | `"9px 11px"` |
| Mic icon width | `13` | `15` |
| Input padding | `"8px 11px"` | `"11px 12px"` |
| Input fontSize | `12` | `13` |

### Header search magnifier (`GlobalSearch`)
| Element | compact | big |
|---------|---------|-----|
| Container width (open) | `340` | `400` |
| Container width (closed) | `26` | `34` |
| Container height | `26` | `34` |
| Inner button (w/h) | `26` | `34` |

### Notification bell (`NotificationBell`)
| Element | compact | big |
|---------|---------|-----|
| Button (w/h) | `26` | `34` |

### Admin pill (`RoleHeaderBadge`, both color variants)
| Element | compact | big |
|---------|---------|-----|
| Padding | `"2px 7px"` | `"3px 10px"` |
| fontSize | `8.5` | `10` |

### DEMO pill (`SceneBar.jsx` — imports `useCompact` from `./responsive`)
| Element | compact | big |
|---------|---------|-----|
| Pill height | `26` | `34` |
| Pill padding | `'0 8px'` | `'0 12px'` |
| gap | `6` | `8` |
| fontSize | `9.5` | `11` |
| 🎬 emoji fontSize | `11` | `13` |
| status dot (w/h) | `6` | `7` |

### CARL chat bubble (`SecureMessageCenter` — receives `compact` as a PROP)
| Element | compact | big |
|---------|---------|-----|
| Bubble container (w/h) | `36` | `56` |
| Icon (w/h) | `16` | `24` |
| Unread badge (w/h) | `16` | `20` |
| Unread badge fontSize | `8` | `10` |

### Lens narrative box (the "Legal & Ownership / Who owns and controls…" bracket)
| Element | compact | big |
|---------|---------|-----|
| Position | `top:14, left:186` | `top:14, left:256` |
| Outer maxWidth | `225` | `420` |
| Description maxWidth | `200` | `380` |
| Headline fontSize | `14` | `18` |
| Description fontSize | `10.5` | `12.5` |
| paddingBottom | `8` | `12` |
| Bracket padding | `"6px 9px 4px 12px"` | `"9px 11px 6px 16px"` |
| Background | `#F8FAFC` (opaque, **= canvas color**), `borderRadius:10` | same |

The box background is set to the **exact map-canvas color** (`#F8FAFC`, from the map container at `OrgMap` L2645) and fully opaque, so it reads as a clean patch of canvas punched through the nodes — invisible against empty canvas, covers nodes where it overlaps. `top:14` aligns its top with the START THREAD card top; `left` + `maxWidth` are tuned to sit in the gap between the sidebar's right edge and the search bar's left edge without overlapping either.

### Canvas height — extend to viewport bottom on compact
```js
height: mapFull ? "100vh"
      : compact ? "calc(100vh - 138px)"   // compact: header+tabs are shorter
      :           "calc(100vh - 175px)"   // big screen: UNCHANGED
```
The subtracted offset reserves room for the header + tabs above the canvas. `175px` is tuned for the **big-screen** header height; on compact the header/tabs are shorter, so reserving 175 leaves a white strip at the bottom (where the fixed CARL bubble floats off-canvas). Subtracting less (`138`) grows the canvas downward until its bottom reaches the viewport edge, pulling the bubble onto the canvas. **Rule:** the compact offset must be **≥ the real compact header+tabs height** or the page will scroll (Jason's hard constraint: never extend the viewport / add vertical scroll). Tune the number down to close any residual gap, up if a scrollbar appears.

### Page wrapper (`app/DashboardClient.js`)
The Formation Tracker hero wrapper was `padding: '24px 24px 0'`. The hero returns `null` in steady state, so the 24px top padding was dead gray space above the header. Changed to `padding: '0 24px'` (side gutters only) so the header sits flush to the top; the hero keeps its own `margin: '0 auto 24px'` when it *does* render.

### Self-responsive — DO NOT gate
Map **graph nodes, labels, and edges** scale with the d3/zoom transform already. Never add `compact` gating to them — they are responsive by construction and gating them double-shrinks.

---

## 4. Hard-won lessons (read before touching responsive code)

1. **Container-vs-inner-button trap.** When an element "won't shrink" even though you gated it, the gated value is usually on the *inner* button while a **hardcoded wrapper/container** sets the visible footprint. Check the wrapper. This bit us three times: the header magnifier (inner button gated, container hardcoded `34`), the toolbar ADD (+) button (hardcoded `38/40` forcing container width), and the map search bar.

2. **Pass `compact` as a prop to header children.** `SecureMessageCenter` (CARL bubble) originally computed its own `useCompact`, and it read inconsistently. Fix: remove its local hook, change its signature to `({ onNavigate, onOpenFull, compact })`, and have ClientShell pass its own known-good `compact={compact}` at the call site. Children rendered by ClientShell into the header should share ClientShell's value, not recompute.

3. **The icon inside a shrunk ring must shrink too.** The CARL bubble looked unchanged across many edits because the ring shrank but the icon was a hardcoded `<svg width="24" height="24">`. Always gate the inner glyph/icon alongside its container.

4. **On-screen debug badge beats remote reasoning.** When "why isn't X changing" is unclear and you're guessing about a remote viewport, deploy a **temporary red badge** pinned top-center of the header showing live `vw / vh / screen.w×h / dpr / compact`. Jason screenshots it instantly → definitive bisection. This is what finally proved the wiring was correct and the threshold (not the plumbing) was the issue. Remove the badge once confirmed.

5. **Deploy/refresh timing during rapid pushes.** Several "it didn't work" reports were screenshots taken *before* the relevant deploy went READY. Confirm the commit SHA is live (Vercel `list_deployments`) before trusting a "no change" screenshot.

6. **Threshold history (for context).** Width-only `vw<1180` → his 1280 laptop never qualified. Then height-aware `vh<880`. Then `vw<1400`. Then the zoom-proof `min(viewport,screen)` at **1500/900**, which is the locked value. The lesson: a width-only breakpoint misses short-but-wide laptops; always consider the height axis, and account for browser zoom.

---

## 5. Debug badge (temporary instrument — keep this snippet)

Drop near the top of the header render, ship it, screenshot, then remove:
```jsx
{/* TEMP responsive debug badge — REMOVE after confirming */}
<div style={{position:"absolute",top:2,left:"50%",transform:"translateX(-50%)",zIndex:99999,
  background:"#DC2626",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,
  fontFamily:"monospace",pointerEvents:"none"}}>
  vw{typeof window!=="undefined"?window.innerWidth:"?"} · vh{typeof window!=="undefined"?window.innerHeight:"?"} · scr{typeof window!=="undefined"?`${window.screen.width}x${window.screen.height}`:"?"} · dpr{typeof window!=="undefined"?window.devicePixelRatio:"?"} · {compact?"COMPACT":"big"}
</div>
```

---

## 6. Deploy gotchas (Client-Dashboard)

### File → repo path map
| Working file | Repo path |
|--------------|-----------|
| `ClientShell.js` | `app/components/ClientShell.js` |
| `SceneBar.jsx` | `app/components/SceneBar.jsx` |
| `responsive.js` | `app/components/responsive.js` |
| `DashboardClient.js` | **`app/DashboardClient.js`** (repo root `app/`, NOT `components/`) |

### Editing files with non-UTF-8 glyphs (◈ 🎬 ™)
`ClientShell.js` (~1.6 MB) contains non-ASCII glyphs. Edit via a Python **latin-1 round-trip** so bytes survive:
```python
data = open(f, 'rb').read().decode('latin-1')
# assert count before replace: if data.count(a) != 1: bail
data = data.replace(a, b, 1)
open(f, 'wb').write(data.encode('latin-1'))
```

### Always parse-check JSX before declaring done
esbuild transform-only catches syntax errors. The `.js` extension **fails** on JSX — copy to `/tmp/x.jsx` first:
```bash
cp file.js /tmp/x.jsx
cd /tmp/parse-check && npx --no-install esbuild /tmp/x.jsx --format=esm --outfile=/tmp/x.out
```

### Commit messages: SHORT, SINGLE LINE
zsh splits a pasted multi-line command at the newline, leaves the quote open (`dquote>`), and the leftover words of a long commit message get handed to `git` as pathspecs (`error: pathspec 'lens' did not match…`). Keep `-m` messages to one short line so the whole block pastes as a single command. Canonical:
```bash
cp ~/Downloads/ClientShell.js ./app/components/ClientShell.js && npm run build && git add app/components/ClientShell.js && git commit -m "Short single-line message" && git push origin main
```
Claude prepares files + the exact bash block; **Jason runs all git pushes** — Claude never pushes.
