# Ralph Language

## Ralph

Ralph means Repo Autonomous Loop for Planned Hygiene.

Ralph is not a single model.
Ralph is a workflow that lets agents execute repo tasks from a backlog safely.

## Backlog

A backlog is the set of tasks available for Ralph.
In this repo, the backlog is usually GitHub Issues.

## Queue

A queue is the ordered subset of backlog items Ralph may execute.

A queue can be implicit:

- oldest `agent-ready` issue first
- `ralph-next` label first
- dependency order

Or explicit:

- `.agent/ralph/queue.md`
- GitHub Project column
- manually selected issue list

## HITL

HITL means human-in-the-loop.

A HITL Ralph task requires human judgment before or during execution.

Examples:

- product policy decisions
- auth/session behavior changes
- billing behavior
- entitlement rules
- schema migrations
- production config
- broad architecture rewrites

HITL output is usually:

- report
- options
- recommended decision
- issue rewrite
- PRD update

## Ralph Prime

Ralph Prime is the planning lane above Ralph execution.

A `ralph-prime` issue is not executable by Ralph yet.
It must be processed through planning and relabeled before AFK execution.

## Ralph Prime-shaped

`ralph-prime-shaped` means Ralph Prime created or narrowed the issue into an executable slice.

It is provenance, not a planning-lane marker.
If the issue also satisfies the readiness gate and carries `agent-ready`, Ralph may execute it.

## Ralph Fixer

Ralph Fixer is the bounded repair lane for already-started Ralph work.

It may repair only the current issue branch or PR when validation fails or a mechanical merge conflict appears.
It does not create new scope, new PRs, or new product decisions.

## AFK

AFK means away-from-keyboard.

An AFK Ralph task can be executed by an agent without constant supervision.

AFK does not mean unsafe.
AFK does not mean auto-merge.
Only explicit `ralph-sequential-merge` runs may auto-merge under their separate label and risk gates.
AFK means the agent may implement and open a PR.

AFK output is usually:

- branch
- code change
- tests
- PR
- final summary

## Agent-ready issue

An issue is agent-ready when:

- scope is clear
- acceptance criteria are clear
- blockers are closed
- non-goals are clear
- validation expectations are clear
- it does not require human policy judgment

## Parent PRD

A parent PRD is a planning issue.
It should not be executed directly.

Parent PRDs should be broken into child issues using `/to-issues`.

## Child issue

A child issue is an executable slice produced from a PRD or plan.

Good child issues are narrow, verifiable, and independently reviewable.

## Vertical slice

A vertical slice is a thin end-to-end task that touches only the necessary layers to prove behavior.

Vertical slices are better than horizontal slices because they produce demoable or testable progress.

## Tracer bullet

A tracer bullet is a narrow implementation path that proves the architecture or behavior through the full system.

## Blocker

A blocker is another issue or decision that must be completed before the current issue can safely run.

Ralph must verify blockers before execution.

## Sandbox

A sandbox is a safe execution environment.

Examples:

- throwaway branch
- draft PR
- local test environment
- mock provider
- limited-scope issue
- non-production config

## Sandcastle

A sandcastle is a practice Ralph run.

It is intentionally low-risk and disposable.
Use it to test whether the Ralph workflow works before trusting it with real architecture or security work.

## Branch

A branch is the isolated workspace for one issue.

Ralph branch format:

`ralph/issue-{issueNumber}-{short-slug}`

## Local Worker

A Local Worker is a local IDE/Desktop clone executing a scoped issue or backlog item.

Local Worker branches start from `origin/{baseBranch}`, not from local `{baseBranch}`, so merged remote work is the baseline before each issue. For the project Ralph runs, the default is `origin/<base-branch>`.

## PR

A PR is the handoff artifact from Ralph to the human.

Ralph opens PRs.
Humans merge PRs.

## Merge gate

The merge gate is the human review step.

Ralph must not bypass it.
Base Ralph always keeps this gate; `ralph-sequential-merge` is the explicit invoked exception.

## Closing keyword

A closing keyword tells GitHub to close an issue when a PR is merged.

Use:

`Closes #ISSUE_NUMBER`

## Human-gated

Human-gated means Ralph may analyze but should not implement without approval.

## Stacked branch

A stacked branch is a branch based on another feature branch.

Ralph should avoid stacked branches by default.

Each issue branch should start from the base branch. Local Worker issue branches should start from `origin/<base-branch>`.
