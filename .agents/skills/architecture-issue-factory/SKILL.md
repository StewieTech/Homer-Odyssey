---
name: architecture-issue-factory
description: Weekly architecture issue factory that converts high-confidence architecture findings into deduped GitHub issues or PRD/report issues without implementing code.
---

# Architecture Issue Factory

## Purpose

Turn architecture discovery output into a clean, low-noise implementation queue.

Use this skill after architecture exploration/reporting work, not for implementation.

## Required Reading

1. `.agents/skills/issue-factory-core/SKILL.md`
2. `.agents/skills/improve-codebase-architecture/SKILL.md`
3. `agent.md`
4. `agent-architect.md`
5. `agent-backlog.md`
6. `agent-ai-workflow-backlog.md`
7. `agent-github-queue.md`
8. `.agents/skills/ralph/SKILL.md`
9. `.agents/skills/ralph-prime/SKILL.md`

## Domain-Specific Rules

- Keep issues centered on module/interface depth, locality, seams, and leverage.
- Prefer small tracer-bullet slices over broad refactor tickets.
- Use PRD/report issues for cross-cutting redesign candidates.
- Route decomposable but cross-cutting architecture candidates to `ralph-prime` + `needs-plan`.
- Mark architecture-policy or irreversible tradeoff work as `human-gated` or `needs-grill-me`.

## Cadence

Recommended cadence: weekly.

Runner wiring is not part of this skill.
