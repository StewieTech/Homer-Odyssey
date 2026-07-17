# Issue-shaping contract

A shaped finding names a content-free summary, surface, reproduction steps, actual and expected behavior, impact, severity, confidence, evidence references, first vertical slice, acceptance criteria, non-goals, likely seams when known, validation, deferred work, and blockers.

Before proposing new work, compare the finding with open work, recent changes, and relevant durable registers. Return `duplicate`, `extends-existing`, or `not-worth-it` instead of creating parallel scope.

Execution-ready routing requires a reproducible, reversible, one-change-sized slice with resolved blockers. Cross-cutting or acceptance-ambiguous work routes to planning. Policy or human-judgment boundaries route to governance. Raw user content, secrets, private payloads, and token-level artifacts never enter the shaped packet.
