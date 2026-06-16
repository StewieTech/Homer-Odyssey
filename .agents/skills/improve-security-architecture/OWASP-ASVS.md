# OWASP and ASVS Mapping

## Purpose
This file maps security findings to common security standards so agents do not invent their own security framework.

## OWASP Top 10:2025 awareness layer

Use this list for high-level categorization:

1. A01 Broken Access Control
2. A02 Security Misconfiguration
3. A03 Software Supply Chain Failures
4. A04 Cryptographic Failures
5. A05 Injection
6. A06 Insecure Design
7. A07 Authentication Failures
8. A08 Software or Data Integrity Failures
9. A09 Security Logging and Alerting Failures
10. A10 Mishandling of Exceptional Conditions

For every major finding, map it to one or more OWASP categories.

## ASVS-style control areas

Use ASVS-style thinking for deeper verification.

Review these areas:

### Identity and authentication
- login
- session validation
- token verification
- password reset
- email verification
- account recovery

### Session management
- token expiry
- refresh behavior
- revocation
- secure storage
- logout behavior

### Access control
- object ownership
- tier authorization
- role checks
- server-side enforcement
- denied-by-default behavior

### Input validation and sanitization
- request schemas
- type validation
- payload size limits
- injection protection
- unexpected fields

### Cryptography and secrets
- API keys
- JWT secrets
- environment variables
- SSM/secret manager usage
- no client-side secrets

### Error handling and logging
- no sensitive data in logs
- useful security events
- clear failure modes
- alerting for suspicious behavior

### Data protection and privacy
- sensitive user content
- chat history
- audio payloads
- analytics payloads
- third-party data sharing

### API and service communication
- external provider boundaries
- webhook verification
- replay protection
- timeout/retry behavior
- idempotency

### Configuration and deployment
- CORS
- Function URLs
- environment separation
- staging/prod parity
- least privilege IAM

### Business logic security
- entitlements
- paid tiers
- quotas
- subscription status
- cancellation/refund behavior

## Mapping template

For each finding:

- OWASP Top 10 category:
- ASVS-style control area:
- Security property violated:
- Business risk:
- Recommended control:
- Validation method:
