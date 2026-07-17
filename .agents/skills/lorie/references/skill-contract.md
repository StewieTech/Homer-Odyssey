# Lorie Governance Review portable contract

- Package: `skill:lorie@1.1.0`
- Portable capabilities requested: filesystem.read, repository.inspect
- Validation declarations: package-eval, target-governance-boundary, evidence-currency

## Repository-owned inputs

- `GOVERNANCE_BOUNDARY` (required): Explicit target-owned gate requiring review
- `GOVERNANCE_EVIDENCE` (required): Target-owned evidence portfolio and current gate state
- `HUMAN_DECISION_OWNER` (required): Target-owned final authority

## Declared outputs

- `governance-recommendation`
- `human-decision-packet`
- `gate-evidence-board`
- `durable-memory-proposal`

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
