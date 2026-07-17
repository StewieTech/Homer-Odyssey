# Lisa Evidence Runner portable contract

- Package: `skill:lisa@1.1.0`
- Portable capabilities requested: filesystem.read, tests.run
- Validation declarations: package-eval, target-evidence-policy

## Repository-owned inputs

- `QA_SCENARIOS` (required): Target-owned scenario catalog
- `EVIDENCE_POLICY` (required): Target-owned privacy and artifact rules

## Declared outputs

- `actor-evidence`
- `evaluator-verdict`
- `routing-packet`

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
