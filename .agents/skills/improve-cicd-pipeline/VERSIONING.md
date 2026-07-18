# Versioning

Version policy for your product release engineering.

## Release Identity Tuple

Always treat these as separate fields:

- `version`: product/release version (`MAJOR.MINOR.PATCH`)
- `buildNumber`: unique native build identifier (`ios.buildNumber`, `android.versionCode`)
- `environment`: where the artifact is running
- `gitSha`: exact source revision
- `updateId`: OTA/update identity (when EAS Update is in play)

## Source of Truth (Current Repo)

- User-facing app version source: `<frontend-app-dir>/package.json`
- Runtime wiring: `<frontend-app-dir>/app.config.js` reads `EXPO_PUBLIC_APP_VERSION` or package version
- Build stamp source: `EXPO_PUBLIC_BUILD_STAMP` (set by `<frontend-app-dir>/scripts/promote.ps1`)
- Git SHA source: `EXPO_PUBLIC_GIT_SHA` (set by promotion scripts)

## Current Promotion Mapping

- Frontend web promotion identity is emitted by `<frontend-app-dir>/scripts/promote.ps1` as:
  - version: app version from `<frontend-app-dir>/package.json`
  - buildNumber/buildStamp: `EXPO_PUBLIC_BUILD_STAMP`
  - environment: promotion target env
  - gitSha: short git SHA
  - updateId: `n/a` (no OTA update in this path)
- Backend promotion identity is emitted by `scripts/promote-full.ps1` as:
  - version: root package version
  - buildNumber/buildStamp: published Lambda version (`publish-version` output)
  - environment: promotion target env
  - gitSha: short git SHA
  - updateId: `n/a` (no OTA update in this path)

## Rules

- Environment transitions do not require product version bumps.
- Staging and production may run the same version/build/SHA with different environment labels.
- Product version changes are intent-driven:
  - `0.y.z` for pre-1.0 development
  - `1.0.0` for first serious public app-store release
  - patch for backward-compatible fixes
  - minor for backward-compatible features
  - major for incompatible shifts
- Native build identifiers must be unique and monotonic for store-distributed builds.

## Display Guidance

Prefer diagnostics labels like:

- `your product v0.1.0 Â· staging Â· build 57 Â· abc123`
- `your product v0.1.0 Â· production Â· build 57 Â· abc123`

Avoid encoding environment into the semantic version itself.

## Expo Go Caveat

In Expo Go, native build identifiers may be unavailable or `null`.
When that happens, show app version + environment + git SHA/build stamp and do not imply store-native build identity.
