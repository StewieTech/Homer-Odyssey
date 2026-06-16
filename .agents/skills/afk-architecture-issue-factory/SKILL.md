---
name: afk-architecture-issue-factory
description: Legacy compatibility wrapper for architecture issue-factory runs. Use architecture-issue-factory as the canonical skill name.
---

# AFK Architecture Issue Factory (Compatibility Wrapper)

## Status

This skill name is retained for compatibility with existing prompts and automations.

Canonical path:

- `.agents/skills/architecture-issue-factory/SKILL.md`

Shared contract:

- `.agents/skills/issue-factory-core/SKILL.md`

## Compatibility Rule

When this wrapper is invoked, run the canonical architecture issue-factory workflow and core contract rules.

## Guardrails

- Do not implement code.
- Do not open PRs.
- Do not invoke Ralph.
- Keep issue creation deduped, high-confidence, and capped by the core contract.
