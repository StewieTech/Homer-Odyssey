# Canonical Promotion Path

Single source of truth for your product release promotion operations.

## Scope

This document defines the only supported release promotion paths for day-to-day operations.

- User-visible dev deployment (backend dev-lane + dev frontend)
- User-visible staging candidate promotion (backend + staging frontend)
- Deterministic production promotion
- Frontend production mirror sync to `pre`

Anything else is legacy and must stay quarantined.

Environment/runtime lane source of truth:

- `docs/architecture/environment-surface-matrix.json`

Promotion checks and CI contract checks should reference that matrix for lane names, origins, auth assumptions, and required request-header behavior.

## Supported Commands

Run from repository root unless noted.

### 1) Deploy user-visible development lane

```powershell
npm run deploy:dev
```

This orchestrates:

- `npm run deploy:dev --prefix <serverless-package>` (backend development-lane deploy)
- `npm run deploy:frontend:dev --prefix <frontend-app-dir>` (dev frontend deploy)
- development SSM namespace binding (`ENV_ALIAS=development`, never staging)
- remote dev frontend evidence check (served bundle URL + build stamp/API-url verification)
- dev API health probe (`GET /health` on the configured dev API URL)
- dev API CORS preflight probe (`OPTIONS /auth/guest` from `https://dev.<production-domain>` with `content-type,x-client-surface`)
- dev core chat journey probe (`POST /auth/guest` then `POST /chat/send`)

Optional flags:

- `powershell -ExecutionPolicy Bypass -File scripts/deploy-dev.ps1 -SkipBackend`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-dev.ps1 -SkipFrontend`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-dev.ps1 -SkipFrontendVerification`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-dev.ps1 -SkipApiHealthCheck`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-dev.ps1 -SkipApiCorsCheck`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-dev.ps1 -DryRun`

### 2) Promote a tested candidate (staging lane)

```powershell
npm run deploy:staging
```

This orchestrates:

- `npm run deploy:staging --prefix <serverless-package>` (backend staging deploy)
- `powershell -ExecutionPolicy Bypass -File <frontend-app-dir>/scripts/promote.ps1 -Env staging` (staging frontend deploy)
- isolated production-like staging namespace binding (`ENV_ALIAS=staging`)
- remote staging frontend evidence check (served bundle URL + build stamp/API-url verification)
- staging API CORS preflight probe (`OPTIONS /auth/guest` from the staging frontend origin with `content-type,x-client-surface`)
- staging core chat journey probe (`POST /auth/guest` then `POST /chat/send`)

Optional flags:

- `powershell -ExecutionPolicy Bypass -File scripts/deploy-staging.ps1 -SkipBackend`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-staging.ps1 -SkipFrontend`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-staging.ps1 -SkipApiCorsCheck`
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-staging.ps1 -DryRun`

Backend-candidate-only promotion command remains available for explicit release operations:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/promote-full.ps1 -TargetEnv staging
```

### 3) Deterministic production promotion (human-gated)

```powershell
npm run promote:prod
```

This invokes `scripts/promote-prod.ps1`, which:

- enforces strict git gates (unless `-Force`)
- reads the staging release tuple from `artifacts/release-tuples/staging/release-tuple.json` (or `-StagingReleaseTuplePath`) and fails before mutation unless staging frontend, API CORS, and chat availability gates passed
- builds the production release tuple from the validated staging candidate tuple
- runs validation/build steps (unless explicitly skipped)
- runs a pre-mutation availability gate (`npm run check:cors-contract` + production lane preflight) before backend alias/frontend publish
- promotes backend + frontend
- runs post-deploy availability telemetry checks (health + auth/CORS + separate bearer-token and browser-cookie auth/chat journeys + frontend shell) and writes report artifacts under `artifacts/postdeploy`
- performs release-branch/tag push flow
- supports incident-only break-glass bypass via `-BreakGlassSkipAvailabilityGate -BreakGlassReason "<ticket>"`

### 4) Refresh `pre` as production mirror snapshot

```powershell
npm run promote:pre --prefix <frontend-app-dir>
```

This invokes `scripts/mirror-prod-to-pre.ps1 -SyncOnly`.

## Explicitly Quarantined Legacy Paths

Do not use these for normal release operations:

- `<serverless-package>/scripts/promote_alias.sh`
- `bootstrap-<serverless-package>.sh`

They are legacy scaffolding/alias helpers and are guarded to prevent accidental execution.
If they must be run for legacy recovery, they require explicit opt-in environment overrides.

## Required Identity Evidence

For production promotion approval and audit capture, record the release tuple output:

- `version`
- `buildNumber/buildStamp`
- `environment`
- `gitSha`
- `updateId` (or `n/a` when OTA is not in play)

Also record the source staging candidate tuple path and fields printed by `scripts/promote-prod.ps1`; production promotion must be traceable back to the tested staging tuple.

## Related Docs

- [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md)
- [POST-DEPLOY-ROLLBACK-RUNBOOK.md](POST-DEPLOY-ROLLBACK-RUNBOOK.md)
- [VERSIONING.md](VERSIONING.md)
- [ENVIRONMENT-LANGUAGE.md](ENVIRONMENT-LANGUAGE.md)
- [`docs/architecture/environment-surface-matrix.md`](../../../docs/architecture/environment-surface-matrix.md)
