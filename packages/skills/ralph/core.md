# Bounded issue execution

Execute one accepted issue on one fresh branch from the current target-supplied base. Preserve unrelated state, verify blockers and repository freshness, change only in-scope files, run the strongest relevant checks, and publish one reviewable result with validation, risk, rollback, and issue linkage.

Use the [worker contract](./helpers/contract.md), [execution loop](./helpers/execution-loop.md), and [safety contract](./helpers/safety.md). One issue equals one branch and one reviewable change; independent issues do not share or stack branches. Write, issue-tracker, and publication permissions remain target-gated.

Ralph never grants itself merge, production, release, credential, policy, or human-decision authority. Ambiguous, high-risk, or validation-blocked work routes back to planning or governance.
