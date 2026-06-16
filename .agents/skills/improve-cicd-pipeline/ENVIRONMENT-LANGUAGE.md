# Environment Language

Canonical release language for your product.
Use these terms consistently in docs, scripts, PRs, and automation.
Runtime lane contract source of truth: `docs/architecture/environment-surface-matrix.json`.

## Canonical Terms

| Term | Meaning | Do not use it as |
|---|---|---|
| `local` | Developer machine / Expo Go / simulator / localhost | A deployed shared environment |
| `development` | Shared unstable deployed sandbox | `staging` |
| `staging` | Production-like release candidate environment | `development` or random preview |
| `production` | Real user-facing environment | Anything experimental |
| `preview` | Internal or PR preview (usually EAS/web preview) | A synonym for `staging` unless documented |

## Repo-specific Mappings

| Token | Meaning |
|---|---|
| `<base-branch>` | Integration/source branch. It is not an environment name. |
| `<release-branch>` | Production release branch in current promote scripts. |
| `pre` | Production mirror snapshot surface (`<preprod-domain>`), not a release-candidate lane. |
| `preprod` | Legacy alias for `pre`; normalize to `pre` in current docs/scripts. |

## Deployed Secret Namespaces

| CLI stage | Canonical lane | SSM namespace |
|---|---|---|
| `dev` | `development` | `/<ssm-namespace-prefix>/development/*` |
| `staging` | `staging` | `/<ssm-namespace-prefix>/staging/*` |
| `prod` | `production` | `/<ssm-namespace-prefix>/prod/*` |

The development lane must not read `/<ssm-namespace-prefix>/staging/*`; staging is the production-like candidate lane and needs isolated candidate configuration.

## Usage Rules

- In code/docs, prefer full terms: `development`, `staging`, `production`.
- Use `dev` and `prod` only as shorthand in CLI/script flags.
- If legacy text says `preprod` as an RC environment, treat it as outdated language and correct it.
- Do not invent new environment names without a documented definition and owner.
- Keep lane metadata (origins, API base expectation, auth/header expectations) aligned with `docs/architecture/environment-surface-matrix.json`.
