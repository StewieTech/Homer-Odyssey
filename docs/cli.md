# CLI

`homer inspect`, `homer plan`, `homer diff`, `homer apply`, `homer verify`, `homer rollback`, and `homer run` accept `--source`, `--target`, and `--profile`, or `--config <homer.yaml>`. `run` additionally requires `--request <odyssey-operation-request.json>`. Bundled profiles are `studio`, `restricted`, and `pariss`. Output is stable, pretty-printed JSON on standard output; diagnostics use standard error.

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
| 70 | Unexpected internal failure or read-only invariant violation |

Profile validation and policy failures are fail-closed. `diff` returns the same policy exit as `plan` because it is a view of that plan, not a bypass.

`run` maps the compatibility commands into a structured `OdysseyOperationResponse`. Read-only operations fingerprint both roots before and after execution. Mutating operations require a fresh accepted plan and an exclusive repository/profile lease. Programmatic branch and pull-request operations use an injected repository adapter; the local CLI therefore fails closed if no authorized adapter is present.

`plan` and `diff` accept `--package-filters <id,...>`. Filters are retained in plan identity as trigger scope; Homer still resolves and validates the complete dependency-closed profile projection.
