# Redaction of the committed cardiac handoff copies, 2026-10-01

The files under `docs/cardiac-grok-ring-handoff/` and the cardiac handoff notes in `docs/` are copies of records kept in
the owner's local study workspace. Before they went to this public repository, the following substitutions were made
in the committed copies only:

| Original | Committed copy |
| --- | --- |
| absolute path of the local study workspace | `<workspace>` |
| absolute path of the local Codex runtime cache | `<codex-runtimes>` |
| any other absolute home-directory path | `~` |
| the local machine identifier | `<redacted>` |
| the owner's nickname | `the owner` (or `OWNER` inside authorization tokens such as `AUTHORIZED_BY_OWNER_GO_A`) |

The nickname was never the owner's GitHub account. The owner's account is ChaseHendrick (see AGENTS.md).

No number, hash, verdict, gate result or other content changed. Every SHA-256 recorded inside these files identifies
the **unredacted local original**, so a redacted copy here no longer hashes to its own pin. Verify against the local
originals, not these copies. The two committed `ring_flow_zero_pruned.cpp` snapshots contained none of the redacted
strings and are byte-identical to their pinned hashes (`5b85695c…` and `e9081f21…`).

`2026-09-30-pm/_exec_g5_p0.py` contained a shell `echo` line before redaction and does not parse as Python. It is kept
as committed, as a record of what was run.
