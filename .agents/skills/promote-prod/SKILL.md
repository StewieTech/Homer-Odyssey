---
name: promote-prod
description: Promote your product frontend and backend to production with deterministic runtime resource discovery and cache invalidation
when_to_use: Use when releasing to <production-domain> so promotion follows strict gates, runtime CloudFront lookup, Lambda alias update, release tagging, and branch push in one repeatable flow.
---

# Promote to Prod Skill

## Overview

This skill runs a deterministic production release for your product across backend and frontend.

It uses runtime discovery (no hardcoded prod IDs), invalidates CloudFront cache, updates a release alias, tags the release, and pushes the release branch.

## Main Command

```bash
npm run promote:prod
```

Equivalent direct call:

```bash
pwsh -ExecutionPolicy Bypass -File scripts/promote-prod.ps1
```

## What Happens

1. **Strict gate** (unless `-Force`):
   - clean git working tree
   - current branch = `<base-branch>` (your working branch)
   - local `<base-branch>` is not behind `origin/<base-branch>`
   - `origin/<release-branch>` is an ancestor of `origin/<base-branch>` (prevents losing release-branch-only commits)
2. **Staging candidate tuple gate**:
   - reads `artifacts/release-tuples/staging/release-tuple.json` unless `-StagingReleaseTuplePath` is provided
   - fails before mutation unless the staging tuple environment is `staging`
   - requires staging frontend, API CORS, and chat availability gates to have run and passed
   - builds the production tuple from the same staging version/build/git SHA/update id
3. **Validation** (unless skipped):
   - `npm test`
   - `npm run build`
   - `npm run build --prefix <frontend-app-dir>`
4. **Pre-mutation availability gate** (unless break-glass bypass is explicitly requested):
   - `npm run check:cors-contract`
   - production-lane preflight probe (`/auth/guest`) using matrix-driven lane expectations
   - fails closed before any backend/frontend production mutation if compatibility evidence is missing or failing
5. **Backend promote** via `scripts/promote-full.ps1 -TargetEnv prod`:
   - optional serverless redeploy (`-RedeployBackend`)
   - publish Lambda version
   - create/update alias (default `prod`)
6. **Frontend promote** via `<frontend-app-dir>/scripts/promote.ps1 -Env prod`:
   - build and sync to `s3://<prod-frontend-bucket>`
   - resolve CloudFront distribution by alias `<production-domain>`
   - invalidate `/*`
7. **Post-deploy availability telemetry** (unless explicitly skipped):
   - runs `scripts/check-postdeploy-availability.js`
   - captures health, auth/CORS, separate bearer-token and browser-cookie guest auth bootstrap, authenticated `/me`, chat, and frontend shell reachability
   - links all findings to release identity tuple for incident attribution
   - writes report artifacts under `artifacts/postdeploy`
8. **Git sync and release outputs**:
   - checkout `<release-branch>`
   - fast-forward pull from `origin/<release-branch>`
   - merge `<base-branch>` into `<release-branch>` with `--no-ff` (preserves branch history)
   - create tag: `release/YYYY-MM-DD-HHmm` on the merge commit
   - push `<release-branch>`, the tag, and `<base-branch>`
   - return to `<base-branch>` (even on failure)

## Deterministic Guarantees

- No hardcoded production CloudFront distribution IDs.
- Runtime lookup fails loudly if alias lookup returns 0 or multiple distributions.
- Default source branch is `<base-branch>`; default release branch is `<release-branch>`.
- Script automatically merges `<base-branch>` into `<release-branch>` with `--no-ff` and returns you to `<base-branch>`.
- `-DryRun` exits successfully with no side effects.

## Parameters

`scripts/promote-prod.ps1` supports:

- `-DryRun`
- `-Force`
- `-RedeployBackend`
- `-SkipTests`
- `-SkipBuild`
- `-SkipProductionCorsCheck` (legacy alias for break-glass availability-gate bypass; audit reason still required)
- `-BreakGlassSkipAvailabilityGate` (incident-only bypass)
- `-BreakGlassReason "INC-1234: <reason>"` (required when break-glass bypass is used outside `-DryRun`)
- `-SkipPostDeployAvailabilityCheck` (incident-only or recovery-only usage; report gap must be documented)
- `-PostDeployFrontendUrl` (default `https://<production-domain>/`)
- `-PostDeployApiBaseUrl` (override production API base when env file lookup is not desired)
- `-StagingReleaseTuplePath` (override source candidate tuple path for controlled recovery/testing)
- `-SourceBranch` (default `<base-branch>`)
- `-ReleaseBranch` (default `<release-branch>`)
- `-TagPrefix` (default `release`)
- `-Region` (default `ca-central-1`)
- `-AwsProfile` (default `<aws-profile>`)
- `-LambdaAlias` (default `prod`)
- `-ProdDomainAlias` (default `<production-domain>`)

## Verification

After a live run:

```bash
curl -I https://<production-domain>/
```

Expect:
- HTTP 200
- `x-cache: Miss from cloudfront` shortly after invalidation, then `Hit`

Check backend alias:

```bash
aws lambda get-alias --function-name <lambda-function-name> --name prod --region ca-central-1
```

Check pushed tag:

```bash
git ls-remote --tags origin
```

## Rollback Notes

This workflow does not perform automatic rollback.

Manual rollback options:
- move Lambda alias `prod` back to prior version
- restore prior frontend snapshot to `s3://<prod-frontend-bucket>`
- invalidate CloudFront again
- follow trigger/action mapping in `.agents/skills/improve-cicd-pipeline/POST-DEPLOY-ROLLBACK-RUNBOOK.md`

If break-glass bypass is used:
- record `BreakGlassReason` and incident/ticket id in release notes
- include who approved the bypass and when

## Related Files

- `scripts/promote-prod.ps1`
- `scripts/promote-full.ps1`
- `<frontend-app-dir>/scripts/promote.ps1`
- `.windsurf/workflows/promote-prod.md`
- `.windsurf/workflows/promote-pre.md`
