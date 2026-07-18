# Security Nightly

Nightly release-health and security checks should be report-first.

## Purpose

Catch release drift and security regressions early without auto-changing production.

## Nightly Check Set

- Dependency vulnerability scan
- Outdated package signal
- Code scanning (for example CodeQL path)
- SSM key parity checks
- Environment naming drift checks
- Release metadata consistency checks (version/build/env/sha presence)
- Availability-risk contract drift checks:
  - matrix-driven CORS contract status
  - PR availability gate wiring presence
  - production promote pre-mutation availability gate presence
  - deployed `/auth/guest -> /chat/send` report-first checks for `development`, `staging`, and `production`
  - nightly workflow mutation guard (report-only enforcement)
- Optional Expo doctor/config sanity checks when relevant

## Operating Rules

- Open issues or reports first; do not auto-merge risky fixes.
- Keep signal high: prioritize actionable, high-confidence findings.
- Tag findings with ownership and risk level so Ralph/humans can triage quickly.
- Preserve secret hygiene: no secret values in logs, issue bodies, or artifacts.

## Ralph Interaction

- Ralph may triage nightly findings into scoped issues/PRs.
- Ralph must not self-approve, self-merge, or deploy production from nightly output.

## Signal-to-Triage Path

Nightly output should include, for each finding:

- owner
- risk
- canonical contract term
- evidence excerpt
- first recommended action

At least one sample finding path should always show how a failed signal becomes a triage-ready issue/report payload.
