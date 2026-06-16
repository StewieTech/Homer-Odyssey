# Post-Deploy Rollback Runbook

Deterministic post-production verification and rollback decision contract for availability-risk releases.

For staging-candidate browser gate prerequisites and production pre-mutation fail-closed rules, also see [../../../docs/ops/browser-auth-gate-promotion-runbook.md](../../../docs/ops/browser-auth-gate-promotion-runbook.md).

## Verification Command

Run immediately after production mutation:

```powershell
npm run check:postdeploy-availability -- --api-url <production_api_base> --frontend-url https://<production-domain>/ --version <version> --build <buildNumber_or_buildStamp> --environment production --git-sha <git_sha> --update-id <update_id_or_na> --out-dir artifacts/postdeploy
```

Outputs:

- `artifacts/postdeploy/postdeploy-availability-report.md`
- `artifacts/postdeploy/postdeploy-availability-findings.json`

Run the browser-real companion probe in the same promotion window:

```powershell
npm run check:browser-auth-journey -- --api-url <production_api_base> --frontend-url https://<production-domain>/ --out-dir artifacts/postdeploy
```

Additional outputs:

- `artifacts/postdeploy/browser-auth-journey-report.md`
- `artifacts/postdeploy/browser-auth-journey-findings.json`
- `artifacts/postdeploy/browser-auth-journey-chat.png`

## Required Signals

Post-deploy verification must capture:

- API health endpoint status (`GET /health`)
- auth/CORS preflight contract (`OPTIONS /auth/guest`)
- bearer auth bootstrap journey (`POST /auth/guest` expecting an access token)
- browser-cookie auth bootstrap journey (`POST /auth/guest` with `x-client-surface: web`, expecting access and refresh cookies)
- bearer authenticated follow-up journey (`GET /me` using `Authorization: Bearer <token>`)
- browser-cookie authenticated follow-up journey (`GET /me` using session cookies)
- bearer and browser-cookie core chat completion journeys (`POST /chat/send`)
- frontend shell reachability (`GET /` from production origin)
- browser-real `/chat` journey from page load through `auth/guest -> chat/send`, including auth credential presence on the chat request

Each finding must be linked to the release identity tuple:

- `version`
- `buildNumber/buildStamp`
- `environment`
- `gitSha`
- `updateId`

## Trigger-to-Action Mapping

### Trigger: Backend availability breach

Condition:

- `/health` non-2xx, request timeout, or `db: down`.

Operator action:

1. Capture tuple + failing evidence in incident timeline.
2. Roll back backend alias:
   `aws lambda update-alias --function-name <lambda-function-name> --name prod --function-version <known_good_lambda_version> --region ca-central-1`
3. Re-run post-deploy verification and confirm pass before closing incident.

### Trigger: Auth/CORS journey breach

Condition:

- `OPTIONS /auth/guest`, bearer `POST /auth/guest`, browser-cookie `POST /auth/guest`, `GET /me`, or `POST /chat/send` fails contract.
- Missing bearer-token signals and missing browser-cookie/session signals are separate findings; route bearer failures to API token response/config triage and cookie failures to web session/CORS/cookie policy triage.

### Trigger: Browser-real auth/chat breach with direct API pass

Condition:

- `check-browser-auth-journey` fails but direct API availability probes pass.
- Browser findings show missing auth credentials on `POST /chat/send` or browser request-surface auth drift.

Operator action:

1. Freeze promotion advancement and capture both direct API and browser artifact paths in incident notes.
2. Triage auth bootstrap and cookie policy first (`AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_SECURE`), then verify in-memory bearer send-path sync behavior.
3. Re-promote frontend/backend as needed to restore browser auth propagation.
4. Re-run both probes and close only when both pass.

Operator action:

1. Freeze further release operations and open incident triage.
2. Restore backend alias to known-good Lambda version if backend/auth behavior regressed.
3. Re-promote known-good frontend snapshot when origin/header mismatch is frontend-config related.
4. Re-run post-deploy verification before declaring recovery.

### Trigger: Frontend shell breach

Condition:

- Production frontend shell probe fails while backend probes remain healthy.

Operator action:

1. Checkout known-good release tag/commit.
2. Re-promote frontend:
   `powershell -ExecutionPolicy Bypass -File <frontend-app-dir>/scripts/promote.ps1 -Env prod`
3. Re-run post-deploy verification and confirm pass state.

## Decision Flow

1. Run post-deploy verification and collect report artifacts.
2. If all signals pass, record tuple + report paths in release notes.
3. If any signal fails, classify by direct API vs browser-real failure surface, map failure to trigger policy, and execute mapped rollback action path.
4. Re-run verification after rollback action.
5. Close incident only when all signals pass and tuple evidence is updated.
