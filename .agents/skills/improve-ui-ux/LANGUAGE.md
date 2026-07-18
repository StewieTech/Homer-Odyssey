# UI/UX Language

Shared vocabulary for product experience reviews. Do not use these terms as decoration. Use a term when it explains a concrete user behavior, product risk, or design decision.

## Interaction Design

**Direct manipulation**
The user changes something by acting on the object itself instead of using detached controls.
Use when reviewing drag/drop, inline editing, replay controls, annotation flows, scenario builders, or comparison views.
Design implication: prefer interfaces where the user can act on the work directly instead of navigating through abstract menus.

**Affordance**
What an object appears to make possible.
Use when a visual element suggests action or non-action.
Design implication: controls should look actionable only when they are actionable.

**Signifier**
A visible cue that tells the user how to interact.
Use when an affordance is real but not obvious.
Design implication: add labels, icons, motion, position, or state cues that make the action legible.

**Feedback**
The system response that confirms an action was seen and explains what changed.
Use when actions feel uncertain, silent, or delayed.
Design implication: every meaningful user action needs immediate, specific feedback.

**Constraints**
Limits that prevent invalid actions or reduce impossible choices.
Use when users can enter a broken path.
Design implication: prevent mistakes before relying on error copy.

**Reversibility**
The user's ability to undo, revise, retry, or recover.
Use when a flow asks for commitment or exposes failure.
Design implication: make key task, feedback, and account actions feel safe to explore.

**Progressive disclosure**
Showing the next useful layer only when the user needs it.
Use when a screen overwhelms with options, copy, or configuration.
Design implication: keep the primary path obvious and reveal advanced options later.

**Recognition over recall**
The user recognizes visible choices instead of remembering hidden facts.
Use when the next action depends on prior copy, memory, or hidden instructions.
Design implication: keep options, examples, state, and context visible near the decision.

**Forgiving UI**
An interface that expects mistakes and makes recovery easy.
Use when user input, feedback-heavy workflows, or payment/account flows could create shame or anxiety.
Design implication: soften failure, keep retry paths close, and avoid dead ends.

**Invisible interface**
An experience where the mechanism gets out of the user's way.
Use when controls, chrome, or explanations compete with the real task.
Design implication: make the core action feel direct and fluent, not administrative.

## Cognitive Load

**Mental model**
The user's internal explanation of how the product works.
Use when the UI contradicts what the user expects.
Design implication: align labels, navigation, states, and feedback with the model the product wants to teach.

**Cognitive friction**
Extra thinking required before the user can act.
Use when a screen is technically usable but mentally effortful.
Design implication: remove decisions, clarify hierarchy, or make the next step visible.

**Information scent**
The cues that tell a user where an action or answer is likely to be.
Use when navigation or copy does not promise the right destination.
Design implication: labels should forecast what the user gets next.

**Decision fatigue**
Quality loss caused by too many choices.
Use when a screen asks a beginner to configure before they understand value.
Design implication: choose smart defaults and stage decisions.

**Attention hierarchy**
The order in which the UI pulls the eye.
Use when the most important thing is not visually dominant.
Design implication: align size, spacing, contrast, position, and motion with the task priority.

**Working-memory burden**
The amount the user must hold in mind to complete the task.
Use when important context disappears between steps.
Design implication: keep working context, feedback, progress, and choices visible where they are used.

## Product Experience

**Time to first value**
How quickly a user reaches the first meaningful outcome.
Use when onboarding, signup, permissions, setup, or explanation delays value.
Design implication: shorten the path to the first useful conversation, completed task, or helpful correction.

**Activation moment**
The point where the user understands why the product matters to them.
Use when evaluating onboarding and early journeys.
Design implication: design toward a memorable first success, not mere account creation.

**Friction map**
A list of hesitations, dead ends, unclear choices, and trust gaps in a flow.
Use for screen-flow reviews.
Design implication: prioritize the friction that blocks confidence or completion.

**Confidence loop**
A repeated cycle of attempt, feedback, retry, and visible progress.
Use for iterative workflows and feedback-heavy systems.
Design implication: make progress observable and retry safe.

**Trust cue**
A visible signal that helps the user believe the product is safe, competent, and honest.
Use for account, payment, privacy, AI, and correction moments.
Design implication: explain sensitive actions at the moment trust is needed.

**Perceived intelligence**
The product feeling context-aware, timely, and helpful.
Use when AI behavior feels generic, random, overbearing, or under-responsive.
Design implication: show that the assistant or feedback system understands the user's context and recent action.

**Emotional safety**
The user feels they can make mistakes without embarrassment or punishment.
Use for correction, pronunciation, placement, and practice flows.
Design implication: correction should feel like support, not exposure.

## Premium Feel

**Visual hierarchy**
The structured ordering of importance on the screen.
Design implication: the primary task should win without shouting.

**Spacing rhythm**
Consistent breathing room that makes the screen feel intentional.
Design implication: irregular spacing reads as unfinished even when logic is correct.

**Typography confidence**
Type choices that feel clear, stable, and intentional.
Design implication: reserve large type for true priority; keep tool surfaces tighter.

**Motion semantics**
Motion that communicates cause, continuity, state, or feedback.
Design implication: animation should explain the product, not decorate it.

**State polish**
Loading, empty, disabled, success, error, and in-progress states that feel designed.
Design implication: unresolved states make the product feel cheap.

**Perceived performance**
How fast and responsive the product feels, regardless of actual latency.
Design implication: acknowledge input immediately and mask waits with useful feedback.

## Optional Product-Specific Concepts

Adapt these to your own domain when the product has a strong internal vocabulary:

**First meaningful interaction**
The first moment the user experiences the core value in a way that feels real.

**First meaningful feedback**
The first feedback moment that proves the product can guide improvement without making the user feel punished.

**Confidence-building loop**
A cycle where the user attempts something, gets useful feedback, tries again, and sees visible progress.

**Practice flow**
A journey that lets users rehearse or simulate a real task before higher-stakes use.

**User agency**
The user's control over pacing, retrying, accepting, skipping, or deepening feedback.

**Feedback timing**
The decision of when feedback appears: inline, after the action, after the scenario, or on request.
