---
name: issue-factory-core
description: Shared workflow contract for unattended issue-factory skills that convert high-confidence findings into deduped, execution-ready backlog artifacts without implementing code.
---

# Issue Factory Core

## Purpose

Provide one reusable contract for domain issue factories:

- discover and score candidates
- dedupe against active and recent completed work
- create only high-confidence backlog artifacts
- hand off safe slices to Ralph through labels and issue quality

This contract does not implement code, open PRs, or invoke Ralph.

## Hard Rules

- Do not implement code.
- Do not open PRs.
- Do not invoke Ralph.
- Do not merge anything.
- Do not create duplicate issues.
- Do not publish sensitive security detail in GitHub issues.
- Do not link OS temp paths or local-only files from GitHub issues.
- Do not make a generated HTML report the sole source of truth for a PRD/report issue.
- Confirm the intended base branch before required-file validation or issue creation.
- Recheck code-evidence claims against the current checkout before creating an issue.
- Route stale or branch-specific findings to report-only output or existing-issue comments.
- Create at most 3 safe implementation issues per run.
- Create at most 1 PRD/report issue per run.
- Report overflow candidates instead of creating them.
- Only mark an issue `agent-ready` when the readiness gate is fully satisfied.

## Required Inputs

Read these before creating anything:

1. `agent.md`
2. `agent-architect.md`
3. `agent-backlog.md`
4. `agent-ai-workflow-backlog.md`
5. `agent-github-queue.md`
6. `.agents/skills/ralph/SKILL.md`
7. `.agents/skills/ralph-prime/SKILL.md`

Each domain factory must add its own domain-specific required reading.

Source-of-truth note:

- `agent-backlog.md` at repo root is canonical for strategic priority.
- Nested backlog mirrors (for example under `src/`) are non-authoritative unless explicitly declared canonical.

## Candidate Classification

Classify each candidate as one of:

- `NEW`
- `DUPLICATE`
- `EXTENDS_EXISTING`
- `CHILD_OF_EXISTING`
- `NOT_WORTH_IT`
- `NEEDS_HITL`
- `NEEDS_RALPH_PRIME`

## Dedupe Contract

Before creating anything, search:

- open GitHub issues
- open PRs
- recently merged PRs (recommended bounded window: last 14 days)
- recently closed issues (recommended bounded window: last 14 days)
- `agent-backlog.md`
- `agent-ai-workflow-backlog.md`
- `agent-architect.md`
- `agent-github-queue.md`
- relevant domain docs/reports

If an equivalent issue already exists, comment there instead of creating new noise.
If evidence is stale or branch-specific, report or comment instead of creating a new issue.

## PRD/Report Artifact Contract

When an issue-factory run creates a PRD/report issue and produces a generated HTML report, publish the HTML as a durable repo-owned artifact instead of linking an OS temp file.

Use this path pattern:

```text
docs/reports/issue-factory/<automation-id>/<YYYY-MM-DD>-<slug>/report.html
```

Every linked PRD/report issue must include a `Review Artifact` section with:

- clickable report link
- automation id
- generated date
- base branch
- source commit when known
- short Markdown summary of the top recommendation, ranked candidates, confidence, and next slice

The Markdown summary is mandatory so GitHub search, agents, and reviewers can understand the issue without opening the HTML file. Child implementation issues should normally link to the parent PRD/report issue rather than linking the raw HTML report again.

Security issue-factory runs may only publish sanitized HTML or Markdown. Keep runnable attack payloads, secret values, operational abuse detail, and provider-specific attack steps out of GitHub issues and public report artifacts.

## Freshness Preflight

Before candidate creation:

1. Resolve the intended base branch.
2. Confirm the workspace is on that branch before required-file checks.
3. Confirm required files exist on that branch before issuing missing-path findings.
4. Verify code-evidence claims against the current checkout.
5. If any freshness gate fails, produce report-only output and stop issue creation for affected candidates.

## Creation Policy

- `NEW` + confidence >= 85 + narrow, reversible, testable scope -> create implementation issue.
- `NEW` + broad or cross-cutting theme + confidence >= 85 -> create PRD/report issue.
- `EXTENDS_EXISTING` -> comment on the existing issue.
- `DUPLICATE` -> report only.
- `NEEDS_RALPH_PRIME` -> create or update a planning-lane issue with `ralph-prime` + `needs-plan`, never `agent-ready`.
- `NEEDS_HITL` -> create or update a human-gated issue/report, never `agent-ready`.
- `NOT_WORTH_IT` -> ignore.

## Readiness Gate For `agent-ready`

Apply `agent-ready` only when all are true:

- scope is narrow and one-PR sized
- first vertical slice is explicit
- acceptance criteria are concrete and testable
- non-goals are explicit
- validation plan is explicit
- known blockers are resolved
- task is reversible and does not require policy judgment

If any gate fails, use planning labels instead (`needs-plan`, `needs-grill-me`, or `human-gated`) and skip `agent-ready`.

## Labeling Lanes

- Safe implementation issue: `needs-plan`, `vertical-slice`; add `agent-ready` only after gate passes.
- Planning/discovery issue: `needs-plan`, optionally `needs-grill-me`.
- Escalation planning issue: `ralph-prime`, `needs-plan`.
- Human decision required: `human-gated`, optionally `HITL`.
- PRD/report issue: `prd`, `needs-review`.

## Required Issue Shape

Every created implementation issue must include:

- first vertical slice
- acceptance criteria
- non-goals
- likely files
- validation plan
- deferred work

## Output Contract

End every run with:

1. Issues created
2. PRD/report issues created
3. Existing issues commented on
4. Duplicates rejected
5. Ralph Prime planning-lane candidates
6. Human-gated candidates
7. Overflow candidates not created
8. Recommended next Ralph-ready issue

## Scheduling and Runner

This core defines behavior, not runner implementation.

- Domain skills may recommend cadence.
- Automation runner wiring (GitHub Actions/Codex automations/other) is out of scope for this skill.
