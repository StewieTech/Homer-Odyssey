# Agent Prompting

## Purpose

This file is the prompt intelligence layer for the workspace.

It exists to improve:

1. my prompting ability over time
2. the AI’s ability to help me over time
3. the quality and consistency of outputs produced for the Pariss project
4. the effectiveness of the Planner -> Worker -> Teacher -> User flow
5. the conversion of repeated prompting into reusable systems

This is not a dump of random prompts.
This is a curated prompt library plus a prompt learning system.

---

## What Belongs Here

Add content here when one of these is true:

- a prompt worked unusually well
- a prompt failed in an instructive way
- a prompt pattern is becoming reusable
- a prompt should become a standard template
- a prompt revealed a better way to sequence Planner / Worker / Teacher / User
- a wording change noticeably improved output quality
- a prompt structure worked across multiple tasks
- a prompt became useful enough to reuse in repo strategy, architecture, or system design work

---

## What Does NOT Belong Here

Do not put in this file:

- one-off casual prompts with no lasting value
- random brainstorming fragments
- raw conversation dumps
- giant prompt collections with no classification
- prompts that sound impressive but are brittle
- prompts that were never tested or compared
- notes that belong in `agent-backlog.md` or `decision-log.md` instead

---

## Relationship to Other Files

- `workspace-os.md`
  - defines the operating system of the workspace

- `agent-patterns.md`
  - defines workflows and execution patterns

- `decision-log.md`
  - records durable decisions

- `agent-backlog.md`
  - records critiques, failures, workflow friction, and optimization ideas

- `agent-prompting.md`
  - stores prompt systems, templates, comparisons, and prompting lessons

---

## Core Prompting Philosophy

Good prompting in this workspace should aim to do more than get a single answer.

A strong prompt should usually do some combination of these:

- improve the current output
- improve the structure of reasoning
- improve future reuse
- surface tradeoffs
- strengthen Planner -> Worker -> Teacher -> User handoffs
- create durable artifacts
- reduce ambiguity
- make the AI more aligned to how I think and work

The goal is not clever prompts.
The goal is reliable strategic prompts.

---

## Prompt Design Principles

### Principle 1: Frame the task before generating the answer
The stronger the framing, the stronger the output.

Use prompts that first establish:
- the real objective
- the type of task
- the level of thinking needed
- the desired artifact
- the constraints
- the evaluation standard

---

### Principle 2: Prefer structured role flow over raw generation
Default to:

**Planner -> Worker -> Teacher -> User**

Use this unless the task is trivial.

This improves:
- problem framing
- output quality
- critique quality
- learning extraction
- reusability

---

### Principle 3: Separate creation from evaluation
Do not rely on first-pass generation for important tasks.

A strong prompt often asks for:
1. framing
2. generation
3. critique
4. refinement
5. final decision

---

### Principle 4: Prompt for leverage, not just completion
Prompts should often ask:
- what is reusable?
- what should be logged?
- what pattern should be repeated?
- what pattern should be avoided?
- what becomes a durable file entry?

---

### Principle 5: Prefer prompts that compound
The best prompts improve the current task and the future system.

A prompt is especially strong when it produces:
- a result
- a lesson
- a reusable pattern
- a decision
- an improvement to future prompting

---

## Prompt Quality Checklist

Before keeping or reusing a prompt, ask:

- Did it frame the real task?
- Did it reduce ambiguity?
- Did it improve output quality?
- Did it improve critique quality?
- Did it create reusable value?
- Did it fit the Planner -> Worker -> Teacher -> User system?
- Did it help produce a better decision?
- Would I use it again?

If mostly no, do not keep it as a durable prompt.

---

# Prompt Categories

## 1. Foundation Prompts
Prompts that define how work should be done.

## 2. Strategy Prompts
Prompts used for architecture, prioritization, and long-term direction.

## 3. Build Prompts
Prompts used to generate code, files, plans, and implementation-ready outputs.

## 4. Critique Prompts
Prompts used to evaluate, optimize, and improve outputs or workflows.

## 5. Prompt Improvement Prompts
Prompts whose explicit purpose is to improve prompting itself.

## 6. Repo-Specific Prompts
Prompts specialized for Pariss / LolaLingo repo work.

---

# Standard Prompt Template

Use this as the default base when a task is important.

## Template

Act in four stages using **Planner -> Worker -> Teacher -> User**.

### Planner
- Define the real objective
- Identify the type of task
- Identify constraints
- Break the problem into parts
- Explain the best approach

### Worker
- Execute the plan directly
- Produce the artifact clearly
- Keep the result practical and implementation-ready

### Teacher
- Critique the output
- Critique the prompt
- Identify what is strong, weak, missing, or reusable
- Explain what would improve the result next time

### User
- End with the best recommendation, decision, or next move

Also include:
1. what should go into `decision-log.md`
2. what should go into `agent-backlog.md`
3. whether this result is reusable enough to become a durable pattern

---

# Reusable Prompt Templates

## Prompt 1 — Strategic Project Improvement

I am using this workspace to improve the Pariss project over time.

Use **Planner -> Worker -> Teacher -> User**.

### Planner
- Define the real improvement opportunity
- Identify the root problem, not just the surface problem
- Identify what layer this belongs to: product, architecture, workflow, prompting, repo structure, model strategy, or user feedback system
- Break the problem into the highest-leverage parts

### Worker
- Give the strongest practical recommendation
- Produce the exact artifact, framework, or plan needed
- Keep it implementation-ready and reusable

### Teacher
- Critique the answer
- Critique the framing of the problem
- Explain what this reveals about the project, my prompting, or the workflow
- Identify reusable lessons

### User
- End with the strongest next move

Also identify:
- what belongs in `decision-log.md`
- what belongs in `agent-backlog.md`
- whether this should become a durable pattern in the workspace

---

## Prompt 2 — Repo Architecture Review

Act as a strategic architecture reviewer for the Pariss project.

Use **Planner -> Worker -> Teacher -> User**.

### Planner
- Define the actual architecture decision being made
- Identify constraints and future scaling implications
- Separate reversible vs hard-to-reverse decisions
- Explain what matters most

### Worker
- Recommend the best architecture
- Explain why it is better than the alternatives
- Keep the recommendation concrete, not generic

### Teacher
- Critique the recommendation
- Identify hidden tradeoffs
- Explain what assumptions need validation
- Extract durable lessons for future architecture decisions

### User
- Conclude with what I should most likely do now

Also include:
- what is strategic
- what is tactical
- what should be logged in `decision-log.md`
- what should be logged in `agent-backlog.md`

---

## Prompt 3 — Prompt Improvement Pass

I want to improve both my prompt and the AI’s ability to help me.

Use **Planner -> Worker -> Teacher -> User**.

### Planner
- Explain what kind of prompt is needed for this task and why
- Identify missing constraints or ambiguity
- Explain the best structure for the prompt

### Worker
- Write the strongest version of the prompt
- Then write a shorter version
- Then write a reusable template version

### Teacher
- Critique all three
- Explain which one is best and when
- Identify anti-patterns in my original prompt style
- Extract reusable prompting lessons

### User
- Recommend which version I should actually use going forward

Also include:
- what belongs in `agent-prompting.md`
- what belongs in `agent-backlog.md`

---

## Prompt 4 — Workflow Optimization

I want to improve how I use AI in this workspace.

Use **Planner -> Worker -> Teacher -> User**.

### Planner
- Identify the real workflow issue
- Explain where the current flow breaks down
- Identify whether the issue is in Planner, Worker, Teacher, User, or handoff between stages

### Worker
- Propose the best upgraded workflow
- Show the workflow clearly
- Make it easy to reuse

### Teacher
- Critique the old workflow and the new one
- Explain what improvement would matter most
- Extract a reusable operating rule

### User
- Conclude with the workflow I should adopt now

Also include:
- what should be logged in `agent-backlog.md`
- whether this should change `agent-patterns.md`

---

## Prompt 5 — Durable File Generator

I want to turn this chat result into something reusable for the workspace.

Use **Planner -> Worker -> Teacher -> User**.

### Planner
- Determine whether the result deserves to become a durable file entry
- Identify which file it belongs in:
  - `workspace-os.md`
  - `agent-patterns.md`
  - `decision-log.md`
  - `agent-backlog.md`
  - `agent-prompting.md`

### Worker
- Write the exact entry in the correct format
- Keep it compressed, reusable, and clean

### Teacher
- Critique whether this truly deserves durable status
- Explain what would make the entry stronger
- Identify whether this is reusable or just locally useful

### User
- Recommend whether I should save it now, revise it, or leave it in chat only

---

# Prompt Comparison Log

Use this section to compare prompt versions that matter.

## Prompt Comparison Entry Template

### Prompt Goal
What was the prompt trying to achieve?

### Version A
Paste prompt here.

### Version B
Paste prompt here.

### Observed Difference
What changed in the output?

### Better Version
Which version was better?

### Why
Why was it better?

### Reusable Lesson
What should be remembered?

---

## Example Comparison

### Prompt Goal
Improve a repo architecture recommendation.

### Version A
“Help me improve my repo architecture.”

### Version B
“Use Planner -> Worker -> Teacher -> User. First identify the real architectural decision, then recommend the best structure, then critique the recommendation and extract reusable lessons.”

### Observed Difference
Version B produced stronger framing, more relevant tradeoffs, and reusable critique.

### Better Version
Version B

### Why
It specified role flow, evaluation, and reusable learning instead of asking for a generic answer.

### Reusable Lesson
Prompts that ask for both generation and critique are much stronger for strategic tasks.

---

# Prompt Win Log

Use this section for prompts that worked well enough to reuse.

## Prompt Win Entry Template

### Name
Short name for the prompt.

### Use Case
When should it be used?

### Prompt
Paste the prompt.

### Why It Worked
Why was it strong?

### Weaknesses
What are its limits?

### Reuse Rule
When should it be used again?

---

## Prompt Wins

### Name
Planner-Worker-Teacher strategic pass

### Use Case
Project strategy, architecture, workflow redesign, prompt optimization

### Prompt
Use **Planner -> Worker -> Teacher -> User**.

Planner:
- define the real objective
- identify constraints
- break the problem into parts
- explain the best approach

Worker:
- execute directly
- produce the artifact clearly
- keep it practical

Teacher:
- critique the output
- critique the prompt
- identify reusable lessons
- explain what should be logged

User:
- end with the best recommendation or next move

Also include:
- what belongs in `decision-log.md`
- what belongs in `agent-backlog.md`

### Why It Worked
It reliably improves structure, output quality, and learning extraction.

### Weaknesses
May be too heavy for trivial questions.

### Reuse Rule
Use for substantial tasks with strategic or reusable value.

---

# Prompt Failure Log

Use this section for failed or weak prompts that taught something important.

## Prompt Failure Entry Template

### Prompt
Paste the weak prompt.

### Failure Type
Ambiguous / Too broad / Too clever / Underconstrained / No critique / Wrong abstraction / Other

### What Went Wrong
What happened?

### Root Cause
Why did it happen?

### Better Prompt
What should replace it?

### Lesson
What should be remembered?

---

## Prompt Failures

### Prompt
“Help me with this project.”

### Failure Type
Too broad

### What Went Wrong
The answer was generic, under-targeted, and not well structured.

### Root Cause
The prompt did not define the task type, desired artifact, or evaluation criteria.

### Better Prompt
“Use Planner -> Worker -> Teacher -> User. First define the real problem in the Pariss project, then produce the strongest practical recommendation, then critique both the output and the prompt, and end with what should be logged.”

### Lesson
Broad prompts create broad answers. Strategic tasks need structure.

---

# Anti-Patterns in Prompting

Watch for these:

- asking for output without framing the task
- asking for strategy without asking for tradeoffs
- asking for generation without asking for critique
- overloading the prompt with too many unrelated goals
- using highly elaborate wording that does not improve clarity
- writing prompts that sound smart but do not improve the result
- failing to ask what should be saved for reuse
- keeping prompts that were never validated against alternatives

---

# Prompt Improvement Queue

Use this for prompts worth revising later.

## Improvement Entry Template

### Prompt Name
### Current Problem
### Proposed Revision
### Why It Might Be Better
### Test Plan
### Status

---

## Improvement Entry Template

### Prompt Name
### Current Problem
### Proposed Revision
### Why It Might Be Better
### Test Plan
### Status

---

# Durable Prompt Promotion Rule

A prompt should become a durable entry in this file only if it is:

- reusable
- tested or clearly promising
- strategically useful
- better than a generic alternative
- relevant to how this workspace operates

A prompt should not be promoted just because it sounded good once.

---

# Long-Term Aim

Over time, this file should help create:

- stronger prompt instincts
- more repeatable high-quality outputs
- better Planner -> Worker -> Teacher -> User execution
- a more aligned AI collaborator
- a smarter strategy layer around the Pariss project
- a compounding prompt system instead of ad hoc prompting