---
name: ralph
description: Run Ralph loops for GitHub issue execution, backlog queueing, HITL/AFK task selection, queue draining, and one-issue-one-PR implementation. Use when the user mentions Ralph, AFK agents, HITL agents, backlog queues, GitHub issue execution, sequential issue implementation, or agent-ready tasks.
---

# Ralph

Ralph is the Repo Autonomous Loop for Planned Hygiene.

Ralph turns repo backlog work into controlled agent execution.

Core loop:

1. Inspect the executable issue queue.
2. Check whether each issue is HITL, AFK, blocked, or already covered by an open PR.
3. Select every eligible AFK issue.
4. For each selected issue, create one fresh branch from the current base branch; local Worker runs must branch from `origin/<base-branch>`.
5. Implement only that issue.
6. Run validation.
7. Open one pull request.
8. Verify the PR body includes `Closes #ISSUE_NUMBER`.
9. Return to the queue and continue until eligible issues are exhausted or a stop condition is hit.
10. Human reviews and merges.

Ralph does not merge its own PRs.
`ralph-sequential-merge` is the explicit named exception for one-issue-at-a-time merge-if-clean runs.

## When to use Ralph

Use this skill when:

- executing GitHub issues
- running AFK implementation tasks
- triaging `agent-ready` issues
- turning a backlog into an execution queue
- running sequential Codex Web tasks
- deciding whether a task is HITL or AFK
- setting up safe issue-to-PR loops
- checking whether issues are ready for agents
- keeping the human merge gate intact

Do not use Ralph for:

- architecture discovery
- PRD creation
- breaking PRDs into issues
- broad strategy work
- user-facing product decisions
- `ralph-prime` planning-lane issues that still need escalation-stage planning
- explicit merge-if-clean issue-list runs that belong to `ralph-sequential-merge`

Use these instead:

- `/improve-codebase-architecture` for architecture discovery
- `/to-prd` for parent PRD creation
- `/to-issues` for child issue creation

## Required reading

Before running Ralph, read:

1. `AGENTS.md` if present
2. `agent.md` if present
3. `.github/codex-implement.md` if present
4. `.github/copilot-instructions.md` if present
5. `.windsurf/workflows/read-agent-context.md` if present

Then read the Ralph helper files as needed:

- `LANGUAGE.md`
- `MODES.md`
- `QUEUE.md`
- `GITHUB-ISSUES.md`
- `SANDBOXING.md`
- `SANDCASTLE.md`
- `EXAMPLES.md`

## Core rule

One issue = one branch = one pull request.

One Ralph run may open multiple PRs when multiple independent AFK issues are available.

Never batch unrelated issues into one PR.
Never stack issue branches on top of each other.
Never merge your own PR.
The only repo exception is explicit use of `.agents/skills/ralph-sequential-merge/SKILL.md`.
Never stop the whole run only because one issue produced one PR.

## Codex Web toolchain contract

For Codex Web Ralph runs, use the installed GitHub app/connector for issue discovery, issue reads, branch/PR operations, and metadata checks.

- Repository: `<owner>/<repo>`
- Base branch: `<base-branch>`
- Remote identity: `https://github.com/<owner>/<repo>.git`
- Do not install GitHub CLI in Codex Web.
- Do not run package-manager install attempts for `gh` such as `apt-get`, `npm install -g gh`, or `go install`.
- If the GitHub connector cannot access the repository, stop and report the missing connector access.
- Do not run shell/API fallback issue discovery in Codex Web when connector access is missing.
- Include a connector remediation checklist in the blocked report: ChatGPT `Settings -> Apps -> GitHub`, verify installation/repo access for `<owner>/<repo>`, then re-run preflight issue searches.

GitHub CLI is optional for local IDE runs only when `gh` is already installed and authenticated.

## Local Worker branch freshness contract

For local IDE/Desktop Worker runs, `origin/<base-branch>` is the source of truth before every issue branch unless the task explicitly names another base branch.

Before reading or editing issue files locally:

1. Preserve dirty local state with a named stash, including untracked files: `git stash push --include-untracked -m "local-worker-preflight-YYYYMMDD-HHMM"`.
2. Run `git fetch origin --prune`.
3. Create the issue branch from `origin/{baseBranch}`, not from local `{baseBranch}`. For the project default Ralph runs, use `git switch -c ralph/issue-{issueNumber}-{short-slug} origin/<base-branch>`.
4. Record the remote base SHA with `git rev-parse origin/{baseBranch}`.
5. Do not reuse a previous issue branch for new work.
6. If the branch already exists, inspect whether it belongs to an existing PR before continuing.

For multi-issue local Ralph runs, repeat the fetch before each issue branch. Keep any preflight stash untouched until the run finishes or stops, then switch back and restore it. If stash restore conflicts, stop and report the conflict instead of contaminating the worker branch.

Every local Worker PR must include freshness proof:

```md
## Worker freshness
- Base branch: `<base-branch>`
- Branch created from: `origin/<base-branch>`
- Remote base SHA: `<git rev-parse origin/<base-branch>>`
- Fetch command: `git fetch origin --prune`
```

## Default Ralph sequence

1. Inspect open GitHub issues.
2. Skip PRDs and planning-only issues.
3. Skip HITL, human-gated, `ralph-prime`, blocked, ambiguous issues, and issues already linked to open PRs.
4. Select all issues labeled `agent-ready` or `ready-for-agent`, including issues that also carry `ralph-prime-shaped`.
5. Prefer `ralph-next` first if present, then continue through the remaining eligible queue.
6. Run eligible AFK issues until the queue is exhausted, or until a stop condition is hit.
7. For each issue:
   - create a fresh branch from the base branch; local Worker runs use `origin/<base-branch>`
   - implement only that issue
   - validate
   - open a PR
   - include `Closes #ISSUE_NUMBER` in the PR body under an `## Issue` section
   - include worker freshness proof for local Worker PRs
   - verify the created PR body contains the exact closing keyword
   - if the closing keyword is missing, update the PR body before reporting success
   - finish that issue for the current run
   - return to the queue and continue with the next independent eligible issue
8. Summarize PRs opened, validation, skipped issues, and next recommended issue.

## Default base branch

Use the repository default branch.
For the project, use `<base-branch>` unless repo instructions say otherwise.

## Stop conditions

Stop and do not implement if the issue requires:

- auth/session policy changes
- Stripe billing behavior changes
- entitlement policy changes
- production config changes
- secret rotation
- database schema/migrations
- pricing/tier decisions
- broad architecture rewrites
- unresolved human decisions

Also stop the current issue on:

- validation failure that cannot be fixed within issue scope
- ambiguous acceptance criteria
- conflicting queue/dependency state
- unexpected risk expansion outside issue scope

In these cases, produce a HITL report for that issue, skip it, and continue with other independent eligible issues when safe.

Stop the whole run only when the repository/toolchain is unsafe, the base branch cannot be determined, shared validation is misleading, or the eligible queue is exhausted.

## Output

Every Ralph run must end with:

1. Issues inspected
2. Issues selected
3. Issues skipped and why
4. Branches created
5. PRs opened
6. Validation results
7. Risks
8. Recommended next issue
9. Labels that should be changed
