# Product-architecture routing contract

Choose exactly one route:

- `NO_OP`: the harness passes and no material gap remains.
- `REPORT_ONLY`: evidence is useful but not ready for mutation.
- `ISSUES_ONLY`: narrow, reversible, testable gaps fit an accepted direction.
- `DIRECTION_REQUIRED`: a new surface, durable tradeoff, or unclear dependency order needs a product artifact.
- `PLANNING_REQUIRED`: implementation ambiguity can be resolved through deeper evidence and option analysis.
- `GOVERNANCE_REQUIRED`: launch, release, production, privacy, billing, entitlement, legal, or user-trust judgment is involved.
- `HUMAN_REQUIRED`: product taste, role behavior, policy, private data, credentials, or unsafe mutation is unresolved.
- `EXECUTE_READY`: the target explicitly authorizes a bounded handoff and every readiness and governance gate passes.

Execution-ready work must be explicitly listed, dependency-ordered, capped, and assigned target-approved execution profiles. A pending dependency, stale base, ambiguous acceptance criterion, or human-gated label is a hard stop.
