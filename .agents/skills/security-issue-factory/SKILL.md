---
name: security-issue-factory
description: Security issue factory that runs focused unattended security passes and converts high-confidence findings into sanitized, deduped issues while keeping sensitive security detail out of shared artifacts.
---

# Security Issue Factory

## Purpose

Convert focused security findings into actionable backlog artifacts without leaking sensitive security detail and without executing risky implementation.

## Required Reading

1. `.agents/skills/issue-factory-core/SKILL.md`
2. `.agents/skills/improve-security-architecture/SKILL.md`
3. `.agents/skills/improve-security-architecture/RALPH-LOOP.md`
4. `agent.md`
5. `agent-backlog.md`
6. `.agents/skills/ralph/SKILL.md`
7. `.agents/skills/ralph-prime/SKILL.md`

## Domain-Specific Rules

- Run one focused audit type per pass (do not mix all topics in one run).
- For Medium+ findings, keep additional sensitive reproduction detail out of shared repo artifacts and issue bodies.
- Keep GitHub issues sanitized: no runnable attack payloads, secrets, or operational abuse instructions.
- Route auth/session, Stripe billing policy, entitlements, secret rotation, prod config, and schema changes to `human-gated` or `HITL`.
- Route multi-slice but reversible hardening work to `ralph-prime` + `needs-plan` before AFK execution.
- Only low-risk, reversible hardening slices may become `agent-ready`.

## Cadence

Recommended cadence: 2-3 runs per week.

Runner wiring is not part of this skill.
