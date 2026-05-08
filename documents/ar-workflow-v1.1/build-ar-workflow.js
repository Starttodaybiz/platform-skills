// AR Collection Workflow v1.1 — refreshed 2026-05-07
// Updates from v1.0 (March 2026):
//  - Step 6 Platform Upload — now performed by ST staff via compliance.starttoday.biz
//  - Document upload links directly to Annual_Report_Filings via the Documents table
//  - Added Step 7 covering verification status / STVerified™ promotion
//  - Added Illinois bulk feed note (forthcoming)
//  - Refreshed branding to current navy/emerald palette

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat,
  BorderStyle, HeadingLevel, PageNumber, Header, Footer,
} = require("docx");

const navy = "1E3A5F";
const emerald = "059669";
const slate700 = "334155";
const slate500 = "64748B";
const slate400 = "94A3B8";

const arial = (text, opts = {}) => new TextRun({
  text, font: "Arial", size: opts.size ?? 22,
  color: opts.color ?? slate700, bold: opts.bold, italics: opts.italic,
});

const P = (text, opts = {}) => new Paragraph({
  spacing: { before: opts.before ?? 60, after: opts.after ?? 120, line: 280 },
  alignment: opts.align ?? AlignmentType.LEFT,
  children: [arial(text, opts)],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 320, after: 140 },
  children: [arial(text, { size: 28, bold: true, color: navy })],
});

const ListItem = (parts) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { before: 40, after: 80, line: 280 },
  children: Array.isArray(parts) ? parts.map(p => arial(p.text, p)) : [arial(parts, {})],
});

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: navy },
        paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: navy, space: 1 } },
        children: [arial("START TODAY™ — Annual Report Collection Workflow v1.1", { size: 16, color: slate400 })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          arial("Page ", { size: 16, color: slate400 }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: slate400 }),
          arial("  ·  Updated May 7, 2026", { size: 16, color: slate400 }),
        ],
      })] }),
    },
    children: [
      // Title block
      new Paragraph({
        spacing: { after: 60 },
        children: [arial("Annual Report Collection Workflow", { size: 36, bold: true, color: navy })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: emerald, space: 1 } },
        children: [arial("Start Today™ — Corporate Books Compliance  ·  v1.1  ·  May 7, 2026", { size: 20, color: slate500, italics: true })],
      }),
      P("This workflow accompanies the Corporate Books Audit spreadsheet (Annual Reports by State tab). Each entity/state row in the audit corresponds to one filing that needs to be located, downloaded, archived, and linked to the platform's Annual_Report_Filings record."),
      P("Use this in the compliance.starttoday.biz portal — staff and contractors only. As of v1.1, Step 6 is performed by ST staff directly through the compliance portal rather than handed off to Jason.", { italic: true, color: slate500 }),

      H2("Step 1 — Open the Audit Sheet & Identify the Filing"),
      ListItem([{ text: "Open the " }, { text: "Annual Reports by State", bold: true }, { text: " tab in the current audit workbook." }]),
      ListItem([{ text: "Filter to " }, { text: "Status = MISSING", bold: true, color: "9C0006" }, { text: " to see only gaps." }]),
      ListItem([{ text: "Note the " }, { text: "Entity Name, State, and Filing Year", bold: true }, { text: " for the row you are working." }]),

      H2("Step 2 — Access the Secretary of State Business Search"),
      ListItem([{ text: "Click the " }, { text: "SOS Business Search", bold: true, color: "0563C1" }, { text: " hyperlink in column H of the row. This opens the correct state's SOS portal." }]),
      ListItem([{ text: "Search for the entity by its exact legal name as shown in column A. If no results, try dropping punctuation or trailing entity-type suffix (\"LLC\", \"Inc.\")." }]),
      ListItem([{ text: "Confirm the correct entity by matching the EIN, formation date, or registered agent shown in our records." }]),

      H2("Step 3 — Locate the Filing History / Records"),
      ListItem("Once on the entity detail page, look for a section labeled Filing History, Document History, Records, or similar."),
      ListItem("Locate the Annual Report for the specific Filing Year you are pulling."),
      ListItem("If the state portal shows a downloadable PDF/image of the filed report, proceed to Step 4."),
      ListItem("If the filing is not found on the portal, note it in the Notes column — the entity may not have filed, or the state may not publish it online."),

      H2("Step 4 — Save the Report"),
      ListItem("Download or print-to-PDF the annual report filing."),
      ListItem([{ text: "Save into the folder structure: " }, { text: "/Annual Reports/{Entity Name}/{State} — {Year}.pdf", bold: true }]),
      ListItem([{ text: "Example: " }, { text: "/Annual Reports/SupplyCore LLC/IL — 2023.pdf", bold: true, color: emerald }]),
      ListItem("If pulling multiple years for the same entity/state in one session, batch-save all at once before moving on."),

      H2("Step 5 — Confirm & Mark Complete in the Audit Sheet"),
      ListItem([{ text: "Return to the audit sheet. Update the Status cell from " }, { text: "MISSING", bold: true, color: "9C0006" }, { text: " to " }, { text: "FILED", bold: true, color: "16A34A" }, { text: "." }]),
      ListItem("Add any relevant notes (e.g., \"filed late\", \"only confirmation receipt available\")."),
      ListItem("Verify the PDF file name matches the naming convention."),

      H2("Step 6 — Upload to Platform (Compliance Staff)"),
      P("As of v1.1, this step is performed by ST staff or contractors directly through compliance.starttoday.biz. The legacy hand-off to Jason is retired.", { italic: true, color: slate500 }),
      ListItem([{ text: "In compliance.starttoday.biz, navigate to " }, { text: "Documents → Bulk Upload", bold: true }, { text: ", or open the entity's record and use " }, { text: "Add Document", bold: true }, { text: "." }]),
      ListItem([{ text: "Set " }, { text: "Document Type = Annual Report", bold: true }, { text: " and select the correct " }, { text: "Filing Year", bold: true }, { text: "." }]),
      ListItem([{ text: "Link to the corresponding " }, { text: "Annual_Report_Filings", bold: true }, { text: " row by selecting the entity and the matching year. The platform will auto-suggest if a row exists." }]),
      ListItem("If no matching Annual_Report_Filings row exists yet, create one — the platform will prompt you. Status defaults to FILED on upload."),

      H2("Step 7 — Verification Status (NEW in v1.1)"),
      P("Once a filing is uploaded, the platform's Data State Machine™ moves the record from MISSING → SYSTEM_PULLED. To raise the record's quality multiplier further, the document can be promoted through the verification chain.", {}),
      ListItem([{ text: "After upload, the record is in the " }, { text: "SYSTEM_PULLED", bold: true, color: "0563C1" }, { text: " state (0.7× multiplier)." }]),
      ListItem([{ text: "Optionally route to internal review: change to " }, { text: "PENDING_REVIEW", bold: true }, { text: " (0.8×) and assign to a staff reviewer." }]),
      ListItem([{ text: "After reviewer concurrence, mark " }, { text: "APPROVED", bold: true }, { text: " (0.9×)." }]),
      ListItem([{ text: "For deal-readiness or banking-readiness use cases, request a " }, { text: "STVerify Certified Calculation™ ($10)", bold: true, color: emerald }, { text: " or " }, { text: "Legal Snapshot™ ($75)", bold: true, color: emerald }, { text: " — the record then reaches " }, { text: "STVERIFIED", bold: true, color: emerald }, { text: " (1.0×)." }]),

      H2("Tips & Troubleshooting"),
      ListItem([{ text: "Work one entity at a time", bold: true }, { text: " — pull all years and all states for that entity before moving to the next." }]),
      ListItem([{ text: "Some states charge for copies", bold: true }, { text: " — Delaware, for example, does not provide free online filing images. Note in the sheet if a paid request is needed." }]),
      ListItem([{ text: "Illinois tip", bold: true }, { text: " — use the IL SOS Cyber Drive link. Annual reports for LLCs and Corps are under \"File Details\" after searching by name. The IL SOS bulk data feed is in procurement (forthcoming Q3 2026); when live, IL filings will pull automatically and this step becomes self-service for IL only." }]),
      ListItem([{ text: "If Formation Date is NOT SET", bold: true }, { text: " in the audit sheet, find it on the SOS detail page and update the Entities table in Supabase via the Platform Admin." }]),
      ListItem([{ text: "Entities with no registration record", bold: true }, { text: " (state = ??) need their Entity_Registrations rows added to the platform before AR tracking is accurate." }]),
      ListItem([{ text: "Schema reference", bold: true }, { text: " — the Annual_Report_Filings table uses column \"Entity_id\" (not \"Entity\") for the foreign key, and \"Filing Year\" with a space. The Entities table uses \"Entities_id\" (plural)." }]),

      H2("Document Registry"),
      P("This workflow is a Start Today internal SOP, registered in st_internal_policies under doc_class='operational_sop'. Future revisions will follow the same publication mechanism — fn_publish_internal_doc() with policy_number ST-OPS-ARCollectionWorkflow.", { color: slate500 }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/claude/AR_Collection_Workflow_v1.1.docx", buf);
  console.log("✓ AR Workflow v1.1 written:", buf.length, "bytes");
});
