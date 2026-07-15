# Recurring Odyssey operations

Homer exposes recurring synchronization as a local, versioned operation contract. It is not a hosted service. A caller supplies a source checkout, a target checkout, an Odyssey target declaration or explicit roots, and a schema-valid request. The caller persists the response and run history.

## Operations

| Operation | Mutation | Terminal state | Typical next action |
| --- | --- | --- | --- |
| `inspect` | none | `inspection_ready` | check drift or plan |
| `check-drift` | none | `no_drift` or `drift_detected` | plan if drift exists |
| `plan` | none | `plan_ready` | human acceptance |
| `create-update-branch` | repository adapter | `branch_created` | apply exact plan |
| `apply-plan` | managed projection only | `applied` | verify |
| `verify` | none | `verified` or `failed` | open a draft PR when verified |
| `open-pr` | repository adapter | `pr_created` | human review |
| `rollback-plan` | none | `rollback_ready` | open a separately reviewed draft PR |

Read-only operations fingerprint both roots before and after execution. Apply continues to write only profile-managed paths and the declared lockfile. Rollback planning previews the lock-owned restoration and never performs a direct reset.

## Safety model

- Idempotency keys replay a compatible prior result and reject incompatible reuse.
- A repository/profile mutation lease prevents overlapping branch, apply, or pull-request operations.
- Accepted plans are re-derived before mutation. Stale reasons distinguish source/overlay, target ref, target lock or managed files, profile/policy, privilege calculation, declaration, inventory, plan identity, and conflicting pull-request changes.
- Branches are deterministic and must differ from the target and default branches.
- Pull requests are draft-only. Neither the operation schema nor repository adapter defines a merge operation.
- The workflow boundary requires the server-owned `HOMER_ALLOWED_TARGETS` repository variable. Optional `HOMER_ALLOWED_PROFILES` and `HOMER_ALLOWED_REFS` variables narrow the bundled-profile and safe-ref defaults further. Package filters must resolve to the checked-out Homer catalog. Credential selection remains an operator-owned secret configuration step.
- Structured artifacts contain plans and evidence, never credentials. Workflows do not echo token values.

## Reusable workflows

Four manual/reusable workflows live in `.github/workflows/`:

- `homer-check-drift.yml`
- `homer-plan-odyssey.yml`
- `homer-create-update-pr.yml`
- `homer-verify-target.yml`

The read workflows use read permissions and upload the request and response as short-retention artifacts. The update workflow requires `HOMER_TARGET_TOKEN`, serializes by repository/profile, derives a fresh branch from the accepted plan ID, applies and verifies the exact plan, and opens only a draft pull request. It never pushes the target/default branch and never merges.

Package filters are validated, retained in plan identity, and used as auditable trigger scope. The resulting plan still resolves the profile's complete dependency-closed projection; a filter can narrow why a run starts, but cannot bypass required packages or policy checks.

The workflows are disconnected by default: an operator must configure the allowlist and an appropriately scoped target token before enabling writes. Scheduled and dependency-event triggers are intentionally deferred until the reusable manual contract has proven stable.
