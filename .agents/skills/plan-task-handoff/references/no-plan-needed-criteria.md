# No Plan Needed Criteria

Skip deep planning only when all are true:

- The change is a trivial edit (single-file or tightly scoped).
- Desired behavior is explicit and unambiguous.
- No architecture or API design decision is required.
- Validation is obvious and quick.
- Rework risk is low and rollback is easy.

If any item fails, run full planning.

No Plan Needed output should include:
- Task summary in one sentence.
- Exact file(s) to touch.
- Minimal validation command(s).
- Explicit note: no broader planning artifact required.
