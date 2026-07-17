# Gate review contract

For each target-owned gate, record one outcome:

- `BECAME_MORE_PROVABLE`: durable evidence improved inspectability or repeatability.
- `UNCHANGED`: activity occurred but did not improve proof.
- `REGRESSED`: new evidence reduced confidence or exposed a blocker.
- `GAP_IDENTIFIED`: the gate is claimed but cannot be proven.
- `READY_FOR_HUMAN_DECISION`: evidence is current and the remaining action is approval.
- `HUMAN_BLOCKED`: policy, legal, billing, auth, privacy, production, or strategic judgment is required.

Ask what changed, what proves it, whether the evidence matches the target environment and revision, whether another reviewer can reproduce it, what still blocks judgment, and which action requires approval. Silent merge, deploy, publication, production mutation, policy change, credential access, customer communication, and accepted-decision mutation are forbidden by default.
