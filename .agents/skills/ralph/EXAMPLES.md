# Ralph Examples

## Codex Web: generic sequential run

```md
Repository:
<owner>/<repo>

Base branch:
<base-branch>

Use `.agents/skills/ralph/SKILL.md`.

Run Ralph AFK issue execution.

Codex Web toolchain:
- use GitHub app/connector tools for issue search, issue reads, branch creation, and PR creation
- do not install or bootstrap `gh`
- do not run `apt-get`, `npm install -g gh`, or `go install` for GitHub CLI
- if the local git remote is missing, use `https://github.com/<owner>/<repo>.git` only as repo identity/bootstrap context
- if connector access to `<owner>/<repo>` is unavailable, stop and report that blocker with remediation steps:
  1) ChatGPT `Settings -> Apps -> GitHub`
  2) verify installation/repo access to `<owner>/<repo>`
  3) rerun preflight search for `ralph-next`, `agent-ready`, `ready-for-agent`

Rules:
- inspect open GitHub issues
- select open issues labeled `agent-ready` or `ready-for-agent`
- skip PRDs
- skip HITL/human-gated/`ralph-prime` issues
- skip blocked issues
- skip issues already linked to open PRs
- continue until queue is exhausted or a stop condition is hit
- one issue = one branch = one PR
- each Codex Web branch starts from the connector's current `<base-branch>`
- do not stack branches
- do not merge
- include `Closes #ISSUE_NUMBER` in every PR body

Final output:
1. issues inspected
2. issues selected
3. issues skipped and why
4. PRs opened
5. validation results
6. recommended next issue
```

## Codex Web: one specific issue

```md
Repository:
<owner>/<repo>

Base branch:
<base-branch>

Use `.agents/skills/ralph/SKILL.md`.

Implement GitHub Issue #ISSUE_NUMBER only.

Codex Web toolchain:
- use GitHub app/connector tools for issue reads, branch creation, and PR creation
- do not install or bootstrap `gh`
- do not run `apt-get`, `npm install -g gh`, or `go install` for GitHub CLI
- if the local git remote is missing, use `https://github.com/<owner>/<repo>.git` only as repo identity/bootstrap context
- if connector access to `<owner>/<repo>` is unavailable, stop and report that blocker with the same connector remediation checklist

Rules:
- read full issue body and comments
- create branch `ralph/issue-ISSUE_NUMBER-short-slug`
- implement only the issue
- run validation
- open PR into `<base-branch>`
- include `Closes #ISSUE_NUMBER`
- stop after PR
```

## VS Code Codex IDE: local implementation

```md
Use `.agents/skills/ralph/SKILL.md`.

Run Ralph locally on Issue #ISSUE_NUMBER.

Rules:
- work from current repo
- preserve dirty local state with `git stash push --include-untracked -m "local-worker-preflight-YYYYMMDD-HHMM"` when needed
- run `git fetch origin --prune` before creating the issue branch
- create branch `ralph/issue-ISSUE_NUMBER-short-slug` from `origin/<base-branch>`, not local `<base-branch>`
- record `git rev-parse origin/<base-branch>` for PR freshness proof
- implement only the issue
- run validation locally
- commit changes
- if GitHub CLI is available, open PR
- otherwise provide exact commands to push and open PR
- include worker freshness proof in the PR body
- do not merge
```

## Windsurf: planning and HITL mode

```md
Use `.agents/skills/ralph/SKILL.md`.

Run Ralph HITL review on the current backlog.

Do not implement.

Output:
1. open issue map
2. PRDs to skip
3. agent-ready issues
4. blocked issues
5. human-gated issues
6. recommended next 3 Ralph issues
7. label cleanup recommendations
```

## Ralph after merge

After a Ralph PR is merged, run locally:

```bash
git fetch origin --prune
git switch <base-branch>
git pull --ff-only origin <base-branch>
```

Then start the next branch from `origin/<base-branch>`.
