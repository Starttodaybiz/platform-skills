// Start Today™ — Master's Thesis v2.0
// Authoritative strategic document for the Start Today platform as of 2026-05-07
// Reflects current platform state: 1,034 tables, 81 cron jobs, 76 orgs, full multi-portal ecosystem,
// SOC 2 readiness milestone, automated security audit, and the C2C/Chamber/Lender expansion.

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, HeadingLevel, PositionalTab,
  PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
  TabStopType, TabStopPosition,
} = require("docx");

// ── Brand palette ───────────────────────────────────────────────────────────
const navy = "1E3A5F";
const emerald = "059669";
const slate900 = "0F172A";
const slate700 = "334155";
const slate500 = "64748B";
const slate400 = "94A3B8";
const slate200 = "E2E8F0";
const slate100 = "F1F5F9";
const slate50 = "F8FAFC";
const warmBg = "F5F4F1";
const accent = "10B981";

// ── Page setup (US Letter) ──────────────────────────────────────────────────
const DXA_W = 12240, DXA_H = 15840;
const MARGIN = 1440;
const CONTENT_W = DXA_W - 2 * MARGIN;

// ── Helpers ─────────────────────────────────────────────────────────────────
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before ?? 60, after: opts.after ?? 120, line: 300 },
    alignment: opts.align ?? AlignmentType.LEFT,
    children: [new TextRun({
      text,
      font: "Arial",
      size: opts.size ?? 22,
      color: opts.color ?? slate700,
      bold: opts.bold,
      italics: opts.italic,
    })],
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: navy })],
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: navy })],
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: slate700 })],
  });
}

function PB() {
  return new Paragraph({ children: [new PageBreak()] });
}

function Bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 80, line: 280 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: slate700 })],
  });
}

function BulletBold(label, body) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 80, line: 280 },
    children: [
      new TextRun({ text: label + " — ", font: "Arial", size: 22, bold: true, color: slate900 }),
      new TextRun({ text: body, font: "Arial", size: 22, color: slate700 }),
    ],
  });
}

function Callout(title, lines) {
  const cellChildren = [
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: title, font: "Arial", size: 22, bold: true, color: navy })],
    }),
  ];
  for (const ln of lines) {
    cellChildren.push(new Paragraph({
      spacing: { before: 0, after: 60, line: 280 },
      children: [new TextRun({ text: ln, font: "Arial", size: 20, color: slate700 })],
    }));
  }
  const border = { style: BorderStyle.SINGLE, size: 4, color: emerald };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { fill: "ECFDF5", type: ShadingType.CLEAR },
        borders: { top: border, bottom: border, left: border, right: border },
        margins: { top: 200, bottom: 200, left: 240, right: 240 },
        children: cellChildren,
      })],
    })],
  });
}

function MetricsTable(rows) {
  const colW = [Math.floor(CONTENT_W * 0.55), Math.floor(CONTENT_W * 0.45)];
  const tableW = colW[0] + colW[1];
  const border = { style: BorderStyle.SINGLE, size: 1, color: slate200 };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: tableW, type: WidthType.DXA },
    columnWidths: colW,
    rows: rows.map((row, idx) => new TableRow({
      children: row.map((cell, i) => new TableCell({
        width: { size: colW[i], type: WidthType.DXA },
        shading: { fill: idx === 0 ? slate100 : "FFFFFF", type: ShadingType.CLEAR },
        borders,
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({
            text: cell,
            font: "Arial",
            size: 20,
            bold: idx === 0,
            color: idx === 0 ? navy : slate700,
          })],
        })],
      })),
    })),
  });
}

function ColTable(headers, rows, widths) {
  // widths array of fractions, e.g., [0.3, 0.4, 0.3]
  const colW = widths.map(w => Math.floor(CONTENT_W * w));
  const tableW = colW.reduce((a,b)=>a+b,0);
  const border = { style: BorderStyle.SINGLE, size: 1, color: slate200 };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: colW[i], type: WidthType.DXA },
      shading: { fill: navy, type: ShadingType.CLEAR },
      borders,
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: "Arial", size: 20, bold: true, color: "FFFFFF" })],
      })],
    })),
  });
  const bodyRows = rows.map((row, idx) => new TableRow({
    children: row.map((cell, i) => new TableCell({
      width: { size: colW[i], type: WidthType.DXA },
      shading: { fill: idx % 2 === 0 ? "FFFFFF" : slate50, type: ShadingType.CLEAR },
      borders,
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text: cell, font: "Arial", size: 19, color: slate700 })],
      })],
    })),
  }));
  return new Table({
    width: { size: tableW, type: WidthType.DXA },
    columnWidths: colW,
    rows: [headerRow, ...bodyRows],
  });
}

// ── COVER ───────────────────────────────────────────────────────────────────
const coverChildren = [
  new Paragraph({
    spacing: { before: 2400, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "START TODAY™", font: "Arial", size: 64, bold: true, color: navy })],
  }),
  new Paragraph({
    spacing: { before: 240, after: 600 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "MASTER'S THESIS  ·  v2.0", font: "Arial", size: 24, color: emerald, bold: true })],
  }),
  new Paragraph({
    spacing: { before: 200, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "The Compliance Intelligence Platform", font: "Arial", size: 32, color: slate700 })],
  }),
  new Paragraph({
    spacing: { before: 80, after: 1200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Strategic Vision · Architecture · Revenue Model · Roadmap", font: "Arial", size: 22, color: slate500, italics: true })],
  }),
  new Paragraph({
    spacing: { before: 1600, after: 60 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: emerald, space: 1 } },
    children: [new TextRun({ text: "  ", font: "Arial", size: 8 })],
  }),
  new Paragraph({
    spacing: { before: 200, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Authored by:  Jason C. Walker, Co-Founder & CCO", font: "Arial", size: 22, color: slate700 })],
  }),
  new Paragraph({
    spacing: { before: 80, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Co-Founder:  Michael J. Schirger, CEO", font: "Arial", size: 22, color: slate700 })],
  }),
  new Paragraph({
    spacing: { before: 80, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "May 7, 2026", font: "Arial", size: 22, color: slate500 })],
  }),
  new Paragraph({
    spacing: { before: 240, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Start Today, LLC  ·  Illinois", font: "Arial", size: 18, color: slate400 })],
  }),
  new Paragraph({
    spacing: { before: 400, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "CONFIDENTIAL", font: "Arial", size: 18, color: navy, bold: true })],
  }),
];

module.exports = {
  P, H1, H2, H3, PB, Bullet, BulletBold, Callout, MetricsTable, ColTable,
  coverChildren, navy, emerald, slate900, slate700, slate500, slate400,
  slate200, slate100, slate50, warmBg, accent,
  DXA_W, DXA_H, MARGIN, CONTENT_W,
};
