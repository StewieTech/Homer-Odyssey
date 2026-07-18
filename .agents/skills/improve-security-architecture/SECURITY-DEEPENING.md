# Security Deepening

## Purpose
Security deepening means making the codebase safer by improving boundaries, contracts, and controls, not just patching individual bugs.

## Shallow security

Shallow security exists when:
- checks are scattered
- rules are duplicated
- frontend and backend disagree
- security depends on developer memory
- entitlement logic is mixed into UI code
- auth checks are manually repeated everywhere
- errors reveal too much
- logs are noisy but not useful
- security assumptions are not documented
- tests only cover happy paths

## Deep security

Deep security exists when:
- trust boundaries are explicit
- auth identity has one canonical source
- entitlement logic is centralized
- server-side enforcement is default
- validators exist at API boundaries
- risky flows have regression tests
- errors fail safely
- logs support investigation without leaking secrets
- external provider failures are handled intentionally
- security-sensitive decisions are documented

## Deepening patterns

### Pattern 1: Centralize entitlement decisions
Bad:
- many files check `user.tier === "premium"` manually

Better:
- one entitlement service answers:
  - canUseVoice(user)
  - canUseLiveSession(user)
  - canAccessSession(user, session)
  - canConsumeQuota(user, feature)

### Pattern 2: Validate at the boundary
Bad:
- handlers trust request bodies

Better:
- every handler parses and validates input before business logic

### Pattern 3: Separate identity from analytics
Bad:
- analytics/session identifiers are treated as authorization proof

Better:
- auth identity comes from verified token/session
- analytics identity is for measurement only

### Pattern 4: Make Stripe idempotent
Bad:
- repeated webhook events can duplicate side effects

Better:
- processed event IDs are recorded
- subscription transitions are deterministic
- unknown events are ignored safely

### Pattern 5: Fail closed on paid features
Bad:
- if subscription status is missing, allow access

Better:
- if subscription status is missing, deny paid feature access and log the reason

### Pattern 6: Remove client trust
Bad:
- frontend sends `isPremium: true` 

Better:
- backend derives tier from trusted server-side data

### Pattern 7: Safe error surfaces
Bad:
- API returns raw provider/database errors

Better:
- user receives safe message
- logs receive structured diagnostic data without secrets

### Pattern 8: Security regression tests
Bad:
- only successful paid user paths are tested

Better:
- test expired user, guest user, tampered body, missing auth, wrong owner, duplicate webhook, provider failure

## Security deepening output

When recommending a deepening change, include:
- current shallow pattern
- target deeper pattern
- affected trust boundary
- business risk
- likely files
- test strategy
- whether this should be implemented now or turned into a GitHub issue
