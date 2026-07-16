# Homer Odyssey — Agent Portability Control Plane

[![skills.sh](https://skills.sh/b/StewieTech/Homer-Odyssey)](https://skills.sh/StewieTech/Homer-Odyssey)

Homer Odyssey inventories, plans, applies, and verifies governed character and skill projections across repositories. Read-only commands describe a Pariss-to-Studio Odyssey Run; the write path requires an explicitly accepted, current plan and is confined to profile-managed paths.

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

2. To install the generalized agent-skill catalog, run:

```bash
npx skills@latest add StewieTech/Homer-Odyssey
```

3. Pick the skills you want and the coding agents you want to install them on.

4. If you install planning or issue-tracker skills, also install and run `/setup-agent-skills` once per repo. It configures:
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

Recurring callers use the same engine through a versioned operation envelope:

```bash
homer run --request odyssey-operation-request.json --config ./homer.yaml
```

The request supports `inspect`, `check-drift`, `plan`, `create-update-branch`, `apply-plan`, `verify`, `open-pr`, and `rollback-plan`. Repository mutations require a fresh accepted plan and a target/profile lease. Homer exposes draft-pull-request orchestration but intentionally exposes no merge operation. See [recurring operations and workflows](./docs/recurring-operations.md).

## Notes

- `afk-architecture-issue-factory` is a legacy compatibility alias for `architecture-issue-factory`.
- This repo focuses on the generalized Pariss-derived skills. If you also want Matt Pocock's baseline catalog such as `diagnose`, `tdd`, `prototype`, `handoff`, `write-a-skill`, or `zoom-out`, install [mattpocock/skills](https://github.com/mattpocock/skills) alongside this repo.
- The repo has been validated with the `skills` installer locally using `npx skills add ... --list` semantics before publish.
