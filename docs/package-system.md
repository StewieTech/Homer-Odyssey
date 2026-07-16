# Portable packages and governed projection

Homer Odyssey separates reusable character behavior from repository policy. A character package contains a passport and portable core. A skill package contains a manifest, core, helpers, evaluations, and any explicitly declared references, commands, workflows, templates, or adapters. The first catalog contains Marge, Lisa, Ralph Prime, Ralph, and Lorie, plus their required skill packages.

## Portable core and overlays

Package core uses general product and repository language. It owns identity, bounded authority, delegations, outputs, and reusable workflow behavior. Target overlays own local vocabulary, canon, approval rules, validation expectations, and repository-specific constraints.

Studio overlays preserve Studio product canon and approval boundaries. Pariss overlays preserve the source repository's Character OS language. The restricted profile is intended for read-only review and rejects packages that request write authority. Overlays never edit the portable package and are applied only to their matching character or skill core.

Projection runs this deterministic pipeline:

1. Load and validate every selected passport, manifest, declared surface, and package evaluation.
2. Resolve transitive dependencies and reject cycles, missing delegates, incompatible targets, same-name conflicts, and undeclared references.
3. Classify source-specific content, generalize reusable core, redact credential-shaped literals, scan all transitive surfaces, and filter capabilities against the target profile.
4. Apply only the matching target overlay and render through the target adapter.
5. Compare the rendered hashes with the target and produce an Odyssey Plan.

Security checks cover core, helpers, references, commands, workflows, templates, adapters, outputs, validation declarations, and upgrade instructions. Sanitization is transitive: hiding an unsafe instruction in a delegated package or helper does not bypass policy. Studio and restricted policy exclude exploit construction, credential export, protected-policy bypass, stealth social automation, automatic production mutation, and provider-specific attack procedures.

## Governed Pariss promotion

Pariss is the incubator and Homer is the canonical portability layer. `homer promote inspect` compares complete governed source trees—not only already-pinned paths—with the commit pinned by package provenance across the selected packages' complete dependency closure. A promotion plan records source, previous-provenance, and Homer target fingerprints; changed source paths; exactly one semantic classification per change; hash-bound source-to-destination content; reviewer decision reasons; package/overlay/variable destinations; computed capability, dependency, reference, version, catalog, and evaluation deltas; rejection reasons; and the human-acceptance requirement.

`homer promote plan --review <draft> --accept` lets the reviewer override classifications, destinations, and payloads while rebinding them to current fingerprints. `homer promote apply` accepts only that exact reviewed plan. Any source, provenance, target, or embedded-content change makes it stale. Candidate package/reference validation and every required eval run before provenance is advanced. The generic catalog is regenerated and verified with the promoted package hashes. Failed verification restores package, descriptor, overlay, and newly generated catalog state and leaves provenance unchanged.

Repository/product/branch details such as `StewieTech/Pariss`, `developSIT`, Pariss paths and labels, Docker commands, product names, production domains, provider credentials, and environment deployment actions belong in overlays, variables, or rejection evidence—not portable core.

## Deterministic generic catalog

The six governed `.agents/skills/**` entries are rendered from package core, declared helpers, the generic overlay registry, and the Codex catalog template/adapter. Their frontmatter begins with the exact native name and a concise discovery description. Generated metadata follows the frontmatter so Codex parsing remains valid. Renderer ownership is limited to those six directories; all unrelated generalized skills are preserved.

`homer catalog verify` compares every expected byte and fails on missing, changed, or unexpected managed files. `.github/workflows/homer-catalog-parity.yml` makes package/catalog drift a CI failure.

## Target-aware installation

The installer deliberately does not reuse the legacy projection namespace or lock. Legacy Odyssey projection continues to own `.homer/generated/characters/**`, `.homer/generated/skills/**`, and `homer.lock`. First-party installation owns `.homer/generated/install/**`, `.homer/generated/install/install-lock.json`, and only the exact native child roots declared by `sanitization.managedNativeSkillPaths`.

Installation resolves the full package closure, applies portable core then bundled adapter overlays then target-owned required overlays, substitutes target policy values, removes automatic human-gated authority, scans the entire candidate write set, and renders full native Codex skills. The target's `AGENTS.md`, local canon/ADRs, profile, validation commands, and human gates always outrank portable text.

An existing path is writable only when absent or proven by both installer ownership metadata and the prior lock/hash. An unmanaged same-name skill produces a semantic conflict report and stops. Repeated identical installs preserve all bytes, including the lock. Rollback restores/removes only paths recorded by the current installer lock and refuses drifted output.

## Provenance and upgrades

Every package records its incubator repository, complete relevant source paths, and pinned source commit. Generic catalog metadata records canonical package coordinates. Target-aware output intentionally records only canonical Homer package IDs, versions, and hashes; it does not copy Pariss identity into Studio. Traceability is `target install lock → Homer package hash → Homer package provenance → Pariss commit`. `homer.lock` remains the legacy projection lock; the target-aware installer uses its disjoint install lock.

Manifests declare compatible target profiles, package version requirements, and upgrade instructions. Compatibility is evaluated across the complete dependency closure before projection. A package or dependency that does not support the selected target fails closed.

## Privilege review

The profile is the authority ceiling. Allowed capabilities remain in generated descriptors. Human-gated capabilities are removed from the projection and recorded in install evidence. Denied or undeclared package authority blocks application before mutation and is returned in the machine-readable sanitization report attached to the rejection. Portable package text cannot grant target authority or override protected paths.

Ralph's Studio write and GitHub capabilities are human-gated: its portable core can describe bounded execution, but generated Studio output does not receive those capabilities. Lorie remains the only explicit launch-governance role. Lisa, Lisa Prime, Ralph Prime, and Marge remain report, analysis, planning, or routing roles within their declared contracts.

## Accepted plans, idempotency, and rollback

`homer plan --accept` marks one deterministic plan as reviewed. Apply rebuilds current state and accepts the plan only when its ID and evidence still match. `--dry-run` returns the exact write and removal set without changing the target. Writes are atomic: a partial failure restores the pre-apply files.

Generated paths carry an ownership marker. Protected paths and unmarked customizations are never overwritten. A successful apply writes a deterministic `homer.lock`; applying the same projection again is a no-op and does not rewrite the lock.

Rollback uses only the lockfile's previous managed-file backups and previous lockfile. `--dry-run` previews those actions. Rollback validates ownership and drift first, restores or removes only Homer-managed paths, and preserves all target-owned content. If generated content was edited after apply, rollback fails rather than discarding the edit.
