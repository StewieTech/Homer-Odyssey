# ToolsCLI Agent Skills

[![skills.sh](https://skills.sh/b/StewieTech/ToolsCLI)](https://skills.sh/StewieTech/ToolsCLI)

Generalized agent skills extracted from the Pariss workflow stack and cleaned up for public reuse.

These skills are meant to be small, composable, and practical. Some are broadly reusable out of the box. Others are intentionally template-like and use placeholders such as `<base-branch>`, `<release-branch>`, `<production-domain>`, and `<frontend-app-dir>` so you can adapt them to your own repo and release flow.

## Quickstart

1. Run the installer:

```bash
npx skills@latest add StewieTech/ToolsCLI
```

2. Pick the skills you want and the coding agents you want to install them on.

3. If you install planning or issue-tracker skills, also install and run `/setup-agent-skills` once per repo. It configures:
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

## Notes

- `afk-architecture-issue-factory` is a legacy compatibility alias for `architecture-issue-factory`.
- This repo focuses on the generalized Pariss-derived skills. If you also want Matt Pocock's baseline catalog such as `diagnose`, `tdd`, `prototype`, `handoff`, `write-a-skill`, or `zoom-out`, install [mattpocock/skills](https://github.com/mattpocock/skills) alongside this repo.
- The repo has been validated with the `skills` installer locally using `npx skills add ... --list` semantics before publish.
