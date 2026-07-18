---
name: ralph-sequential-merge
description: Runs a one-issue-at-a-time Ralph workflow on an explicit GitHub issue list with label-aware human approval gates, optional PRD guardrails, dependency-aware blocker deferral, and connector-first GitHub operations.
---

# Ralph Sequential Merge

## Purpose

Run a deterministic Ralph workflow for a named GitHub issue list where only one issue is active at a time, merges are label/risk gated, and blocked issues can be deferred while independent later issues continue.

This skill is the explicit exception to base Ralph's human merge gate. It may auto-merge when the PR is mergeable, has no conflict, is not HITL/human-approval labeled, and GitHub repository policy allows the merge.

## Required Inputs

1. `repo`: GitHub repo slug (example: `<owner>/<repo>`)
2. `issues`: explicit execution list in order, accepts comma list and ranges (example: `136-138,142`)
3. `prd_issue` (optional): PRD/planning issue number for parent guardrails (example: `132`)
4. `base_branch` (optional): defaults to repo default branch unless user overrides

## Hard Rules

1. Use Ralph execution with `$github:github` as the connector-first GitHub workflow layer.
2. Process issues in the provided order, allowing deferral only through the blocker/dependency rules below.
3. Keep one-issue-one-branch-one-PR.
4. PR body must include `Closes #<issue_number>`.
5. Before implementation, inspect the current issue labels and classify it as `auto-merge-eligible`, `approval-required`, or `blocked`, then record a blocker reason code when it is not immediately executable.
6. Conflict/HITL-aware merge policy:
   - Auto-merge is allowed when the PR has no merge conflicts, GitHub branch protection or required checks allow merge or auto-merge, and labels do not include `HITL`, `human-gated`, or `ready-for-human`.
   - Planning labels such as `needs-grill-me`, `ralph-prime`, `blocked`, and `ralph-blocked` may still route the issue before implementation, but they do not block merging a clean, executable PR by themselves.
   - Risk is recorded for the run summary and only blocks merge when it creates or confirms a HITL/human-approval requirement under the blocker routing rules.
   - Any issue or PR with `HITL`, `human-gated`, or `ready-for-human` requires explicit human approval before implementation or merge.
7. Planning-resolvable blockers automatically route through Ralph Prime child analysis before falling back to human approval.
8. `needs-grill-me` may be resolved by Ralph Prime when the answer is grounded in repo evidence; unresolved product, policy, or approval questions remain human-gated.
9. Current-PR validation failures or mechanical merge conflicts caused by the active issue branch may use Ralph Fixer for one bounded repair attempt.
10. A failed PR gate must invoke Ralph Prime before the issue is parked as pending, unless the failure is already an explicit HITL/human-gated boundary. Prime must receive the failing run/job evidence and decide whether to return the PR to Ralph/Fixer for a bounded repair, keep it in Prime for planning, or escalate to HITL.
11. If checks still fail after the Prime-routed repair path, merge is blocked, scope is ambiguous, or risk expands beyond Prime/Fixer scope, Ralph must record the blocker, apply the correct lane, and continue only with independent downstream issues.
12. After recording a pending issue, Ralph may move to the next issue only when that next issue is not dependent on any pending unmerged issue.
13. Ralph must never auto-merge an issue that is approval-required.

## Context Isolation Rule

1. Range parsing is allowed only to compute numeric order.
2. Do not read, summarize, search, or inspect future issue details before their turn, except minimal dependency checks after a blocker.
3. Only the current issue, optional PRD context, and pending dependency map may be active in memory.

## Local Worker Branch Freshness

For local IDE/Desktop Worker runs, `origin/<base-branch>` is the source of truth before every issue branch unless the user explicitly overrides `base_branch`.

Before reading or editing each issue locally:

1. Preserve dirty local state with a named stash, including untracked files: `git stash push --include-untracked -m "local-worker-preflight-YYYYMMDD-HHMM"`.
2. Run `git fetch origin --prune`.
3. Create the issue branch from `origin/{base_branch}`, not from local `{base_branch}`. For the project default runs, use `git switch -c ralph/issue-{issueNumber}-{short-slug} origin/<base-branch>`.
4. Record the remote base SHA with `git rev-parse origin/{base_branch}`.
5. Do not reuse a previous issue branch; inspect any existing branch/PR before continuing.

For multi-issue local sequential runs, repeat the fetch before each issue branch. Keep any preflight stash untouched until the run finishes or stops, then switch back and restore it. If stash restore conflicts, stop and report the conflict instead of contaminating the worker branch.

Every local Worker PR must include freshness proof:

```md
## Worker freshness
- Base branch: `<base-branch>`
- Branch created from: `origin/<base-branch>`
- Remote base SHA: `<git rev-parse origin/<base-branch>>`
- Fetch command: `git fetch origin --prune`
```

## Merge, Approval, Close, And Advance Gates

1. Merge gate:
   - required checks pass
   - no merge conflicts
   - no blocking review or repository policy blocker
   - no `HITL`, `human-gated`, or `ready-for-human` label is present
   - risk does not introduce a HITL/human-approval blocker under the blocker routing rules
2. Approval gate:
   - explicit human approval is required when labels include `HITL`, `human-gated`, or `ready-for-human`
   - explicit human approval is required when risk creates or confirms a HITL/human-approval blocker, even without those labels
   - planning labels such as `needs-grill-me`, `ralph-prime`, `blocked`, and `ralph-blocked` route planning or repair work but do not block merge by themselves
   - for `needs-grill-me`, Ralph Prime may answer evidence-grounded clarification itself; unanswered product or policy judgment still requires approval
3. Close gate:
   - prefer auto-close via `Closes #<issue_number>`
   - if not auto-closed after merge, close the issue manually
   - Ralph Prime may close without implementation only when it leaves a durable rationale that implementation should not continue
4. Advance gate:
   - merged issue path: move to the next issue only after close gate passes
   - blocked issue path: write blocker plan, mark issue pending, then check whether the next issue depends on any pending unmerged issue
   - dependency rule: if dependency exists or is unclear, keep the next issue deferred and continue scanning in order

## Blocker Routing Rules

- Route to Ralph Prime when the blocker is planning-resolvable:
  - ambiguous scope
  - unclear acceptance criteria
  - unknown or expanded risk
  - validation failure outside the current issue scope
  - dependency ambiguity
  - broad or cross-cutting implementation implications
  - missing first-slice decomposition
  - labels such as `needs-plan`, `needs-grill-me`, or `ralph-prime`
- Route to Ralph Prime for PR gate failures when:
  - a gate failure is ambiguous, surprising, or outside the current issue's obvious edit surface
  - a Ralph Fixer attempt failed, was inconclusive, or revealed scope/risk expansion
  - the run would otherwise mark the issue pending only because checks failed
- Route to Ralph Fixer when the active issue branch has a mechanical merge conflict or validation failure caused by the current PR and the repair stays within issue scope.
- Route to HITL when the blocker touches auth/session policy, billing or entitlement policy, secrets, production config, legal/privacy commitments, schema/data migration, or unresolved product judgment.
- Note and skip without child routing when the issue is already covered by an open PR or the repo/toolchain is unsafe.

## Workflow

1. Resolve repository and base branch.
2. Normalize `issues` into an ordered list (expand ranges like `136-138` to `136,137,138`) without loading future issue content.
3. If `prd_issue` is provided, read it once before processing the first implementation issue.
4. Maintain a `pending_unmerged` list for issues that are blocked or waiting on human approval.
5. For each issue in order:
   - Load only that issue.
   - Detect label lane (`auto-merge-eligible`, `approval-required`, `blocked`) and dependency state against `pending_unmerged`.
   - If the issue depends on pending unmerged work, mark it deferred and continue in order.
   - If the blocker is planning-resolvable, invoke Ralph Prime before deciding whether the issue should return to AFK, stay in planning, escalate to HITL, split into child issues, or close with rationale.
   - If the active PR hits an in-scope mechanical validation or merge repair, invoke Ralph Fixer once before escalating.
   - If a PR gate fails, collect the failing workflow run, job, step, and log evidence, then invoke Ralph Prime before marking the issue pending. Prime decides whether the next action is parent Ralph repair, Ralph Fixer, Prime planning, or HITL.
   - If Ralph Prime creates or narrows an executable issue, add `ralph-prime-shaped` alongside `agent-ready`.
   - If Ralph Prime keeps the issue in planning or HITL, write the decision prompt or plan packet and add the issue to `pending_unmerged`.
   - If approval-required for any other reason, write a decision prompt and add to `pending_unmerged`.
   - If executable, implement only that issue scope and open one PR with `Closes #<issue_number>`.
   - If the PR came from a local Worker run, include worker freshness proof in the PR body.
   - Confirm CI/checks status, risk level, and mergeability.
   - If merge gate passes, auto-merge and close the issue.
   - If merge gate fails after the Prime-routed repair path is exhausted or blocked, write blocker plan, add to `pending_unmerged`, and continue dependency-aware processing.
6. End with a run summary, including pending approvals and deferred dependency blocks.

## Output Format

1. PRD issue used (or `none`)
2. Issue order requested
3. Per-issue status:
   - lane (`auto-merge-eligible`, `approval-required`, `blocked`, `deferred`)
   - blocker reason code
   - child lane used (`none`, `ralph-prime`, `ralph-fixer`, `ralph-prime -> ralph-fixer`)
   - dependency status
   - branch
   - PR URL
   - local Worker freshness proof (`yes/no/n/a`)
   - checks
   - risk level
   - approval required (`yes/no`) and reason
   - merge result
   - issue close result
4. Pending unmerged issues and required approvals
5. Deferred issues and dependency reason
6. Next recommended action

## Quick Start Prompt

Use this skill on `owner/repo` with issues `136-138`.
Execute one issue at a time with label-aware gates.
Auto-merge clean PRs that have no merge conflicts, are not labeled `HITL`, `human-gated`, or `ready-for-human`, and are allowed by GitHub branch protection or required checks.
Auto-merge never applies to `ralph-prime` planning-lane issues.
For blocked issues, route planning blockers through Ralph Prime, current-PR mechanical repair through Ralph Fixer, failed PR gates through Ralph Prime before parking pending, and continue only with independent downstream issues.

Use this skill on `owner/repo` with issues `136-138` and PRD `132` to apply PRD guardrails once at start.
