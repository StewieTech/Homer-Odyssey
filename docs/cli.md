# Read-only CLI

`homer inspect`, `homer plan`, and `homer diff` accept `--source`, `--target`, and `--profile`, or `--config <homer.yaml>`. `--profile studio` resolves to the bundled Studio profile. Output is stable, pretty-printed JSON on standard output; diagnostics use standard error.

The read-only commands never create, update, or delete files under the source or target root. The CLI snapshots both roots before and after execution and returns an internal-error exit if that invariant is violated.

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
| 70 | Unexpected internal failure or read-only invariant violation |

Profile validation and policy failures are fail-closed. `diff` returns the same policy exit as `plan` because it is a view of that plan, not a bypass.
