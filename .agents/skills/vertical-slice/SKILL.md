---
name: vertical-slice
description: Plan and deliver the smallest validated end-to-end slice for a feature before expanding scope.
---

# Vertical Slice

## Job
Force tasks into the smallest useful end-to-end behavior that can be validated now, then defer the rest explicitly.

## Use when
- A task can sprawl across backend/frontend/infra/docs.
- A plan is broad and needs a first shippable increment.
- You need to reduce risk and avoid half-finished cross-layer work.

## Do not use when
- The task is a tiny one-file mechanical fix.
- The task is strictly docs-only with no behavior change.

## Definition of a valid slice
- Produces user-visible or system-visible behavior now.
- Includes only the minimum layers required for that behavior.
- Has concrete validation proving the behavior works.
- Names what is deferred and why it is safe to defer.

## Anti-patterns
- Building isolated layers with no runnable path.
- Broad refactors labeled as "prep work."
- "We will test later" without present validation.
- Mixing unrelated cleanups into the slice.

## Slice checklist
1. Name the first shippable behavior in one sentence.
2. List the minimum files/layers required for that behavior.
3. Define 2-4 acceptance criteria tied to observable results.
4. Add validation commands (targeted first, broad only if needed).
5. List deferred work and trigger for next slice.
6. Confirm "no unrelated files changed."

## Planner output requirements
- Include a "First Slice" section in the handoff.
- Include "Deferred Until Slice 2+" section.
- Keep sub-tasks scoped to delivering the first slice only.

## Worker output requirements
- Confirm completed behavior matches the planned slice.
- Report any drift from slice scope.
- Suggest the next slice, but do not implement it unless asked.
