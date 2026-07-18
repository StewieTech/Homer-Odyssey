---
name: improve-security-architecture
description: Report-first security architecture review for your project, using OWASP Top 10:2025 and ASVS-style thinking to identify trust boundary issues, missing controls, and unsafe patterns. Use for auth, entitlements, Stripe webhooks, API handlers, secrets, logging, and external provider integrations.
---

# Improve Security Architecture

## Purpose
This skill reviews and improves the security architecture of a codebase.

It is not a generic vulnerability scanner. It is a security architecture reasoning skill that helps agents identify insecure boundaries, fragile trust assumptions, missing controls, and unsafe implementation patterns.

## Non-negotiable invariant
Security improvements must preserve system availability and core product usability across supported environments.

If a proposed security change could break login, chat, billing, voice, or other core flows in any supported environment, default to:
- report-only output (Mode A), or
- a human-gated issue (Mode B),
instead of code changes (Mode C).

## When to use
Use this skill when:
- reviewing auth/session logic
- reviewing role or tier entitlements
- reviewing Stripe/billing/webhook security
- reviewing API handlers and validation
- reviewing secrets/config/env handling
- reviewing logging/monitoring gaps
- reviewing external provider integrations
- reviewing frontend/backend trust boundaries
- preparing security-focused GitHub issues for AFK agents
- running a Ralph security loop

## Inputs
The agent should inspect:
- README / CONTEXT files
- package scripts
- server/API routes
- auth/session code
- entitlement/tier logic
- Stripe webhook handlers
- config/env handling
- logging/error handling
- tests
- CI/security tooling
- deployment config
- frontend gating logic
- backend enforcement logic

## Process

### 1. Explore

Read the project's context, prior security docs, and any ADRs or runbooks in the area you are touching first.

Run one focused security pass at a time. Map:
- trust boundaries
- sensitive assets
- attack surfaces
- supported environment contract
- existing controls
- missing controls
- severity and likelihood
- availability impact
- evidence anchors

### 2. Present findings as an HTML report

Write a self-contained, sanitized HTML file to `docs/security/security-architecture-report-<timestamp>.html` so each run gets a fresh file in a durable repo location. Create `docs/security` lazily if it does not exist yet. Open it for the user - `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows - and tell them the absolute path.

If this review is being published by an issue-factory automation as part of a GitHub PRD/report issue, follow `.agents/skills/issue-factory-core/SKILL.md` instead: write the HTML to the durable `docs/reports/issue-factory/<automation-id>/<YYYY-MM-DD>-<slug>/report.html` path, link it from the issue's `Review Artifact` section, and keep the issue body searchable with a Markdown summary.

The report uses Tailwind via CDN for layout and styling, and Mermaid via CDN for trust-boundary, attack-surface, and request-flow diagrams. Mix Mermaid with hand-crafted HTML/CSS tables and callouts. Keep the report static and self-contained.

Every report should include:
- executive summary
- top 5 security architecture risks
- trust boundaries
- sensitive assets
- attack surfaces
- OWASP Top 10:2025 mapping
- ASVS-style control mapping
- severity and likelihood
- recommended GitHub issues
- safe AFK tasks
- human-gated tasks
- validation plan
- evidence anchors

For each major finding, render a card with:
- title
- severity
- likelihood
- availability impact
- affected surfaces
- evidence anchors
- sanitized failure scenario
- OWASP and ASVS mapping
- recommended next action
- routing tag (`agent-ready`, `human-gated`, or `report-only`)

Never include secrets, runnable attack code, operational abuse instructions, or provider-specific attack steps in the HTML file.

See [HTML-REPORT.md](HTML-REPORT.md) for the full HTML scaffold, section layout, styling guidance, and sanitization rules.

After the file is written, ask the user: "Which finding should we turn into an issue or hardening slice next?"

## Output modes

### Mode A: Security Architecture HTML Report
Use when the risk is unclear or broad, or when running a report-first security audit.

Primary artifact:
- the self-contained sanitized HTML report from Process step 2

Output:
1. Executive summary
2. Top 5 security architecture risks
3. Trust boundaries
4. Sensitive assets
5. Attack surfaces
6. OWASP Top 10:2025 mapping
7. ASVS-style control mapping
8. Severity and likelihood
9. Recommended GitHub issues
10. Safe AFK tasks
11. Human-gated tasks
12. Validation plan
13. Evidence anchors

### Mode B: Agent-Ready GitHub Issue
Use when a finding should become delegated work.

Output:
- Title
- Problem
- Risk
- Availability impact (`none` / `low` / `medium` / `high`)
- Expected secure behavior
- Supported environment contract (which clients + environments must keep working)
- Non-goals
- Likely files
- Acceptance criteria
- Test plan
- Rollback plan
- Labels
- Agent safety level

### Mode C: Small Security PR
Use only for low-risk, availability-safe improvements.

Allowed examples:
- add missing input validation
- improve error handling
- remove unsafe logging of sensitive data
- add regression tests
- tighten obvious frontend/backend mismatch when server behavior is preserved
- add security-focused comments/docs
- add missing validation scripts

Not allowed without explicit approval:
- auth redesign
- JWT lifetime changes
- Stripe entitlement behavior changes
- CORS policy or cookie attribute changes
- auth/session middleware behavior changes
- runtime adapter behavior changes (`local`/`lambda` boot or route-parity surfaces)
- production config changes
- staged/prod deployment policy changes
- schema migrations
- secret rotation
- pricing or tier policy changes
- broad refactors

## Availability blast-radius gate
Before proposing implementation:

1. Classify blast radius:
   - Low: local code-only checks unlikely to affect runtime boundaries
   - Medium: behavior changes behind existing API contracts
   - High: auth/CORS/cookie/runtime/env/deploy/traffic-shaping boundaries
2. If blast radius is High:
   - default to Mode A or Mode B
   - do not emit Mode C unless explicit approval is present and compatibility proof is included

## Mandatory compatibility proof (when boundaries are touched)
If any of these are touched, compatibility proof is required:
- `src/app.ts` CORS/auth-related middleware wiring
- auth/session middleware or cookie behavior
- `<serverless-package>/serverless.yml` Function URL CORS settings
- runtime entry adapters/contracts
- deploy scripts that change environment routing or origin policy

Required validation evidence:
- `npm run test:security`
- `npm run check:cors-contract`
- targeted route-parity/auth tests
- targeted web cookie + native bearer auth round-trip tests
- deployed preflight proof for every environment in scope (`dev`/`staging`/`prod`) when relevant

If this evidence cannot be produced, downgrade to report/issue output instead of shipping code changes.

## Ralph loop compatibility

The skill must support Ralph:

R — Recon:
- Read project context.
- Identify security-relevant domains.
- Map trust boundaries.

A — Audit:
- Run one focused security pass.
- Do not mix all security topics at once.

L — Limit:
- Keep output scoped.
- Prefer report or GitHub issue over risky code changes.

P — Prove:
- Identify tests, scans, or validations needed.
- If implementation is done, run the strongest available validation.

H — Handoff:
- Produce a clear report, GitHub issue, or PR summary.
- Include what should go into decision-log.md and agent-backlog.md when relevant.

## Security review order

Pre-step:
1. classify availability blast radius and supported environment contract

Use this priority order:
2. Auth/session security
3. Entitlement enforcement
4. Stripe/webhook/payment integrity
5. Secrets/config/environment handling
6. API input validation
7. Access control
8. External provider integrations
9. Logging/alerting/error handling
10. Supply-chain/dependencies
11. Frontend/backend trust mismatches
12. Data privacy and sensitive data exposure
13. Deployment and CORS configuration

## Availability-first hardening gate

When a proposed security change touches CORS/auth/origin/header/session/env/rate-limit/entitlement-sensitive boundaries, classify it as `availability-risk` and require:

- matrix-style availability evidence across affected runtime surfaces,
- explicit rollback trigger and rollback owner notes,
- human-gated release decision before production mutation.

If usability breaks under a hardening change, treat it as a failed release outcome.

## Core principle
Security architecture is about controlling trust.

For every important flow, ask:
- Who is trusted?
- What proves identity?
- What proves entitlement?
- What data is sensitive?
- What happens if this input is hostile?
- What happens if this external provider fails?
- What happens if a user tampers with frontend state?
- What must be enforced on the server?
- What should be logged without leaking secrets?
- What should fail closed?
- What should fail safe for availability?
- Which supported environments must keep working after the change?

Reference the helper files:
- SECURITY-LANGUAGE.md
- THREAT-MODELING.md
- OWASP-ASVS.md
- SECURITY-DEEPENING.md
- RALPH-LOOP.md
- HTML-REPORT.md
