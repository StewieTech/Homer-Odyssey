---
name: ui-ux-issue-factory
description: UI/UX issue factory that creates evidence-backed design and product-experience issues from validated screen/flow observations without implementing UI changes.
---

# UI/UX Issue Factory

## Purpose

Turn UX observations into clear, implementation-ready issues with evidence, while keeping subjective noise out of the queue.

## Required Reading

1. `.agents/skills/issue-factory-core/SKILL.md`
2. `.agents/skills/improve-ui-ux/SKILL.md`
3. `.agents/skills/improve-ui-ux/LANGUAGE.md`
4. `.agents/skills/improve-ui-ux/RUBRIC.md`
5. `agent.md`
6. `agent-backlog.md`
7. `.agents/skills/ralph/SKILL.md`
8. `.agents/skills/ralph-prime/SKILL.md`

## Domain-Specific Rules

- Create issues only when evidence is concrete:
  - screenshot-backed observation, or
  - reproducible screen-flow behavior, or
  - direct code evidence tied to UX impact.
- Do not create taste-only tickets without behavioral evidence.
- Separate must-fix clarity/trust/accessibility issues from polish or experiment items.
- Route broad-but-plannable interaction-model changes to `ralph-prime` + `needs-plan`.
- Route product-policy or brand-direction decisions to `needs-grill-me` or `human-gated`.

## Cadence

Recommended cadence: 2-3 runs per week.

Runner wiring is not part of this skill.
