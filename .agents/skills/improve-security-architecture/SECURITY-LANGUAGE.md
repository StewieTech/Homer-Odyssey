# Security Language

Shared vocabulary for every security architecture review this skill produces. Use these terms to name assets, actors, trust boundaries, controls, risk paths, severity, likelihood, and blast radius consistently. Prefer this language over generic words when a precise security term applies.

## Core concepts

### Asset
Something valuable that must be protected.

Examples:
- user account
- access token
- refresh token
- billing customer ID
- subscription tier
- feature entitlement
- usage quota
- provider API key
- user content history
- analytics identity
- admin-only data
- deployment config

### Actor
Someone or something interacting with the system.

Examples:
- guest user
- registered user
- paid user
- privileged operator
- malicious user
- expired subscriber
- webhook sender
- frontend client
- backend API
- background worker
- database
- external provider

### Trust boundary
A place where data crosses from one trust zone into another.

Examples:
- mobile app to backend API
- browser to edge or runtime endpoint
- API handler to database
- webhook provider to webhook endpoint
- backend to external provider
- frontend analytics to analytics provider
- environment variables to runtime config

### Authentication
Proof of who the actor is.

### Authorization
Proof of what the actor is allowed to do.

### Entitlement
Product/business-level authorization.

Examples:
- can use voice
- can use live session
- has premium tier
- has remaining quota
- can access a session
- can create paid feature output

### Server-side enforcement
Security rules enforced by the backend, not by frontend UI.

Rule:
Frontend gating improves UX. Backend enforcement provides security.

### Fail closed
When uncertain, deny access or stop the operation safely.

### Fail open
When uncertain, allow access. This is usually dangerous for auth, billing, and entitlement logic.

### Sensitive data
Data that should not be leaked, logged, exposed to clients, or sent to unnecessary third parties.

### Idempotency
A property where repeating the same event does not create duplicate side effects.

Critical for:
- Stripe webhooks
- payment events
- subscription changes
- entitlement updates
- retryable external calls

### Least privilege
Give each component only the permissions it needs.

### Defense in depth
Use multiple layers of protection instead of relying on one control.

### Security architecture smell
A pattern that may not be a bug yet but creates risk.

Examples:
- entitlement checked only in frontend
- userId accepted from request body instead of token/session
- webhook without signature verification
- secrets referenced in frontend code
- logs contain tokens or API keys
- unclear ownership of access checks
- duplicate tier logic in many places
- external provider failure grants access
- CORS treated as authorization
- analytics identity used as auth identity

### Availability blast radius
How much a security change can break system availability or usability across supported environments.

Use:
- low: unlikely to affect runtime boundaries
- medium: may affect behavior but keeps stable contracts
- high: touches auth/CORS/cookies/runtime/env/deploy boundaries
 
### Availability-risk change
A security or policy change that touches sensitive runtime boundaries and can break user-visible functionality if hardened incorrectly.

Classify as availability-risk by default when a change touches:
- CORS
- auth/session behavior
- origin/header contracts
- environment/runtime entry wiring
- rate-limit policy
- entitlement-sensitive boundaries

Rule:
Security hardening that degrades usability is treated as a failed release and must include explicit availability evidence plus rollback trigger notes.

## Security language to use in findings

Every finding should use this language:
- asset
- actor
- trust boundary
- attack surface
- control
- missing control
- risk path
- severity
- likelihood
- blast radius
- availability blast radius
- server-side enforcement
- fail-open/fail-closed behavior
- regression test
- human-gated change
