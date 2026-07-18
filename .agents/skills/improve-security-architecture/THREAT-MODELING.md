# Threat Modeling

## Purpose
This file helps agents reason about how the system can be abused before suggesting fixes.

## Default method

For every reviewed flow, identify:

1. Assets
2. Actors
3. Entry points
4. Trust boundaries
5. Security assumptions
6. Abuse cases
7. Existing controls
8. Missing controls
9. Impact
10. Availability impact
11. Recommended mitigation
12. Test strategy

## STRIDE-lite checklist

Use this lightweight STRIDE model:

### Spoofing
Can someone pretend to be another user or trusted service?

Check:
- JWT verification
- session identity
- Stripe webhook signature
- userId source
- admin-like routes
- API keys

### Tampering
Can someone modify data they should not control?

Check:
- request body trust
- subscription tier changes
- voice quota changes
- session ownership
- analytics payloads
- client-side flags

### Repudiation
Can someone deny an action because there is no trustworthy audit trail?

Check:
- billing events
- entitlement changes
- login/security events
- failed access attempts
- webhook processing logs

### Information disclosure
Can sensitive data leak?

Check:
- API responses
- error messages
- logs
- analytics events
- frontend bundles
- environment variables
- third-party calls

### Denial of service
Can someone exhaust resources?

Check:
- chat endpoints
- TTS endpoints
- transcription endpoints
- expensive AI calls
- unauthenticated routes
- missing rate limits

### Elevation of privilege
Can someone access a higher tier or privileged behavior?

Check:
- premium gating
- live session gating
- role checks
- subscription state
- server-side authorization

## the project-specific threat model

Review these flows first:

### Auth flow
Questions:
- Is identity derived from a trusted token/session?
- Are tokens verified consistently?
- Are expired/revoked users handled safely?
- Are auth failures logged safely?

### Entitlement flow
Questions:
- Is paid access enforced on the server?
- Can frontend state unlock premium behavior?
- Can expired users keep access?
- Can quota be bypassed?
- Are tier names centralized?

### Stripe webhook flow
Questions:
- Is webhook signature verified?
- Are events idempotent?
- Are subscription state transitions safe?
- Are refunds/cancellations handled?
- Are unknown events ignored safely?
- Does failed processing retry safely?

### live session flow
Questions:
- Can only entitled users create or access sessions?
- Is session ownership checked?
- Are session identifiers canonical?
- Is analytics separate from authorization?
- Are voice/chat costs protected from abuse?

### AI provider flow
Questions:
- Are API keys server-only?
- Are user prompts logged safely?
- Are provider errors handled fail-closed where needed?
- Are expensive calls rate-limited?
- Are audio/text payloads size-limited?

### Analytics flow
Questions:
- Does analytics leak sensitive content?
- Are user identifiers pseudonymous where appropriate?
- Are analytics events trusted for business logic? They should not be.
- Are event names consistent enough for investigation?

## Threat finding template

Use this format:

### Finding: [short name]

**Risk:** Low / Medium / High / Critical  
**Actor:**  
**Asset:**  
**Trust boundary:**  
**Risk path:**  
**Current control:**  
**Missing or weak control:**  
**Impact:**  
**Availability impact:**  
**Recommended mitigation:**  
**Safe for AFK agent:** Yes / No / Report-only  
**Test strategy:**  
**Suggested GitHub issue title:**
