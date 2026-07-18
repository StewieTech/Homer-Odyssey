# PR Quality Gates

Minimum release-quality PR expectations for your product.

## Availability-First Invariant

Hardening work is incomplete if it breaks user-visible functionality.
Any security/policy change that degrades usability is treated as a failed release.

## Security-Impact Classification

Every PR should be classified as one of:

- `none`
- `availability-risk`

Classify as `availability-risk` when a PR touches any of:

- CORS policy
- auth/session behavior
- origin/header contracts
- environment wiring/runtime entry behavior
- rate-limiting policy
- entitlement-sensitive boundaries

## Required PR Sections

- Summary of what changed
- Why this change exists
- Security-impact classification (`none` or `availability-risk`)
- Risk level (`Low`, `Medium`, `High`)
- Environment impact (`none`, `development`, `staging`, `production`, config/secrets)
- Release impact (`no version change`, `patch`, `minor`, `major`, `native/app-store needed`)
- Validation evidence (`npm test`, `npm run build`, `npm run lint`, plus scoped checks)
- CORS contract evidence (`npm run check:cors-contract`) when auth, client headers, Function URL CORS, or deploy scripts change
- Rollback plan
- Availability evidence + rollback trigger/owner notes (required when classified `availability-risk`)

## Classified PR Handling (Checklist Example)

Use this checklist pattern when `availability-risk` is selected:

- [ ] Classified as `availability-risk` (sensitive hardening surface touched)
- [ ] Matrix-style compatibility evidence attached (surface/origin/auth mode/result)
- [ ] Candidate-to-production integrity statement present
- [ ] Explicit rollback trigger and rollback owner documented

## Gate Policy

- Production-impacting PRs must include explicit rollback notes.
- Promotion-affecting PRs must state whether they preserve candidate-to-prod promotion integrity.
- Client-request header changes must be paired with Lambda Function URL CORS updates before merge.
- Deployed web auth changes must pass an `OPTIONS /auth/guest` preflight from the target frontend origin with `content-type,x-client-surface`.
- Changes touching chat/auth/CORS/deploy boundaries must include evidence for guest-authenticated `/chat/send` completion (local parity test evidence + deployed lane smoke evidence where applicable).
- Any environment naming change must reference [ENVIRONMENT-LANGUAGE.md](ENVIRONMENT-LANGUAGE.md).
- Any version/build metadata change must reference [VERSIONING.md](VERSIONING.md).
- `availability-risk` PRs should be held until availability evidence and rollback notes are complete.
- CI enforces `availability-risk` evidence via `npm run check:pr-availability-gate` on pull requests.

## Ralph Requirements

- Ralph-generated PRs must still include risk, environment impact, release impact, and rollback sections.
- Ralph-generated `availability-risk` PRs must include classification and availability-evidence checklist completion.
- Ralph may prepare release-ready PRs; merge/deploy remains human-gated.
