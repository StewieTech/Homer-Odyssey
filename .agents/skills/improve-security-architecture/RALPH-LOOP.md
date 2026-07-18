# Ralph Security Loop

## Purpose
This file defines how Ralph runs security architecture loops safely.

Ralph is the Repo Autonomous Loop for Planned Hygiene.

The security loop should produce reports, GitHub issues, and small PRs only when safe.

## Ralph stages

### R â€” Recon
Read:
- repo context
- auth code
- entitlement code
- billing code
- API handlers
- config/env files
- CI scripts
- tests
- recent issues/PRs if available

Output:
- security-relevant map of the repo
- likely sensitive flows
- files to inspect

### A â€” Audit
Choose one audit type only:

1. Auth/session audit
2. Entitlement audit
3. Stripe/webhook audit
4. API validation audit
5. Secrets/config audit
6. Logging/error handling audit
7. External provider audit
8. Supply-chain/dependency audit
9. CORS/deployment audit
10. live session security audit

Do not mix all topics in one loop.

### L â€” Limit
Classify the work:

#### Safe AFK
- documentation
- reports
- test additions
- input validation with preserved behavior
- removing sensitive logs
- small error handling improvements
- low-risk dependency patch PRs

#### Human-gated
- auth/session changes
- auth cookie policy changes
- CORS policy changes
- entitlement policy
- Stripe billing behavior
- schema migrations
- production config
- deploy/runtime routing changes
- secret rotation
- IAM changes
- large refactors

Availability rule:
- If a change touches auth/CORS/cookies/runtime/env/deploy boundaries, treat it as high blast radius.
- High-blast-radius security work defaults to report/issue output unless explicit approval and compatibility proof are present.

### P â€” Prove
For any implementation, run available validation:
- typecheck
- lint
- tests
- focused security regression tests
- build
- dependency audit if available

Boundary compatibility proof (required when auth/CORS/runtime/deploy boundaries are touched):
- `npm run test:security`
- `npm run check:cors-contract`
- targeted route-parity/auth tests
- targeted web-cookie and native-bearer auth round-trip checks
- deployed preflight verification for each in-scope environment (`dev`, `staging`, `prod`) when relevant

If validation commands do not exist, recommend adding them.

### H â€” Handoff
Every Ralph security loop ends with:

1. Summary
2. Files inspected
3. Findings
4. Risk ranking
5. Availability impact ranking (`none` / `low` / `medium` / `high`)
6. OWASP/ASVS mapping
7. Safe AFK tasks
8. Human-gated tasks
9. GitHub issue drafts
10. Tests/checks run
11. Follow-up recommendations
12. Suggested decision-log.md entry if a durable decision was made
13. Suggested agent-backlog.md entry if a workflow or prompt improvement was discovered

## Ralph security report template

# Ralph Security Architecture Report

## Scope
What was reviewed?

## Executive summary
One paragraph.

## Trust boundaries
List major boundaries.

## Sensitive assets
List protected assets.

## Findings

### Finding 1
**Severity:**  
**OWASP:**  
**ASVS-style area:**  
**Availability impact:**  
**Actor:**  
**Asset:**  
**Risk path:**  
**Impact:**  
**Recommended fix:**  
**Safe for AFK:**  
**Suggested issue:**  

## Safe AFK PR candidates
Ranked list.

## Human-gated work
Ranked list.

## Suggested GitHub issues
Provide issue-ready text.

## Validation
What was run or what should be run.

## Log recommendations
- decision-log.md:
- agent-backlog.md:
