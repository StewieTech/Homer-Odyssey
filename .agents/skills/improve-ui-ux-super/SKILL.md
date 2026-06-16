---
name: improve-ui-ux-super
description: Run screenshot-grounded UI/UX planning sessions that capture screen state, benchmark interaction patterns, and emit evidence-backed issue sets routed through ui-ux-issue-factory and ralph-prime.
---

# Improve UI/UX Super

## Purpose

This workflow plans high-confidence UI/UX work before implementation. It is an orchestrator:

- it captures and reviews product-facing evidence,
- grades it against existing UX criteria,
- benchmarks against proven interaction patterns,
- then routes outcomes to AFK / Ralph Prime / HITL lanes.

It does not implement UI changes directly.

## When to use

- You want UX planning instead of direct redesign execution.
- You need evidence-backed findings from screenshots and reproducible flows.
- You are deciding whether a UI/UX change should be AFK, Ralph Prime, or HITL.
- You want ranking on what matters first across screens/funnels.

## Required loading

Load these before running the workflow:

- `AGENTS.md`
- `agent.md`
- `agent-backlog.md`
- the repository structure and any route or context docs that explain the active product surfaces
- `.agents/skills/improve-ui-ux/SKILL.md`
- `.agents\skills\improve-ui-ux-super\BENCHMARK-LIBRARY.md`
- `.agents/skills/improve-ui-ux/LANGUAGE.md`
- `.agents/skills/improve-ui-ux/RUBRIC.md`
- `.agents/skills/improve-ui-ux/PREMIUM-FEEL.md`
- `.agents/skills/improve-ui-ux/SCREEN-REVIEW.md`
- `.agents/skills/improve-ui-ux/INTERACTION-PATTERNS.md`
- `.agents/skills/ui-ux-issue-factory/SKILL.md`
- `.agents/skills/ralph-prime/SKILL.md`
- `.agents/skills/grill-with-docs/SKILL.md`
- `.agents/skills/grill-with-docs/EXTENSIONS.md`
- the primary route map, router config, or navigation manifest for the product
- any existing visual regression, Playwright, or end-to-end specs that already cover auth or first-run flows

## Core flow (7 stages)

1. **Zoom-out map**
   - Sketch the active product surfaces, state transitions, and likely high-friction zones from repo evidence before scoring screens.
   - Keep one sentence per screen of "goal" and one sentence per screen of "failure mode".

2. **Select screen / flow set**
   - Start from the root entry route and the route map or router config that best describes the product surface area.
   - Prioritize auth, first-time value, the core task flow, collaboration or sharing surfaces, real-time flows, profile or account trust surfaces, and retention surfaces.

3. **Capture evidence**
   - Use deterministic Playwright captures where possible.
   - If a baseline visual or end-to-end test already exists for auth or onboarding, start there.
   - Extend with route snapshots only if the extra test burden is justified by scope.
   - For protected routes, avoid guessing backend state; prefer explicit deterministic fixtures/mocks and document those assumptions.

4. **Score every captured screen**
   - Review each screen with the Screen Review format.
   - Score against:
     - clarity in first 3 seconds,
     - directness of action model,
     - state feedback quality,
     - emotional safety,
     - accessibility and premium feel.

5. **Benchmark calibration**
   - Compare patterns, not brands.
   - Use [BENCHMARK-LIBRARY.md](./BENCHMARK-LIBRARY.md) as the approved pattern set.
   - Record where your product should match, diverge, or intentionally ignore each pattern.

6. **Issue drafting**
   - Create at most **3** evidence-backed issue candidates, each with:
     - user goal,
     - route + viewport + evidence reference,
     - rubric score,
     - must-fix/should-fix/polish split,
     - first-practice slice.

7. **Lane routing**
   - Apply ralph-prime novelty scoring:
     - `0-1` usually AFK,
     - `2` AFK or Ralph Prime depending blast radius,
     - `3+` Ralph Prime,
     - auth/billing/legal/irreversible decisions -> HITL.
   - Route via issue factory + ralph-prime labels and preserve issue order:
     - `needs-plan` + `vertical-slice` for AFK-ready items,
     - `ralph-prime` + `needs-plan` for planning-only items,
     - `human-gated` / `HITL` for human-first decisions.

## Evidence packet template (for each finding)

- **Route / viewport:** `/chat`, desktop, first run
- **Screen goal:** Start a first-value text lesson
- **User actions observed:** ... 
- **Screenshot evidence:** path + timestamp
- **Rubric score:** 1-5 per dimension
- **Problem:** what breaks, where, and after which action
- **Pattern reference:** [pattern name] + why it applies
- **Recommended first slice:** no more than 1 PR-sized change
- **Labels / lane:** AFK, Ralph Prime, or HITL

## Output discipline

- Keep the result list short and sequentially executable.
- Do not produce taste-only tickets without reproduced evidence.
- Never ask the planner to compare against arbitrary competitors; compare only calibrated patterns.
- Do not implement UI in this workflow.
