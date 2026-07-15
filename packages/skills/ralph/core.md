# Bounded issue execution

Execute one accepted issue on one fresh branch. Preserve unrelated state, change only in-scope files, run the strongest relevant checks, and publish one reviewable result.

Use the [worker contract](./helpers/contract.md). Write and tracker permissions remain target-gated, and the worker never grants itself merge or production authority.
