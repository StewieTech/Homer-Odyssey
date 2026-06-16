# Release Checklist

Operational checklist for staging-to-production promotion.

Follow the canonical execution contract in [CANONICAL-PROMOTION-PATH.md](CANONICAL-PROMOTION-PATH.md).
For browser-real auth gate details (artifact contract, triage, and rollback branches), use [../../../docs/ops/browser-auth-gate-promotion-runbook.md](../../../docs/ops/browser-auth-gate-promotion-runbook.md).

## Candidate Preparation (Staging)

- Confirm environment naming and metadata are correct.
- Confirm `development`, `staging`, and `production` are not sharing SSM namespaces; staging must be the isolated production-like candidate lane.
- Confirm candidate includes clear `version`, `build`, `environment`, `gitSha`.
- Run standard validations (`npm test`, `npm run build`, `npm run lint`) and scoped smoke checks.
- Run `npm run check:cors-contract` and verify deployed `OPTIONS /auth/guest` from the candidate frontend origin allows `content-type,x-client-surface` with credentials.
- Review local-vs-lambda auth/CORS parity evidence (`runtime.auth-cors-parity.test.ts`) and treat parity failures as promotion blockers for affected paths.
- Confirm local test-suite evidence covers guest-authenticated `/chat/send` completion in route-parity checks.
- Confirm deployed candidate evidence includes `/auth/guest -> /chat/send` completion for development and staging lanes.
- Confirm staging candidate tuple includes browser-real gate evidence in `artifacts/release-tuples/staging/release-tuple.json`:
  - `candidate.browserAuthJourneyCheckEnabled=true`
  - `candidate.browserAuthJourneyCheckPassed=true`
  - non-empty `candidate.browserAuthJourneyReportPath`
  - non-empty `candidate.browserAuthJourneyFindingsPath`
- Verify diagnostics surface reports expected release identity.

## Production Gate

- Confirm production candidate is the tested staging candidate (not arbitrary latest code).
- Confirm `artifacts/release-tuples/staging/release-tuple.json` exists and shows passing staging frontend, API CORS, direct API chat availability, and browser-real auth/chat gates.
- Confirm rollback plan is written and understood.
- Confirm required human approval is present.
- Confirm pre-mutation availability gate passes (matrix contract + production lane preflight) before any user-visible production mutation.
- Record release identity tuple output (version, buildNumber/buildStamp, environment, gitSha, updateId) from promotion scripts before final confirmation.
- Promote using approved release procedure.
- If break-glass is used, record `BreakGlassReason` and incident/ticket reference in release notes.

## Post-Production Verification

- Run `npm run check:postdeploy-availability -- --api-url <prod_api_base> --frontend-url https://<production-domain>/ --version <version> --build <buildNumber/buildStamp> --environment production --git-sha <gitSha> --update-id <updateId_or_na>`.
- Run `npm run check:browser-auth-journey -- --api-url <prod_api_base> --frontend-url https://<production-domain>/ --out-dir artifacts/postdeploy`.
- Verify production endpoint health and key user journey smoke checks, including bearer and browser-cookie authenticated core chat (`POST /chat/send`).
- Verify both direct API and browser-auth artifact outputs exist in `artifacts/postdeploy`.
- Verify browser guest auth from production does not emit CORS errors in the Network tab.
- Verify release metadata in app diagnostics and backend health response path.
- Record release notes with version/build/env/sha tuple.
- If any post-deploy signal fails, execute the mapped rollback policy in [POST-DEPLOY-ROLLBACK-RUNBOOK.md](POST-DEPLOY-ROLLBACK-RUNBOOK.md).

## Pre Mirror Sync

- If `pre` mirror is used, update `<preprod-domain>` after production promotion.
- Treat `pre` as production snapshot validation, not RC staging.

## Rollback Readiness

- Document rollback trigger conditions.
- Document rollback operator and command path.
- Keep previous known-good candidate metadata available.
