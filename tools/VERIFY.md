# Run the registered scientific checks

From the repository root:

```sh
node tools/verify.js cahn
node tools/verify.js --print schrodinger convection
node tools/verify.js --list --print --all
```

The runner selects numerical evidence from `validation/techniques.json`. `--print` includes
registered print checks. A shared test runs once even when multiple selected techniques or
evidence entries reference it; a family test can exercise additional techniques internally.
With no IDs, the runner asks for a selection. `--all` explicitly selects every record.
`--list` only displays the plan and gaps; it does not check source or inventory freshness.

Before executing evidence, the runner checks generated-source parity and inventory consistency
with `tools/build.js --check` and `tools/science.js`. Stale builds, changed source fingerprints,
inconsistent records or a stale validation report stop the run. Correct the source/build and
review the evidence records using the workflow in [BUILDING.md](../BUILDING.md).

Only repository files with a canonical `tools/.../*.js` path are accepted. Each is launched
directly with the current Node executable and no shell, from the repository root, without extra
arguments. The freeform `command` field describes a reproducible command for a human; the runner
never parses or executes it. Environment settings such as `NODE_PATH` are inherited normally.
Evidence needing arguments or another language should have a reviewed Node wrapper with fixed
arguments; its exact behavior still requires code review.

The runner itself needs only Node. Browser benchmarks require the development setup in
[BUILDING.md](../BUILDING.md):

```sh
npm install --no-save playwright@1.49.1
npx playwright install chromium
```

Test output streams to the terminal. The runner stops at the first failed consistency check or
benchmark, preserving its nonzero exit code. No result artifact or validation status is updated.

Exit codes:

| Result | Exit code |
|---|---|
| Valid plan (`--list`) or all requested registered checks passed with no missing evidence lists | `0` |
| Invalid selection/path, or missing numerical evidence (also missing print evidence with `--print`) | `2` |
| Failed child check | Its nonzero exit code; it can also be `2` |
| Failed process launch | `1` |

Missing evidence does not prevent the other registered checks from running, but the final result
remains **incomplete**. `--all` cannot turn missing evidence into a complete audit. A successful
`--list` describes a valid plan, not a successful check.

Passing tests supports only their recorded cases and tolerances. The runner prints existing
scientific status labels and explicitly reports selected techniques that still lack full
validation within stated limits. It cannot certify arbitrary formulas, establish originality,
or substitute for independent scientific review. Read [the validation contract](../validation/README.md)
and each record's limitations when interpreting a result.

The runner's own lightweight regression tests require no browser:

```sh
node tools/verify-check.js
```
