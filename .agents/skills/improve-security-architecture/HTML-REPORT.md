# HTML Report Format

The security review is rendered as a single self-contained, sanitized HTML file at `docs/security/security-architecture-report-<timestamp>.html`. Create `docs/security` lazily if it does not exist yet. Tailwind and Mermaid both come from CDNs. Mermaid handles trust-boundary graphs, request flows, and sequence diagrams well; tables, callouts, and finding cards should be hand-built HTML so the report still feels editorial instead of auto-generated.

If the review is being published by an issue-factory automation, follow `.agents/skills/issue-factory-core/SKILL.md` instead and write the artifact to `docs/reports/issue-factory/<automation-id>/<YYYY-MM-DD>-<slug>/report.html`.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Security architecture report - {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .severity-critical { background: #7f1d1d; color: #fff; }
      .severity-high { background: #b91c1c; color: #fff; }
      .severity-medium { background: #b45309; color: #fff; }
      .severity-low { background: #475569; color: #fff; }
      .boundary { border-style: dashed; }
      .surface-chip { border: 1px solid #cbd5e1; }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="summary">...</section>
      <section id="trust-boundaries">...</section>
      <section id="top-risks">...</section>
      <section id="findings">...</section>
      <section id="actions">...</section>
      <section id="evidence">...</section>
    </main>
  </body>
</html>
```

## Header

Show:
- repo name
- generated date
- audit scope (for example `auth/session`, `billing/webhooks`, `provider integrations`)
- supported environments in scope
- blast-radius summary
- confidence level

Use a compact legend if you are drawing trust-boundary diagrams or request-flow diagrams.

## Summary strip

Use a small row of cards for fast scanning:
- top risk
- number of medium+ findings
- highest availability impact
- validation strength or missing evidence

Keep it short. The report should be answer-first.

## Trust boundaries section

Always include at least one visual that makes the trust model legible. Mermaid is usually the right choice here.

Good uses:
- client -> API -> datastore -> provider flow
- webhook ingress path
- signed URL or token handling path
- environment/config trust chain

Example:

```html
<div class="rounded-xl border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      Web[Web Client]
      Native[Native Client]
      API[API Routes]
      DB[(MongoDB)]
      Stripe[Stripe]
      OpenAI[OpenAI]
      Ops[Deploy Config]

      Web --> API
      Native --> API
      API --> DB
      Stripe --> API
      API --> OpenAI
      Ops -. config .-> API
  </pre>
</div>
```

## Top risks table

Include a ranked table with:
- rank
- finding
- severity
- likelihood
- availability impact
- status

This is the fastest entry point for readers deciding whether to drill into the finding cards.

## Finding card template

Each major finding should be one `<article>` card with:

- title
- badge row for severity, likelihood, routing tag, and topic area
- why this matters
- affected surfaces or files
- sanitized failure scenario
- control gap or expected secure behavior
- evidence anchors
- OWASP Top 10:2025 mapping
- ASVS-style mapping
- recommended next action
- validation needed

Keep the failure scenario abstract. Describe the trust failure, not the exact misuse procedure.

## Required sections after the findings

Include these sections somewhere after the finding cards:
- Recommended GitHub issues
- Safe AFK tasks
- Human-gated tasks
- Validation plan
- Evidence anchors appendix

The GitHub issue titles should be copy-pastable. The validation plan should name the strongest available commands or checks, not vague prose.

## Safety and sanitization rules

The HTML file is a durable repo artifact. Treat it as sanitized by default.

Do not include:
- secrets
- bearer tokens
- password reset or verification links
- runnable attack code
- step-by-step abuse instructions
- exact rate-limit bypass recipes
- provider-specific operational abuse detail
- customer or user private data

If a Medium+ finding needs deeper detail, keep it in local working notes rather than the durable HTML artifact or issue tracker.

## Style guidance

- Lean editorial, not dashboard-heavy.
- Use whitespace generously.
- Prefer stone, slate, red, amber, and emerald accents.
- Keep tables readable on laptop screens.
- Use `font-mono text-sm` for file paths and evidence anchors.
- Use serif headings only if they improve readability; do not make the report decorative.
- Keep the report static. No app code, no interactive controls, no client-side data fetching.

## Tone

Plain, evidence-first, and specific.

Name:
- trust boundaries
- sensitive assets
- attack surfaces
- control gaps
- blast radius
- supported environment contract

Every recommendation should make the routing obvious:
- `agent-ready`
- `human-gated`
- `report-only`

Do not bury the top risk. Lead with it.
