const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageNumberElement, LevelFormat,
  TabStopType, PageBreak
} = require('docx');
const fs = require('fs');

const today = 'March 19, 2026'; // ADAPT: set to current audit run date
const CW = 9360; // content width DXA

const C = {
  darkBlue:'1E3A5F', midBlue:'2563EB', lightBlue:'D6E4F7',
  red:'B91C1C', redBg:'FEE2E2',
  amber:'92400E', amberBg:'FEF3C7',
  green:'166534', greenBg:'DCFCE7',
  gray:'374151', lightGray:'F9FAFB',
  border:'D1D5DB', white:'FFFFFF', black:'111827',
};

// ── helpers ──────────────────────────────────────────────────────────────
const sp = (b=0,a=120) => new Paragraph({spacing:{before:b,after:a},children:[new TextRun('')]});
const hr = () => new Paragraph({spacing:{before:200,after:200},border:{bottom:{style:BorderStyle.SINGLE,size:8,color:C.midBlue,space:1}},children:[]});
const pb = () => new Paragraph({children:[new PageBreak()]});

const h1 = t => new Paragraph({heading:HeadingLevel.HEADING_1,spacing:{before:360,after:120},children:[new TextRun({text:t,font:'Arial',bold:true,size:34,color:C.darkBlue})]});
const h2 = t => new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:240,after:100},children:[new TextRun({text:t,font:'Arial',bold:true,size:26,color:C.darkBlue})]});
const h3 = t => new Paragraph({spacing:{before:180,after:60},children:[new TextRun({text:t,font:'Arial',bold:true,size:22,color:C.gray})]});
const body = t => new Paragraph({spacing:{before:60,after:80},children:[new TextRun({text:t,font:'Arial',size:20,color:C.black})]});
const bul = (t,l=0) => new Paragraph({numbering:{reference:'bullets',level:l},spacing:{before:40,after:40},children:[new TextRun({text:t,font:'Arial',size:20,color:C.black})]});

const bord = {style:BorderStyle.SINGLE,size:1,color:C.border};
const bords = {top:bord,bottom:bord,left:bord,right:bord};

function tc(text,w,bg=C.white,bold=false,fg=C.black,center=false){
  return new TableCell({
    width:{size:w,type:WidthType.DXA},borders:bords,
    shading:{fill:bg,type:ShadingType.CLEAR},
    margins:{top:70,bottom:70,left:120,right:120},
    verticalAlign:VerticalAlign.CENTER,
    children:[new Paragraph({alignment:center?AlignmentType.CENTER:AlignmentType.LEFT,
      children:[new TextRun({text,font:'Arial',size:19,bold,color:fg})]})],
  });
}
function badge(text,bg,fg,w=1400){
  return new TableCell({
    width:{size:w,type:WidthType.DXA},borders:bords,
    shading:{fill:bg,type:ShadingType.CLEAR},
    margins:{top:60,bottom:60,left:80,right:80},
    verticalAlign:VerticalAlign.CENTER,
    children:[new Paragraph({alignment:AlignmentType.CENTER,
      children:[new TextRun({text,font:'Arial',size:18,bold:true,color:fg})]})],
  });
}
const hr_ = cs => new TableRow({tableHeader:true,children:cs});
const dr_ = cs => new TableRow({children:cs});

function ftable(rows){
  return new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2000,7360],
    rows:rows.map(([lbl,txt,lbg,lfg])=>dr_([tc(lbl,2000,lbg||C.lightGray,true,lfg||C.darkBlue),tc(txt,7360)]))});
}

function callout(title,lines,bg,fg,bc){
  const mk=(text,sp={before:40,after:40})=>new Paragraph({spacing:sp,shading:{fill:bg,type:ShadingType.CLEAR},
    border:{left:{style:BorderStyle.SINGLE,size:14,color:bc},right:{style:BorderStyle.SINGLE,size:3,color:bc},
            top:{style:BorderStyle.SINGLE,size:3,color:bc},bottom:{style:BorderStyle.SINGLE,size:3,color:bc}},
    children:[new TextRun({text,font:'Arial',size:19,color:fg,bold:text===title})]});
  return [mk(title,{before:100,after:40}),...lines.map(l=>mk('  '+l)),mk('',{before:0,after:120})];
}

// ── DOCUMENT ────────────────────────────────────────────────────────────
const doc = new Document({
  numbering:{config:[{reference:'bullets',levels:[
    {level:0,format:LevelFormat.BULLET,text:'\u2022',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:540,hanging:260}}}},
    {level:1,format:LevelFormat.BULLET,text:'\u25E6',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:900,hanging:260}}}},
  ]}]},
  styles:{
    default:{document:{run:{font:'Arial',size:20}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,
       run:{size:34,bold:true,font:'Arial',color:C.darkBlue},paragraph:{spacing:{before:360,after:120},outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,
       run:{size:26,bold:true,font:'Arial',color:C.darkBlue},paragraph:{spacing:{before:240,after:100},outlineLevel:1}},
      {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,
       run:{size:22,bold:true,font:'Arial',color:C.gray},paragraph:{spacing:{before:180,after:60},outlineLevel:2}},
    ],
  },

  sections:[{
    properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({
      border:{bottom:{style:BorderStyle.SINGLE,size:4,color:C.midBlue,space:1}},
      children:[
        new TextRun({text:'Start Today\u2122  |  Platform Security & Code Quality Audit  \u2014  INITIAL AUDIT REPORT',font:'Arial',size:17,color:C.gray}),
        new TextRun({text:'\t',font:'Arial',size:17}),
        new TextRun({text:today,font:'Arial',size:17,color:C.gray}),
      ],
      tabStops:[{type:TabStopType.RIGHT,position:CW}],
    })]})},
    footers:{default:new Footer({children:[new Paragraph({
      border:{top:{style:BorderStyle.SINGLE,size:4,color:C.midBlue,space:1}},
      children:[
        new TextRun({text:'Confidential \u2014 Start Today\u2122 Internal Use Only',font:'Arial',size:16,color:C.gray}),
        new TextRun({text:'\t',font:'Arial',size:16}),
        new TextRun({text:'Page ',font:'Arial',size:16,color:C.gray}),
        new PageNumberElement(),
      ],
      tabStops:[{type:TabStopType.RIGHT,position:CW}],
    })]})},

    children:[

      // ═══════════════════════════════════════════════
      // COVER
      // ═══════════════════════════════════════════════
      new Paragraph({spacing:{before:480,after:60},children:[new TextRun({text:'Start Today\u2122',font:'Arial',size:56,bold:true,color:C.darkBlue})]}),
      new Paragraph({spacing:{before:0,after:60},children:[new TextRun({text:'Platform Security & Code Quality Audit',font:'Arial',size:36,bold:true,color:C.midBlue})]}),
      new Paragraph({spacing:{before:0,after:40},border:{bottom:{style:BorderStyle.SINGLE,size:8,color:C.midBlue,space:1}},
        children:[new TextRun({text:'INITIAL AUDIT REPORT',font:'Arial',size:22,bold:true,color:C.gray})]}),
      sp(120,80),

      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,7160],rows:[
        dr_([tc('Audit Date',2200,C.lightBlue,true,C.darkBlue),tc(today,7160)]),
        dr_([tc('Auditor',2200,C.lightBlue,true,C.darkBlue),tc('Automated live system scan + manual code review of all repositories',7160)]),
        dr_([tc('Project ID',2200,C.lightBlue,true,C.darkBlue),tc('Supabase: ptgtliwllimkswtajcmy (Start Today Live, us-east-1)',7160)]),
        dr_([tc('Scope',2200,C.lightBlue,true,C.darkBlue),tc('Supabase database \u2022 6 Vercel applications \u2022 8 GitHub repositories \u2022 28 edge functions',7160)]),
        dr_([tc('Classification',2200,C.lightBlue,true,C.darkBlue),tc('Confidential \u2014 Internal Use Only',7160)]),
        dr_([tc('Audit Status',2200,C.lightBlue,true,C.darkBlue),tc('OPEN \u2014 Findings Require Review & Remediation Action',7160)]),
      ]}),
      sp(200,80),

      ...callout('AUDIT OVERVIEW',[
        'This initial security and code quality audit covers the complete Start Today\u2122 technology stack.',
        'All data was collected live from the production Supabase database, deployed Vercel applications,',
        'and current GitHub source code at the time of this audit. Findings reflect the current state',
        'of the platform as of '+today+'. No changes were made to any system during this audit.',
        '',
        'Report is structured in three parts:',
        '  Part 1: Master Security & Code Quality Audit (Database + Infrastructure)',
        '  Part 2: Source Code Security Audit Addendum (Application-level findings)',
        '  Part 3: SOC 2 Certification Assessment & Gap Analysis',
      ],C.lightBlue,C.darkBlue,C.midBlue),

      sp(100), pb(),

      // ═══════════════════════════════════════════════
      // PART 1 BANNER
      // ═══════════════════════════════════════════════
      new Paragraph({spacing:{before:120,after:40},children:[new TextRun({text:'PART 1',font:'Arial',size:20,bold:true,color:C.midBlue,allCaps:true})]}),
      new Paragraph({spacing:{before:0,after:20},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:C.darkBlue,space:1}},
        children:[new TextRun({text:'Master Security & Code Quality Audit',font:'Arial',size:34,bold:true,color:C.darkBlue})]}),
      sp(60,40),

      // ═══════════════════════════════════════════════
      // SECTION 1 — SCOPE
      // ═══════════════════════════════════════════════
      h1('1. Audit Scope & Technology Stack'),hr(),
      body('Start Today\u2122 is a business compliance and advisory SaaS platform built on a Next.js / Supabase / Vercel stack. The platform serves multi-entity business owners and professional service providers across compliance tracking, entity management, document processing, and attorney-client portal functions.'),
      sp(60),

      h2('1.1 Technology Stack'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,3400,3760],rows:[
        hr_([tc('Component',2200,C.darkBlue,true,C.white),tc('Details',3400,C.darkBlue,true,C.white),tc('Notes',3760,C.darkBlue,true,C.white)]),
        // ADAPT: db-counts — update tc text below with live counts from pg_tables, pg_views, pg_proc SQL queries
        dr_([tc('Database',2200,C.lightGray,true),tc('Supabase PostgreSQL \u2014 ptgtliwllimkswtajcmy',3400),tc('361 tables, 118 views, 224 functions, us-east-1',3760)]),
        dr_([tc('Framework',2200,C.lightGray,true),tc('Next.js 14 App Router (4 apps) + Pages Router (2 apps)',3400),tc('jose JWT + custom HMAC session management',3760)]),
        dr_([tc('Hosting',2200,C.lightGray,true),tc('Vercel \u2014 team_7hbKJDeZuvbjZ7aTxXxUnFv4',3400),tc('22 deployed projects, global edge network',3760)]),
        dr_([tc('Source Control',2200,C.lightGray,true),tc('GitHub \u2014 Starttodaybiz organization',3400),tc('8 application repos in scope',3760)]),
        dr_([tc('Edge Functions',2200,C.lightGray,true),tc('Supabase Edge Functions (Deno) \u2014 28 active',3400),tc('AI extraction, document processing, storage ops',3760)]),
        dr_([tc('Auth Library',2200,C.lightGray,true),tc('jose (HS256 JWT) + custom HMAC cookie signing',3400),tc('GoTrue admin APIs non-functional on this project',3760)]),
        dr_([tc('MFA Infrastructure',2200,C.lightGray,true),tc('TOTP via SECURITY DEFINER RPCs on auth.mfa_factors',3400),tc('Web Crypto API for code validation, no 3rd party libs',3760)]),
        dr_([tc('Document AI',2200,C.lightGray,true),tc('Anthropic Claude API via Supabase Edge Functions',3400),tc('Estate plans, leases, insurance, title policies',3760)]),
        dr_([tc('Email',2200,C.lightGray,true),tc('Resend API \u2014 transactional only',3400),tc('Invites, magic link (edge fn), invoices',3760)]),
      ]}),
      sp(100),

      h2('1.2 Applications in Scope'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2200,2600,1600,2960],rows:[
        hr_([tc('Application',2200,C.darkBlue,true,C.white),tc('Domain / Purpose',2600,C.darkBlue,true,C.white),tc('Router',1600,C.darkBlue,true,C.white),tc('Users',2960,C.darkBlue,true,C.white)]),
        dr_([tc('platform-admin',2200,C.lightGray,true),tc('admin.starttoday.biz \u2014 Internal ops',2600),tc('App Router',1600),tc('Platform administrators',2960)]),
        dr_([tc('attorney-dashboard',2200,C.lightGray,true),tc('legal.starttoday.biz \u2014 Attorney portal',2600),tc('App Router',1600),tc('MJS Law attorneys & staff',2960)]),
        dr_([tc('Admin-User',2200,C.lightGray,true),tc('Admin portal \u2014 platform operations',2600),tc('Pages Router',1600),tc('Platform administrators',2960)]),
        dr_([tc('Client-Dashboard',2200,C.lightGray,true),tc('Client compliance portal',2600),tc('App Router',1600),tc('Business clients',2960)]),
        dr_([tc('compliance-User',2200,C.lightGray,true),tc('Compliance workstation',2600),tc('Pages Router',1600),tc('Compliance users',2960)]),
        dr_([tc('Client-EP',2200,C.lightGray,true),tc('Estate plan client portal',2600),tc('App Router',1600),tc('Estate plan clients',2960)]),
      ]}),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 2 — DATABASE
      // ═══════════════════════════════════════════════
      h1('2. Database Security Findings'),hr(),
      body('The Supabase Security Advisor was executed against the production database (ptgtliwllimkswtajcmy). Live SQL queries were run against pg_tables, pg_views, pg_proc, pg_policies, and auth schema tables to verify the current state. The results below reflect the live production database as of the audit date.'),
      sp(60),

      h2('2.1 Security Advisory Summary \u2014 Live Scan Results'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[700,3100,1600,1560,2400],rows:[
        hr_([tc('Level',700,C.darkBlue,true,C.white),tc('Advisory Category',3100,C.darkBlue,true,C.white),tc('Count',1600,C.darkBlue,true,C.white,true),tc('Severity',1560,C.darkBlue,true,C.white,true),tc('Current Status',2400,C.darkBlue,true,C.white)]),
        // ADAPT: advisory-counts — update each row from fresh Supabase:get_advisors scan
        dr_([badge('WARN','F9FAFB',C.gray,700),tc('rls_disabled_in_public',3100),badge('0',C.greenBg,C.green,1600),badge('RESOLVED',C.greenBg,C.green,1560),tc('All 361 tables now have RLS enabled',2400)]),
        dr_([badge('WARN','F9FAFB',C.gray,700),tc('rls_enabled_no_policy',3100),badge('0',C.greenBg,C.green,1600),badge('RESOLVED',C.greenBg,C.green,1560),tc('All tables have at least one policy',2400)]),
        dr_([badge('WARN','F9FAFB',C.gray,700),tc('function_search_path_mutable',3100),badge('0',C.greenBg,C.green,1600),badge('RESOLVED',C.greenBg,C.green,1560),tc('All 224 functions have SET search_path',2400)]),
        dr_([badge('WARN','F9FAFB',C.gray,700),tc('security_definer_view',3100),badge('0',C.greenBg,C.green,1600),badge('RESOLVED',C.greenBg,C.green,1560),tc('All 118 views have security_invoker = true',2400)]),
        dr_([badge('WARN',C.amberBg,C.amber,700),tc('rls_policy_always_true',3100),badge('11',C.amberBg,C.amber,1600),badge('OPEN',C.amberBg,C.amber,1560),tc('11 policies with unconditional USING (true)',2400)]),
        dr_([badge('WARN',C.amberBg,C.amber,700),tc('extension_in_public',3100),badge('1',C.amberBg,C.amber,1600),badge('OPEN',C.amberBg,C.amber,1560),tc('pg_net in public schema (system limitation)',2400)]),
        dr_([badge('WARN',C.amberBg,C.amber,700),tc('auth_leaked_password_protection',3100),badge('?',C.amberBg,C.amber,1600),badge('VERIFY',C.amberBg,C.amber,1560),tc('Not confirmed enabled in Auth dashboard',2400)]),
        hr_([tc('TOTAL OPEN ADVISORIES',700+3100,C.darkBlue,true,C.white),badge('2+',C.amberBg,C.amber,1600),tc('',1560,C.darkBlue),tc('Detailed findings below',2400,C.darkBlue,false,C.white)]),
      ]}),
      sp(100),

      h2('2.2 Open Finding: 11 Always-True RLS Policies'),
      ftable([
        ['Category','rls_policy_always_true'],
        ['Severity','MEDIUM',C.amberBg,C.amber],
        ['Count','11 policies confirmed via live SQL query on pg_policies'],
        ['Affected Tables','G_Feature_Permissions, G_Matter_Statuses, G_Matter_Types, G_Title_Covered_Risks, G_Title_Exception_Categories, G_Title_Exclusions, Platform_Settings, Platform_Theme_Config, entity_start_scores_table (3 policies)'],
        ['Risk','These policies use USING (true) which grants access to all rows for any authenticated user regardless of their organization, role, or entity access level. While several of these are likely intended as public lookup tables, the pattern must be reviewed. entity_start_scores_table has three separate unconditional policies (anon read, authenticated read, public read) which is particularly noteworthy as it may expose scoring data for entities the user has no relationship with.'],
        ['Remediation','Review each table. For intentional public lookups (G_ prefix tables, Platform_Settings), add an explicit comment confirming intent. For entity_start_scores_table, replace the three open policies with a single policy scoped to the user\'s accessible entities via User_Entity_Access.'],
      ]),
      sp(80),

      h2('2.3 Open Finding: pg_net Extension in Public Schema'),
      ftable([
        ['Category','extension_in_public'],
        ['Severity','LOW',C.lightBlue,C.darkBlue],
        ['Extension','pg_net \u2014 PostgreSQL extension for making async HTTP requests from database functions'],
        ['Risk','pg_net has network egress capability from within the database. Extensions in the public schema are accessible to any role that has USAGE on public. If an RLS bypass were ever achieved, pg_net could theoretically be used to exfiltrate data to external endpoints via HTTP calls from database-level code.'],
        ['Constraint','This is a Supabase-managed system extension. Supabase may not support relocating it to another schema. This is an accepted limitation of the Supabase platform.'],
        ['Remediation','Confirm with Supabase support whether relocation is possible. If not, document acceptance. Ensure no user-written functions call net.http_post() with sensitive data payloads.'],
      ]),
      sp(80),

      h2('2.4 Open Finding: Leaked Password Protection \u2014 Unconfirmed'),
      ftable([
        ['Category','auth_leaked_password_protection'],
        ['Severity','MEDIUM',C.amberBg,C.amber],
        ['Status','Cannot be confirmed via SQL query \u2014 requires Supabase Auth dashboard inspection'],
        ['Risk','If the HaveIBeenPwned check is disabled, users can register or change passwords to credentials known to be compromised. This significantly increases vulnerability to credential-stuffing attacks.'],
        ['Remediation','Verify in Supabase Dashboard: Authentication \u2192 Providers \u2192 Email \u2192 confirm "Protect against leaked passwords" is enabled.'],
      ]),
      sp(80),

      // ADAPT: mfa-enrollment — update enrolled/total from live auth.mfa_factors SQL
      h2('2.5 Database Schema Health \u2014 Live Metrics'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Metric',3200,C.darkBlue,true,C.white),tc('Value',1600,C.darkBlue,true,C.white,true),tc('Assessment',4560,C.darkBlue,true,C.white)]),
        dr_([tc('Total public tables',3200),tc('361',1600,C.white,true,C.black,true),tc('Large schema \u2014 reflects Airtable migration. All have RLS.',4560)]),
        dr_([tc('Tables with RLS enabled',3200),tc('361 / 361',1600,C.greenBg,true,C.green,true),tc('\u2705 100% RLS coverage \u2014 confirmed via live query',4560)]),
        dr_([tc('Tables with zero policies',3200),tc('0',1600,C.greenBg,true,C.green,true),tc('\u2705 All tables have at least one policy',4560)]),
        dr_([tc('Public views',3200),tc('118',1600,C.white,true,C.black,true),tc('All confirmed security_invoker = true via live query',4560)]),
        dr_([tc('Functions with mutable search_path',3200),tc('0',1600,C.greenBg,true,C.green,true),tc('\u2705 All 224 functions fixed',4560)]),
        dr_([tc('Active edge functions',3200),tc('28',1600,C.white,true,C.black,true),tc('All 28 have verify_jwt: true \u2014 confirmed live',4560)]),
        dr_([tc('Auth users in system',3200),tc('48',1600,C.white,true,C.black,true),tc('Confirmed via auth.users count',4560)]),
        dr_([tc('Users with verified MFA factor',3200),tc('2 of 48',1600,C.amberBg,true,C.amber,true),tc('\u26A0\uFE0F Only 2 users have enrolled \u2014 46 have no MFA factor',4560)]),
        dr_([tc('Total MFA factors (all)',3200),tc('2',1600,C.amberBg,true,C.amber,true),tc('Both are verified TOTP. No unverified orphan factors.',4560)]),
      ]}),
      sp(80),

      h2('2.6 Critical Finding: MFA Enforcement Gap \u2014 46 of 48 Users Unenrolled'),
      ftable([
        ['Severity','CRITICAL \u2014 All 6 Applications',C.redBg,C.red],
        ['Evidence','Live query: auth.mfa_factors shows 2 verified factors total; auth.users shows 48 active users. 46 users have ZERO MFA factor in the database.'],
        ['Context','All 6 applications have MFA infrastructure deployed in code: login routes issue setup cookies, middleware enforces /mfa-enroll redirect, mfa-enroll and mfa-challenge pages exist. The code-level enforcement is present. However the database confirms only 2 users have actually completed MFA enrollment.'],
        ['Risk','The 46 unenrolled users can log in normally. The MFA enforcement in the application layer means they will be forced through /mfa-enroll on next login. However until they actually complete enrollment and activate a TOTP factor in auth.mfa_factors, their accounts are protected only by password. A compromised password for any of the 46 unenrolled users yields full account access.'],
        ['Impact','This applies to all roles: client users, attorneys, compliance users, and platform admins. Whoever has not yet logged in since MFA enforcement was deployed remains password-only.'],
        ['Remediation','Conduct a forced re-enrollment sweep: send emails to all 46 unenrolled users directing them to log in and complete MFA setup. Monitor auth.mfa_factors until all 48 users show a verified TOTP factor. Do not launch publicly until admin and attorney accounts are fully enrolled.'],
      ]),
      sp(80),

      // ADAPT: edge-functions — update count and verify all have verify_jwt: true
      h2('2.7 Edge Function Security Assessment'),
      body('28 Supabase Edge Functions are active in production. All 28 were enumerated and verified via the Supabase MCP. Key findings:'),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,2000,4160],rows:[
        hr_([tc('Finding',3200,C.darkBlue,true,C.white),tc('Status',2000,C.darkBlue,true,C.white),tc('Note',4160,C.darkBlue,true,C.white)]),
        dr_([tc('verify_jwt: true on all 28 functions',3200),badge('\u2705 CONFIRMED',C.greenBg,C.green,2000),tc('Live verified \u2014 all edge functions require valid JWT',4160)]),
        dr_([tc('send-magic-link function STILL ACTIVE',3200),badge('\u26A0\uFE0F OPEN',C.amberBg,C.amber,2000),tc('This edge function exists and is deployed. Magic link routes have been removed from app code, but the underlying edge function remains active. Requires a caller with a valid JWT to invoke, but the infrastructure persists.',4160)]),
        dr_([tc('security-health-check function',3200),badge('REVIEW',C.lightBlue,C.darkBlue,2000),tc('Active function that reports internal service health. Verify its invoke permissions match platform-admin auth only.',4160)]),
        dr_([tc('AI extraction functions (12 functions)',3200),badge('LOW RISK',C.greenBg,C.green,2000),tc('All require valid JWT. Process documents from Supabase Storage. No direct data exfiltration vector identified.',4160)]),
      ]}),
      sp(80),

      h2('2.8 Performance Advisory Summary'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3400,1400,4560],rows:[
        hr_([tc('Advisory Type',3400,C.darkBlue,true,C.white),tc('Count',1400,C.darkBlue,true,C.white,true),tc('Impact & Remediation',4560,C.darkBlue,true,C.white)]),
        dr_([tc('multiple_permissive_policies',3400),tc('746',1400,C.white,false,C.black,true),tc('Multiple SELECT policies per table. Consolidate into single policies.',4560)]),
        dr_([tc('auth_rls_initplan',3400),tc('282',1400,C.white,false,C.black,true),tc('auth.uid() evaluated per-row. Wrap in (SELECT auth.uid()) for N+1 fix.',4560)]),
        dr_([tc('unindexed_foreign_keys',3400),tc('278',1400,C.white,false,C.black,true),tc('FK constraints without indexes cause sequential scans on JOINs.',4560)]),
        dr_([tc('unused_index',3400),tc('99',1400,C.white,false,C.black,true),tc('Unused indexes add write overhead. Review and drop.',4560)]),
        dr_([tc('no_primary_key',3400),tc('5',1400,C.white,false,C.black,true),tc('5 tables lack PKs. Impacts integrity and Supabase Realtime.',4560)]),
        dr_([tc('auth_db_connections_absolute',3400),tc('1',1400,C.white,false,C.black,true),tc('Auth using absolute connection count vs percentage-based pooling.',4560)]),
        hr_([tc('TOTAL',3400,C.darkBlue,true,C.white),tc('1,411',1400,C.darkBlue,true,C.white,true),tc('Performance remediation \u2014 address in dedicated sprint post-launch',4560,C.darkBlue,false,C.white)]),
      ]}),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 3 — AUTH & MFA
      // ═══════════════════════════════════════════════
      h1('3. Authentication & MFA Assessment'),hr(),
      body('Authentication across all 6 applications uses custom session-based management via HttpOnly cookies. Supabase GoTrue auth APIs are not used for session management \u2014 this is a deliberate architectural decision due to known GoTrue limitations on this project. MFA infrastructure using TOTP and SECURITY DEFINER RPCs has been deployed to all 6 applications.'),
      sp(60),

      h2('3.1 Per-Application Authentication Architecture'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2000,1600,1800,1400,2560],rows:[
        hr_([tc('Application',2000,C.darkBlue,true,C.white),tc('Session Cookie',1600,C.darkBlue,true,C.white),tc('JWT Secret Env',1800,C.darkBlue,true,C.white),tc('MFA Code',1400,C.darkBlue,true,C.white),tc('Enrollment Status',2560,C.darkBlue,true,C.white)]),
        // ADAPT: app-auth-table — update cookie names, JWT envs, enrollment mode from live repo scan
        dr_([tc('platform-admin',2000,C.lightGray,true),tc('pa_admin_session',1600),tc('ADMIN_JWT_SECRET',1800),badge('Mode A',C.greenBg,C.green,1400),badge('DEPLOYED',C.greenBg,C.green,2560)]),
        dr_([tc('attorney-dashboard',2000,C.lightGray,true),tc('st_auth',1600),tc('SESSION_SECRET',1800),badge('Mode A',C.greenBg,C.green,1400),badge('DEPLOYED',C.greenBg,C.green,2560)]),
        dr_([tc('Admin-User',2000,C.lightGray,true),tc('pa_admin_session',1600),tc('JWT_SECRET',1800),badge('Mode A',C.greenBg,C.green,1400),badge('DEPLOYED',C.greenBg,C.green,2560)]),
        dr_([tc('Client-Dashboard',2000,C.lightGray,true),tc('st_client',1600),tc('SESSION_SECRET',1800),badge('Mode A',C.greenBg,C.green,1400),badge('DEPLOYED',C.greenBg,C.green,2560)]),
        dr_([tc('compliance-User',2000,C.lightGray,true),tc('compliance_session',1600),tc('SESSION_SECRET',1800),badge('Mode A',C.greenBg,C.green,1400),badge('DEPLOYED',C.greenBg,C.green,2560)]),
        dr_([tc('Client-EP',2000,C.lightGray,true),tc('ep_session',1600),tc('SESSION_SECRET',1800),badge('Mode A',C.greenBg,C.green,1400),badge('DEPLOYED',C.greenBg,C.green,2560)]),
      ]}),
      sp(60),
      body('Mode A = Forced enrollment: users without a verified MFA factor in auth.mfa_factors are issued a 30-minute setup cookie on password verification and redirected to /mfa-enroll. Middleware blocks access to all dashboard routes until enrollment is confirmed. The mfa_setup cookie is destroyed and replaced with a full session cookie only after a valid TOTP code activates the factor.'),
      sp(80),

      h2('3.2 Open Finding: 46 of 48 Users Have No MFA Factor Enrolled'),
      ftable([
        ['Severity','CRITICAL',C.redBg,C.red],
        ['Database Evidence','SELECT COUNT(DISTINCT user_id) FROM auth.mfa_factors WHERE status = \'verified\' \u2192 returns 2. SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL \u2192 returns 48.'],
        ['Gap','Code-level MFA enforcement is present and correctly implemented across all 6 apps. The database layer confirms only 2 of 48 users have completed enrollment. The 46 un-enrolled users will be forced through enrollment on their next login, but until that login occurs, their accounts are password-only.'],
        ['Risk','Any of the 46 unenrolled accounts that can be compromised via password attack have no TOTP requirement until the account owner logs in again. This is the single highest-risk open item in the platform as of audit date.'],
        ['Remediation','Proactively notify all unenrolled users. Consider a force-logout mechanism that invalidates existing sessions, requiring re-login and MFA enrollment within 48 hours.'],
      ]),
      sp(80),

      // ADAPT: requireSession-gap — re-verify via: grep -A5 requireSession pa-repo/app/api/admin/route.js | grep -c jwtVerify
      h2('3.3 High Finding: requireSession() Checks Cookie Presence Only (platform-admin)'),
      ftable([
        ['Location','app/api/admin/route.js \u2014 shared helper used by all 27 admin/* routes'],
        ['Severity','HIGH',C.amberBg,C.amber],
        ['Code','export function requireSession(request) { const cookie = request.cookies.get(\'pa_admin_session\')?.value; if (!cookie) return new Response(JSON.stringify({ error: \'Unauthorized\' }), { status: 401 }); return null; }'],
        ['Risk','This helper checks only that the pa_admin_session cookie exists and has a value. It does NOT call jwtVerify() to validate the JWT signature, expiry, or payload. A manually crafted cookie with any non-empty value passes authentication. A forged, expired, or tampered token grants access to all 27 admin routes.'],
        ['Contrast','The middleware.js for platform-admin correctly calls jwtVerify() with the secret. The per-route requireSession() gap means a request that bypasses middleware (e.g., a direct API call without browser routing) would not be JWT-validated.'],
        ['Remediation','Upgrade requireSession() to import and call jwtVerify() from jose with the ADMIN_JWT_SECRET. Reject any request where the JWT signature fails or has expired.'],
      ]),
      sp(80),

      h2('3.4 Open Finding: send-magic-link Edge Function Still Active'),
      ftable([
        ['Location','Supabase Edge Functions \u2014 slug: send-magic-link, version: 7, status: ACTIVE'],
        ['Severity','MEDIUM',C.amberBg,C.amber],
        ['Context','Magic link routes have been removed from all application codebases. However the send-magic-link Supabase Edge Function remains deployed and active. It requires a valid JWT to invoke (verify_jwt: true), so an unauthenticated caller cannot trigger it.'],
        ['Risk','Any authenticated user who knows the edge function endpoint URL can trigger a magic link send. Depending on the function\'s internal logic, this could generate unauthenticated login tokens and deliver them to any email address, bypassing the password + MFA login flow for the target account.'],
        ['Remediation','If magic link login has been retired as an authentication method, delete this edge function from the Supabase project immediately.'],
      ]),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 4 — INFRASTRUCTURE
      // ═══════════════════════════════════════════════
      h1('4. Infrastructure Security'),hr(),

      h2('4.1 Security Headers Assessment'),
      body('HTTP security response headers were assessed via live inspection of each application\'s next.config.js. These headers protect against click-jacking, MIME sniffing, HTTPS downgrade attacks, and unwanted browser feature access.'),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2000,1200,1200,1200,1200,2560],rows:[
        hr_([tc('Application',2000,C.darkBlue,true,C.white),tc('HSTS',1200,C.darkBlue,true,C.white,true),tc('X-Content-Type',1200,C.darkBlue,true,C.white,true),tc('X-Frame / CSP',1200,C.darkBlue,true,C.white,true),tc('Referrer',1200,C.darkBlue,true,C.white,true),tc('Issues Found',2560,C.darkBlue,true,C.white)]),
        // ADAPT: security-headers — update per-app status from fresh next.config.js scan
        dr_([tc('platform-admin',2000,C.lightGray,true),badge('\u2713',C.greenBg,C.green,1200),badge('\u2713',C.greenBg,C.green,1200),badge('\u2713',C.greenBg,C.green,1200),badge('\u2713',C.greenBg,C.green,1200),tc('Full suite deployed. X-Frame-Options: SAMEORIGIN.',2560)]),
        dr_([tc('attorney-dashboard',2000,C.lightGray,true),badge('\u2713',C.greenBg,C.green,1200),badge('\u2713',C.greenBg,C.green,1200),badge('\u2713',C.greenBg,C.green,1200),badge('\u2713',C.greenBg,C.green,1200),tc('frame-ancestors * (intentional \u2014 required for iframe embedding).',2560)]),
        dr_([tc('Client-Dashboard',2000,C.lightGray,true),badge('\u2717',C.redBg,C.red,1200),badge('\u2713',C.greenBg,C.green,1200),badge('!\uFE0F',C.amberBg,C.amber,1200),badge('\u2717',C.redBg,C.red,1200),tc('X-Frame-Options: ALLOWALL is an invalid value. No HSTS. No Referrer-Policy.',2560)]),
        dr_([tc('compliance-User',2000,C.lightGray,true),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),tc('Only Synthesia CSP frame-src. No HSTS, no X-Content-Type, no Referrer-Policy.',2560)]),
        dr_([tc('Admin-User',2000,C.lightGray,true),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),tc('No security headers configured.',2560)]),
        dr_([tc('Client-EP',2000,C.lightGray,true),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),badge('\u2717',C.redBg,C.red,1200),tc('No security headers configured.',2560)]),
      ]}),
      sp(60),
      body('Notable: Client-Dashboard sets X-Frame-Options: ALLOWALL, which is not a valid W3C specification value. Valid values are DENY and SAMEORIGIN only. Since the app also sets CSP frame-ancestors *, the X-Frame-Options header should be removed entirely to avoid browser inconsistency.'),
      sp(80),

      h2('4.2 Vercel Platform Security'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Area',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Notes',4560,C.darkBlue,true,C.white)]),
        dr_([tc('TLS/HTTPS enforcement',3200),badge('\u2713',C.greenBg,C.green,1600),tc('Vercel enforces HTTPS on all deployments by default. HTTP redirects to HTTPS.',4560)]),
        dr_([tc('Automatic certificate management',3200),badge('\u2713',C.greenBg,C.green,1600),tc('Let\'s Encrypt certificates auto-renewed by Vercel.',4560)]),
        dr_([tc('DDoS protection',3200),badge('\u2713',C.greenBg,C.green,1600),tc('Vercel\'s edge network provides basic DDoS mitigation.',4560)]),
        dr_([tc('Environment variable isolation',3200),badge('REVIEW',C.amberBg,C.amber,1600),tc('All secrets in Vercel env vars. Confirm no secrets committed to GitHub. SUPABASE_SERVICE_ROLE_KEY must not appear in any repo file.',4560)]),
        dr_([tc('Vercel WAF / Firewall',3200),badge('NOT CONFIGURED',C.amberBg,C.amber,1600),tc('No Vercel Firewall rules detected. Rate limiting on auth endpoints not enforced at the edge. Brute-force protection relies entirely on application-level logic.',4560)]),
        dr_([tc('Preview deployment access',3200),badge('REVIEW',C.amberBg,C.amber,1600),tc('Preview deployments may expose unreleased features. Confirm Vercel authentication on preview URLs or use deployment protection.',4560)]),
      ]}),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 5 — PRIORITY MATRIX
      // ═══════════════════════════════════════════════
      h1('5. Finding Priority Matrix \u2014 Part 1'),hr(),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[700,3200,1400,1800,2260],rows:[
        hr_([tc('#',700,C.darkBlue,true,C.white),tc('Finding',3200,C.darkBlue,true,C.white),tc('Severity',1400,C.darkBlue,true,C.white,true),tc('Category',1800,C.darkBlue,true,C.white),tc('Effort',2260,C.darkBlue,true,C.white)]),
        dr_([tc('1',700,C.lightGray,true),tc('46/48 users have no MFA factor enrolled in DB',3200),badge('CRITICAL',C.redBg,C.red,1400),tc('Auth / Ops',1800),tc('Low \u2014 notify + monitor',2260)]),
        dr_([tc('2',700,C.lightGray,true),tc('requireSession() does not verify JWT signature',3200),badge('HIGH',C.amberBg,C.amber,1400),tc('App Code',1800),tc('Low \u2014 add jwtVerify call',2260)]),
        dr_([tc('3',700,C.lightGray,true),tc('send-magic-link edge function still active',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Infrastructure',1800),tc('Minimal \u2014 delete function',2260)]),
        dr_([tc('4',700,C.lightGray,true),tc('11 always-true RLS policies (entity_start_scores)',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Database',1800),tc('Low \u2014 scope policy to entity access',2260)]),
        dr_([tc('5',700,C.lightGray,true),tc('Leaked password protection unconfirmed',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Auth Config',1800),tc('Minimal \u2014 enable in dashboard',2260)]),
        dr_([tc('6',700,C.lightGray,true),tc('Security headers missing on 4 apps',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('App Config',1800),tc('Low \u2014 update next.config.js',2260)]),
        dr_([tc('7',700,C.lightGray,true),tc('X-Frame-Options: ALLOWALL invalid value',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('App Config',1800),tc('Minimal \u2014 remove header',2260)]),
        dr_([tc('8',700,C.lightGray,true),tc('pg_net extension in public schema',3200),badge('LOW',C.lightBlue,C.darkBlue,1400),tc('Database',1800),tc('Medium \u2014 may need Supabase support',2260)]),
        dr_([tc('9',700,C.lightGray,true),tc('Vercel WAF / rate limiting not configured',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Infrastructure',1800),tc('Medium \u2014 configure firewall rules',2260)]),
        dr_([tc('10',700,C.lightGray,true),tc('1,411 performance advisories',3200),badge('INFO',C.lightGray,C.gray,1400),tc('Performance',1800),tc('High \u2014 dedicated sprint',2260)]),
      ]}),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // PART 2 BANNER
      // ═══════════════════════════════════════════════
      new Paragraph({spacing:{before:120,after:40},children:[new TextRun({text:'PART 2',font:'Arial',size:20,bold:true,color:C.midBlue,allCaps:true})]}),
      new Paragraph({spacing:{before:0,after:20},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:C.darkBlue,space:1}},
        children:[new TextRun({text:'Source Code Security Audit Addendum',font:'Arial',size:34,bold:true,color:C.darkBlue})]}),
      sp(60,40),
      body('This section documents application-level security findings from live static analysis and manual code review of all 6 GitHub repositories, pulled at audit date. All findings reflect the current state of the code in the main branch of each repository.'),
      sp(60),

      // ═══════════════════════════════════════════════
      // SECTION 6 — UNPROTECTED ROUTES
      // ═══════════════════════════════════════════════
      h1('6. API Route Authentication Coverage'),hr(),
      body('A systematic review of all API routes assessed whether each route implements a session authentication guard. Routes are classified as: Protected (verified session required), Public-by-design (intentionally unauthenticated), or Unprotected (missing guard, requires review).'),
      sp(60),

      h2('6.1 attorney-dashboard \u2014 Unprotected Routes'),
      ftable([
        ['Severity','HIGH \u2014 Multiple routes lack auth guards',C.amberBg,C.amber],
        ['Protected routes','All routes that import jwtVerify and parse the st_auth session cookie are correctly protected.'],
      ]),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3600,1800,3960],rows:[
        hr_([tc('Route',3600,C.darkBlue,true,C.white),tc('Auth Status',1800,C.darkBlue,true,C.white),tc('Risk',3960,C.darkBlue,true,C.white)]),
        // ADAPT: unprotected-routes — update from fresh grep scan of all repos
        dr_([tc('app/api/onboard/route.js',3600),badge('UNPROTECTED',C.redBg,C.red,1800),tc('Processes bulk estate plan documents. Uses SUPABASE_SERVICE_ROLE_KEY internally. 60s Vercel Pro timeout budget.',3960)]),
        dr_([tc('app/api/onboard/commit/route.js',3600),badge('UNPROTECTED',C.redBg,C.red,1800),tc('Writes onboarded plan data to Supabase. No session guard.',3960)]),
        dr_([tc('app/api/templates/process/route.js',3600),badge('UNPROTECTED',C.redBg,C.red,1800),tc('Receives DOCX, calls Claude API to parse. Uses service role key.',3960)]),
        dr_([tc('app/api/invoice/pdf/route.js',3600),badge('UNPROTECTED',C.redBg,C.red,1800),tc('Generates invoice PDF. No session required.',3960)]),
        dr_([tc('app/api/report/pdf/route.js',3600),badge('UNPROTECTED',C.redBg,C.red,1800),tc('Generates PDF reports. No session required.',3960)]),
        dr_([tc('app/api/messages/read/route.js',3600),badge('PUBLIC',C.amberBg,C.amber,1800),tc('Called by client portal (cross-app). Low-risk read. Review if intentional.',3960)]),
        dr_([tc('app/api/messages/attachment/route.js',3600),badge('UNPROTECTED',C.amberBg,C.amber,1800),tc('Returns attachment data. Requires review.',3960)]),
        dr_([tc('app/api/integrations/ms365/auth/route.js',3600),badge('UNPROTECTED',C.amberBg,C.amber,1800),tc('MS365 OAuth callback. Should be restricted post-auth.',3960)]),
        dr_([tc('app/api/integrations/ms365/files/route.js',3600),badge('UNPROTECTED',C.amberBg,C.amber,1800),tc('Returns MS365 file listings. No session guard.',3960)]),
        dr_([tc('app/api/esign/webhook/route.js',3600),badge('PUBLIC',C.greenBg,C.green,1800),tc('DocuSign webhook \u2014 must be public. Add HMAC signature validation.',3960)]),
        dr_([tc('app/api/esign/status/route.js',3600),badge('UNPROTECTED',C.amberBg,C.amber,1800),tc('Returns eSign status. No session guard.',3960)]),
      ]}),
      sp(80),

      h2('6.2 Client-Dashboard \u2014 Unprotected Routes'),
      body('Client-Dashboard relies on middleware for app-level authentication. The following individual data routes lack per-route auth guards. Middleware bypass would expose all simultaneously.'),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3600,1800,3960],rows:[
        hr_([tc('Route',3600,C.darkBlue,true,C.white),tc('Auth Status',1800,C.darkBlue,true,C.white),tc('Risk',3960,C.darkBlue,true,C.white)]),
        dr_([tc('app/api/data/route.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Primary data fetch route. No per-route session guard.',3960)]),
        dr_([tc('app/api/catalog/route.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns service catalog. No per-route guard.',3960)]),
        dr_([tc('app/api/upload-logo/route.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('File upload to storage. No per-route guard.',3960)]),
        dr_([tc('app/api/send-message/route.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Sends messages. No per-route guard.',3960)]),
      ]}),
      sp(80),

      h2('6.3 compliance-User \u2014 Unprotected Routes'),
      body('compliance-User relies on middleware HMAC session validation. Seven data API routes lack individual auth guards.'),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3600,1800,3960],rows:[
        hr_([tc('Route',3600,C.darkBlue,true,C.white),tc('Auth Status',1800,C.darkBlue,true,C.white),tc('Risk',3960,C.darkBlue,true,C.white)]),
        dr_([tc('pages/api/entities.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns entity data for the compliance workstation.',3960)]),
        dr_([tc('pages/api/orgs.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns organization data.',3960)]),
        dr_([tc('pages/api/client-health.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns client health metrics.',3960)]),
        dr_([tc('pages/api/documents.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns document listings.',3960)]),
        dr_([tc('pages/api/training-videos.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns training video links.',3960)]),
        dr_([tc('pages/api/audit-log.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns audit log entries.',3960)]),
        dr_([tc('pages/api/work-items.js',3600),badge('MIDDLEWARE ONLY',C.amberBg,C.amber,1800),tc('Returns work item data.',3960)]),
      ]}),
      sp(80),

      h2('6.4 Client-EP \u2014 Unprotected Route'),
      ftable([
        ['Location','app/api/documents/process/route.js'],
        ['Severity','HIGH',C.amberBg,C.amber],
        ['Access','No session guard on POST handler. Uses SUPABASE_SERVICE_ROLE_KEY internally.'],
        ['Exposure','Receives a DOCX file, calls Claude API to classify and parse document sections, uploads to Supabase Storage, and writes structured estate plan data. Hardcodes "mjs@mjs.law" as the p_user_email parameter to the get_firm_integration_creds RPC. Any caller can upload documents and have them processed and stored using service role credentials without authentication.'],
        ['Remediation','Add JWT auth guard checking ep_session cookie before processing. Replace hardcoded email with the authenticated user\'s email from the verified JWT payload.'],
      ]),
      sp(80),

      h2('6.5 platform-admin \u2014 Route Auth Gap'),
      ftable([
        ['Architecture','27 admin/* routes use shared requireSession() helper from app/api/admin/route.js'],
        ['Severity','HIGH \u2014 Cookie presence only, no JWT signature verification',C.amberBg,C.amber],
        ['Finding','requireSession() checks only that the pa_admin_session cookie has a value. Does not call jwtVerify(). A manually crafted, expired, or tampered token passes the guard. All 27 admin routes are affected: overview, users, entities, orgs, access, billing, impersonate/start, impersonate/log, impersonate/end, settings, schema, flags, activity, deployments, db-stats, edgefns, security, softr, and activity-feed.'],
        ['Remediation','Import jwtVerify from jose in requireSession(). Validate the JWT against ADMIN_JWT_SECRET and return 401 on failure.'],
      ]),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 7 — PII & HARDCODED DATA
      // ═══════════════════════════════════════════════
      h1('7. Hardcoded PII & Sensitive Data in Source Code'),hr(),
      body('Grep analysis of all 6 repositories for hardcoded personal identifiable information, email addresses, phone numbers, and names revealed the following findings. This data is compiled into JavaScript bundle files served to authenticated users, cannot be selectively restricted, and creates maintenance burden when personnel change.'),
      sp(60),

      // ADAPT: pii-counts — update section headings and instance counts from fresh grep scan
      h2('7.1 admin-user \u2014 PlatformOpsV3.jsx (52 PII Instances)'),
      ftable([
        ['File','components/PlatformOpsV3.jsx'],
        ['Severity','HIGH \u2014 52 hardcoded PII instances',C.amberBg,C.amber],
        ['PII Found','Full user roster with emails: Jason K. (j@starttoday.biz), Michael Schirger (mjs@starttoday.biz), Peter Provenzano (peter@supplycore.com, (815) 555-0100), Jeff Fahrenwald (jeff@supplycore.com, (815) 555-0101), Rusty Pugh, Sarah Essex; Attorney roster: Joseph Walker (jwalker@mjs.law), Michael Schirger (mjs@mjs.law), Matt Schirger (mschirger@mjs.law); KYC/AML screening data: OFAC/PEP screening results for Peter Provenzano, Jeff Fahrenwald, Essex Managing Partner, Alan Browne, SupplyCore LLC with completion dates; Failed login details tied to j@starttoday.biz with timestamps; FinCEN ID completion status per named individual.'],
        ['Risk','This data is rendered in the admin portal UI using hardcoded JavaScript objects. Any attorney or admin who can load the page receives the complete user roster, KYC screening status, login patterns, and compliance data for real individuals regardless of whether those records are within their authorized scope.'],
        ['Remediation','Replace all hardcoded personnel data with API calls to Supabase RPCs that return only records the authenticated user is authorized to see.'],
      ]),
      sp(80),

      h2('7.2 client-ep \u2014 EstatePlanApp.jsx (10 PII Instances)'),
      ftable([
        ['File','app/components/EstatePlanApp.jsx, app/api/documents/process/route.js'],
        ['Severity','MEDIUM \u2014 10 hardcoded PII instances',C.amberBg,C.amber],
        ['PII Found','Michael Schirger (Managing Attorney, mschirger@mjs.law, (312) 555-0101, bar: IL/WI), William Schirger (Of Counsel, wschirger@mjs.law, bar: IL), Danny Robinson (Associate, drobinson@mjs.law, bar: IL); "mjs@mjs.law" hardcoded as p_user_email in documents/process API route; Attorney names and emails repeated in contact display and firm overview sections.'],
        ['Risk','Estate plan clients see hardcoded attorney contact details regardless of which firm is actually assigned to their engagement. The hardcoded email in the API route means document processing is attributed to mjs@mjs.law even for clients of other firms.'],
        ['Remediation','Load attorney roster dynamically from the database. Replace hardcoded p_user_email in documents/process with the authenticated user\'s email from the session JWT.'],
      ]),
      sp(80),

      h2('7.3 client-dashboard \u2014 ClientShell.js (3 PII Instances)'),
      ftable([
        ['File','app/components/ClientShell.js'],
        ['Severity','MEDIUM \u2014 3 hardcoded PII instances',C.amberBg,C.amber],
        ['PII Found','"Michael Schirger \u00b7 mjs@mjs.law \u00b7 Attorney" hardcoded as search alias value; "mjs@mjs.law mschirger@mjs.law jwalker@mjs.law info@mjs.law" hardcoded as email alias strings in global search index construction (2 locations).'],
        ['Risk','All clients using the global search feature see MJS Law contact information in their search results regardless of whether MJS Law is their assigned service provider.'],
        ['Remediation','Build search aliases from the client\'s assigned professional contacts fetched from the database rather than hardcoded strings.'],
      ]),
      sp(80),

      h2('7.4 compliance-user \u2014 ComplianceWorkstation.jsx (2 PII Instances)'),
      ftable([
        ['File','components/ComplianceWorkstation.jsx'],
        ['Severity','LOW \u2014 2 PII instances in mock thread data',C.lightBlue,C.darkBlue],
        ['PII Found','"Jason C. Walker" and "Michael Harrison" as participants in a hardcoded mock thread entry for "Ironwood Properties, LLC"'],
        ['Risk','Low severity. These appear to be development seed data accidentally left in production code. The names are visible to all compliance users who see thread listings.'],
        ['Remediation','Remove mock thread data. Threads should be loaded from the database.'],
      ]),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 8 — CODE QUALITY
      // ═══════════════════════════════════════════════
      h1('8. Code Quality Assessment'),hr(),
      body('The following assessment evaluates the overall quality, maintainability, and structural patterns of the codebase across all 6 repositories. This is not a security finding but informs the platform\'s long-term security posture.'),
      sp(60),

      h2('8.1 Strengths'),
      bul('Consistent session pattern: all apps use HttpOnly, Secure, SameSite=Lax cookies. No sensitive data in localStorage or sessionStorage.'),
      bul('TOTP MFA implementation is well-structured: three-cookie state machine (session / pending / setup) with Web Crypto API for validation and no external TOTP libraries.'),
      bul('RLS is uniformly applied: 361 of 361 tables have RLS enabled. The User_Entity_Access access control pattern is consistent.'),
      bul('SECURITY DEFINER RPCs for privileged operations follow the correct pattern: all have SET search_path = public and run as service role.'),
      bul('Edge functions correctly use verify_jwt: true across all 28 functions.'),
      bul('No hardcoded secrets in source code were found. All credentials reference process.env variables.'),
      bul('platform-admin and attorney-dashboard have complete security header suites.'),
      sp(60),

      h2('8.2 Structural Concerns'),
      bul('Inconsistent router pattern: 4 apps use App Router, 2 use Pages Router. This creates inconsistent auth guard patterns (route handlers vs API handlers), inconsistent middleware behavior, and split documentation/mental models for the team.'),
      bul('compliance-user uses a custom HMAC cookie session instead of jose JWT. The format is correct but differs from the rest of the platform, creating two authentication paradigms to maintain.'),
      bul('No shared auth library: auth guard logic is duplicated across 6 codebases. The requireSession() gap in platform-admin exists partly because each app reimplements auth independently.'),
      bul('Monolithic component files: PlatformOpsV3.jsx, AttorneyDashboard.jsx, ClientShell.js, and EstatePlanApp.jsx are extremely large single-file components (1,000\u2013 10,000+ lines). This makes security auditing harder and increases the risk of hardcoded data going unnoticed.'),
      bul('No error boundary standardization: error handling patterns differ across apps. Some routes return raw Supabase error objects to the client, which can leak internal schema details.'),
      bul('Hardcoded Supabase URL fallback in multiple routes: e.g., process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ptgtliwllimkswtajcmy.supabase.co". Hardcoding the project URL in fallback reduces flexibility and is an information disclosure if the code is ever made public.'),
      bul('admin-user had no middleware.js until recently added. Historically all route protection relied on client-side redirect logic.'),
      sp(60),

      h2('8.3 GoTrue API Constraints (Known Limitation)'),
      ...callout('KNOWN PLATFORM CONSTRAINT',[
        'The following Supabase GoTrue admin APIs are non-functional on this project and must never be called:',
        '  auth.admin.generateLink() \u2014 returns "Database error finding user"',
        '  auth.admin.createSession() \u2014 "not a function"',
        '  auth.admin.getUserById() \u2014 500 error',
        '  supabase.auth.mfa.* \u2014 requires a real GoTrue session (unavailable)',
        '  supabase.auth.signInWithPassword() \u2014 silently fails, last_sign_in_at stays null',
        '',
        'All authentication and MFA operations must use direct DB access via SECURITY DEFINER RPCs.',
        'This constraint is documented but not formally commented in the codebase, creating',
        'a risk that future developers attempt to use GoTrue APIs and introduce silent failures.',
      ],C.amberBg,C.amber,'D97706'),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 9 — SOURCE CODE PRIORITY MATRIX
      // ═══════════════════════════════════════════════
      h1('9. Source Code Finding Priority Matrix'),hr(),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[700,3200,1400,1800,2260],rows:[
        hr_([tc('#',700,C.darkBlue,true,C.white),tc('Finding',3200,C.darkBlue,true,C.white),tc('Severity',1400,C.darkBlue,true,C.white,true),tc('App',1800,C.darkBlue,true,C.white),tc('Effort',2260,C.darkBlue,true,C.white)]),
        dr_([tc('1',700,C.lightGray,true),tc('requireSession() no JWT validation (27 routes)',3200),badge('HIGH',C.amberBg,C.amber,1400),tc('platform-admin',1800),tc('Low \u2014 add jwtVerify',2260)]),
        dr_([tc('2',700,C.lightGray,true),tc('documents/process unprotected (service role)',3200),badge('HIGH',C.amberBg,C.amber,1400),tc('Client-EP',1800),tc('Low \u2014 add session guard',2260)]),
        dr_([tc('3',700,C.lightGray,true),tc('onboard & templates/process unprotected',3200),badge('HIGH',C.amberBg,C.amber,1400),tc('attorney-dashboard',1800),tc('Low \u2014 add session guards',2260)]),
        dr_([tc('4',700,C.lightGray,true),tc('52 PII instances incl. KYC/AML data',3200),badge('HIGH',C.amberBg,C.amber,1400),tc('Admin-User',1800),tc('High \u2014 replace with API calls',2260)]),
        dr_([tc('5',700,C.lightGray,true),tc('Hardcoded mjs@mjs.law in API route body',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Client-EP',1800),tc('Low \u2014 use JWT email',2260)]),
        dr_([tc('6',700,C.lightGray,true),tc('10 PII instances (attorney names/emails)',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Client-EP',1800),tc('Medium \u2014 database-driven',2260)]),
        dr_([tc('7',700,C.lightGray,true),tc('3 PII instances in search aliases',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Client-Dashboard',1800),tc('Low \u2014 dynamic search index',2260)]),
        dr_([tc('8',700,C.lightGray,true),tc('7 middleware-only routes (compliance)',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('compliance-User',1800),tc('Low \u2014 add per-route guards',2260)]),
        dr_([tc('9',700,C.lightGray,true),tc('4 middleware-only routes (client)',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('Client-Dashboard',1800),tc('Low \u2014 add per-route guards',2260)]),
        dr_([tc('10',700,C.lightGray,true),tc('Multiple unprotected attorney-dashboard routes',3200),badge('MEDIUM',C.amberBg,C.amber,1400),tc('attorney-dashboard',1800),tc('Medium \u2014 add session guards',2260)]),
        dr_([tc('11',700,C.lightGray,true),tc('2 PII instances in mock thread data',3200),badge('LOW',C.lightBlue,C.darkBlue,1400),tc('compliance-User',1800),tc('Low \u2014 remove mock data',2260)]),
        dr_([tc('12',700,C.lightGray,true),tc('Hardcoded Supabase URL fallbacks',3200),badge('LOW',C.lightBlue,C.darkBlue,1400),tc('Multiple',1800),tc('Low \u2014 remove fallback strings',2260)]),
      ]}),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // PART 3 BANNER
      // ═══════════════════════════════════════════════
      new Paragraph({spacing:{before:120,after:40},children:[new TextRun({text:'PART 3',font:'Arial',size:20,bold:true,color:C.midBlue,allCaps:true})]}),
      new Paragraph({spacing:{before:0,after:20},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:C.darkBlue,space:1}},
        children:[new TextRun({text:'SOC 2 Certification Assessment & Gap Analysis',font:'Arial',size:34,bold:true,color:C.darkBlue})]}),
      sp(60,40),
      body('This section assesses the Start Today\u2122 platform against the AICPA SOC 2 Trust Service Criteria, compares readiness for SOC 2 Type I versus Type II certification, and identifies the specific gaps that must be addressed before pursuing formal audit engagement.'),
      sp(60),

      // ═══════════════════════════════════════════════
      // SECTION 10 — SOC 2
      // ═══════════════════════════════════════════════
      h1('10. SOC 2 Framework Overview'),hr(),

      h2('10.1 What SOC 2 Covers'),
      body('SOC 2 (System and Organization Controls 2) is an audit framework developed by the AICPA that evaluates an organization\'s information security controls against five Trust Service Criteria (TSC). It is the de facto security certification for SaaS companies serving business customers in the United States.'),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[1200,2200,5960],rows:[
        hr_([tc('Criteria',1200,C.darkBlue,true,C.white),tc('Area',2200,C.darkBlue,true,C.white),tc('What It Evaluates',5960,C.darkBlue,true,C.white)]),
        dr_([tc('CC1\u2013CC9',1200,C.lightGray,true),tc('Security (Required)',2200),tc('Logical and physical access controls, system operations, change management, risk mitigation',5960)]),
        dr_([tc('A1',1200,C.lightGray,true),tc('Availability (Optional)',2200),tc('System availability commitments, uptime monitoring, incident response, backup/recovery',5960)]),
        dr_([tc('C1',1200,C.lightGray,true),tc('Confidentiality (Optional)',2200),tc('Protection of confidential information, data classification, data disposal',5960)]),
        dr_([tc('PI1',1200,C.lightGray,true),tc('Processing Integrity (Optional)',2200),tc('Complete, valid, accurate, timely, and authorized processing',5960)]),
        dr_([tc('P1\u2013P8',1200,C.lightGray,true),tc('Privacy (Optional)',2200),tc('Personal information collection, use, retention, disclosure, and disposal per AICPA privacy principles',5960)]),
      ]}),
      sp(60),
      body('For a SaaS compliance platform handling business entity data, attorney-client communications, estate plans, and financial records, the recommended scope is Security (required) + Confidentiality + Availability. Privacy criteria apply if personal data of end users is processed.'),
      sp(80),

      h2('10.2 Type I vs Type II \u2014 Key Differences'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2400,3480,3480],rows:[
        hr_([tc('Dimension',2400,C.darkBlue,true,C.white),tc('SOC 2 Type I',3480,C.darkBlue,true,C.white),tc('SOC 2 Type II',3480,C.darkBlue,true,C.white)]),
        dr_([tc('What is assessed',2400,C.lightGray,true),tc('Design of controls at a single point in time',3480),tc('Design AND operating effectiveness of controls over a period of time',3480)]),
        dr_([tc('Observation period',2400,C.lightGray,true),tc('None \u2014 point-in-time snapshot',3480),tc('Minimum 6 months; typically 12 months',3480)]),
        dr_([tc('Auditor question',2400,C.lightGray,true),tc('"Are controls suitably designed?"',3480),tc('"Have controls operated effectively over time?"',3480)]),
        dr_([tc('Evidence required',2400,C.lightGray,true),tc('Policies, configurations, architecture diagrams',3480),tc('Policies + logs, tickets, access reviews, change records, incident reports over the observation period',3480)]),
        dr_([tc('Market weight',2400,C.lightGray,true),tc('Lighter weight \u2014 shows intent and design',3480),tc('Stronger \u2014 enterprise and regulated customers typically require Type II',3480)]),
        dr_([tc('Time to obtain',2400,C.lightGray,true),tc('2\u20134 months from readiness',3480),tc('8\u201316 months from start of observation period',3480)]),
        dr_([tc('Cost (approx.)',2400,C.lightGray,true),tc('$15,000 \u2013 $40,000 for audit',3480),tc('$30,000 \u2013 $80,000+ for audit (plus ongoing compliance tooling)',3480)]),
        dr_([tc('Renewability',2400,C.lightGray,true),tc('Does not renew \u2014 is a point-in-time report',3480),tc('Renewed annually with each new observation period',3480)]),
        dr_([tc('Recommended path',2400,C.lightGray,true),tc('Pursue first to establish baseline',3480),tc('Pursue after 12 months of documented operational controls',3480)]),
      ]}),
      sp(80),pb(),

      h1('11. SOC 2 Type I Readiness Assessment'),hr(),
      body('SOC 2 Type I evaluates whether controls are suitably designed at a point in time. The assessment below maps the current platform state to the Security Trust Service Criteria (CC1\u2013CC9), which is the mandatory category.'),
      sp(60),

      h2('11.1 CC1 \u2014 Control Environment'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        // ADAPT: soc2-criteria — update each criterion status based on live findings
        dr_([tc('CC1.1 \u2014 Organizational commitment to security',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No formal written information security policy (ISP) or organizational security charter exists. Auditors require documented management commitment.',4560)]),
        dr_([tc('CC1.2 \u2014 Board / management oversight of security',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No formal security steering committee or documented security governance structure.',4560)]),
        dr_([tc('CC1.3 \u2014 Organizational structure and authority',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Platform has defined roles (admin, attorney, client). No formal RACI or security responsibility assignment matrix.',4560)]),
        dr_([tc('CC1.4 \u2014 HR policies: background checks, training',3200),badge('GAP',C.redBg,C.red,1600),tc('No documented security awareness training program or background check policy for personnel with system access.',4560)]),
        dr_([tc('CC1.5 \u2014 Enforcement of accountability',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Impersonation logging and audit trail exist in platform-admin. No formal disciplinary policy documented.',4560)]),
      ]}),
      sp(60),

      h2('11.2 CC2 \u2014 Communication & Information'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC2.1 \u2014 Information used to support internal controls',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Security audit reports exist (this document). No systematic internal risk reporting cadence.',4560)]),
        dr_([tc('CC2.2 \u2014 Internal communication of security responsibilities',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No documented security responsibility communication to all personnel with system access.',4560)]),
        dr_([tc('CC2.3 \u2014 External communication to users',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No published privacy policy, security page, or customer-facing incident communication procedures.',4560)]),
      ]}),
      sp(60),

      h2('11.3 CC3 \u2014 Risk Assessment'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC3.1 \u2014 Risk identification and assessment',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('This audit document constitutes a risk identification exercise. No formal risk register exists.',4560)]),
        dr_([tc('CC3.2 \u2014 Risk assessment to determine responses',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No documented risk treatment plan or formal accept/mitigate/transfer decisions.',4560)]),
        dr_([tc('CC3.3 \u2014 Change risk assessment',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No formal change management process. Deployments made directly via Vercel + GitHub push without security review gate.',4560)]),
      ]}),
      sp(60),

      h2('11.4 CC4 \u2014 Monitoring Activities'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC4.1 \u2014 Ongoing evaluation of controls',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No automated monitoring for security control effectiveness. No recurring security review cadence.',4560)]),
        dr_([tc('CC4.2 \u2014 Remediation of deficiencies',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Audit findings are being addressed (as evidenced by this report). No formal deficiency tracking system.',4560)]),
      ]}),
      sp(60),

      h2('11.5 CC5 \u2014 Control Activities'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC5.1 \u2014 Controls to mitigate risks',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('RLS, MFA enforcement, JWT sessions, HttpOnly cookies, HSTS (2 apps). Gaps: WAF, rate limiting, per-route guards.',4560)]),
        dr_([tc('CC5.2 \u2014 Technology controls via policies',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Supabase RLS and RPC policies exist. No formal data classification or handling policy.',4560)]),
        dr_([tc('CC5.3 \u2014 Deployment of controls via policies',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No documented security baseline for code deployment. No mandatory security checklist for new features.',4560)]),
      ]}),
      sp(60),

      h2('11.6 CC6 \u2014 Logical and Physical Access Controls'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC6.1 \u2014 Logical access security measures',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('MFA deployed in all 6 apps. Only 2/48 users enrolled. JWT cookie sessions. Middleware authentication.',4560)]),
        dr_([tc('CC6.2 \u2014 Prior to issuing credentials',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No documented user provisioning process. No formal approval workflow for account creation.',4560)]),
        dr_([tc('CC6.3 \u2014 Remove access when no longer required',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No documented offboarding or access removal process.',4560)]),
        dr_([tc('CC6.4 \u2014 Authentication mechanisms',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Password + TOTP MFA deployed. requireSession() in platform-admin only checks cookie presence, not JWT validity.',4560)]),
        dr_([tc('CC6.5 \u2014 Identification and authentication for infrastructure',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Supabase project access via Supabase dashboard. Vercel dashboard access. No documented MFA on developer tooling accounts.',4560)]),
        dr_([tc('CC6.6 \u2014 Restrict access to authorized users (network)',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('Vercel edge network. No IP allowlisting on Supabase or Vercel admin. Database accessible from any IP with valid credentials.',4560)]),
        dr_([tc('CC6.7 \u2014 Transmission of data',3200),badge('MET',C.greenBg,C.green,1600),tc('HTTPS enforced by Vercel. HSTS on 2 apps. Supabase connections use TLS. All cookies are Secure flag.',4560)]),
        dr_([tc('CC6.8 \u2014 Prevent/detect unauthorized software',3200),badge('GAP',C.redBg,C.red,1600),tc('No software composition analysis (SCA) or dependency vulnerability scanning in CI/CD. No SBOM.',4560)]),
      ]}),
      sp(60),

      h2('11.7 CC7 \u2014 System Operations'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC7.1 \u2014 Detection of security events',3200),badge('GAP',C.redBg,C.red,1600),tc('No SIEM, log aggregation, or alerting on anomalous behavior (failed logins, unusual query patterns, etc.).',4560)]),
        dr_([tc('CC7.2 \u2014 Monitoring for security threats',3200),badge('GAP',C.redBg,C.red,1600),tc('No automated threat detection. Vercel access logs available but no alerting configured.',4560)]),
        dr_([tc('CC7.3 \u2014 Evaluate security events',3200),badge('GAP',C.redBg,C.red,1600),tc('No documented security event triage or escalation process.',4560)]),
        dr_([tc('CC7.4 \u2014 Incident response',3200),badge('GAP',C.redBg,C.red,1600),tc('No documented incident response plan (IRP). No defined breach notification procedure.',4560)]),
        dr_([tc('CC7.5 \u2014 Remediation of incidents',3200),badge('GAP',C.redBg,C.red,1600),tc('No post-incident review process. No defined RTO/RPO.',4560)]),
      ]}),
      sp(60),

      h2('11.8 CC8 \u2014 Change Management'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC8.1 \u2014 Change management process',3200),badge('GAP',C.amberBg,C.amber,1600),tc('Changes deployed directly via GitHub push / Vercel auto-deploy. No formal change request, approval, or rollback procedure documented.',4560)]),
      ]}),
      sp(60),

      h2('11.9 CC9 \u2014 Risk Mitigation'),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[3200,1600,4560],rows:[
        hr_([tc('Criterion',3200,C.darkBlue,true,C.white),tc('Status',1600,C.darkBlue,true,C.white),tc('Evidence / Gap',4560,C.darkBlue,true,C.white)]),
        dr_([tc('CC9.1 \u2014 Risk identification and response',3200),badge('PARTIAL',C.amberBg,C.amber,1600),tc('This audit functions as a risk assessment. No formal risk register or treatment plan.',4560)]),
        dr_([tc('CC9.2 \u2014 Vendor risk management',3200),badge('GAP',C.amberBg,C.amber,1600),tc('No vendor risk assessment process for Supabase, Vercel, Resend, DocuSign, Anthropic, Synthesia, or Microsoft (MS365). No BAAs in place where required.',4560)]),
      ]}),
      sp(80),pb(),

      h1('12. SOC 2 Type I vs Type II \u2014 Current Certification Readiness'),hr(),

      h2('12.1 Type I Readiness Score'),
      body('SOC 2 Type I evaluates whether controls are suitably designed at a point in time. The platform currently meets some technical control requirements but has significant policy and process gaps that auditors will flag as deficiencies.'),
      sp(40),
      new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[2600,1600,1600,3560],rows:[
        hr_([tc('Trust Service Criteria',2600,C.darkBlue,true,C.white),tc('Type I Ready?',1600,C.darkBlue,true,C.white,true),tc('Type II Ready?',1600,C.darkBlue,true,C.white,true),tc('Key Gaps',3560,C.darkBlue,true,C.white)]),
        dr_([tc('CC1 \u2014 Control Environment',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No ISP, no security governance, no HR security policy',3560)]),
        dr_([tc('CC2 \u2014 Communication',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No privacy policy, no security responsibilities documented',3560)]),
        dr_([tc('CC3 \u2014 Risk Assessment',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No risk register, no change risk assessment',3560)]),
        dr_([tc('CC4 \u2014 Monitoring',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No automated monitoring, no review cadence',3560)]),
        dr_([tc('CC5 \u2014 Control Activities',2600),badge('PARTIAL',C.amberBg,C.amber,1600),badge('NO',C.redBg,C.red,1600),tc('Technical controls exist; no documented security baseline for deployments',3560)]),
        dr_([tc('CC6 \u2014 Logical Access',2600),badge('PARTIAL',C.amberBg,C.amber,1600),badge('NO',C.redBg,C.red,1600),tc('MFA deployed but 46/48 users unenrolled; no provisioning/offboarding process',3560)]),
        dr_([tc('CC7 \u2014 System Operations',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No incident response plan, no SIEM, no threat detection',3560)]),
        dr_([tc('CC8 \u2014 Change Management',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No change management process documented',3560)]),
        dr_([tc('CC9 \u2014 Risk Mitigation',2600),badge('NO',C.redBg,C.red,1600),badge('NO',C.redBg,C.red,1600),tc('No vendor risk management, no BAAs',3560)]),
        hr_([tc('OVERALL READINESS',2600,C.darkBlue,true,C.white),badge('NOT READY',C.redBg,C.red,1600),badge('NOT READY',C.redBg,C.red,1600),tc('Estimated 6\u20139 months to Type I readiness with focused effort',3560,C.darkBlue,false,C.white)]),
      ]}),
      sp(80),

      h2('12.2 What the Platform Does Well (SOC 2 Credit)'),
      bul('All 361 database tables have RLS enabled with policies \u2014 strong data isolation evidence'),
      bul('TOTP MFA deployed to all 6 applications with forced enrollment flow \u2014 CC6.1 partial credit'),
      bul('HttpOnly, Secure, SameSite cookie sessions \u2014 no token storage in localStorage'),
      bul('All edge functions require JWT verification \u2014 no unauthenticated server-to-server calls'),
      bul('Vercel enforces HTTPS \u2014 data in transit encrypted, CC6.7 met'),
      bul('HSTS configured on admin and attorney apps \u2014 downgrade attack prevention'),
      bul('Comprehensive RLS policy patterns with org-scoped access helpers'),
      bul('Audit log capability in platform-admin (impersonation logging)'),
      sp(60),

      h2('12.3 SOC 2 Readiness Roadmap'),
      h3('Phase 1 \u2014 Technical Remediation (0\u20133 months)'),
      bul('Complete MFA enrollment for all 46 unenrolled users'),
      bul('Fix requireSession() JWT signature verification gap'),
      bul('Add security headers to all 6 applications'),
      bul('Add per-route auth guards to unprotected routes'),
      bul('Remove hardcoded PII from all source code'),
      bul('Delete send-magic-link edge function'),
      bul('Configure Vercel WAF with rate limiting on auth endpoints'),
      bul('Implement dependency vulnerability scanning (npm audit / Snyk / Dependabot)'),
      sp(40),
      h3('Phase 2 \u2014 Policy & Process Documentation (1\u20134 months)'),
      bul('Write Information Security Policy (ISP)'),
      bul('Write Incident Response Plan (IRP) with defined RTO/RPO'),
      bul('Write Access Control Policy (user provisioning and offboarding procedures)'),
      bul('Write Change Management Policy (review gates before production deployment)'),
      bul('Write Vendor Risk Assessment Policy and assess each critical vendor'),
      bul('Publish Privacy Policy and Terms of Service'),
      bul('Document data classification scheme (public / internal / confidential / restricted)'),
      bul('Create security awareness training program for all personnel with system access'),
      sp(40),
      h3('Phase 3 \u2014 Monitoring & Observability (2\u20136 months)'),
      bul('Configure log aggregation from Vercel, Supabase, and edge functions into a SIEM or log platform (Datadog, Splunk, or similar)'),
      bul('Create alerts for: failed login spikes, unusual API call volumes, after-hours admin access, RLS policy errors'),
      bul('Implement automated weekly security scans (Supabase Security Advisor + dependency audit)'),
      bul('Establish quarterly access reviews to validate User_Entity_Access assignments'),
      bul('Set up uptime monitoring and SLA tracking (Availability TSC)'),
      sp(40),
      h3('Phase 4 \u2014 Audit Engagement (4\u20139 months)'),
      bul('Engage a SOC 2 auditor (recommended: Drata, Vanta, or Secureframe for compliance automation + audit coordination)'),
      bul('Complete readiness assessment with the auditor'),
      bul('Produce Type I report (point-in-time)'),
      bul('Begin 12-month Type II observation period'),
      sp(80),

      h2('12.4 Certification Level Summary'),
      ...callout('CURRENT CERTIFICATION POSTURE',[
        'SOC 2 Type I:  NOT READY \u2014 Estimated 6\u20139 months with focused effort',
        'SOC 2 Type II: NOT READY \u2014 Estimated 18\u201324 months (12-month observation after Type I readiness)',
        'ISO 27001:     NOT READY \u2014 Requires all SOC 2 gaps plus additional ISMS documentation',
        'HIPAA:         NOT IN SCOPE \u2014 Platform does not appear to handle PHI (verify with counsel)',
        'PCI DSS:       NOT IN SCOPE \u2014 Platform does not handle cardholder data (verify with counsel)',
        '',
        'The platform\'s technical security controls (RLS, MFA, JWT, HTTPS) are more mature than its',
        'organizational and process controls. The fastest path to SOC 2 Type I is closing the policy,',
        'documentation, and monitoring gaps rather than further hardening technical controls.',
      ],C.lightBlue,C.darkBlue,C.midBlue),
      sp(80),pb(),

      // ═══════════════════════════════════════════════
      // SECTION 13 — FULL ROADMAP
      // ═══════════════════════════════════════════════
      h1('13. Master Remediation Roadmap'),hr(),

      h2('13.1 Priority 1 \u2014 Immediate (Before Public Launch)'),
      bul('Complete MFA enrollment for all 46 unenrolled users \u2014 mandatory before launch'),
      bul('Upgrade requireSession() in platform-admin to verify JWT signature via jwtVerify()'),
      bul('Add auth guard to /api/documents/process in Client-EP (uses service role key)'),
      bul('Add auth guards to /api/onboard, /api/onboard/commit, and /api/templates/process in attorney-dashboard'),
      bul('Delete send-magic-link edge function from Supabase'),
      bul('Verify leaked password protection is enabled in Supabase Auth dashboard'),
      bul('Scope entity_start_scores_table RLS policies to user entity access'),
      sp(60),

      h2('13.2 Priority 2 \u2014 Short Term (30\u201360 Days)'),
      bul('Add full security header suite to Client-EP, compliance-User, and Admin-User next.config.js'),
      bul('Remove X-Frame-Options: ALLOWALL from Client-Dashboard (keep CSP frame-ancestors)'),
      bul('Configure Vercel WAF rate limiting on /api/auth/login across all 6 apps'),
      bul('Replace 52 hardcoded PII instances in admin-user PlatformOpsV3.jsx with API calls'),
      bul('Replace 10 hardcoded PII instances in Client-EP EstatePlanApp.jsx with database-driven values'),
      bul('Replace 3 hardcoded PII instances in Client-Dashboard ClientShell.js search aliases'),
      bul('Remove mock thread PII data from compliance-User ComplianceWorkstation.jsx'),
      bul('Add per-route auth guards to 7 compliance-User data API routes'),
      bul('Add per-route auth guards to 4 Client-Dashboard data API routes'),
      bul('Add session guards to remaining unprotected attorney-dashboard routes (esign/status, ms365/files, ms365/auth, messages/attachment, report/pdf, invoice/pdf)'),
      sp(60),

      h2('13.3 Priority 3 \u2014 Pre-SOC 2 Engagement (60\u2013180 Days)'),
      bul('Write and publish Information Security Policy'),
      bul('Write and publish Incident Response Plan with RTO/RPO definitions'),
      bul('Write Access Control Policy: user provisioning, periodic access review, offboarding'),
      bul('Write Change Management Policy with mandatory security review gate'),
      bul('Assess all critical vendors (Supabase, Vercel, Anthropic, Resend, DocuSign) and obtain BAAs where required'),
      bul('Publish Privacy Policy and Terms of Service'),
      bul('Implement dependency vulnerability scanning in GitHub Actions CI/CD pipeline'),
      bul('Set up log aggregation and alerting (Datadog or equivalent)'),
      bul('Configure uptime monitoring with SLA targets'),
      bul('Remove hardcoded Supabase URL fallback strings from API route files'),
      bul('Document GoTrue API constraints formally in codebase (architecture decision record)'),
      sp(60),

      h2('13.4 Performance Backlog'),
      bul('Consolidate 746 multiple_permissive_policies into single policies per table'),
      bul('Wrap auth.uid() in (SELECT auth.uid()) for 282 auth_rls_initplan fixes'),
      bul('Add indexes to 278 unindexed foreign key columns'),
      bul('Review and drop 99 unused indexes'),
      bul('Add primary keys to 5 tables missing them'),
      sp(80),

      hr(),
      new Paragraph({spacing:{before:200,after:80},alignment:AlignmentType.CENTER,
        children:[new TextRun({text:'Start Today\u2122 \u2014 Initial Security & Code Quality Audit \u2014 '+today,font:'Arial',size:18,color:C.gray,italics:true})]}),
      new Paragraph({spacing:{before:0,after:80},alignment:AlignmentType.CENTER,
        children:[new TextRun({text:'Confidential \u2014 Internal Use Only',font:'Arial',size:18,bold:true,color:C.darkBlue})]}),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/home/claude/audit-output/StartToday_Security_Audit_Initial.docx', buf);
  console.log('Done');
});
