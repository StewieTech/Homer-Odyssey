# CLI

`homer inspect`, `homer plan`, `homer diff`, `homer apply`, `homer verify`, `homer rollback`, and `homer run` accept `--source`, `--target`, and `--profile`, or `--config <homer.yaml>`. `run` additionally requires `--request <odyssey-operation-request.json>`. Bundled profiles are `studio`, `restricted`, and `pariss`. Output is stable, pretty-printed JSON on standard output; diagnostics use standard error.

## Promotion commands

```text
homer promote inspect --source <pariss-root> [--package-filters <id,...>]
homer promote plan --source <pariss-root> [--package-filters <id,...>] [--review <draft-plan.json>] [--accept]
homer promote apply --source <pariss-root> --plan <promotion-plan.json>
homer promote verify --source <pariss-root> [--package-filters <id,...>]
```

Filters are trigger scope; Homer always resolves and validates the complete dependency closure. Inspect and plan are read-only. Plan discovery covers the full governed Pariss skill/Character OS trees, so new helpers cannot hide outside old provenance paths. Draft proposals include exact content, source and destination fingerprints, reviewer decision reasons, and computed capability/dependency/reference/version/catalog/eval deltas. Edit the draft as needed, then pass it with `--review ... --accept`; Homer recomputes hashes and refuses stale review input. Apply materializes only the accepted payload, rejects classified unsafe/nonportable content, runs required package evals, advances provenance only after candidate verification, regenerates the catalog, and verifies parity. Any failure restores package, descriptor, overlay, and generated-catalog state.

## Catalog commands

```text
homer catalog render [--source <homer-root>] [--dry-run]
homer catalog verify [--source <homer-root>]
```

Render owns only the six package-backed native skill roots and preserves unrelated catalog skills. Verify exits `18` when package hashes and checked-in output differ.

## Target-aware installer

```text
homer install --target <target-root> --profile <target-profile-path> --init-target
homer install --target <target-root> --profile <target-profile-path> [--dry-run]
homer install --target <target-root> --profile <target-profile-path> --verify
homer install --target <target-root> --profile <target-profile-path> --rollback [--dry-run]
```

The profile path is resolved inside the target and is reread and schema-validated on every normal run. `--init-target` writes only a safe-deny profile and ADR, never overwrites either, installs no skills, returns `policy-review-required`, and prints the exact follow-up command. `--dry-run` returns the exact write/removal set. `--verify` reports drift without repair. Rollback uses only the installer lock and refuses generated drift.

POSIX GitHub-ref invocation:

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> \
  homer install \
  --target . \
  --profile .homer/profiles/studio.json
```

PowerShell:

```powershell
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json
```

The read-only commands never create, update, or delete files under the source or target root. Apply requires a current plan emitted with `homer plan --accept`; `--dry-run` previews its exact write set. Apply writes only profile-managed paths and the profile's declared lockfile. Rollback reads the lockfile backup packet and restores only previously managed content.

An accepted plan is not a blanket authorization. At apply time Homer rebuilds the inventory and plan and rejects stale IDs, source changes, target changes, dependency conflicts, profile incompatibility, denied privileges, failed package evaluations, unsafe transitive content, protected paths, and unmanaged customizations. Reapplying an unchanged projection is idempotent and preserves the existing lockfile byte-for-byte.

`verify` rechecks contract validity, dependencies and declared references, capability policy, package evaluations, generated-file hashes, source integrity, and privilege changes. It reports drift without repairing it.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | Success |
| 2 | Invalid command or arguments |
| 10 | Invalid target declaration, profile, or contract |
| 11 | Missing referenced file or package dependency |
| 12 | A planned path conflicts with a protected path |
| 13 | A requested capability is denied by the target profile |
| 14 | A target customization exists inside a managed path |
| 15 | Apply plan is missing, unaccepted, or stale |
| 16 | Transitive security sanitization or profile policy failed |
| 17 | A package evaluation failed |
| 18 | Generated output, source input, or lockfile drift was detected |
| 19 | Rollback ownership validation failed |
| 20 | Target policy/ADR was initialized; policy review is required before installation |
| 70 | Unexpected internal failure or read-only invariant violation |

Profile validation and policy failures are fail-closed. `diff` returns the same policy exit as `plan` because it is a view of that plan, not a bypass.

`run` maps the compatibility commands into a structured `OdysseyOperationResponse`. Read-only operations fingerprint both roots before and after execution. Mutating operations require a fresh accepted plan and an exclusive repository/profile lease. Programmatic branch and pull-request operations use an injected repository adapter; the local CLI therefore fails closed if no authorized adapter is present.

`plan` and `diff` accept `--package-filters <id,...>`. Filters are retained in plan identity as trigger scope; Homer still resolves and validates the complete dependency-closed profile projection.
