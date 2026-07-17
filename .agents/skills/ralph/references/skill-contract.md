# Ralph Bounded Execution portable contract

- Package: `skill:ralph@1.1.0`
- Portable capabilities requested: filesystem.read, filesystem.write, github.write, tests.run
- Validation declarations: package-eval, target-branch-freshness, target-validation

## Repository-owned inputs

- `ACCEPTED_ISSUE` (required): One decision-complete executable scope
- `TARGET_REPOSITORY` (required): Target-owned repository identity
- `TARGET_BASE_BRANCH` (required): Target-owned base branch
- `ISSUE_TRACKER` (required): Target-owned work and review surface
- `VALIDATION_COMMANDS` (required): Target-owned validation command set

## Declared outputs

- `reviewable-change`
- `validation-packet`
- `freshness-evidence`
- `rollback-plan`

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
