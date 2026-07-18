---
name: mirror-prod-to-pre
description: Mirror production frontend content to <preprod-domain> (rolling pre-prod snapshot)
when_to_use: Use when you need to create or update a byte-for-byte mirror of the production frontend at https://<preprod-domain>. This is typically done after promoting to production to maintain a pre-prod snapshot.
---

# Mirror PROD to Pre-Prod Skill

## Overview

This skill creates and maintains a pre-production frontend endpoint at `https://<preprod-domain>` that mirrors the current production content from `https://<production-domain>`.

## When to Use

- **First-time setup**: Creating the pre-prod infrastructure (S3 bucket, CloudFront distribution, Route53 record)
- **After prod promote**: Syncing the latest prod content to pre-prod to keep the snapshot current
- **Rollback testing**: Testing a previous prod version by syncing from an earlier snapshot

## Prerequisites

- AWS CLI configured with appropriate credentials
- Route53 hosted zone for `<production-domain>` exists in the same AWS account
- ACM wildcard certificate `*.<production-domain>` exists in `us-east-1`
- PowerShell available (script is `.ps1`)

## First-Time Setup

Run the full provisioning script:

```bash
pwsh -ExecutionPolicy Bypass -File scripts/mirror-prod-to-pre.ps1
```

This creates:
- S3 bucket `<preprod-frontend-bucket>` in `ca-central-1`
- CloudFront distribution with alias `<preprod-domain>`
- Route53 A-ALIAS record `<preprod-domain>` -> CloudFront distribution
- OAC (Origin Access Control) for secure S3 access
- Bucket policy allowing CloudFront OAC access
- Initial content sync from `s3://<prod-frontend-bucket>`

## Recurring Sync

After each production promotion, run sync-only mode:

```bash
pwsh -ExecutionPolicy Bypass -File scripts/mirror-prod-to-pre.ps1 -SyncOnly
```

This:
- Syncs content from `s3://<prod-frontend-bucket>` to `s3://<preprod-frontend-bucket>` with `--delete` flag
- Creates CloudFront invalidation `/*` on the pre-prod distribution
- Does NOT modify infrastructure (idempotent)

## Safety Guards

The script has built-in guards:
- Refuses to operate on buckets: `<prod-frontend-bucket>`, `<preprod-frontend-bucket>`, `<dev-frontend-bucket>`
- Refuses to operate on any bucket matching pattern `<preprod-bucket-pattern>`
- Idempotent: re-running with no changes performs only sync + invalidation
- Detects existing distributions and reuses them (waits for deployment if in progress)

## Verification

After sync, verify the endpoint:

```bash
curl -I https://<preprod-domain>/
```

Expected:
- HTTP 200 response
- `x-cache: Hit/Miss from cloudfront` header
- Same HTML content as `https://<production-domain>/`

Compare content hash:

```bash
# Get prod index.html
curl -s https://<production-domain>/ | Get-FileHash -Algorithm MD5

# Get pre-prod index.html
curl -s https://<preprod-domain>/ | Get-FileHash -Algorithm MD5
```

Hashes should match.

## Cost Considerations

Running this infrastructure incurs:
- S3 storage costs (duplicate of prod content)
- CloudFront distribution costs (separate from prod)
- Route53 query costs (minimal)

Actual cost depends on asset volume, invalidation frequency, and traffic.

## Rollback

If you need to rollback pre-prod to an earlier state:
1. Restore the desired prod snapshot to `s3://<prod-frontend-bucket>` (or use a different sync source)
2. Run the sync-only script again
3. CloudFront invalidation will propagate the change

## Important Notes

- The pre-prod endpoint serves the **same API URL** as prod (because we mirror exact prod bytes). This is by design for true prod mirroring.
- PWA service workers are cached aggressively; users who previously visited the pre-prod domain may need a hard refresh.
- CloudFront propagation can take 1-2 minutes for DNS and 5-10 minutes for cache invalidation.
- The script should reuse the production distribution's cache policy settings and SPA error-response behavior where applicable.

## Troubleshooting

**Distribution already exists with alias**: The script will detect and reuse the existing distribution. It will wait for deployment if in progress.

**CNAMEAlreadyExists error**: A distribution already uses the `<preprod-domain>` alias. Check existing distributions and delete or disable the conflicting one:
```bash
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '<preprod-domain>')]"
```

**OAC deletion fails**: OAC requires If-Match header. If you need to clean up, disable the distribution first, wait for deployment, then delete.

**Route53 record already exists**: The script uses UPSERT, so it will update the existing record.

## Script Parameters

The script accepts these parameters (all have sensible defaults):

- `-SyncOnly`: Skip infrastructure provisioning, only sync content and invalidate
- `-Region`: AWS region (default: `ca-central-1`)
- `-ProdBucket`: Prod bucket name (default: `<prod-frontend-bucket>`)
- `-PreBucket`: Pre-prod bucket name (default: `<preprod-frontend-bucket>`)
- `-PreDomain`: Pre-prod domain (default: `<preprod-domain>`)
- `-ProdDistributionId`: Prod distribution ID (default: `<prod-distribution-id>`)
- `-HostedZoneId`: Route53 hosted zone ID (default: `<hosted-zone-id>`)
- `-WildcardCertArn`: ACM wildcard cert ARN (default: `<wildcard-cert-arn>`)
- `-CacheDir`: Cache directory for distribution metadata (default: `.cache`)

## Related Files

- `scripts/mirror-prod-to-pre.ps1`: Main provisioning script
- `.windsurf/workflows/promote-pre.md`: Workflow documentation
- `.cache/pre-distribution.json`: Cached distribution metadata (auto-generated)
