# Contract ownership

Homer Odyssey keeps portable identity, target policy, and run evidence as separate versioned contracts:

- `schemas/character-passport.schema.json` owns portable character identity and authority.
- `schemas/skill-manifest.schema.json` owns a portable skill's files, dependencies, capabilities, variables, outputs, validation, and upgrade metadata.
- `schemas/target-profile.schema.json` owns target policy, vocabulary, repository inputs, path ownership, adapters, overlays, validation commands, and package allowlists.
- `schemas/promotion-plan.schema.json` owns reviewed Pariss-to-Homer classification, freshness, proposals, rejection, evaluation, and acceptance evidence.
- `schemas/install-lock.schema.json` owns target-aware generated file hashes, canonical package coordinates, disjoint ownership, and rollback backups.
- `schemas/sanitization-report.schema.json` owns target transformations, overlays, generalized/replaced/removed items, human gates, denials, validators, and precedence evidence.
- `schemas/homer.schema.json` validates a target declaration (`homer.yaml`).
- `schemas/package-eval.schema.json` owns portable, package-local evaluation cases.
- `schemas/homer-lock.schema.json` owns deterministic generated-file, provenance, sanitization, and rollback evidence.
- `schemas/verification.schema.json` owns verification evidence and verdicts.
- Inventory, dependency graph, privilege delta, and Odyssey Plan schemas own discovery and approval evidence.

Every contract uses `apiVersion: homer.odyssey/v1`. Schema changes that break consumers require a new API version rather than an in-place reinterpretation.

## Versioned sanitization policy

`TargetProfile.sanitization.version` versions executable target installation policy independently from ADR prose. It contains target repository identity and base branch; allowed character/skill packages; exact native skill names; target vocabulary and required source docs; validation commands; path/repository/branch substitutions; allowed, human-gated, and denied capabilities; denied content/reference patterns; protected paths; exact managed native skill child roots; local-precedence rules; required target overlays; minimum package versions; fail-closed placeholder/leakage/conflict flags; and the evidence report path.

The top-level capability and package allowlists remain ceilings. Sanitization may narrow but never silently widen them. Native name bindings and managed child paths must match exactly and case-insensitively unique. Installer evidence must stay under `.homer/generated/install/**` so it cannot collide with legacy `homer.lock` ownership.

The target ADR records rationale. It is never parsed as executable configuration. The JSON profile is the executable policy and is reread on every run.

## Path ownership

Profiles declare protected and managed glob patterns. Protected content is always target-owned. A managed-path file is replaceable only when it carries the Homer generated marker and no protected rule matches it. All other target files are preserved. Protected rules win over managed rules.

The target-aware installer adds a narrower ownership rule without changing legacy projection: `.agents/**` remains protected, but exact `sanitization.managedNativeSkillPaths` children are eligible only to the installer. Eligibility is not ownership. Existing content requires the installer marker plus an undrifted prior install-lock entry. Foreign files anywhere inside a requested child root are semantic conflicts.

## Recurring operation contracts

The JSON Schemas under `schemas/` are Homer's public, versioned boundary. Callers must validate inputs and outputs against the exact `apiVersion`; unknown fields fail closed.

Recurring integrations use three related contracts:

- `OdysseyOperationRequest` owns bounded caller intent and idempotency metadata.
- `OdysseyRun` owns exact inputs, source/target identities, lifecycle transitions, evidence references, and retry state.
- `OdysseyOperationResponse` owns drift and package summaries, privilege and policy evidence, artifacts, failure taxonomy, and next allowed actions.

Bounded drift automation adds two caller-side contracts without creating a second drift engine:

- `OdysseyTargetRegistry` owns the explicit repository/profile/channel allowlist and execution bounds.
- `OdysseyDriftOrchestration` owns trigger identity, stable package versions, per-target dedupe decisions, and the exact read-only requests that may be queued.

The orchestration dedupe key binds repository, ref, profile, stable package versions, target lock hash, channel, and policy identity. Active equivalent runs, completed equivalent checks, open Homer update pull requests, and exact dismissed state suppress redundant work. A changed package version, lock hash, profile, or policy identity produces a new key instead of silently carrying a dismissal forward.

The existing inventory, plan, lock, verification, package, profile, and privilege schemas remain the transformation truth. The recurring contracts reference their outputs rather than duplicating their calculations.
