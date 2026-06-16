# Ralph Prime Novelty Rubric

Use this rubric before routing any issue lane.

## Scoring

| Score | Meaning | Default lane |
|---|---|---|
| `0` | Mechanical fix, typo, docs-only maintenance | AFK |
| `1` | Known pattern change with low blast radius | AFK |
| `2` | Scoped UX or behavior polish within existing model | AFK or Ralph Prime |
| `3` | Meaningful user-facing behavior change with tradeoffs | Ralph Prime |
| `4` | New feature/workflow or product-direction choice | Ralph Prime with possible HITL |
| `5` | Policy, security, billing, auth, legal, irreversible architecture | HITL |

## Hard HITL Boundaries

Always route to HITL when any of these are true:

- auth/session policy changes
- Stripe billing or entitlement policy changes
- secret rotation
- production config mutation
- legal/privacy commitments
- irreversible data/schema migration

## Evidence Requirements By Lane

- AFK lane:
  - acceptance criteria are concrete and testable
  - blockers are resolved
  - scope is one-PR sized and reversible
- Ralph Prime lane:
  - options/tradeoffs are documented
  - first slice and deferred work are explicit
  - evidence-grounded grill is complete
- HITL lane:
  - decision prompt is explicit
  - risks and consequences are summarized
  - no implementation started

## Routing Output

Always output:

1. novelty score
2. lane decision
3. labels to apply
4. reason and evidence summary

