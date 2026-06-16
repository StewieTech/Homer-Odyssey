# Ralph Sandcastle

A sandcastle is a disposable practice run for Ralph.

Use a sandcastle before trusting Ralph with high-risk work.

## Purpose

A sandcastle tests whether the Ralph loop works:

- issue selection
- branch creation
- validation
- PR creation
- closing keyword
- human review
- local pull after merge

## Good sandcastle tasks

Use low-risk issues such as:

- docs update
- test-only change
- small compatibility wrapper
- tiny lint cleanup
- non-production config docs
- runbook addition

## Bad sandcastle tasks

Do not use sandcastle for:

- auth behavior
- billing behavior
- entitlement policy
- production config
- secrets
- schema migrations
- broad refactors

## Sandcastle prompt

```md
Use `.agents/skills/ralph/SKILL.md`.

Run a Ralph sandcastle.

Select exactly one low-risk open issue labeled `agent-ready` or `ready-for-agent`.

If no low-risk issue exists, stop and recommend one sandcastle issue to create.

Rules:
- one issue
- one branch
- one PR
- no merge
- include `Closes #ISSUE_NUMBER`
- run docs-safe or targeted validation
```

## Sandcastle success criteria

A sandcastle succeeds when:

- Codex selects the correct issue
- branch name follows the rule
- PR targets the base branch
- PR body includes Closes #X
- validation is documented
- no unrelated files are touched
- human can review easily
