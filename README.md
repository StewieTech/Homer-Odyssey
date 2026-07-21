# Homer Odyssey — Agent Portability Control Plane

[![skills.sh](https://skills.sh/b/StewieTech/Homer-Odyssey)](https://skills.sh/StewieTech/Homer-Odyssey)

Homer Odyssey is the canonical portability and installation layer for governed character workflows. Pariss is the incubator: its skills can evolve quickly, while Homer detects provenance drift, requires an explicit promotion plan, separates portable core from overlays and target variables, rejects unsafe content, renders a repository-neutral skill catalog, and installs target-aware native Codex skills under target-owned policy.

The generalized agent skills and the legacy `j2puml` and `rct` utilities remain available in their existing locations.

These skills are meant to be small, composable, and practical. Some are broadly reusable out of the box. Others are intentionally template-like and use placeholders such as `<base-branch>`, `<release-branch>`, `<production-domain>`, and `<frontend-app-dir>` so you can adapt them to your own repo and release flow.

## Quickstart

1. Clone and link the CLI with Node.js 20 or newer:

```bash
git clone https://github.com/StewieTech/Homer-Odyssey.git
cd Homer-Odyssey
npm link
homer --help
```

2. To install the generalized, repository-neutral agent-skill catalog, run:

```bash
npx skills@latest add StewieTech/Homer-Odyssey
```

3. Pick the skills you want and the coding agents you want to install them on.

The package-backed native catalog includes exact invocations for:

```text
$lisa
$lisa-prime
$marge-product-architect
$ralph
$ralph-prime
$lorie
```

Natural-language routing such as “Use Lisa” or “Use Marge” remains a responsibility of the target repository's `AGENTS.md`.

4. For a governed target-aware installation, initialize target policy first. Initialization writes a safe-deny profile and ADR, installs no skills, and exits with `policy-review-required`:

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --init-target
```

PowerShell:

```powershell
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --init-target
```

After reviewing the executable profile and target-owned ADR, install and verify:

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --verify
```

The future npm form remains:

```bash
npx --yes @stewietech/homer-odyssey install --target . --profile .homer/profiles/studio.json
```

5. If you install planning or issue-tracker skills, also install and run `/setup-agent-skills` once per repo. It configures:
   - your issue tracker
   - your triage label vocabulary
   - your domain-doc layout

## Skill Families

- **Planning and execution**: `implement-change`, `plan-task-handoff`, `vertical-slice`, `to-prd`, `to-issues`, `triage`
- **Architecture and documentation**: `grill-with-docs`, `improve-codebase-architecture`, `architecture-issue-factory`
- **Security**: `improve-security-architecture`, `security-issue-factory`
- **UI/UX and product review**: `improve-ui-ux`, `improve-ui-ux-super`, `learning-loop-qa`, `ui-ux-issue-factory`
- **Release engineering**: `improve-cicd-pipeline`, `promote-prod`, `mirror-prod-to-pre`, `release-issue-factory`
- **Ralph workflow lanes**: `ralph`, `ralph-prime`, `ralph-fixer`, `ralph-sequential-merge`
- **Utility and integration**: `teach`, `integration-javascript_node`

The full catalog is in [docs/skills-catalog.md](./docs/skills-catalog.md).

## Promotion and catalog governance

Inspect current Pariss drift, create an accepted plan, apply it, and verify package/catalog parity:

```bash
homer promote inspect --source ../Pariss --package-filters lisa,marge-product-architect
homer promote plan --source ../Pariss --package-filters lisa,marge-product-architect > promotion-draft.json
# Review/edit classifications, destinations, and exact payloads in promotion-draft.json.
homer promote plan --source ../Pariss --package-filters lisa,marge-product-architect --review promotion-draft.json --accept > promotion-plan.json
homer promote apply --source ../Pariss --plan promotion-plan.json
homer promote verify --source ../Pariss
homer catalog render
homer catalog verify
```

Promotion is never a directory copy. Homer discovers the complete governed source trees, including newly added files. Every changed source file is classified as `portable-core`, `pariss-overlay`, `studio-overlay-candidate`, `target-variable`, `rejected-unsafe`, `rejected-nonportable`, or `unchanged`. A reviewer may edit classifications, destinations, decision reasons, and exact content in the draft; `--review ... --accept` rebuilds a fresh, hash-bound accepted plan. Apply writes only that embedded payload, executes required package evals, regenerates and verifies the catalog, and advances provenance only after successful candidate verification.

## Odyssey Runs

Use explicit roots:

```bash
homer inspect --source ../Pariss --target ../MaxCharacterWork --profile studio
homer plan --source ../Pariss --target ../MaxCharacterWork --profile studio
homer diff --source ../Pariss --target ../MaxCharacterWork --profile studio
```

Or copy [`homer.example.yaml`](./homer.example.yaml), update its relative roots, and pass `--config`:

```bash
homer plan --config ./homer.yaml
```

Accept a reviewed plan, preview it, apply it, and verify the projection:

```bash
homer plan --config ./homer.yaml --accept > odyssey-plan.json
homer apply --config ./homer.yaml --plan odyssey-plan.json --dry-run
homer apply --config ./homer.yaml --plan odyssey-plan.json
homer verify --config ./homer.yaml
```

`inspect`, `plan`, and `diff` never write into the source or target roots. `apply` and `rollback` can change only generated paths owned by the selected profile and its lockfile. See [package and projection model](./docs/package-system.md), [CLI behavior](./docs/cli.md), [contract ownership](./docs/contracts.md), and the [old-name compatibility note](./docs/toolscli-compatibility.md).

The first-party installer uses a disjoint `.homer/generated/install/**` evidence namespace and exact profile-declared `.agents/skills/<name>/**` child roots. It never weakens protection for the rest of `.agents/**`, never overwrites an unmanaged same-name skill, and never treats portable text as target authority. See [end-to-end lifecycle](./docs/end-to-end-character-lifecycle.md) and [target-aware installation](./docs/target-aware-installation.md).

Recurring callers use the same engine through a versioned operation envelope:

```bash
homer run --request odyssey-operation-request.json --config ./homer.yaml
```

The request supports `inspect`, `check-drift`, `plan`, `create-update-branch`, `apply-plan`, `verify`, `open-pr`, and `rollback-plan`. Repository mutations require a fresh accepted plan and a target/profile lease. Homer exposes draft-pull-request orchestration but intentionally exposes no merge operation. Registered stable-package events and weekly checks use the same read-only `check-drift` contract through a bounded dedupe layer; they never create an update branch or pull request automatically. See [recurring operations and workflows](./docs/recurring-operations.md).

## Notes

- `afk-architecture-issue-factory` is a legacy compatibility alias for `architecture-issue-factory`.
- This repo focuses on the generalized Pariss-derived skills. If you also want Matt Pocock's baseline catalog such as `diagnose`, `tdd`, `prototype`, `handoff`, `write-a-skill`, or `zoom-out`, install [mattpocock/skills](https://github.com/mattpocock/skills) alongside this repo.
- The repo has been validated with the `skills` installer locally using `npx skills add ... --list` semantics before publish.
