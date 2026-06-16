---
name: implement-change
description: 'Use this implementation skill whenever a planner has already chosen a scoped backlog item so we can follow repo conventions, validations, and backlog sweeps without losing context.'
---

## When to use this skill
- After a planner (in `AGENTS.md` or a trusted backlog owner) has decided the exact change we are delivering.
- When the task is already scoped, dependencies have been listed, and implementation is the remaining work.
- Whenever the repo expectations in `agent.md` and `agent-command-backlog.md` should guide how we touch files and run commands.

## Planner → Worker → Teacher
### Planner
- Point to the approved backlog item, reproduce steps, affected files, and the validation requirements in `AGENTS.md` so the worker knows the success criteria before editing.
- Highlight any command friction, permissions, or GUI-only blockers that could arise so we can avoid asking for approvals mid-work.
### Worker
1. Re-read `agent.md` and `agent-command-backlog.md` to refresh coding principles, preferred commands, and known friction.
2. Confirm you are implementing the exact backlog item that is marked as approved; double-check the plan in `AGENTS.md` if it mentions scope, files, or acceptance criteria.
3. For a new local Worker issue/backlog implementation, complete branch freshness before reading or editing issue files:
    - preserve dirty local state with `git stash push --include-untracked -m "local-worker-preflight-YYYYMMDD-HHMM"` when needed
    - run `git fetch origin --prune`
    - create the worker branch from `origin/{baseBranch}`, not from local `{baseBranch}`; default the project base is `origin/<base-branch>`
    - record `git rev-parse origin/{baseBranch}` for PR freshness proof
    - do not reuse an old issue branch; inspect any existing branch/PR before continuing
4. For multi-issue local Ralph runs, keep the preflight stash untouched until the run finishes or stops, then switch back and restore it. If restore conflicts, stop and report the conflict instead of contaminating a worker branch.
5. Re-open the relevant files before editing to ensure your editor shows the latest baseline.
6. Implement only the scoped change, keeping diffs focused and reviewable.
7. Follow repo conventions (formatting, dependency versions, commit style) so the change feels familiar.
8. After each meaningful edit, run the standard validation suite without asking: `npm test`, `npm run build`, `npm run lint`, `npm run deploy:staging`. Extend the suite if the planner requested additional scripts.
9. Run terminal commands yourself instead of delegating them to the user, unless you are blocked by credentials, permissions, or a GUI-only requirement.
10. If validation breaks, resolve the failure before proceeding.
11. Avoid unrelated refactors unless the planner explicitly asked for them or they are required for correctness.
12. After coding, write the implementation summary, list validations, and note follow-up work.
13. Perform the mandatory backlog sweep:
    - Add the completed item to the `## Completed` section of `agent-backlog.md`.
    - Search `agent-backlog.md` for the task name and strike it through (~~DONE~~) in every section where it appears: Top Features / Enhancements, Top Bugs / Stability Issues, Top Architecture Priorities, Cost Optimization Ideas, and Current Backlog Items — Model Assignment.
    - Update area scores that referenced the item, adjust Weakest Areas if it was listed there, and revise the test coverage score if you added tests.
    - If the #1 item in any section is now done, promote the next open item to #1.
14. Only record durable workflow learnings when they change future agent behavior:
    - reusable process changes go in `.agents/skills/*/SKILL.md`
    - workflow/process improvement ideas go in `agent-ai-workflow-backlog.md`
    - current strategy, launch gates, or active priority changes go in `agent-backlog.md`
    - durable decisions and tradeoffs go in `docs/adr/`
15. If you instruct the user to run a terminal command, capture the exact command, blocker, and the smallest prevention addition in `agent-command-backlog.md`.
16. Reflect on the implementation:
    - Did the plan list all affected files and downstream tests?
    - Does the work reveal a repeatable improvement worth codifying in a skill, backlog, or ADR?
17. Perform a model optimization assessment:
    - Record the model that carried out the implementation, rate it (✅ optimal / ⬆️ should use a higher tier / ⬇️ should use a lower tier), and explain why.
18. Update `agent-backlog.md` with any learnings about model tiers, cost patterns, or cost-saving strategies as needed.
19. Share the implementation in the standard output format below so the planner/teacher can verify the change.
### Teacher
- Confirm the summary includes what changed, which files were touched, which validations ran, any follow-ups, and command friction.
- Highlight any unresolved blockers or decisions that require planner review.
- Ensure the model optimization verdict and any backlog or durable workflow updates are recorded before closing the skill.

## Validation expectations
- Run `npm test`.
- Run `npm run build`.
- Run `npm run lint`.
- Run `npm run deploy:staging`.
- Extend the suite if the planner requested additional validators.
- Only ask the user for help when you lack credentials, permissions, GUI access, or explicit approval to proceed.
- If a validation fails, fix it before continuing.

## Implementation output format
### Implemented
- ...

### Files changed
- `path/to/file`
- `path/to/file`

### Validation run
- ...

### Notes
- ...

### Worker freshness
- Base branch: `<base-branch>`
- Branch created from: `origin/<base-branch>` / n/a
- Remote base SHA: `<sha>` / n/a
- Stash restored: yes/no/n/a

### Follow-up
- ...

### Command Friction
- [none / details of what command was requested and why]
- If you asked the user to run a terminal command, reflect that in `agent-command-backlog.md`.

### Model Optimization
- **Model used:** [model name]
- **Verdict:** [✅ optimal / ⬆️ should use higher tier / ⬇️ should use lower tier]
- **Why:** [one line]
- **Backlog updated:** [yes — describe changes / no — no new learnings]

## Done when
- The scoped change is implemented, focused, and consistent with repo norms.
- All required validations have completed successfully or their failures have been triaged.
- Backlog entries, command logs, and any future-behavior-changing workflow learnings are up to date.
- The implementation output template is filled and ready for review.
- Follow-up work, test gaps, and any command friction are documented.

## Failure modes to watch for
- Skipping the required doc review, then missing repo command preferences or friction history.
- Running only a subset of the validations or forgetting to rerun them after a fix.
- Omitting the mandatory backlog sweep or durable workflow-learning update when future behavior changed.
- Leaving unrelated refactors that increase review effort.
- Failing to summarize validations, follow-ups, and command friction for the planner/teacher.
