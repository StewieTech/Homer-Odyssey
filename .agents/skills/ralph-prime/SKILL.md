---
name: ralph-prime
description: Escalation-first planning lane that runs Brainstorm -> Research -> Plan -> Grill -> Route -> Teacher Memory and classifies issues into AFK, Ralph Prime, or HITL lanes.
---

# Ralph Prime

Ralph Prime is the strategic planning lane above Ralph execution.

Ralph Prime does not implement code. Ralph Prime turns ambiguous or cross-cutting work into decision-complete issue artifacts that can be executed safely.

## Purpose

- replace routine human supervision with stronger planning
- preserve human approval for policy, product-direction, and high-risk boundaries
- route issues into clear lanes before execution

## Hard Rules

- Do not implement code.
- Do not open PRs.
- Do not merge.
- Do not bypass `human-gated` or `HITL` boundaries.
- Do not close valid executable work just because it is low risk; route it back to AFK instead.
- Ground critiques in evidence from repo docs, tests, screenshots, and issue context.
- Use `RUBRIC.md` novelty scoring before routing.
- During sequential blocker triage, Ralph Prime may leave comments, update labels, split AFK-ready child issues, and close issues only when it leaves a durable rationale that implementation should not continue.
- During sequential PR-gate triage, Ralph Prime must inspect failing check evidence and route a concrete recovery path before the issue is parked as pending. Execution remains with parent Ralph/Fixer unless the user explicitly grants a one-off Prime execution override for the active run; record any override in the output.

## Required Reading

1. `AGENTS.md`
2. `agent.md`
3. `agent-backlog.md`
4. `agent-github-queue.md`
5. `.agents/skills/issue-factory-core/SKILL.md`
6. `.agents/skills/ralph/SKILL.md`
7. `docs/adr/` entries related to the affected area

## When To Use Ralph Prime

- issue scope is broad, cross-cutting, or decision-heavy
- issue needs option generation and tradeoff analysis before coding
- issue is not pure HITL policy work, but is not `agent-ready` yet
- `ralph-sequential-merge` hit a planning-resolvable blocker or `needs-grill-me` issue
- `ralph-sequential-merge` hit a failed PR gate and needs evidence-based recovery routing before pending deferral
- user asks for planning lane escalation instead of direct execution

## Workflow

1. Classify the issue with novelty score (`0` to `5`) using `RUBRIC.md`.
2. Gather evidence from code, docs, backlog, and current issue state.
3. If invoked from `ralph-sequential-merge`, classify whether the blocker should route to AFK, stay in Ralph Prime, escalate to HITL, or close with a durable rationale.
4. If invoked for a failed PR gate, gather the failing workflow run, job, step, and log excerpt; identify whether the failure is in-scope, out-of-scope, flaky, or policy/HITL-sensitive; then choose one recovery lane: parent Ralph repair, Ralph Fixer, Ralph Prime planning, or HITL.
5. Generate multiple candidate approaches (brainstorm).
6. Select a recommended approach with first vertical slice and deferred work.
7. Grill the plan against domain docs, constraints, risks, and acceptance criteria.
8. Route to exactly one lane:
   - AFK lane: label for direct Ralph execution when fully ready.
   - Ralph Prime lane: keep planning label and produce next planning artifact.
   - HITL lane: human decision required before implementation.
9. Produce Teacher Memory notes for durable improvements.

## Lane Routing Contract

- AFK lane:
  - labels: `agent-ready`, optional `vertical-slice`, optional `ralph-prime-shaped`
  - output: execution-ready issue or child issue with acceptance criteria and validation
- Ralph Prime lane:
  - labels: `ralph-prime`, `needs-plan`
  - output: plan packet + issue refinements, no implementation
- HITL lane:
  - labels: `human-gated`, optional `HITL`
  - output: decision prompt and risk/tradeoff summary
- Failed PR gate recovery:
  - labels: keep the implementation issue executable unless Prime finds a real blocker; add `validation-needed` only when validation remains incomplete after the recovery path
  - output: failing check evidence, root-cause classification, chosen recovery lane, and whether execution approval exists

Prime may close an issue only when it records why implementation should not continue. When the work remains valid and executable, route it back to AFK instead of closing it.

## Output Format

1. Context used
2. Novelty score and routing rationale
3. Top options considered
4. Recommended first slice
5. Acceptance criteria and validation
6. Lane labels to apply
7. Close rationale when applicable
8. Teacher Memory updates
