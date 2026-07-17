# Marge Product Architect portable contract

- Package: `skill:marge-product-architect@1.1.0`
- Portable capabilities requested: filesystem.read, repository.inspect, repository.plan
- Validation declarations: package-eval, target-goal-harness, target-routing-policy

## Repository-owned inputs

- `GOAL_HARNESS` (required): Target-owned goal and scoring contract
- `TARGET_ROUTING` (required): Target-owned planning, execution, and governance routes
- `EXECUTION_POLICY` (required): Target-owned run modes, caps, profiles, and human gates

## Declared outputs

- `architecture-scorecard`
- `routing-packet`
- `human-decision-packet`
- `teacher-synthesis-candidates`

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
