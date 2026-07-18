# Worker safety contract

Stop before implementation when the issue would decide auth or session policy, billing or entitlements, production configuration, credential rotation, destructive migration, legal or privacy commitments, product direction, broad architecture, or another unresolved human judgment.

Use a reversible sandbox: one branch, one reviewable change, target-approved tools, no production side effects, and validation before handoff. External providers should use mocks or read-only evidence where possible; never expose keys or sensitive payloads.

If validation fails, repair only failures caused within the accepted scope. Otherwise capture the failing command and evidence, preserve the branch, and route to the target's recovery or planning lane. Merge and production action remain separate explicit gates.
