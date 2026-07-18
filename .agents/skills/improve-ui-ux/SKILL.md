---
name: improve-ui-ux
description: Review and improve UI/UX, product experience, onboarding, screen flows, interaction design, visual polish, accessibility, and premium feel. Use when the user asks for product critique, UX audit, HCI language, screen-by-screen review, frontend experience improvements, or durable UX decisions for your product/the project.
---

# Improve UI/UX

## Purpose

Turn product experience critique into concrete design and implementation direction. This skill is not a glossary by itself: use the reference files to make review language precise, then convert that language into changes to screens, flows, states, copy, motion, and accessibility.

## Reference Files

Load only what the task needs:

- [LANGUAGE.md](LANGUAGE.md) - shared HCI, UX, product experience, premium feel, and your product-specific vocabulary.
- [RUBRIC.md](RUBRIC.md) - scoring criteria for consistent product experience reviews.
- [PREMIUM-FEEL.md](PREMIUM-FEEL.md) - taste, polish, perceived quality, and brand feel.
- [INTERACTION-PATTERNS.md](INTERACTION-PATTERNS.md) - reusable patterns such as direct manipulation, feedback loops, progressive disclosure, and forgiving UI.
- [SCREEN-REVIEW.md](SCREEN-REVIEW.md) - screen-by-screen audit format.
- [UX-ADR.md](UX-ADR.md) - template for durable interface/product experience decisions.

## Review Flow

1. Identify the user goal.
   - What is the user trying to accomplish?
   - Why does this screen or flow exist?

2. Check the first impression.
   - What does the user understand in the first 3 seconds?
   - What feels premium, generic, cheap, safe, confusing, or unfinished?

3. Map the interaction model.
   - What can the user directly manipulate?
   - What is hidden, delayed, detached, or indirect?
   - Where does the interaction rely on memory instead of recognition?

4. Build a friction map.
   - Where does the user hesitate?
   - Where are there too many decisions?
   - Where is the next action unclear?
   - Where does the screen ask for trust before earning it?

5. Review feedback and state.
   - Loading
   - Empty
   - Success
   - Error
   - Disabled
   - In-progress
   - Correction/result states

6. Review the learning loop.
   - Does the user practice?
   - Does the coach correct at the right moment?
   - Does the user feel progress, agency, and emotional safety?

7. Review premium polish.
   - Spacing, typography, contrast, hierarchy, copy, icon quality, motion, state polish, and perceived performance.

8. Review accessibility.
   - Keyboard and screen-reader support
   - Contrast
   - Readable sizes
   - Touch targets
   - Reduced-motion behavior

9. Run comparative benchmarking when impact is high.
   - Use this pass for high-impact screens/flows, redesign options, onboarding, paywalls, core chat/learning loops, or when the user explicitly asks.
   - Compare against 5-10 relevant best-in-class apps selected by interaction pattern, not brand prestige.
   - Benchmark interaction patterns can include onboarding, chat, discovery, saving, correction, progress, trust, feed, social proof, and paywall.
   - Example benchmark set (vary by task): Hinge, Instagram, Pinterest, Duolingo, Airbnb, ChatGPT, Spotify, Headspace, Notion.
   - Rank the current design or options on first 3-second clarity, interaction directness, emotional safety, state polish, premium feel, and time to first value.

10. Recommend concrete changes.
   - Must-fix: blocks clarity, trust, safety, accessibility, or completion.
   - Should-fix: meaningful UX lift with bounded scope.
   - Polish: perceived quality, delight, or finish.
   - Experiment: valuable but uncertain; needs evidence.

## Output Discipline

Make the critique behavioral, not decorative. Prefer statements like:

- "This violates direct manipulation because the learner has to leave the phrase to edit it."
- "This increases cognitive load because the next action depends on remembering prior copy."
- "This correction moment feels unsafe because the tone exposes failure before offering recovery."
- "This feels cheap because loading, spacing, copy, and disabled states are unresolved."

Every review should end with concrete redesign or implementation direction. A glossary term is useful only when it changes the recommendation.
When benchmark calibration is used, lead with the strongest decision point and include a confidence percentage before the supporting analysis.

## Implementation Mode

When the user asks for changes, inspect the existing frontend conventions before editing. Preserve local components, routes, tokens, and patterns unless the UX problem requires changing them.

Prefer the smallest validated change that improves the user journey. Verify user-facing UI changes with screenshots or browser checks when a runnable local target is available.

## Durable Decisions

Use [UX-ADR.md](UX-ADR.md) when a UI/UX decision is hard to reverse, surprising without context, and the result of a real tradeoff. Examples: navigation model, chat interaction model, correction timing, onboarding path, paywall timing, or the shape of the first-value moment.
