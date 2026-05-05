# SOC 2 Criteria Reference

Complete criterion descriptions, assessment patterns, and language for the
SOC 2 Trust Service Criteria sections of the audit report. Use verbatim when
generating Part 3.

---

## Framework Overview

SOC 2 evaluates five Trust Service Criteria. For Start Today™ the recommended
scope is Security (required) + Confidentiality + Availability.

| Code | Criteria | Required? |
|------|----------|-----------|
| CC1–CC9 | Security | Yes — always required |
| A1 | Availability | Recommended for SaaS |
| C1 | Confidentiality | Recommended — platform handles confidential business data |
| PI1 | Processing Integrity | Optional |
| P1–P8 | Privacy | Apply if personal data of end users is processed |

---

## Type I vs Type II

| Dimension | Type I | Type II |
|-----------|--------|---------|
| What assessed | Design of controls at point in time | Design AND operating effectiveness over time |
| Observation period | None — snapshot | Min 6 months, typically 12 months |
| Auditor question | "Are controls suitably designed?" | "Have controls operated effectively over time?" |
| Evidence | Policies, configs, architecture | Above + logs, tickets, access reviews, change records, incident reports |
| Market weight | Lighter — shows intent | Stronger — enterprise customers require Type II |
| Time to obtain | 2–4 months from readiness | 8–16 months from start of observation |
| Cost (approx) | $15,000–$40,000 | $30,000–$80,000+ |
| Path | Pursue first | Pursue after 12 months documented operational controls |

---

## CC1 — Control Environment

**CC1.1 — Organizational commitment to security**
Requires: Written information security policy (ISP) with documented management
commitment to security as an organizational value.
Platform status default: GAP — No formal written ISP exists.

**CC1.2 — Board/management oversight of security**
Requires: Formal security governance structure, steering committee, or
documented security ownership at management level.
Platform status default: GAP — No formal governance structure.

**CC1.3 — Organizational structure and authority**
Requires: Defined roles and security responsibilities. RACI or equivalent.
Platform status default: PARTIAL — Platform has defined roles (admin, attorney,
client) but no formal security RACI or responsibility matrix.

**CC1.4 — HR policies: background checks, training**
Requires: Background check policy for personnel with system access. Security
awareness training program.
Platform status default: GAP — No documented HR security policies or training
program.

**CC1.5 — Enforcement of accountability**
Requires: Documented disciplinary policy for security violations. Audit trail
for privileged actions.
Platform status default: PARTIAL — Impersonation logging exists in platform-admin
audit trail. No formal disciplinary policy.

---

## CC2 — Communication & Information

**CC2.1 — Information to support internal controls**
Requires: Regular security reporting. Risk register. Internal security reviews
on a defined cadence.
Platform status default: PARTIAL — Security audit reports exist. No systematic
internal risk reporting cadence.

**CC2.2 — Internal communication of security responsibilities**
Requires: Documented communication of security responsibilities to all personnel
with system access.
Platform status default: GAP.

**CC2.3 — External communication to users**
Requires: Published privacy policy, security page, customer-facing incident
communication procedures.
Platform status default: GAP — No published privacy policy or security page.

---

## CC3 — Risk Assessment

**CC3.1 — Risk identification and assessment**
Requires: Formal risk identification process. Risk register.
Platform status default: PARTIAL — This audit document constitutes risk
identification. No formal risk register.

**CC3.2 — Risk assessment to determine responses**
Requires: Documented risk treatment decisions (accept/mitigate/transfer) per
identified risk.
Platform status default: GAP.

**CC3.3 — Change risk assessment**
Requires: Formal change management process with security review before production
deployment.
Platform status default: GAP — Changes deployed directly via GitHub push /
Vercel auto-deploy without a security review gate.

---

## CC4 — Monitoring Activities

**CC4.1 — Ongoing evaluation of controls**
Requires: Automated or scheduled monitoring for security control effectiveness.
Recurring security review cadence.
Platform status default: GAP.

**CC4.2 — Remediation of deficiencies**
Requires: Formal process for tracking and remediating security deficiencies.
Platform status default: PARTIAL — Audit findings are being addressed. No
formal deficiency tracking system.

---

## CC5 — Control Activities

**CC5.1 — Controls to mitigate risks**
Requires: Technical and procedural controls addressing identified risks.
Platform status default: PARTIAL — RLS, MFA enforcement, JWT sessions, HttpOnly
cookies, HSTS (2 apps). Gaps: WAF, rate limiting, per-route guards on client apps.

**CC5.2 — Technology controls via policies**
Requires: Data classification policy. Documented acceptable use of systems.
Platform status default: PARTIAL — Supabase RLS and RPC policies exist. No
formal data classification or handling policy.

**CC5.3 — Deployment of controls via policies**
Requires: Security baseline for code deployment. Mandatory security checklist
for new features.
Platform status default: GAP.

---

## CC6 — Logical and Physical Access Controls

**CC6.1 — Logical access security measures**
Requires: MFA for privileged access. Role-based access control. Session management.
Platform status default: PARTIAL — MFA deployed to all 6 apps with forced
enrollment. Only [N]/48 users enrolled. JWT cookie sessions. Middleware
authentication.

**CC6.2 — Prior to issuing credentials**
Requires: Documented user provisioning process. Formal approval workflow for
account creation.
Platform status default: GAP.

**CC6.3 — Remove access when no longer required**
Requires: Documented offboarding and access removal process. Periodic access
reviews.
Platform status default: GAP.

**CC6.4 — Authentication mechanisms**
Requires: Strong authentication. Verified session management.
Platform status default: PARTIAL — Password + TOTP MFA deployed.
requireSession() in platform-admin only checks cookie presence, not JWT validity.

**CC6.5 — Identification and authentication for infrastructure**
Requires: MFA on developer tooling accounts (GitHub, Vercel, Supabase dashboard).
Platform status default: PARTIAL — Application MFA deployed. Developer tooling
MFA status not confirmed.

**CC6.6 — Restrict access (network)**
Requires: Network controls limiting system access. IP allowlisting where appropriate.
Platform status default: PARTIAL — Vercel edge network provides basic controls.
No IP allowlisting on Supabase or Vercel admin.

**CC6.7 — Transmission of data**
Requires: TLS/HTTPS for all data in transit. Secure cookie flags.
Platform status default: MET — HTTPS enforced by Vercel. HSTS on 2 apps.
Supabase connections use TLS. All cookies have Secure flag.

**CC6.8 — Prevent/detect unauthorized software**
Requires: Software composition analysis (SCA). Dependency vulnerability scanning.
SBOM.
Platform status default: GAP — No SCA or dependency vulnerability scanning in
CI/CD pipeline.

---

## CC7 — System Operations

**CC7.1 — Detection of security events**
Requires: SIEM or log aggregation. Alerts on anomalous behavior (failed login
spikes, unusual query patterns).
Platform status default: GAP.

**CC7.2 — Monitoring for security threats**
Requires: Automated threat detection. Log monitoring with alerting.
Platform status default: GAP — Vercel access logs available but no alerting
configured.

**CC7.3 — Evaluate security events**
Requires: Documented security event triage and escalation process.
Platform status default: GAP.

**CC7.4 — Incident response**
Requires: Documented Incident Response Plan (IRP). Defined breach notification
procedure.
Platform status default: GAP.

**CC7.5 — Remediation of incidents**
Requires: Post-incident review process. Defined RTO/RPO.
Platform status default: GAP.

---

## CC8 — Change Management

**CC8.1 — Change management process**
Requires: Formal change request, approval, and rollback procedure. Security
review gate before production deployments.
Platform status default: GAP — Changes deployed directly via GitHub push /
Vercel auto-deploy without formal change management.

---

## CC9 — Risk Mitigation

**CC9.1 — Risk identification and response**
Requires: Formal risk register. Documented risk treatment plan.
Platform status default: PARTIAL — This audit functions as a risk assessment.
No formal risk register or treatment plan.

**CC9.2 — Vendor risk management**
Requires: Vendor risk assessment for each critical third party. Business Associate
Agreements (BAAs) where required.
Platform status default: GAP — No vendor risk assessment process for Supabase,
Vercel, Resend, DocuSign, Anthropic, Synthesia, or Microsoft (MS365). No BAAs
confirmed in place.

---

## Readiness Assessment Scale

| Score | Meaning | Auditor view |
|-------|---------|-------------|
| MET | Criterion fully satisfied with documented evidence | No finding |
| PARTIAL | Some evidence but gaps exist | Minor finding — note with path to resolution |
| GAP | No evidence or significant shortfall | Finding — must be remediated before Type I |

**Type I threshold:** All CC1–CC9 criteria must be at PARTIAL or better, with
a clear remediation plan for any PARTIAL items.

**Type II threshold:** All criteria must have sustained MET evidence across the
observation period (6–12 months of logs, reviews, and documented operations).

---

## SOC 2 Readiness Phases

### Phase 1 — Technical Remediation (0–3 months)
- Complete MFA enrollment for all unenrolled users
- Fix requireSession() JWT signature verification gap
- Add security headers to all 6 apps
- Add per-route auth guards to unprotected routes
- Remove hardcoded PII from all source code
- Delete send-magic-link edge function
- Configure Vercel WAF with rate limiting on auth endpoints
- Implement dependency vulnerability scanning (npm audit / Snyk / Dependabot)

### Phase 2 — Policy & Process Documentation (1–4 months)
- Write Information Security Policy
- Write Incident Response Plan with RTO/RPO
- Write Access Control Policy (provisioning and offboarding)
- Write Change Management Policy
- Vendor Risk Assessment for all critical vendors + BAAs
- Publish Privacy Policy and Terms of Service
- Data classification scheme
- Security awareness training program

### Phase 3 — Monitoring & Observability (2–6 months)
- Log aggregation from Vercel, Supabase, and edge functions into SIEM
- Alerts: failed login spikes, unusual API volumes, after-hours admin access
- Automated weekly security scans
- Quarterly access reviews
- Uptime monitoring and SLA tracking

### Phase 4 — Audit Engagement (4–9 months)
- Engage SOC 2 auditor (recommended: Drata, Vanta, or Secureframe)
- Complete readiness assessment
- Produce Type I report
- Begin 12-month Type II observation period

### Estimated Timeline
- SOC 2 Type I: NOT READY → 6–9 months with focused effort
- SOC 2 Type II: NOT READY → 18–24 months (12-month observation after Type I readiness)
- ISO 27001: NOT READY → requires all SOC 2 gaps plus ISMS documentation
- HIPAA: NOT IN SCOPE — platform does not appear to handle PHI (verify with counsel)
- PCI DSS: NOT IN SCOPE — platform does not handle cardholder data (verify with counsel)
