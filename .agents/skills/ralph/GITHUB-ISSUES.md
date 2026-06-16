# GitHub Issues for Ralph

GitHub Issues are the execution surface for Ralph.

## Codex Web preflight

Before a Codex Web Ralph run implements anything:

1. Confirm the GitHub app/connector can access `<owner>/<repo>`.
2. Confirm the base branch is `<base-branch>`.
3. Search open issues with `ralph-next`, then search `agent-ready` and `ready-for-agent` separately.
4. Skip PRDs, `ralph-prime`, HITL/human-gated issues, blocked issues, and issues already linked to open PRs before selecting work.
5. If connector access is missing, stop and report the blocker. Do not try to install `gh` or run shell/API fallback issue discovery from Codex Web.

Use the repository URL `https://github.com/<owner>/<repo>.git` only for repo identity/bootstrap context when a local remote is missing.

## Connector remediation checklist (Codex Web)

When preflight fails on connector access, include these exact next steps in the blocked report:

1. Open ChatGPT `Settings -> Apps -> GitHub`.
2. Confirm the connected GitHub installation can access `<owner>/<repo>`.
3. If repository-scoped access is enabled, add `<owner>/<repo>` to the allowlist/selected repos.
4. Re-run Ralph preflight and confirm issue search works before implementation.
5. If still blocked, run in local IDE mode only if `gh` is already installed and authenticated.

## Issue types

### Parent PRD

A parent PRD is a planning issue.

Rules:
- do not implement directly
- use `/to-issues` to create child issues
- label as `parent-prd`
- may also be `human-gated`

### Child issue

A child issue is executable.

Rules:
- must have acceptance criteria
- must have blockers listed
- should be labeled `agent-ready`
- may also be labeled `ralph-prime-shaped` when Ralph Prime created or narrowed it
- should produce one PR

### HITL issue

A HITL issue requires human decisions.

Rules:
- do not implement directly
- produce a report or decision prompt
- label as `human-gated` or `HITL`

### Ralph Prime issue

A Ralph Prime issue is a planning-lane issue that is not executable yet.

Rules:
- do not implement directly
- route through `.agents/skills/ralph-prime/SKILL.md`
- keep label `ralph-prime` until relabeled to `agent-ready` or `human-gated`
- add `ralph-prime-shaped` when Ralph Prime turns the work into an executable slice

## Agent-ready issue checklist

An issue is agent-ready when it has:

- [ ] clear title
- [ ] clear problem or behavior to build
- [ ] acceptance criteria
- [ ] explicit blockers or "None"
- [ ] non-goals or out-of-scope notes
- [ ] expected validation
- [ ] no unresolved human decision
- [ ] safe blast radius
- [ ] issue is not currently labeled `ralph-prime`
- [ ] `ralph-prime-shaped` is treated as provenance, not as a blocker

## PR requirements

Every Ralph PR must:

- target the base branch
- include `Closes #ISSUE_NUMBER`
- include validation results
- include risk level
- include rollback plan
- avoid unrelated changes
- include worker freshness proof when the PR came from a local Worker run

After creating a PR, Ralph must read or inspect the PR body before reporting success. If the closing keyword is missing, Ralph must update the PR body immediately.

## Closing issues

Use GitHub closing keywords in the PR body:

- `Closes #ISSUE_NUMBER`
- `Fixes #ISSUE_NUMBER`
- `Resolves #ISSUE_NUMBER`

Default:

`Closes #ISSUE_NUMBER`

Do not rely on the issue title, branch name, commit message, or final chat summary to close the issue. The closing keyword must be present in the pull request body at merge time.

## PR title

Use:

`Ralph: Implement #ISSUE_NUMBER - ISSUE_TITLE`

## PR body template

```md
## Summary
- ...

## Issue
Closes #ISSUE_NUMBER

## Files changed
- ...

## Validation
- command + result
- command + result

## Worker freshness
- Base branch: `<base-branch>`
- Branch created from: `origin/<base-branch>` / n/a
- Remote base SHA: `<sha>` / n/a
- Fetch command: `git fetch origin --prune` / n/a

## Risk level
Low / Medium / High

## Rollback plan
- Revert this PR.

## Follow-up
- ...
```

## Issue comments

If Ralph skips an issue, do not silently ignore it.

Final summary should explain:

- why it was skipped
- whether it should be relabeled
- what needs to change to make it executable

## Avoid duplicates

Before creating new issues, check:

- open PRDs
- open agent-ready issues
- recently closed related issues
- existing blockers

Do not create duplicate work.
