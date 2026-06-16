# Rubric

Score each metric from 1 to 5 using evidence, not taste.

| Metric | Weight | What 5 looks like | Gate |
|---|---:|---|---|
| Learning loop completion | 16 | Prompt -> attempt -> correction -> repair -> reward -> next step completes cleanly | `< 3` fails |
| Correction usefulness | 13 | the coach identifies the actual mistake and gives a usable next move | `< 3` fails |
| Time to first value | 11 | The learner reaches a meaningful learning moment quickly | `< 3` fails onboarding/entry |
| Adaptive next step quality | 10 | The next challenge matches level, mistake, and goal | none |
| Dialogue naturalness | 9 | the assistant feels conversational, not form-like | none |
| Emotional safety / motivation | 9 | Feedback is low-shame and confidence-building | none |
| Scenario realism / context grounding | 8 | The practice situation feels real and specific | none |
| Responsiveness / game feel | 8 | The app feels fast, tactile, and rewarding | none |
| UI clarity / premium feel / accessibility | 8 | The next action is obvious and usable | none |
| Trust, privacy, and recovery | 8 | Mic/login/cost/error recovery is clear and safe | `< 2` human-gated |

## Scoring Guide

- `5` = excellent, no meaningful friction.
- `4` = good, only minor polish issues.
- `3` = usable but clearly weaker than it should be.
- `2` = friction likely causes drop-off.
- `1` = broken, confusing, unsafe, or trust-damaging.

## Gate Rule

- A strong total score does not override the gates above.
- If learning loop completion or correction usefulness fails, the run fails regardless of polish.
- If trust/privacy/recovery fails at severity `S0` or `S1`, stop and route to a human.
