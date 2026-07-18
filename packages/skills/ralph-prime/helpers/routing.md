# Planning routing contract

Route to exactly one lane:

- `EXECUTION_READY`: a reversible, one-change-sized slice has concrete acceptance criteria, resolved blockers, validation, and target-granted authority.
- `PLANNING_REQUIRED`: scope, dependencies, acceptance, architecture, or recovery still needs evidence-backed planning.
- `HUMAN_REQUIRED`: product direction, policy, auth, billing, entitlements, credentials, privacy, legal, production, destructive migration, or another reserved judgment remains.

Planning provenance is not execution state. When planning produces an executable slice, remove planning blockers according to target policy before marking it ready. Close or reject work only with a durable evidence-backed reason that implementation should not continue; otherwise route valid work forward.
