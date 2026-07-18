---
name: release-issue-factory
description: Release engineering issue factory for CI/CD, environment language, version/build metadata, and release-readiness backlog curation without deploying production.
---

# Release Issue Factory

## Purpose

Convert release-health and CI/CD findings into safe backlog slices while preserving human control of production decisions.

## Required Reading

1. `.agents/skills/issue-factory-core/SKILL.md`
2. `.agents/skills/improve-cicd-pipeline/SKILL.md`
3. `.agents/skills/improve-cicd-pipeline/RALPH-AUTOMATIONS.md`
4. `.agents/skills/improve-cicd-pipeline/ENVIRONMENT-LANGUAGE.md`
5. `agent.md`
6. `agent-backlog.md`
7. `.agents/skills/ralph/SKILL.md`
8. `.agents/skills/ralph-prime/SKILL.md`

## Domain-Specific Rules

- Keep production release actions human-gated.
- Do not auto-create `agent-ready` issues for production deploys, secret changes, release-identifier policy changes, or environment-policy decisions.
- Route multi-slice release-readiness improvements to `ralph-prime` + `needs-plan` before AFK execution.
- Safe `agent-ready` candidates are low-risk docs/check/automation slices that preserve release policy.
- Use labels such as `release-readiness`, `env-change`, `release-risk/high`, `human-gated`, `ralph-safe`, and `ralph-blocked` where appropriate.

## Cadence

Recommended cadence: weekly.

Runner wiring is not part of this skill.
