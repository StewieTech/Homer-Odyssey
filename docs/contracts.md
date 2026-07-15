# Contract ownership

Homer Odyssey keeps portable identity, target policy, and run evidence as separate versioned contracts:

- `schemas/character-passport.schema.json` owns portable character identity and authority.
- `schemas/skill-manifest.schema.json` owns a portable skill's files, dependencies, capabilities, variables, outputs, validation, and upgrade metadata.
- `schemas/target-profile.schema.json` owns target policy, vocabulary, repository inputs, path ownership, adapters, overlays, validation commands, and package allowlists.
- `schemas/homer.schema.json` validates a target declaration (`homer.yaml`).
- `schemas/homer-lock.schema.json` reserves the reproducibility record used by later write/verify slices.
- Inventory, dependency graph, privilege delta, and Odyssey Plan schemas own read-only evidence.

Every contract uses `apiVersion: homer.odyssey/v1`. Schema changes that break consumers require a new API version rather than an in-place reinterpretation.

## Path ownership

Profiles declare protected and managed glob patterns. Protected content is always target-owned. A managed-path file is replaceable only when it carries the Homer generated marker and no protected rule matches it. All other target files are preserved. Protected rules win over managed rules.
