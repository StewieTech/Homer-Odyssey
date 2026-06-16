# Ralph Prime Language

## Ralph Prime

Ralph Prime is the escalation-first planning lane for issue shaping, not an implementation worker.

## Lane

A lane is the current execution path for an issue.

- AFK lane: executable by Ralph after readiness gates pass.
- Ralph Prime lane: planning required before execution.
- HITL lane: human approval required before implementation.

## Novelty score

Novelty score is a `0` to `5` measure of judgment risk and reversibility.

Higher novelty means higher approval requirements.

## Escalation gate

An escalation gate is the decision checkpoint that decides whether work can proceed AFK, stay in Ralph Prime planning, or require HITL approval.

## Planning-resolvable blocker

A planning-resolvable blocker is a blocked issue whose next step can be decided through repo evidence, scope reshaping, or lane routing without implementing code.

Examples include ambiguous scope, unclear acceptance criteria, dependency ambiguity, cross-cutting first-slice design, and evidence-answerable `needs-grill-me` questions.

## Ralph Prime-shaped

`ralph-prime-shaped` marks an issue that Ralph Prime created or narrowed into an executable AFK slice.

It should travel with `agent-ready`, not with `ralph-prime`.

## Administrative close

An administrative close is Ralph Prime ending an issue with a durable rationale that implementation should not continue.

If the work remains valid and executable, it should route to AFK instead of using an administrative close.

## Teacher Memory

Teacher Memory captures durable lessons from planning outcomes, including:

- what failed or was rejected
- what rule should be reused
- what future runs should avoid

## Evidence-grounded grill

Evidence-grounded grill means critique must cite concrete evidence:

- repository docs and ADRs
- issue context and acceptance criteria
- tests/check results
- screenshots or reproducible flow observations when relevant

Self-critique without evidence is insufficient for lane changes.
