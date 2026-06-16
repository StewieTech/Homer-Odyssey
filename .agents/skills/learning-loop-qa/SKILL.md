---
name: learning-loop-qa
description: Evaluates whether your product delivers a complete learning loop using browser evidence, persona scenarios, and weighted scoring. Use when planning or running activation-first QA on first-value, correction quality, falloff diagnosis, or evidence-gated issue candidates.
---

# Learning Loop QA

## Quick Start

- Read `AGENTS.md`, `agent.md`, `agent-backlog.md`, `agent-ai-workflow-backlog.md`, `.agents/skills/issue-factory-core/SKILL.md`, and the files in this folder.
- Scope V1 to activation first: `/`, `/chat`, first meaningful conversation, first meaningful correction, and activation complete.
- Keep the persona actor and evaluator separate.

## Workflow

1. Pick one persona and one scenario from `PERSONAS.md` and `SCENARIOS.md`.
2. Run the flow with browser evidence only.
3. Score the run with `RUBRIC.md`.
4. Label the earliest falloff stage from `FALL_OFF_TAXONOMY.md`.
5. If the finding is strong enough, create at most one issue candidate through `issue-factory-core` gates.

## Rules

- Use `coach` as a neutral label for the product's feedback or correction surface when one exists.
- Stay report-first unless the issue-factory gate passes: dedupe, confidence `>= 85`, severity `>= S2`, reversible, one-PR sized, and testable.
- Cap issue creation at 3 per run; everything else stays in the report.
- Do not implement product code, open PRs, or expand into voice, roleplay, or broad persona coverage in V1.

## Outputs

- Route and viewport
- Actions and transcript summary
- Score table
- Falloff diagnosis
- Issue candidate or report-only note
- End-of-run rollup

See `OUTPUT_SCHEMA.md` for the exact shape.
