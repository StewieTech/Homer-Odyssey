# Ralph Queue

Ralph executes from a backlog.

For the project, the default backlog is GitHub Issues.

## Selection order

Ralph should select issues in this order:

1. Issues labeled `ralph-next`
2. Open issues labeled `agent-ready`
3. Open issues labeled `ready-for-agent`
4. Oldest created issue first
5. Lower risk before higher risk

## Skip rules

Skip issues that are:

- closed
- titled `PRD:`
- labeled `parent-prd`
- labeled `human-gated`
- labeled `HITL`
- labeled `ralph-prime`
- labeled `ralph-blocked`
- already linked to an open PR
- missing acceptance criteria
- blocked by open issues
- too broad for one PR

## Dependency rule

If an issue has a `Blocked by` section:

1. Parse the blocker issue numbers.
2. Check whether each blocker is closed or completed.
3. If any blocker is open, skip the issue.
4. Mention it in the final summary.

## Run limits

Ralph has no fixed numeric issue limit by default.

Run until the eligible AFK queue is exhausted, or stop early when stop conditions are hit.

An opened PR for one issue is not a run-level stop condition. After opening one issue's PR, Ralph must return to the queue and continue with the next independent eligible issue.

If the user provides an explicit issue list, run only that list.

## One issue per PR

Even in a multi-issue Ralph run:

- each issue gets its own branch
- each issue gets its own PR
- each PR includes `Closes #ISSUE_NUMBER`
- each created PR body is checked before Ralph reports success
- if the closing keyword is missing, update the PR body immediately
- branches start from the base branch, not from each other

## Queue status labels

Recommended labels:

| Label | Meaning |
|---|---|
| `agent-ready` | Safe for an agent to attempt |
| `ready-for-agent` | Legacy synonym for `agent-ready` |
| `ralph-prime-shaped` | Executable issue that Ralph Prime created or narrowed |
| `ralph-next` | Next issue to run |
| `ralph-running` | Agent is actively working |
| `ralph-pr-opened` | PR exists |
| `ralph-prime` | Planning lane; not executable by Ralph yet |
| `ralph-blocked` | Agent could not safely proceed |
| `human-review` | Waiting for review |
| `human-gated` | Requires human decision |
| `parent-prd` | Planning issue, not directly executable |
| `HITL` | Human-in-the-loop required |

## Optional queue file

A repo may also define:

`.agent/ralph/queue.md`

If present, Ralph should read it before selecting issues.

Queue file format:

| Order | Issue | Status |
|---:|---|---|
| 1 | #15 | next |
| 2 | #16 | waiting |
| 3 | #20 | waiting |
