# Falloff Taxonomy

Use the earliest stage that clearly explains where the learner left.

| Stage | Meaning | Example |
|---|---|---|
| `value_prop_falloff` | The learner does not understand why to start | "Practice with the assistant" sounds nice but not specific enough |
| `action_falloff` | The learner does not know what to tap or type | The main CTA is unclear |
| `permission_falloff` | Mic, login, or payment creates anxiety | The learner backs out before starting |
| `first_attempt_falloff` | The learner freezes before the first answer | No scaffold or starter phrase is visible |
| `feedback_falloff` | The correction is too vague, harsh, or long | The learner still does not know what to fix |
| `repair_falloff` | The learner gets feedback but no retry path | The loop breaks after correction |
| `reward_falloff` | Progress happened but did not feel rewarding | Completion feels flat or invisible |
| `next_step_falloff` | The learner finishes once and leaves | The next practice option is missing or unclear |
| `trust_falloff` | The learner worries about privacy, cost, or AI behavior | Mic or payment language is ambiguous |
| `technical_falloff` | Latency, crash, layout, or provider failure interrupts the flow | Spinners, errors, or frozen UI stop the run |

## Classification Rule

- If multiple stages fit, choose the earliest stage that a realistic learner would notice.
- Use severity and confidence separately; do not hide uncertainty inside the stage name.
