# Portable QA harness

## Thin pass

Use one actor scenario and one evaluator pass when a narrow smoke or regression signal is enough. Return a minimal evidence packet and an explicit lane result.

## Thin-medium pass

Use up to two bounded actor scenarios and one evaluator pass when broader confidence is useful. Merge only references and content-minimized observations; do not merge actor and evaluator roles.

## Required gates

1. Resolve the target-owned scenario, environment, evidence rules, and rubric.
2. Execute actor steps and capture artifacts before judging the outcome.
3. Score reproducibility, evidence completeness, impact, role separation, and privacy hygiene.
4. Route reproducible findings to analysis or planning; route governance ambiguity to a human gate.
5. Return `NO_OP` or `BLOCKED` when the evidence cannot support a finding.

No issue or mutation follows from this harness unless the target's dedupe, readiness, and authority gates independently allow it.
