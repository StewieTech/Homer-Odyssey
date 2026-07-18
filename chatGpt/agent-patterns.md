# Agent Patterns

## Purpose

This file captures the reusable workflows, patterns, prompt structures, and execution logic used in this workspace.

Its main purpose is to make work more consistent, strategic, and compounding.

The dominant workflow is:

**Planner -> Worker -> Teacher -> User**

---

## Master Flow

## 1. Planner

### Purpose
Convert the user's idea, problem, or request into a structured plan.

### Responsibilities
- identify the real objective
- identify constraints
- reduce ambiguity
- decompose into parts
- determine the order of attack
- identify what level of thinking is needed
- decide whether the task is strategic, tactical, evaluative, architectural, or creative

### Planner Outputs
Examples:
- problem framing
- decomposition
- architecture options
- work plan
- task ordering
- success criteria
- risk list
- evaluation rubric

### Planner Questions
Use these internally when useful:
- What is the real task?
- What type of task is this?
- What is the user actually optimizing for?
- What are the constraints?
- What should be produced?
- What should not be produced?
- What is reusable vs one-off?
- What is the highest-leverage path?

---

## 2. Worker

### Purpose
Execute the plan.

### Responsibilities
- generate the artifact
- solve the problem
- write the code
- draft the file
- create the prompt
- propose the architecture
- perform the analysis
- operationalize the plan

### Worker Outputs
Examples:
- code
- markdown files
- workflow docs
- prompt systems
- repo structures
- analysis
- implementation plans
- architectural recommendations
- strategy docs

### Worker Standard
The Worker should aim for:
- clarity
- correctness
- usefulness
- structure
- execution-readiness
- low ambiguity
- high signal

---

## 3. Teacher

### Purpose
Improve both the output and the system that produced the output.

### Responsibilities
- critique the result
- critique the prompt
- critique the workflow
- critique the reasoning pattern
- identify what could be reused
- identify what should be logged
- convert trial-and-error into durable learning

### Teacher Outputs
Examples:
- lessons learned
- improved prompt version
- anti-patterns
- evaluation notes
- workflow upgrades
- critique summaries
- reusable heuristics

### Teacher Questions
- What is strong here?
- What is weak here?
- What was missing?
- What assumptions were wrong?
- What prompt would have made this better?
- What pattern should be repeated?
- What pattern should be avoided?
- What belongs in `agent-backlog.md`?
- What belongs in `decision-log.md`?

---

## 4. User

### Purpose
Select, judge, and direct.

### Responsibilities
- choose direction
- approve or reject options
- prioritize
- decide what becomes durable
- determine what matters most
- make final tradeoff calls

### User Principle
The system supports judgment; it does not replace it.

---

# Default Task Modes

## Mode A — Strategy Mode

Use when:
- exploring direction
- evaluating architecture
- comparing systems
- thinking long-term
- deciding how to improve the repo or workflow over time

Flow:
Planner heavy -> Worker medium -> Teacher heavy -> User decision

Outputs:
- strategy memo
- tradeoff analysis
- roadmap
- architecture recommendation
- prioritization framework

---

## Mode B — Build Mode

Use when:
- writing files
- generating prompts
- creating workflows
- producing code
- drafting repo structure

Flow:
Planner medium -> Worker heavy -> Teacher medium -> User selection

Outputs:
- code
- markdown docs
- templates
- scripts
- workflow files
- instructions

---

## Mode C — Critique Mode

Use when:
- evaluating existing prompts
- evaluating workflow quality
- improving agent performance
- diagnosing why something worked or failed

Flow:
Planner medium -> Worker low -> Teacher heavy -> User decision

Outputs:
- critique
- prompt revision
- anti-pattern list
- rubric
- failure analysis
- optimization ideas

---

## Mode D — Compounding Mode

Use when:
- something should become reusable
- a repeated pattern is emerging
- a prompt or workflow is starting to matter repeatedly
- lessons need to be turned into durable operating knowledge

Flow:
Planner medium -> Worker medium -> Teacher heavy -> User decision

Outputs:
- durable file entry
- reusable pattern
- saved template
- workflow standard
- operating rule

---

# Prompt Design Principles

## Principle 1: Ask for roles, not just answers
Prefer prompting with a thinking structure.

Example pattern:
- first frame as Planner
- then execute as Worker
- then critique as Teacher
- then summarize for User judgment

---

## Principle 2: Convert vague asks into operating structure
Weak:
- “help me improve this”

Better:
- “Act as Planner first. Diagnose the real problem, identify constraints, then switch to Worker and produce the best artifact. Then switch to Teacher and critique both the artifact and the prompt itself.”

---

## Principle 3: Always try to extract reusable value
A good task should ideally produce one of:
- a result
- a lesson
- a reusable template
- a system improvement
- a decision

Best case: it produces more than one.

---

## Principle 4: Separate generation from evaluation
Do not fully trust first-pass generation.

Default pattern:
- create
- critique
- refine
- save lessons

---

## Principle 5: Preserve strategic context
When discussing implementation details, keep connection to:
- repo quality
- product direction
- workflow leverage
- prompting leverage
- future reuse

---

# Reusable Prompt Skeletons

## Skeleton 1 — Full Planner/Worker/Teacher Pass

Act in four stages:

1. **Planner**
   - Define the real objective
   - Identify constraints
   - Break the problem into parts
   - Explain the best approach

2. **Worker**
   - Execute the plan
   - Produce the artifact directly
   - Keep it practical and implementation-ready

3. **Teacher**
   - Critique the output
   - Critique the prompt
   - Explain what would make the result stronger next time
   - Extract reusable lessons

4. **User**
   - End with the best decision or next move

Optimize for reuse, strategic leverage, and project improvement.

---

## Skeleton 2 — Repo Improvement Prompt

I am using this workspace to improve the Pariss repo over time.

First act as **Planner**:
- identify the real improvement opportunity
- diagnose root causes
- identify architectural or workflow implications
- propose the best structure

Then act as **Worker**:
- produce the exact recommendation, file, code, or structure needed

Then act as **Teacher**:
- explain what this reveals about my prompting, repo design, or agent workflow
- capture what should be logged as a reusable lesson

End with:
- what should go into `decision-log.md`
- what should go into `agent-backlog.md`

---

## Skeleton 3 — Prompt Optimization Prompt

I want to improve both my prompt and the system that responds to it.

Use this sequence:

- **Planner**: explain what kind of prompt this should be and why
- **Worker**: write the strongest version of the prompt
- **Teacher**: critique the prompt and produce a better version if needed
- **User**: recommend when to use this prompt in the future

Also identify:
- reusable prompt patterns
- anti-patterns
- what should be saved to `agent-backlog.md`

---

## Skeleton 4 — Architecture Evaluation Prompt

Act as a strategic architecture reviewer for the Pariss project.

Use Planner -> Worker -> Teacher -> User.

- Planner: identify the real architectural decision
- Worker: give the strongest recommended architecture
- Teacher: critique the design, expose tradeoffs, and extract durable lessons
- User: conclude with the decision I should likely make now

Also note:
- what is strategic
- what is tactical
- what is reversible
- what is expensive to change later

---

# Logging Rules

Log to `agent-backlog.md` when:
- a prompt underperformed
- a workflow felt clumsy
- a repeated failure pattern shows up
- a critique should influence future prompting
- an experiment should be run
- a better prompt structure is discovered

Log to `decision-log.md` when:
- a durable decision is made
- a meaningful architecture choice is made
- a workflow standard is chosen
- a naming/system convention is adopted
- a strategic direction is selected

---

# Quality Checklist

Before finalizing important work, check:

- Was the task properly framed?
- Was the right mode used?
- Did the Worker produce something concrete?
- Did the Teacher extract reusable lessons?
- Was the final answer strategic, not just locally correct?
- Is there something worth saving into a durable file?
- Did the response strengthen future work, not just current work?

---

# Anti-Patterns

Avoid these patterns:

## Anti-Pattern 1: Worker-only output
Jumping straight into output without framing.

## Anti-Pattern 2: Planner without execution
Good analysis with no usable artifact.

## Anti-Pattern 3: No Teacher pass
Useful answer but no learning extracted.

## Anti-Pattern 4: Saving everything
Not every thought deserves to become a durable file.

## Anti-Pattern 5: Overcomplicated prompting
A prompt that is elaborate but brittle is worse than a clear prompt that works repeatedly.

---

# Long-Term Aim

Over time, this file should help create:

- stronger prompting habits
- more reusable workflows
- better repo strategy
- higher-quality project decisions
- a more aligned AI collaborator
- a compounding intelligence system around the Pariss project