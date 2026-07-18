# Expo EAS Releases

Release guidance for Expo + EAS in your product.

## Current Repo Reality

- Current frontend promotion is script-driven web export + S3/CloudFront (`<frontend-app-dir>/scripts/promote.ps1`).
- There is currently no `eas.json` in this repo.
- Any EAS automation proposal must begin as a planned addition, not assumed existing behavior.

## EAS Concepts To Keep Separate

- **EAS Build**: produces native binaries.
- **EAS Update**: ships OTA JS/assets compatible with runtime version.
- **Channels/branches**: route updates to the right builds.
- **runtimeVersion**: compatibility contract for OTA updates.

## Recommended Future Profile Language

If EAS profiles are added, use explicit intent names:

- `development`: unstable/internal builds
- `staging`: release candidate validation
- `production`: user-facing release builds

Reserve `preview` for internal previews, not staging equivalence.

## Promotion Principle

- Build/test candidate for staging.
- Promote that tested candidate to production when approved.
- Do not produce a brand-new, unrelated version only because target changed to production.

## Example Lifecycle

- Local dev snapshot: `v0.1.0-dev Â· local Â· abc123`
- Staging candidate: `v0.1.0 Â· staging Â· build 57 Â· abc123`
- Production promotion: `v0.1.0 Â· production Â· build 57 Â· abc123`
- First public store release: `v1.0.0 Â· production Â· build 100 Â· abc123`

## Rollback Notes

- OTA rollback: repoint channel/branch or republish compatible prior update.
- Native rollback: repromote prior tested binary path (or hotfix forward if store rollback is constrained).
- Always retain release metadata and a human-readable rollback procedure in the release checklist.
