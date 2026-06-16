# GitHub Actions

Workflow policy for your product release engineering.

## Current State Snapshot

- Root workflows currently include:
  - `.github/workflows/pr-quality-gates.yml`
  - `.github/workflows/nightly-availability-drift.yml`
  - `.github/workflows/daily-backlog.yml`
- Release promotion behavior today is script-driven (`promote*.ps1`) and human-invoked.

## Target Workflow Layers

- **PR checks**: type/build/test/lint, static CORS contract checks, and policy checks.
- **Staging promotion**: explicit trigger, artifact metadata capture, smoke checks.
- **Production promotion**: manual/human-gated workflow or protected environment approval.
- **Nightly scheduled checks**: report-first reliability/security hygiene, including deployed core chat journey probes for development/staging/production.

## Guardrails

- Scheduled workflows run on the default branch context; branch policy must account for that.
- Treat deploy workflows as human-gated for production.
- Keep artifact naming deterministic (version, env, sha, timestamp/build id).
- Do not embed secrets in workflow files, logs, or generated artifacts.
- Prefer explicit environment names (`development`, `staging`, `production`) in workflow inputs and outputs.
- Static PR checks must fail if the web client sends a custom auth/session header that Lambda Function URL CORS does not allow.
- Availability workflows should preserve both layers:
  - local suite evidence for `/chat/send` route completion,
  - deployed smoke evidence for `/auth/guest -> /chat/send` in each shared environment lane.

## Before Adding New Workflow Automation

1. Confirm canonical execution paths in [CANONICAL-PROMOTION-PATH.md](CANONICAL-PROMOTION-PATH.md).
2. Confirm naming policy in [ENVIRONMENT-LANGUAGE.md](ENVIRONMENT-LANGUAGE.md).
3. Confirm version/build identity policy in [VERSIONING.md](VERSIONING.md).
4. Confirm release gates in [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
5. Confirm Ralph boundaries in [RALPH-AUTOMATIONS.md](RALPH-AUTOMATIONS.md).
