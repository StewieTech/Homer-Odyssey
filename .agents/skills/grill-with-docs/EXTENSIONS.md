# Domain Extensions

`grill-with-docs` is the critique engine. It should not become the home for every domain glossary.

Before grilling a document, classify the document type. If the document concerns UI, UX, product experience, onboarding, screens, interaction design, visual polish, user flows, or premium look and feel, load the UI/UX extension files:

- `../improve-ui-ux/LANGUAGE.md`
- `../improve-ui-ux/RUBRIC.md`
- `../improve-ui-ux/PREMIUM-FEEL.md`

For implementation-oriented product work, also load:

- `../improve-ui-ux/INTERACTION-PATTERNS.md`
- `../improve-ui-ux/SCREEN-REVIEW.md`

For durable interface decisions, use:

- `../improve-ui-ux/UX-ADR.md`

## Design Grill Pass

When grilling a UI/UX or product design document, ask:

- What user goal is this screen or flow serving?
- What interaction model is implied?
- What can the user directly manipulate?
- Where is the cognitive load?
- Where does the interface fail to give feedback?
- Where does the interface feel cheap, generic, unsafe, or untrustworthy?
- What should be removed, clarified, elevated, or made more direct?
- What decision is durable enough to record?

## Extension Rule

Keep domain intelligence in the domain skill. Add only routing and loading instructions here.
