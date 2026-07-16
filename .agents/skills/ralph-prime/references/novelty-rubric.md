# Novelty and risk rubric

Score planning novelty from zero through five:

- `0`: mechanical or documentation-only maintenance.
- `1`: a known pattern with low blast radius.
- `2`: bounded behavior polish within an existing model.
- `3`: meaningful behavior change with tradeoffs.
- `4`: a new feature, workflow, or architecture direction.
- `5`: policy, security, billing, auth, legal, privacy, production, destructive migration, or effectively irreversible architecture.

Low scores may route to execution only when acceptance, blockers, validation, reversibility, and one-change scope are all clear. Middle scores remain in planning until option analysis and a first slice are complete. Hard human boundaries always route to the target's human gate regardless of score.
