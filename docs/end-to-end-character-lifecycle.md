# End-to-end character lifecycle

## System roles

- **Pariss** is the incubator where character and workflow skills evolve.
- **Homer Odyssey** is the canonical portability layer. It owns reviewed portable packages, promotion provenance, generic catalog generation, target adapters, schemas, and validation.
- **Target repositories** own sanitization policy, repository identity, branch, vocabulary, canon, ADRs, overlays, validators, protected paths, approval gates, and local precedence.

## 1. Detect provenance drift

Fetch Pariss and Homer, then compare current Pariss files with the commit pinned by canonical package provenance:

```bash
homer promote inspect --source ../Pariss
```

Use `--package-filters` to narrow the trigger, not validation. The full dependency closure is always resolved.

## 2. Classify and review

Create a deterministic plan:

```bash
homer promote plan --source ../Pariss --package-filters lisa,lisa-prime,marge-product-architect,ralph,ralph-prime,lorie > promotion-plan.json
```

Every change receives exactly one classification:

1. `portable-core`
2. `pariss-overlay`
3. `studio-overlay-candidate`
4. `target-variable`
5. `rejected-unsafe`
6. `rejected-nonportable`
7. `unchanged`

Review changed source paths, destinations, variables, capabilities, dependencies, references, versions, catalog effects, rejection reasons, required evals, and fingerprints. Materialize reusable behavior in canonical core/helpers and repository behavior in overlays. Do not copy source directories.

After editing classifications, destinations, decision reasons, and exact proposed content in the draft, generate the fresh accepted plan:

```bash
homer promote plan --source ../Pariss --package-filters lisa,lisa-prime,marge-product-architect,ralph,ralph-prime,lorie --review promotion-plan.json --accept > accepted-promotion-plan.json
```

## 3. Apply and verify canonical packages

```bash
homer promote apply --source ../Pariss --plan accepted-promotion-plan.json
homer promote verify --source ../Pariss
```

Apply rejects stale source, provenance, or target fingerprints and any rejected content. Candidate package/reference validation runs before provenance advances. Catalog regeneration and parity verification are part of successful apply. Generated catalog files are never manually edited.

## 4. Publish the generic portable catalog

```bash
homer catalog render
homer catalog verify
npx skills@latest add StewieTech/Homer-Odyssey
```

This path is repository-neutral. It installs exact skills named `lisa`, `lisa-prime`, `marge-product-architect`, `ralph`, `ralph-prime`, and `lorie`, while preserving other generalized skills.

## 5. Initialize a target

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --init-target
```

Initialization writes a safe-deny executable profile and a rationale ADR, installs nothing, and requires policy review. Never treat ADR prose as configuration.

## 6. Install target-aware native skills

After review:

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --dry-run
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --verify
```

Target outputs read the matching generated passport, skill contract/core/helpers, target `AGENTS.md`, and local precedence sources. Package identity shapes judgment; package workflow shapes execution; target policy alone grants authority.

## 7. Confirm Codex discovery

Confirm these target files exist and their frontmatter names are exact:

```text
.agents/skills/lisa/SKILL.md
.agents/skills/lisa-prime/SKILL.md
.agents/skills/marge-product-architect/SKILL.md
.agents/skills/ralph/SKILL.md
.agents/skills/ralph-prime/SKILL.md
.agents/skills/lorie/SKILL.md
```

Restart or refresh Codex skill discovery if required, then invoke `$lisa`, `$marge-product-architect`, or `$ralph`. Natural language such as “Use Lisa” depends on target `AGENTS.md` routing.

## 8. Update or roll back

Rerun dry-run/install/verify after a promoted Homer ref or target policy change. Identical installs are byte-stable no-ops. To undo only the last installer-owned delta:

```bash
homer install --target . --profile .homer/profiles/studio.json --rollback --dry-run
homer install --target . --profile .homer/profiles/studio.json --rollback
```

Rollback stops on drift and never touches unrelated `.agents/**`, legacy Odyssey projection, target policy, ADRs, or local canon.
