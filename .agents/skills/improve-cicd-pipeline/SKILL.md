---
name: improve-cicd-pipeline
description: Improve your product release engineering across CI checks, CD promotion, environment naming, version/build metadata, Expo/EAS releases, PR quality gates, nightly security checks, and Ralph release-support automation. Use when reviewing or changing release workflows, promotion scripts, diagnostics metadata, or release governance.
---

# Improve CICD Pipeline

## Purpose

Use this skill to make your product release delivery safer, clearer, and easier to operate.
Treat this as release engineering, not "YAML-only CI/CD."

## Non-negotiable Rules

- Do not treat `dev` and `staging` as synonyms.
- Do not bump product version only because an artifact moved environments.
- Promote a tested candidate to production; do not promote arbitrary latest code.
- Treat availability as a first-class hardening invariant: if a security/policy change breaks user-visible behavior, the release has failed.
- Classify changes touching CORS/auth/origin/header/session/env/rate-limit/entitlement-sensitive boundaries as `availability-risk` and require stronger evidence.
- Treat the core chat path as a first-class availability contract: `POST /chat/send` must complete in `local`, `development`, `staging`, and `production` (local via test suite, deployed lanes via smoke checks).
- Keep production deploys human-gated.
- Ralph may open reports/issues/PRs, but may not auto-merge or auto-deploy production.
- Every release discussion should separate:
  `version`, `buildNumber`, `environment`, `gitSha`, and `updateId` (when OTA exists).

## Required Repo Inspection

Always inspect these first before proposing changes:

- `.github/workflows/*`
- `<frontend-app-dir>/scripts/promote.ps1`
- `scripts/promote-full.ps1`
- `scripts/promote-prod.ps1`
- `<serverless-package>/serverless.yml`
- `<frontend-app-dir>/app.config.js`
- `<frontend-app-dir>/app/lib/diagnostics.ts`
- `<frontend-app-dir>/package.json`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Workflow

1. Map the current release flow and name contradictions.
2. Normalize language using [ENVIRONMENT-LANGUAGE.md](ENVIRONMENT-LANGUAGE.md).
3. Validate version/build policy with [VERSIONING.md](VERSIONING.md).
4. Confirm execution paths using [CANONICAL-PROMOTION-PATH.md](CANONICAL-PROMOTION-PATH.md).
5. Apply security-impact classification (`none` vs `availability-risk`) and require matrix-style availability evidence + rollback trigger notes for `availability-risk` slices, including core chat journey proof (`/auth/guest -> /chat/send`) on deployed lanes.
6. Propose small, safe PR slices before automation-heavy changes.
7. Keep diagnostics, rollback notes, and human gates explicit.

## Output Modes

- **Mode A: Release Architecture Report**
  Use for ambiguity and contradiction discovery.
- **Mode B: Agent-ready Issue/PR Plan**
  Use when work should be split into safe implementation slices.
- **Mode C: Narrow Release PR**
  Use for low-risk docs/config checks that do not bypass human production gates.

## References

- [ENVIRONMENT-LANGUAGE.md](ENVIRONMENT-LANGUAGE.md)
- [CANONICAL-PROMOTION-PATH.md](CANONICAL-PROMOTION-PATH.md)
- [VERSIONING.md](VERSIONING.md)
- [EXPO-EAS-RELEASES.md](EXPO-EAS-RELEASES.md)
- [GITHUB-ACTIONS.md](GITHUB-ACTIONS.md)
- [PR-QUALITY-GATES.md](PR-QUALITY-GATES.md)
- [SECURITY-NIGHTLY.md](SECURITY-NIGHTLY.md)
- [RALPH-AUTOMATIONS.md](RALPH-AUTOMATIONS.md)
- [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md)
