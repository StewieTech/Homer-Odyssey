---
name: plan-task-handoff
description: Create a decision-complete implementation plan for a scoped backlog task before coding. Use when a task is selected and you need problem framing, decomposition, constraints, tradeoffs, risks, success criteria, model-tier recommendation, and a worker-ready handoff with no code changes.
---

# Plan Task Handoff

## Job
Create an implementation-ready plan for one approved task. Do not implement code in this skill.

## When to use this skill
- The next task is known but implementation has not started.
- A Planner needs a high-quality handoff for a Worker model.
- The task touches multiple files, carries risk, or has unclear constraints.
- You need explicit tradeoffs, risks, and validation before coding.

## When not to use this skill
- The request is a trivial edit that can be done safely in one step with obvious validation.
- The user asked to implement immediately and no planning artifact is needed.
- The task is pure execution of an existing, decision-complete plan.
- The task is exploratory research with no near-term implementation.

## Required inputs
- Approved task name or problem statement.
- Current repo guardrails from `agent.md`.
- Current priorities from `agent-backlog.md`.
- Optional Planning Seed from `/optimize` or `/evaluate-optimize`.
- Relevant source and test files discovered during planning.

## Expected outputs
- One plan that is executable without extra decisions by the implementer.
- Final acceptance criteria that are specific and testable.
- 3-7 ordered sub-tasks with files, risks, and validation per sub-task.
- A model recommendation for execution and why.
- A final "Ready to Implement" handoff prompt.

## Planner -> Worker -> Teacher split
- Planner owns framing, decomposition, constraints, tradeoffs, risk mapping, and execution order.
- Worker executes the plan later, preferably on a cheaper model when feasible.
- Teacher runs a lightweight quality self-check on the plan before finalizing.

## Planning workflow
1. Run a plan-needed gate before deep planning.
2. If the task is trivial, output a "No Plan Needed" note with one-step execution guidance and minimum validation.
3. Read `agent.md`, `agent-backlog.md`, and any available Planning Seed.
4. Read relevant source files before proposing changes.
5. Clarify ambiguous intent only when repo context cannot resolve it.
6. Validate and repair the Planning Seed file list.
7. Remove false-positive files.
8. Add missing files, including `<serverless-package>/src/handler.ts` for route changes and downstream test consumers for shared modules.
9. Freeze a final implementation-ready file list.
10. Frame the problem: target behavior, current behavior, constraints, and out-of-scope items.
11. Separate strategic work from tactical work.
12. Identify reversible decisions and hard-to-reverse decisions.
13. Surface key tradeoffs and choose defaults.
14. Break work into 3-7 numbered sub-tasks.
15. For each sub-task, define likely files, exact change intent, risks, and validation.
16. Convert draft acceptance criteria into final acceptance criteria.
17. Ensure criteria are specific, testable, and include "no unrelated files changed."
18. Define execution order and dependency chain.
19. Recommend the execution model tier.
20. Prefer the cheapest model that can execute safely.
21. Escalate to a stronger model only if cross-cutting architecture or high-ambiguity reasoning is required.
22. Produce a Worker-ready handoff with no missing decisions.
23. Run the Teacher self-check.
24. Present the plan and wait for implementation approval.
25. Do not implement during planning.

## Planning checklist
- [ ] Task is clearly named and scoped.
- [ ] Plan-needed gate was applied.
- [ ] Relevant repo context was read.
- [ ] Final file list is corrected and complete.
- [ ] Strategic vs tactical work is separated.
- [ ] Reversible vs hard-to-reverse decisions are labeled.
- [ ] Tradeoffs and default choices are explicit.
- [ ] Sub-tasks are ordered and dependency-aware.
- [ ] Risks and unknowns are documented with mitigation.
- [ ] Acceptance criteria are testable and implementation-ready.
- [ ] Validation plan is concrete.
- [ ] Model recommendation is justified.
- [ ] Worker handoff is executable without extra decisions.
- [ ] No code implementation occurred.

## Teacher self-check
- Is any decision still implicit?
- Could a lower-cost Worker execute this without guessing?
- Are acceptance criteria measurable and binary where possible?
- Are risky assumptions called out with verification steps?
- Is execution order optimal for fast feedback and low rework?

## Common failure modes
- Vague sub-tasks that describe goals but not actions.
- Missing downstream tests when shared modules change.
- File lists with false positives or missing route-parity files.
- Acceptance criteria that are subjective or untestable.
- Mixing strategy and implementation details into one unclear block.
- Ignoring hard-to-reverse decisions until implementation.
- Choosing an expensive model by habit instead of need.
- Starting implementation inside planning.

## Done when
- The plan is decision-complete and executable by a Worker model.
- Sub-tasks, file list, risks, validation, and acceptance criteria are all explicit.
- Tradeoffs, constraints, unknowns, and reversibility are documented.
- Model recommendation is cost-aware and justified.
- Teacher self-check passes.
- The final output is ready to hand to implementation with no extra planning required.

## Output format
### Goal
[one paragraph with desired outcome and current gap]

### Problem framing
- Current behavior:
- Target behavior:
- Constraints:
- Out of scope:

### Relevant files
- `path/to/source-or-test-file`

### Strategic decisions
- Decision:
- Why:
- Reversible or hard-to-reverse:

### Final acceptance criteria
- ...

### Proposed sub-tasks
1. Sub-task title - files, change intent, risk, validation
2. Sub-task title - files, change intent, risk, validation

### Risks and unknowns
- Risk or unknown:
- Mitigation or validation step:

### Validation plan
- `npm test`
- `npm run build`
- `npm run lint`
- Additional task-specific checks

### Model recommendation
- Suggested model tier:
- Why this tier:
- Downgrade or upgrade trigger:

### Ready to implement
`/implement [task name]` with frozen file list, acceptance criteria, and ordered sub-tasks.
