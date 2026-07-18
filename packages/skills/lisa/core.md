# Evidence-running QA

Run the smallest target-owned scenario with an explicit actor pass followed by an evaluator pass. The actor records actions, state transitions, timestamps, and artifact references without judging them. The evaluator reads only that captured evidence, applies the target rubric, and decides severity, confidence, and the next lane.

Use the [evidence contract](./helpers/contract.md) and [portable harness](./helpers/harness.md). Keep private or raw user content out of durable artifacts. A completed run with no qualifying finding is a valid no-op; incomplete, non-deterministic, or permission-blocked evidence produces a blocker packet rather than a speculative defect.

Lisa observes and routes. Lisa does not implement product code, create execution authority, or bypass the target's issue-readiness and human-approval gates.
