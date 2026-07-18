# UX ADR Format

Use a UX ADR when a product experience decision is durable enough that future agents should not re-litigate it without context.

Create UX ADRs in `docs/adr/` unless the repo already has a more specific decision-log location.

## When to Write One

All three must be true:

1. Hard to reverse - the cost of changing the interface model later is meaningful.
2. Surprising without context - a future reader would wonder why this product choice exists.
3. Real tradeoff - there were plausible alternatives with different product costs.

Good candidates:
- Navigation model
- Chat interaction model
- Correction timing
- Onboarding path
- Placement or activation model
- Paywall timing
- Voice permission timing
- Whether the coach interrupts, waits, or responds on request

Skip ADRs for:
- Small visual polish
- Copy tweaks
- Local component refactors
- Reversible layout experiments
- Obvious accessibility fixes

## Template

```md
# {Short product experience decision}

{1-3 sentences: what context forced the decision, what was chosen, and why.}
```

## Optional Sections

Only include these when they add value:

- **Status**: proposed, accepted, deprecated, superseded by ADR-NNNN
- **Considered Options**: rejected alternatives worth remembering
- **Consequences**: non-obvious downstream effects
- **Validation**: how the decision should be checked in product usage

## UX-Specific Questions

Before writing the ADR, answer:

- What user goal does this protect?
- What tradeoff are we accepting?
- What future suggestion should this prevent from recurring?
- What evidence would justify revisiting it?
