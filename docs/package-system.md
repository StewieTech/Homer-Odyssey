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

## Provenance and upgrades

Every package records its origin repository, source path, and pinned source commit. Generated files record their package source and the Homer version that rendered them. `homer.lock` records the source and target fingerprints, profile, package hashes, generated hashes, removed capabilities, plan ID, and rollback packet.

Manifests declare compatible target profiles, package version requirements, and upgrade instructions. Compatibility is evaluated across the complete dependency closure before projection. A package or dependency that does not support the selected target fails closed.

## Privilege review

The profile is the authority ceiling. Allowed capabilities remain in generated descriptors. Human-gated, denied, and undeclared capabilities are removed from the projection and recorded in the lockfile. Denied or undeclared package authority also blocks application during the security review. Portable package text cannot grant target authority or override protected paths.

Ralph's Studio write and GitHub capabilities are human-gated: its portable core can describe bounded execution, but generated Studio output does not receive those capabilities. Lorie remains the only explicit launch-governance role. Lisa, Lisa Prime, Ralph Prime, and Marge remain report, analysis, planning, or routing roles within their declared contracts.

## Accepted plans, idempotency, and rollback

`homer plan --accept` marks one deterministic plan as reviewed. Apply rebuilds current state and accepts the plan only when its ID and evidence still match. `--dry-run` returns the exact write and removal set without changing the target. Writes are atomic: a partial failure restores the pre-apply files.

Generated paths carry an ownership marker. Protected paths and unmarked customizations are never overwritten. A successful apply writes a deterministic `homer.lock`; applying the same projection again is a no-op and does not rewrite the lock.

Rollback uses only the lockfile's previous managed-file backups and previous lockfile. `--dry-run` previews those actions. Rollback validates ownership and drift first, restores or removes only Homer-managed paths, and preserves all target-owned content. If generated content was edited after apply, rollback fails rather than discarding the edit.
