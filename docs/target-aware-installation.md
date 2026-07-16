# Target-aware installation

## Generic versus target-aware

Use the generic portable catalog when repository-neutral workflows are sufficient:

```bash
npx skills@latest add StewieTech/Homer-Odyssey
```

Use first-party installation when exact target repository identity, branch, vocabulary, validators, overlays, capability policy, native child-path ownership, and sanitization evidence are required:

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json
```

These commands are complementary and intentionally not equivalent.

## First-run initialization

POSIX:

```bash
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> \
  homer install \
  --target . \
  --profile .homer/profiles/studio.json \
  --init-target
```

PowerShell or Command Prompt:

```powershell
npx --yes --package=github:StewieTech/Homer-Odyssey#<ref> homer install --target . --profile .homer/profiles/studio.json --init-target
```

Initialization refuses to overwrite an existing profile or `.homer/adr/0001-homer-target-sanitization.md`. It creates both only when absent, installs no skills, exits with code `20`, and prints the exact reviewed follow-up command.

## Profile review checklist

Review every `sanitization` field:

- `version`
- `targetRepository` and `targetBaseBranch`
- `allowedCharacterPackages` and `allowedSkillPackages`
- exact `nativeSkillNames`
- `targetVocabulary`
- `requiredSourceDocs` and `validationCommands`
- `substitutions.paths`, `.repositories`, and `.branches`
- `capabilities.allowed`, `.humanGated`, and `.denied`
- `deniedPatterns`
- `protectedPaths`
- exact `managedNativeSkillPaths`
- `localPrecedence`
- `requiredOverlays`
- `minimumPackageVersions`
- `failOnUnresolvedPlaceholder`, `failOnSourceSpecificLeakage`, and `failOnUnmanagedConflict`
- `evidenceOutputPath`

The unmanaged-conflict field is recorded as target policy evidence, but it never grants overwrite authority. An unmanaged or drifted exact native-skill path always stops installation and returns a machine-readable `SemanticInstallConflictReport` comparing local, proposed, and prior managed hashes.

The profile is executable policy. The ADR explains why the target chose it. Do not add secrets to either.

## Normal operation

Preview, apply, and verify:

```bash
homer install --target . --profile .homer/profiles/studio.json --dry-run
homer install --target . --profile .homer/profiles/studio.json
homer install --target . --profile .homer/profiles/studio.json --verify
```

The installer:

1. Reads and validates target policy on every run.
2. Resolves the complete allowed package dependency closure and minimum versions.
3. Loads bundled adapter overlays and each target-owned required overlay.
4. Applies target substitutions and vocabulary.
5. Records generalized, replaced, removed, human-gated, and denied items.
6. Rejects source-specific leakage, unresolved placeholders, secret-shaped/denied content, and denied/undeclared capabilities before mutation; rejected runs return the complete machine-readable sanitization report as error evidence.
7. Writes canonical evidence only under `.homer/generated/install/**`.
8. Writes six full native skills only to exact declared child roots.
9. Writes a deterministic install lock and sanitization report.
10. Returns a byte-stable no-op for an identical repeated install.

## Ownership and conflicts

`.agents/**` stays protected. The six exact `managedNativeSkillPaths` are installer-eligible exceptions, not automatically owned. If an existing same-name directory or file lacks the installer marker and matching prior lock/hash, installation stops with local, expected, and proposed hashes. Homer does not overwrite, rename, merge, or hide the conflict.

The installer namespace is disjoint from legacy projection:

- Legacy: `homer.lock`, `.homer/generated/characters/**`, `.homer/generated/skills/**`
- Installer: `.homer/generated/install/**`, `.homer/generated/install/install-lock.json`, exact native skill children

This allows an existing Max-style legacy projection to remain untouched.

## Sanitization evidence

The report path is profile-owned, normally `.homer/generated/install/sanitization-report.json`. It contains target policy identity, canonical Homer package IDs/versions/hashes, overlay hashes, transformation hashes/counts, removed automatic authority, retained human gates, denials, validators, and local-precedence sources. It never copies Pariss repository identity or branch into Studio output.

## Rollback

```bash
homer install --target . --profile .homer/profiles/studio.json --rollback --dry-run
homer install --target . --profile .homer/profiles/studio.json --rollback
```

Rollback validates every current generated hash, restores/removes only paths in the lock's current rollback packet, restores the prior install lock when present, and preserves target-owned content. A changed generated file blocks rollback rather than discarding the edit.
