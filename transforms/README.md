# Transforms

Transforms compose classification, generalization, redaction, capability filtering, dependency resolution, and overlay application. Planning hashes the transformed projection; apply rebuilds the same projection before writing it, and verify repeats the checks against the lockfile.

Portable core is transformed before a target overlay is appended. Overlays are package-scoped, so changing one overlay changes only that package's projected core. Capability filtering removes any authority that is not explicitly allowed by the target profile.
