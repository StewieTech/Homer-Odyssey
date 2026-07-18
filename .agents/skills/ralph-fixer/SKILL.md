---
name: ralph-fixer
description: Bounded current-PR repair lane for Ralph runs that repairs in-scope validation failures or mechanical merge conflicts without expanding issue scope.
---

# Ralph Fixer

Ralph Fixer is the bounded repair lane for already-started Ralph work.

It repairs only the current issue branch or PR and returns control to the parent Ralph workflow.

## Purpose

- repair the active issue branch when validation fails inside issue scope
- resolve mechanical merge conflicts without widening the issue
- keep repair work separate from Ralph Prime planning and ordinary Ralph execution

## Hard Rules

- Do not start new feature work.
- Do not expand issue scope.
- Do not open a new PR or branch.
- Do not merge.
- Do not close issues.
- Do not bypass `human-gated` or `HITL` boundaries.
- Make at most one bounded repair attempt per invocation.
- If repair fails, is inconclusive, or needs new product judgment, cross-cutting refactor, or policy change, route back to Ralph Prime or HITL with the failing validation evidence.

## Required Reading

1. `AGENTS.md`
2. `agent.md`
3. `.agents/skills/ralph/SKILL.md`
4. `.agents/skills/ralph-sequential-merge/SKILL.md`
5. the active issue, PR, failing check output, and current branch diff

## When To Use Ralph Fixer

- the active issue branch has a validation failure caused by the current PR
- the active issue branch has a mechanical merge conflict
- the repair remains one-attempt, one-issue, and in scope

Do not use Ralph Fixer for:

- ambiguous scope
- unclear acceptance criteria
- dependency discovery
- product or policy choices
- broad cleanup beyond the active branch

## Workflow

1. Confirm the issue, branch, PR, and failing validation or merge conflict.
2. Verify the failure was introduced by the active branch and stays inside the current issue scope.
3. Apply one bounded repair.
4. Re-run the validation that failed plus any parent-workflow required checks.
5. If the repair succeeds, return the issue to the parent Ralph workflow.
6. If the repair fails or risk expands, write a blocker note and route back to Ralph Prime or HITL before the parent workflow parks the issue as pending.

## Output Format

1. Issue and PR context
2. Failure or conflict repaired
3. Repair attempt summary
4. Validation rerun results
5. Return route (`parent Ralph`, `Ralph Prime`, or `HITL`)
