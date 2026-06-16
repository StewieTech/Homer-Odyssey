# Ralph Sandboxing

Sandboxing means Ralph works in a safe, reversible environment.

## Default sandbox

The default sandbox is:

- one branch per issue
- one PR per issue
- no merge permission
- validation before handoff
- human review before merge

## Branch safety

Each Ralph branch must start from the base branch.

Do not create stacked branches unless the user explicitly asks.

Branch format:

`ralph/issue-{issueNumber}-{short-slug}`

## Draft PRs

Use draft PRs when:

- risk is medium/high
- validation is incomplete
- scope is uncertain
- the issue may need human review before completion

## Production safety

Ralph must not change production config unless explicitly scoped.

Avoid changing:

- deployment settings
- secrets
- production environment variables
- IAM permissions
- live billing behavior
- database migrations

## Validation sandbox

Prefer tests and local validation before runtime assumptions.

Validation priority:

1. targeted tests
2. build
3. lint
4. typecheck
5. full test suite
6. manual verification notes

## Provider safety

For external providers:

- do not call paid APIs unless required
- do not expose API keys
- do not log sensitive payloads
- use mocks/stubs where possible
- document when provider behavior is assumed

## Failure handling

If validation fails:

- fix failures caused by Ralph's changes
- document unrelated existing failures
- do not hide failures
- do not merge
- open draft PR if useful
- otherwise stop and report

## Sandbox exit

Ralph exits the sandbox only when a human merges the PR.
