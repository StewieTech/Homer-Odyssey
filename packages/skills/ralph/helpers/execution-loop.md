# Execution loop

1. Read the target routing rules and the complete accepted issue, including comments and dependencies.
2. Confirm the issue is executable, not duplicated by an active change, and not human-gated, blocked, or still in planning.
3. Preserve unrelated local state and refresh the target-supplied remote base.
4. Create a fresh issue branch from the recorded remote base revision.
5. Implement only the accepted scope and keep deferred work explicit.
6. Run targeted checks first, then broader target validators in proportion to risk.
7. Publish one reviewable change only when target policy grants that capability.
8. Verify the review packet contains issue linkage, freshness evidence, validation, risk, and rollback.
9. Return to the queue only for another independent eligible issue, using another fresh branch.

Never stack unrelated issue branches or treat an opened review as merge permission.
