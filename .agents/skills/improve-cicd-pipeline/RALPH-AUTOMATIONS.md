# Ralph Automations

Ralph policy for release-support work in your product.

## Allowed Ralph Actions

- Open release-readiness issues
- Draft PRs for docs/checks/low-risk automation
- Summarize failed checks and propose minimal fixes
- Triage nightly reports into scoped follow-up tasks
- Draft release notes and readiness reports

## Blocked Ralph Actions

- Merge PRs
- Deploy production
- Change production secrets
- Approve its own PRs
- Bump app-store/native release identifiers without explicit human direction

## Label Suggestions

- `release-readiness`
- `env-change`
- `release-risk/high`
- `security`
- `dependency`
- `human-gated`
- `ralph-safe`
- `ralph-blocked`

## Execution Pattern

- One issue, one branch, one PR.
- Keep production release actions human-gated even when Ralph prepares all inputs.
- Escalate ambiguous policy decisions to HITL mode.
