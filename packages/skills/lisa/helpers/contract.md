# Evidence contract

## Actor record

The actor record names the scenario, persona or operating perspective, environment, steps executed, state transitions, content-minimized observations, artifact references, and actor confidence. It contains no evaluator judgment and no raw private content.

## Evaluator record

The evaluator consumes the immutable actor record and emits rubric scores, overall gate, severity, confidence, dedupe state, and exactly one next lane. It never rewrites the actor evidence or claims facts that the evidence does not prove.

## Valid outcomes

- `PASS`: one or more evidence-backed findings clear the target's routing threshold.
- `NO_OP`: the run completed but no finding clears the threshold.
- `BLOCKED`: prerequisites, tooling, permissions, or evidence completeness prevent a reliable result.

A routed packet includes the source run, content-free finding summary, reproduction signal, evidence references, confidence, and recommended next owner. Findings involving policy, trust, privacy, billing, entitlement, legal, production, or other human judgment stop at the target governance lane.
