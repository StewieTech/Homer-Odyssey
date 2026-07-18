# Homer Odyssey Skills Catalog

## Canonical character workflows

These six entries are rendered from canonical packages and verified by package/version/hash parity. Do not edit their `.agents/skills/**` files by hand; update the package or generic overlay and run `homer catalog render`.

- `lisa`: Evidence-running QA with strict actor/evaluator separation.
- `lisa-prime`: Reproduction, evidence-lock diagnosis, dedupe, and issue shaping.
- `marge-product-architect`: Goal-harness product architecture and execution routing.
- `ralph`: One-issue, one-branch, one-pull-request bounded implementation.
- `ralph-prime`: Ambiguity, novelty, and risk escalation before execution.
- `lorie`: Launch-governance review and protected human decision boundaries.

They can be installed generically with:

```bash
npx skills@latest add StewieTech/Homer-Odyssey
```

The generated files contain neutral Homer package coordinates, not Pariss or Max authority. `.homer-catalog.json` records the complete dependency closure, package versions and hashes, adapter/template hashes, and rendered source hash. CI runs `homer catalog verify` so relevant package drift cannot be merged without regeneration.

## Planning and execution

- `implement-change`: Execute a scoped backlog item while preserving repo conventions and validation discipline.
- `plan-task-handoff`: Build a decision-complete implementation handoff before coding.
- `vertical-slice`: Plan and deliver the smallest validated end-to-end slice first.
- `to-prd`: Turn the current conversation into a PRD on your issue tracker.
- `to-issues`: Break a plan or PRD into independently grabbable execution issues.
- `triage`: Move issues through a label-driven triage state machine.
- `setup-agent-skills`: Configure issue-tracker, triage-label, and domain-doc assumptions for the repo.

## Architecture and documentation

- `grill-with-docs`: Stress-test a plan against the domain model and update docs inline.
- `improve-codebase-architecture`: Find deeper refactoring and module-shaping opportunities.
- `architecture-issue-factory`: Convert architecture findings into deduped backlog artifacts.
- `afk-architecture-issue-factory`: Legacy alias for `architecture-issue-factory`.

## Security

- `improve-security-architecture`: Run report-first security architecture reviews.
- `security-issue-factory`: Convert high-confidence security findings into sanitized issues.

## UI, UX, and product review

- `improve-ui-ux`: Review and improve product experience, interaction design, and polish.
- `improve-ui-ux-super`: Run screenshot-grounded UI/UX planning with evidence capture and routing.
- `learning-loop-qa`: Evaluate first-value and feedback loops with persona-driven QA.
- `ui-ux-issue-factory`: Turn evidence-backed design findings into implementation-ready issues.

## Release engineering

- `improve-cicd-pipeline`: Review and improve release workflow, promotion language, and CI/CD governance.
- `promote-prod`: Template skill for deterministic production promotion workflows.
- `mirror-prod-to-pre`: Template skill for mirroring production frontend content into a pre-production surface.
- `release-issue-factory`: Turn release-engineering findings into backlog artifacts without deploying.

## Ralph workflow lanes

- `ralph`: Run Ralph loops for issue execution and backlog flow.
- `ralph-prime`: Escalation-first planning and lane routing.
- `ralph-fixer`: Repair the current PR when validation or merge mechanics fail.
- `ralph-sequential-merge`: Run one-issue-at-a-time Ralph execution on an explicit issue list.

The package-backed `ralph` and `ralph-prime` entries above are the canonical generated versions. Related fixer/sequential skills remain independently generalized catalog entries.

## Utility and integration

- `teach`: Teach a concept or skill inside the workspace.
- `integration-javascript_node`: Reference skill for PostHog integration in server-side Node.js apps.

## Adaptation Notes

- Some skills are immediately reusable.
- Some are templates and intentionally include placeholders like `<base-branch>` or `<production-domain>`.
- Release and infrastructure skills usually need the most adaptation because they encode workflow shape as much as behavior.
