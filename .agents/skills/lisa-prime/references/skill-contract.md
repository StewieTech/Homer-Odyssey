# Lisa Prime Evidence Analyst portable contract

- Package: `skill:lisa-prime@1.1.0`
- Portable capabilities requested: filesystem.read, repository.inspect, tests.run
- Validation declarations: package-eval, target-dedupe-check

## Repository-owned inputs

- `ISSUE_TRACKER` (required): Target-owned issue and dedupe surface
- `EVIDENCE_POLICY` (required): Target-owned evidence retention and privacy contract

## Declared outputs

- `reproduction-packet`
- `evidence-lock-packet`
- `lane-recommendation`

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
