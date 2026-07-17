# Ralph Prime Planning portable contract

- Package: `skill:ralph-prime@1.1.0`
- Portable capabilities requested: filesystem.read, repository.inspect, repository.plan
- Validation declarations: package-eval, target-planning-gates

## Repository-owned inputs

- `ISSUE_CONTEXT` (required): Bounded work request and evidence
- `TARGET_ROUTING` (required): Target-owned execution, planning, and human lanes

## Declared outputs

- `decision-complete-plan`
- `execution-route`
- `human-decision-packet`
- `durable-learning-candidates`

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
