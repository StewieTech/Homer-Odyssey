# Ralph Modes

Ralph has two primary modes:

1. HITL Ralph
2. AFK Ralph

## HITL Ralph

Use HITL mode when the work requires human judgment.

### HITL examples

- choose an architecture direction
- decide entitlement policy
- change Stripe behavior
- change auth/session behavior
- change pricing/tier behavior
- rotate secrets
- change production deployment config
- migrate database schema
- define new product behavior
- accept large refactor risk

### HITL output

HITL Ralph should produce:

- concise report
- options
- tradeoffs
- recommendation
- proposed issue rewrite
- proposed PRD update
- risk summary
- decision-log suggestion

### HITL rule

HITL Ralph may prepare work.
HITL Ralph must not commit risky policy changes.

## AFK Ralph

Use AFK mode when the work is scoped, reversible, and testable.

### AFK examples

- implement a focused issue
- add regression tests
- refactor a narrow module seam
- add a compatibility wrapper
- remove unsafe logging
- add docs/runbook
- update typed client boundaries
- implement known validation behavior

### AFK output

AFK Ralph should produce:

- branch
- code changes
- validation
- PR
- risk summary
- rollback plan

### AFK rule

AFK Ralph can open PRs.
AFK Ralph cannot merge PRs.
The separate `ralph-sequential-merge` workflow is the only explicit merge-if-clean exception.

## Decision rubric

Classify each issue:

| Question | If yes |
|---|---|
| Does this change product policy? | HITL |
| Does this change auth/session behavior? | HITL |
| Does this change billing/Stripe behavior? | HITL |
| Does this change entitlement policy? | HITL |
| Does this require secret rotation? | HITL |
| Does this require production config changes? | HITL |
| Does this require database migration? | HITL |
| Is the issue ambiguous? | HITL |
| Is the issue narrow, reversible, and testable? | AFK |
| Does it have clear acceptance criteria? | AFK candidate |
| Can it be one branch and one PR? | AFK candidate |

## Mixed tasks

If a task has both AFK and HITL parts:

1. Split it.
2. Implement only the AFK slice.
3. Create a follow-up HITL issue for the rest.
