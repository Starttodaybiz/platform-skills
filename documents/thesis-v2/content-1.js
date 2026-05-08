const {
  P, H1, H2, H3, PB, Bullet, BulletBold, Callout, MetricsTable, ColTable,
} = require("./build-thesis.js");

// ── EXECUTIVE SUMMARY ───────────────────────────────────────────────────────
const execSummary = [
  PB(),
  H1("Executive Summary"),
  P("Start Today™ is a unified compliance intelligence platform that has evolved from a single-portal compliance tracker into a multi-portal ecosystem serving small and mid-market businesses across compliance, legal, HR, banking, insurance, deal-making, estate planning, and verification. As of May 2026, the platform comprises 23 distinct portals, 1,034 production database tables, 81 scheduled background jobs, and 75+ edge functions — with CARL™ (Compliance AI Reasoning LLM) as the unifying intelligence layer woven through every portal."),
  P("This second-edition thesis updates the strategic narrative first laid out in March 2026. Since then, the platform has shipped seven major portals (Click to Close™, Chamber, Lender, Accounting, Property, Employee Self-Service, and the Provider HR portal), launched STVerify™ as a co-owned standalone verification API, completed a comprehensive SOC 2 readiness program, deployed automated security and compliance monitoring, and built out the Org Mind Map V2 with the CARL Lens™ floating intelligence surface."),
  P("The core thesis remains intact: compliance management is a fragmented, expensive, and reactive market. Small businesses pay the highest per-capita compliance costs and have the fewest tools. Start Today™ unifies the eleven dimensions of business compliance into a single Start Score™, surfaces what to do next via CARL™, and creates a marketplace where professionals deliver against client portfolios that the platform itself maintains. What is new in this edition is that the platform has expanded beyond compliance into the adjacent revenue surfaces — banking, insurance, deal-making, estate, accounting — that compliance data naturally enables."),
  H3("What this document is for"),
  P("This thesis is the authoritative strategic record for Start Today, LLC. It serves three audiences: (1) the founders and operating team, as the canonical narrative tying together architecture, market, pricing, and roadmap; (2) prospective investors and lenders, as a comprehensive substantive picture of the business; and (3) future Claude sessions, as a stable reference point that prevents the strategic memory from drifting between conversations. It is current as of May 7, 2026, and supersedes the v1.0 thesis dated March 12, 2026."),
  Callout("Edition note", [
    "Version 2.0 — May 7, 2026.",
    "Supersedes Master's Thesis v1.0 (March 12, 2026).",
    "Reflects: 23-portal architecture, 1,034-table production schema, SOC 2 readiness milestone, automated security audit, the CARL Lens floating surface, the C2C success-fee revenue model, the chamber expansion through GRCC, and the addition of accounting, property, employee self-service, and lender portals.",
  ]),
];

// ── CHAPTER 1: MARKET ───────────────────────────────────────────────────────
const ch1 = [
  PB(),
  H1("Chapter 1 — The Compliance Market in 2026"),
  H2("1.1  The fragmentation problem, restated"),
  P("The U.S. business compliance services market is approximately $42 billion in 2026, growing at roughly 11% annually toward an estimated $73 billion by 2030. The growth driver is not new regulation alone, although there has been substantial new regulation — the Corporate Transparency Act's Beneficial Ownership Information requirements, the post-Wayfair state-by-state sales tax nexus regimes, the multiplying state-level employment laws, the AI disclosure requirements emerging in California, Colorado, Illinois, and New York. The deeper driver is that small and mid-market businesses now face the same compliance burden as enterprise but with none of the dedicated infrastructure."),
  P("A 50-employee company in Illinois operating across three states must, in any given quarter, file annual reports in three jurisdictions, maintain registered agents in three jurisdictions, file BOI updates within 30 days of any beneficial ownership change, file state and federal employment tax returns, maintain workers compensation coverage in every state where it has employees, file sales tax returns in every state where it crosses economic nexus thresholds, maintain I-9 documentation, run E-Verify queries, post the annually updated state and federal employment law posters, and renew or maintain industry-specific licenses. None of this is optional. None of it is centralized. And the typical small business owner manages it through a combination of email, spreadsheets, their accountant, their attorney, their insurance broker, and the calendar reminders they set themselves."),
  P("This is the market Start Today™ exists to consolidate. The thesis is not that any single one of these compliance categories needs a better tool. The thesis is that the act of running them all in one place creates a category of value that no point-solution provider can match — because the data from one category informs the others, and because the marketplace of professionals who service these clients can be unified once the underlying data is."),
  H2("1.2  Regulatory acceleration since v1.0"),
  P("Three regulatory developments since March have sharpened the case for unified compliance:"),
  BulletBold("BOI enforcement transition", "FinCEN's Beneficial Ownership Information regime entered active enforcement during Q1 2026 after the post-Corporate Transparency Act litigation cycle resolved. The platform's BOI tracker, which was a leading-indicator feature in v1.0, has become a present-tense compliance obligation feature. Penalties for late or inaccurate filings are now being assessed."),
  BulletBold("State-level AI disclosure regimes", "Colorado's SB24-205 took partial effect February 1, 2026, requiring businesses using AI in consequential decisions to maintain risk-management programs and disclose AI use to consumers. Illinois followed with HB 3773 amendments. New York's LL 144 hiring-AI bias audit regime expanded scope. The compounding effect is that any business using AI tools in employment, credit, housing, or healthcare decisions now has new compliance obligations the platform tracks through CARL™."),
  BulletBold("Sales tax nexus expansion", "Five additional states adjusted their economic nexus thresholds during 2025-Q4-2026-Q1, including California's reduced threshold and Texas's filing frequency change. The platform's nexus tracking module now monitors 47 jurisdictions of economic nexus and 12 of physical-presence nexus."),
  H2("1.3  Why the small business is structurally underserved"),
  P("Enterprise compliance is well served by Wolters Kluwer's CT Corporation, CSC, and Corporate Service Company. Each of these firms charges in the high four figures to low five figures per year per entity for registered agent and annual report services alone. They serve the Fortune 5000 well. They are unaffordable for the 33 million U.S. small businesses below 500 employees, and they do not address the full scope of compliance — only the corporate housekeeping subset."),
  P("Small business compliance is served by a fragmented patchwork of specialists: the local attorney for formation and corporate governance, the CPA for tax compliance, the insurance broker for the regulatory components of insurance (workers comp, EPLI, cyber), the HR consultant for employment compliance, the bookkeeper for AR/AP and 1099 filings, and the owner themselves for everything else. None of these specialists see the full compliance picture for the business. None of them coordinate. Each charges separately. And when a regulatory deadline is missed — which happens routinely — none of them are accountable, because none of them were responsible for the whole."),
  P("This structural gap is the market opening. A platform that maintains the compliance ledger, surfaces the next obligation, computes a reliable health score, and offers a marketplace of professionals to deliver against gaps captures value that no individual specialist can capture. The platform becomes the source of truth for the business's compliance posture, and every professional who works on the business does so against that source of truth, in the platform."),
  H2("1.4  Adjacent markets and the platform's expansion thesis"),
  P("The v1.0 thesis was about compliance. The v2.0 thesis is broader. Compliance data — entity structure, ownership, employment, properties, contracts, financials — is the foundational data layer for many adjacent decisions. Once a business's compliance ledger is complete and verified, that same data can underwrite a loan, bind insurance, support a deal closing, populate an estate plan, prepare a tax return, and verify the business to a counterparty. Each of these is a separate revenue surface that traditional compliance providers cannot reach because they do not maintain the underlying data. Start Today™ does."),
  P("The platform has therefore added six new portals since v1.0, each addressing one of these adjacent markets — Click to Close™ for transactions, Banking & Treasury Suite for lenders, the Insurance Brokerage portals, the Estate Planning portal, the Accounting & Tax Suite, and the Chamber Portal for organized business communities. Each is sized as a meaningful revenue stream in its own right. Together, they multiply the platform's revenue per-account by an estimated 4–6× compared to a compliance-only model."),
];

// ── CHAPTER 2: PLATFORM ARCHITECTURE ────────────────────────────────────────
const ch2 = [
  PB(),
  H1("Chapter 2 — Platform Architecture"),
  H2("2.1  Production state, May 2026"),
  P("The production platform comprises the following measurable components:"),
  MetricsTable([
    ["Metric", "Value (May 2026)"],
    ["Production database tables", "1,034"],
    ["Edge functions deployed", "75+"],
    ["Scheduled cron jobs", "81"],
    ["Active client organizations", "76"],
    ["Tracked entities", "90"],
    ["Tracked employees", "64"],
    ["Active compliance items", "1,431"],
    ["Documents in registry", "387"],
    ["Storage buckets", "39"],
    ["SOC 2 controls cataloged", "36"],
    ["Jurisdiction filing rules", "155"],
    ["Master metrics tracked", "122"],
    ["Pipeline stages defined", "33"],
    ["SBA loan programs mapped", "50"],
    ["Report templates", "124"],
  ]),
  H2("2.2  The 23-portal architecture"),
  P("The platform is composed of distinct subdomain-scoped portals, each addressing a specific user role, but all sharing a single Supabase database and a single CARL™ AI layer. Portals are categorized as client-facing, professional-facing, or platform-internal. Each portal has its own authentication boundary (HttpOnly cookie via custom JWT), its own design tokens within the unified Start Today™ design system, and its own role-specific CARL persona context."),
  ColTable(
    ["Portal subdomain", "Audience", "Function"],
    [
      ["client.starttoday.biz", "Client", "Primary client compliance dashboard, Start Score, Org Mind Map"],
      ["compliance.starttoday.biz", "ST staff", "Internal operations, AutoSchedule, document pipeline"],
      ["legal.starttoday.biz", "Attorneys", "Matter management, document workbench, marketplace"],
      ["mylegal.starttoday.biz", "Client", "Client-facing legal suite (Start Suite Legal)"],
      ["bank.starttoday.biz", "Client", "Banking portal, Plaid feed, loan covenants"],
      ["lender.starttoday.biz", "Lenders/CDCs", "Banking & Treasury Suite, SBA 504/7(a) origination"],
      ["hr.starttoday.biz", "Client", "HR compliance, I-9, EEO, workers comp, posters"],
      ["prohr.starttoday.biz", "HR providers", "Multi-client HR provider workspace"],
      ["ins.starttoday.biz", "Brokers", "Insurance brokerage portal"],
      ["mga.starttoday.biz", "MGAs", "Managing general agent portal"],
      ["carl.starttoday.biz", "All users", "Standalone CARL conversation surface"],
      ["admin.starttoday.biz", "Platform admin", "Platform Admin V3, ops, deployment"],
      ["work.starttoday.biz", "Internal", "Work Hub for project, task, and team coordination"],
      ["plan.starttoday.biz", "Client", "Strategic Planning Suite"],
      ["marketplace.starttoday.biz", "All users", "Provider marketplace and engagement"],
      ["c2c.starttoday.biz", "Deal parties", "Click to Close™ — M&A and deal data room"],
      ["property.starttoday.biz", "Client", "Property Suite™ — real estate, leases, properties"],
      ["finance.starttoday.biz", "Providers", "Finance & treasury provider-facing suite"],
      ["chamber.starttoday.biz", "Chambers", "Chamber portal — GRCC, regional intelligence"],
      ["accounting.starttoday.biz", "Client", "Accounting & Tax Suite (in development)"],
      ["employee.starttoday.biz", "Employees", "Mobile-first employee self-service, no-login-token"],
      ["starttoday.estate", "Client", "Estate planning client portal"],
      ["stverify.com", "Developers", "STVerify™ developer portal (separate company)"],
    ],
    [0.32, 0.18, 0.50]
  ),
  H2("2.3  CARL™ — the unifying intelligence layer"),
  P("CARL™ (Compliance AI Reasoning LLM, glyph ◈) is the single AI engine that serves every portal. There is one engine — Anthropic's Claude API — and seven contextual personas injected per portal: CARL Compliance, CARL Legal, CARL Strategy, CARL Finance, CARL Banking, CARL HR, and CARL Estate. The persona is determined at request time based on which portal the user is in. The CARL v4 architecture incorporates seven contextual layers: case law records, enforcement context, IRC statutes, conflict resolution rules, EEOC charge data, NLRB decisions, and OSHA enforcement data. An IP protection layer prevents CARL from answering self-research queries about Start Today's own technology, methodology, pricing, or ownership."),
  P("CARL Lens™ is the floating, draggable AI surface that appears on the Org Mind Map and other key views. Visually, it is a dark capsule (#0A1628), frosted glass, with the emerald ◈ glyph pulsing softly. Functionally, CARL Lens controls the map: it answers user questions by illuminating, dimming, or highlighting nodes in real time. Clarification is collected via tap-chips, not free text. Lens is currently being rolled out cross-portal, with each of the 18 authenticated portals receiving a ◈ button that uses a signed 10-minute SSO JWT to launch Lens in the user's current context."),
  H2("2.4  Start Score™ — the platform's signature metric"),
  P("Start Score™ is the platform's eleven-pillar weighted compliance health index. It is the single number that summarizes a business's overall compliance posture and is the focal metric on every client dashboard. The eleven pillars are: Entity Compliance (15%), Tax Compliance (12%), HR Compliance (12%), Insurance Coverage (10%), Banking & Capital (10%), Legal Posture (10%), Estate & Succession (8%), Financial Data Quality (8%), Property & Real Estate (5%), Reporting & Audit Readiness (5%), and Strategic Planning (5%). Each pillar is computed by a versioned scoring function (currently calculate_start_scores_v3) that draws from authoritative platform data, applies penalties for missing or stale information, and applies bonuses for verified completeness."),
  P("The Data State Machine™ governs how data flows into the score: every datapoint moves through a verification lifecycle of MISSING → DRAFT → SELF_REPORTED → SYSTEM_PULLED → PENDING_REVIEW → APPROVED → STVERIFIED™. Each state has a quality multiplier (0.0× through 1.0×) that caps the contribution of that datapoint to the pillar's score. This means that an entity with comprehensive but unverified data scores meaningfully lower than the same entity with everything verified — creating a structural pull toward verification, which is itself a revenue surface (STVerify™ Certified Calculation™ at $10–$25 per certification)."),
];

module.exports = { execSummary, ch1, ch2 };
