const {
  P, H1, H2, H3, PB, Bullet, BulletBold, Callout, MetricsTable, ColTable,
  coverChildren, navy, emerald, slate900, slate700, slate500, slate400,
  slate200, slate100, slate50, warmBg, accent,
  DXA_W, DXA_H, MARGIN, CONTENT_W,
} = require("./build-thesis.js");

const { execSummary, ch1, ch2 } = require("./content-1.js");
const { ch3, ch4, ch5, ch6 } = require("./content-2.js");

// ── CHAPTER 7: GO-TO-MARKET ─────────────────────────────────────────────────
const ch7 = [
  PB(),
  H1("Chapter 7 — Go-to-Market"),
  H2("7.1  The chamber-led distribution motion"),
  P("The most important go-to-market change since v1.0 is the strategic decision to lead through chambers of commerce rather than through direct online acquisition. Chambers solve the cold-acquisition problem at the cost of a revenue split. The Greater Rockford Chamber of Commerce (GRCC) is the first launch partner, with co-branded enrollment, a chamber-portal-themed regional intelligence map, and a scheduled cohort of GRCC members onboarding through the chamber relationship."),
  P("Why chambers work as a channel for this product specifically: chambers already have trust with their member businesses, chambers are looking for value-add member benefits to justify dues, chambers themselves have administrative burden the platform reduces, and the Regional Intelligence Map is a chamber-specific deliverable that becomes a chamber retention tool. The expansion plan calls for 5 additional chambers in Illinois and Wisconsin during 2026, then 15-20 chambers nationally during 2027."),
  H2("7.2  Channel partner segments"),
  BulletBold("Chambers of Commerce", "GRCC live, additional Illinois and Wisconsin chambers in pipeline. Chambers receive co-branded portal, member-acquisition revenue share, and the regional intelligence map as a chamber-retention asset."),
  BulletBold("CDCs (Certified Development Companies)", "Rockford Local Development Corporation is the demonstration CDC partner. The platform provides 504 packaging tooling that reduces the CDC's per-loan cost meaningfully. The CDC channel is sized at approximately 220 active CDCs nationally."),
  BulletBold("Insurance Brokerages", "Brokers receive a portal that maintains their book of business's compliance posture, generates renewal-readiness alerts, and allows them to refer clients into Start Today services in exchange for ongoing commission share. The MGA portal extends this to the wholesale insurance layer."),
  BulletBold("Banks and CDFIs", "Smaller community banks, credit unions, and CDFIs are the first banking partners. They receive the lender portal for SBA 504/7(a) origination at meaningfully lower cost than building it themselves. Once the SOC 2 milestone is reached, larger commercial banks become accessible."),
  BulletBold("Accounting / CPA firms", "Through the Accounting & Tax Suite, CPA firms become both a referral source and a service provider. Multi-firm CPA practices become Provider HR-style multi-client portal users."),
  BulletBold("Estate Planning Attorneys", "The Estate Planning Suite at starttoday.estate is the corresponding professional-side portal. Attorneys engaged through the platform earn while the platform earns marketplace take-rate."),
  H2("7.3  The four-stage funnel"),
  P("The platform's customer funnel — distinct from the older v1.0 framing — is now structured as four stages, each with its own conversion logic and own platform features:"),
  P("Stage 1: Discover. Source: chamber, CDC, broker, attorney referral, or organic search to starttoday.biz marketing site. Outcome: lead opens the Business Readiness Assessment (a free, 8-minute interactive form with no login required) and receives an immediate Start Score preview."),
  P("Stage 2: Activate. Conversion from Score Preview to active client portal account. Free tier or paid tier, depending on entry point. Onboarding scene SCENE_1_ONBOARDING delivers the new-client experience with intentional initial Start Score around 62 and visible compliance crises to motivate engagement."),
  P("Stage 3: Verify. The client transitions data through the Data State Machine — moving SELF_REPORTED items toward APPROVED and STVERIFIED status. This is where STVerify revenue activates and where marketplace professionals are first engaged. Scene SCENE_2_STEADY_STATE represents this stable activated state with score around 84.6."),
  P("Stage 4: Expand. The client begins consuming adjacent portals: banking, insurance, deal-making, estate, accounting. Each adjacent portal substantially raises annual revenue per account. The marketplace take-rate becomes meaningful here."),
];

// ── CHAPTER 8: COMPETITIVE LANDSCAPE ────────────────────────────────────────
const ch8 = [
  PB(),
  H1("Chapter 8 — Competitive Landscape"),
  H2("8.1  No direct equivalent"),
  P("There is no direct competitor to Start Today as a unified compliance intelligence platform with multi-portal coverage of compliance, legal, HR, banking, insurance, deal-making, and estate. Each competitor operates in a single domain. The platform's defensible position is the fact that operating across all of these domains, with shared data, creates value that no single-domain competitor can match."),
  H2("8.2  Domain-by-domain competitor map"),
  ColTable(
    ["Domain", "Strongest competitors", "Why ST wins"],
    [
      ["Corporate compliance / RA", "CSC, CT Corporation, Corporate Service Co.", "ST is 1/4 the price for SMB and adds the score, marketplace, and adjacent portals."],
      ["BOI/CTA filing", "Corpnet, IncFile, ZenBusiness, FincenFetch", "ST handles BOI as one of many obligations, not a standalone product. Comes free with subscription."],
      ["HR compliance", "Bambee, Mineral, ComplyRight, SHRM", "ST's HR portal is integrated with employee self-service, training, policies, and HR_Compliance_Issues queue, not just policy docs."],
      ["Insurance brokerage SaaS", "Applied Epic, AMS360, Vertafore", "Those are broker management systems. ST provides a true two-sided client/broker portal with compliance context."],
      ["Deal data rooms", "Datasite, Intralinks, Firmex", "ST's C2C is success-fee priced and integrates STVerify certifications throughout. Competitors charge per-deal flat fees of $5K-$25K."],
      ["Estate planning", "Trust & Will, Wealth.com", "ST connects estate planning to live business compliance data; estate documents reflect actual operating reality."],
      ["Verification", "Middesk, FullCircl, Persona", "STVerify is the platform's verification layer, not a third party. Margin captured rather than paid."],
      ["SBA 504/7(a) origination", "Lendio, NumeraLending, internal bank tools", "ST's lender portal reduces packaging cost from $5-15K to $1-2.5K per 504 loan, transforming CDC and small bank economics."],
    ],
    [0.22, 0.30, 0.48]
  ),
  H2("8.3  The data network effect"),
  P("Once the platform has a critical mass of clients in a region, the regional data — incentive maps, brownfield overlays, TIF districts, member network density — becomes a deliverable in its own right. The 106-entry GRCC dataset, the 44 historic-district members, the proximity overlays for brownfield/Superfund/RCRA: this is data the chamber itself does not have, the bank does not have, and that no single-domain competitor can assemble. As the platform expands chamber-by-chamber, this data depth compounds and becomes harder for any single-domain competitor to replicate."),
];

// ── CHAPTER 9: STRATEGIC MOATS ──────────────────────────────────────────────
const ch9 = [
  PB(),
  H1("Chapter 9 — Strategic Moats"),
  H2("9.1  Five compounding moats"),
  BulletBold("The CARL contextual library", "CARL v4 incorporates seven contextual layers (case law, enforcement context, IRC statutes, EEOC, NLRB, OSHA, conflict resolution rules) plus the IP protection layer. Each new vertical adds another layer. Each new client adds question-and-answer training data. The CARL library compounds."),
  BulletBold("The platform ontology", "The platform_ontology table is the locked record of every architectural and product decision made about the platform. It prevents future re-litigation of decided questions. It accelerates onboarding of any new contributor — including future Claude sessions. It is how the platform retains organizational memory at scale."),
  BulletBold("The verification layer", "STVerify certifications create stamped, hashed, timestamped data records that are independently verifiable. Once a body of certifications exists for a client, the cost to switch platforms includes the cost to re-verify everything. This is the strongest single-client switching cost."),
  BulletBold("The marketplace network", "The marketplace creates two-sided network effects: more clients pull more professionals, more professionals serve more clients faster, faster service raises NPS, higher NPS raises retention. Once the marketplace passes a regional threshold (estimated at 200 active clients per market), it becomes self-sustaining."),
  BulletBold("The regional intelligence depth", "The chamber-by-chamber regional intelligence overlay is a slow-to-build asset but very hard to replicate. Each chamber added grows the federation of data. Eventually this dataset becomes a separately-licensable product."),
  H2("9.2  The platform's most defensible single asset"),
  P("Of the five moats above, the most defensible single asset is the verification layer — STVerify. It is the platform's only standalone product (operating at stverify.com under separate corporate ownership), its certifications create durable switching costs, and its API surface has external pricing power even when bundled with the platform. STVerify is the one piece of the platform that could in principle be sold or spun out independently. It is, accordingly, the platform's most strategically protected asset."),
];

// ── CHAPTER 10: ROADMAP ─────────────────────────────────────────────────────
const ch10 = [
  PB(),
  H1("Chapter 10 — Roadmap"),
  H2("10.1  Q3 2026"),
  Bullet("Complete SOC 2 Type I audit. Engagement of independent auditor by end of June 2026. Type I attestation by end of August 2026."),
  Bullet("Ship Accounting & Tax Suite to general availability. Currently in development; target launch August 2026."),
  Bullet("Expand chamber portal to 5 additional chambers (Illinois + Wisconsin)."),
  Bullet("Stripe e2e wired for self-service subscription upgrades and STVerify pay-as-you-go billing."),
  Bullet("USPTO trademark filings completed for Start Today™, Start Score™, STVerify™, CARL™, Business Start Studio™."),
  H2("10.2  Q4 2026"),
  Bullet("CARL Lens cross-portal rollout completed across all 18 authenticated portals."),
  Bullet("First closed C2C transaction with success fee captured."),
  Bullet("First fully packaged SBA 504 loan originated through the lender portal."),
  Bullet("Illinois Secretary of State bulk data feed live (currently parked pending IL SOS bulk data acquisition)."),
  Bullet("MFA enrollment >50% across professional users."),
  H2("10.3  Q1 2027"),
  Bullet("SOC 2 Type II audit window opens (6-month operating-effectiveness window starting from Q3 2026 evidence collection)."),
  Bullet("First 10-chamber regional intelligence federation live."),
  Bullet("Lender portal exits demonstration mode; first contracted bank partner."),
  Bullet("Platform passes 250 active client organizations."),
  H2("10.4  Q2 2027 and beyond"),
  Bullet("SOC 2 Type II attestation issued."),
  Bullet("Healthcare-vertical sales motion opens."),
  Bullet("Series A or strategic investment, depending on revenue trajectory."),
  Bullet("STVerify standalone enterprise sales motion opens."),
  H2("10.5  How this thesis stays current"),
  P("This thesis is now part of the unified platform documentation registry (st_internal_policies, doc_class='strategy'). Each major version supersedes the prior version through fn_publish_internal_doc(); the supersession chain is preserved through the supersedes_id column. Major architectural decisions are logged in platform_ontology with effective dates. Future revisions of this thesis will be triggered by significant portal additions, significant revenue model changes, or major strategic pivots — and will follow the same publication mechanism so that the canonical record is always current and discoverable."),
  PB(),
  // ── END MATTER ────────────────────────────────────────────────────────────
  new (require("docx").Paragraph)({
    alignment: require("docx").AlignmentType.CENTER,
    spacing: { before: 1600, after: 200 },
    children: [new (require("docx").TextRun)({ text: "— END OF THESIS v2.0 —", font: "Arial", size: 22, italics: true, color: slate500 })],
  }),
  P("Authored by Jason C. Walker, Co-Founder & CCO, Start Today, LLC.", { align: require("docx").AlignmentType.CENTER, color: slate500, size: 20 }),
  P("Reviewed and concurred by Michael J. Schirger, Co-Founder & CEO.", { align: require("docx").AlignmentType.CENTER, color: slate500, size: 20 }),
  P("May 7, 2026.", { align: require("docx").AlignmentType.CENTER, color: slate500, size: 20 }),
];

// ── ASSEMBLE ────────────────────────────────────────────────────────────────
const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType,
  BorderStyle, PageNumber, LevelFormat, PageOrientation, PositionalTab,
  PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
} = require("docx");
const fs = require("fs");

const coverSection = {
  properties: {
    page: { size: { width: DXA_W, height: DXA_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
    titlePage: true,
  },
  children: coverChildren,
};

const bodyChildren = [
  ...execSummary,
  ...ch1, ...ch2, ...ch3, ...ch4, ...ch5,
  ...ch6, ...ch7, ...ch8, ...ch9, ...ch10,
];

const bodySection = {
  properties: {
    page: { size: { width: DXA_W, height: DXA_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: navy, space: 1 } },
        children: [
          new TextRun({ text: "START TODAY™ — Master's Thesis v2.0", font: "Arial", size: 16, color: slate400 }),
          new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE }),
          new TextRun({ text: "Confidential", font: "Arial", size: 16, color: slate400, italics: true }),
        ],
      })],
    }),
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", font: "Arial", size: 16, color: slate400 }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: slate400 }),
        ],
      })],
    }),
  },
  children: bodyChildren,
};

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: navy },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: navy },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: slate700 },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [coverSection, bodySection],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/claude/thesis-v2/StartToday_Masters_Thesis_v2.docx", buf);
  console.log("✓ Thesis v2.0 written:", buf.length, "bytes");
});
