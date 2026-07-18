# Model Tier Signals

Default principle: prefer the cheapest model that can execute safely.

Use lower-cost Worker model when:
- Scope is stable and file list is known.
- Sub-tasks are mostly mechanical or localized.
- Acceptance criteria are explicit and validation is straightforward.

Use stronger Planner model when:
- Task is cross-cutting with evolving file boundaries.
- There are unresolved architecture or tradeoff decisions.
- The problem is ambiguous and requires deeper decomposition.
- Risk of regressions is high without stronger upfront reasoning.

Downgrade trigger:
- Plan is decision-complete and no strategic unknowns remain.

Upgrade trigger:
- New unknowns appear that change architecture, sequencing, or risk profile.
