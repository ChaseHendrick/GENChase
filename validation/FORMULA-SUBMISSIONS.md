# Submitting a formula

GENChase currently accepts new formulas through contributed source modules. There is no general
formula-entry box in the studio. Existing controls change the parameters of installed techniques;
Settings JSON restores those parameters. The displayed `equation` is explanatory text, not executable
input. Adding an equation label does not implement or validate it.

For a new simulation, follow [CONTRIBUTING.md](../CONTRIBUTING.md) and the
[module contract](../tools/modules/CONTRACT.md). Add the implementation in `src/modules/`, include it
in `src/studio.html`, rebuild, and register its evidence in `validation/techniques.json`. A proposed
identity without a simulation belongs in the research notes, with its assumptions and derivation.
Read [RESEARCH.md](../RESEARCH.md) before a literature search and record the search there.

## State what is being claimed

Describe the formula, variables, units or nondimensionalization, admissible parameter domain,
initial and boundary conditions, and any singularities or excluded cases. Distinguish an exact
formula from a numerical approximation or an empirical fit. Explain stochastic forcing, clipping,
regularization and other departures from the stated mathematical model.

Credit the primary source for existing mathematics. For a proposed result, supply a derivation and
label originality as unconfirmed unless a separate literature review supports a narrower statement.
A proof of correctness does not establish that the result is new.

## Establish evidence before changing the status

Start a new record at **unvalidated**. Passing a parser, compiling a shader, producing an image or
reproducing a seed keeps that status unchanged.

| Evidence | What it can support | What it does not establish |
|---|---|---|
| Syntax, runtime and image checks | The implementation runs in the tested setting | Mathematical or physical correctness |
| Independent benchmark with tolerances and a failure control | A stated numerical claim over tested cases | An identity over an unrestricted domain |
| Reviewed derivation or proof | The stated result under its assumptions | Historical originality or correct software implementation |
| Comparison with experimental data and uncertainty | Agreement with those measurements under the model assumptions | Universal physical validity |
| Documented literature review | What sources and equivalent formulations were checked | Proof that no earlier result exists |

Choose the scientific checks to fit the claim. For a numerical solver, compare against an independent
reference and test convergence at fixed physical domain and time. For a stochastic result, use
independent seeds and report uncertainty and sample size. For an exact construction, test relevant
invariants and provide the algebraic or geometric reasoning. Sampled equality alone is not a proof.
See the full [scientific validation contract](README.md).

Declare tolerances and the reason for them. Cover regular, limiting and deliberately invalid cases
within the proposed domain. Include a failure control, such as an incorrect coefficient or update
sign, that the benchmark rejects. Comparing two calls to the same formula is not an independent
reference; identify any shared assumptions or code.

If the claim includes printed output, exercise the real export path at the declared dimensions,
record numerical resolution and precision, and check preservation of scientific state. Image
dimensions or sharpness alone do not establish scientific rendering accuracy.

## Record a reproducible numerical check

Each entry in `numerical` needs these fields:

| Field | Required content |
|---|---|
| `test` | Repository path to a regular file implementing the scientific check |
| `scope` | Exact claim, parameter cases and numerical modes exercised |
| `criteria` | Acceptance tolerances and their interpretation |
| `limitations` | Exclusions and what this test cannot establish |
| `benchmark` | Independent reference, with its source or derivation and any shared dependencies |
| `failureControl` | What deliberate error is introduced and how the test rejects it |
| `command` | Command a reviewer can run, with setup documented alongside the test |
| `results` | Path to measured results as a nonempty JSON object in `validation/results/` |

Store the measurements from a successful run, including the tested parameters, errors and control
outcomes. Include the runtime or hardware when it affects the result. Keep the test, current source
fingerprint and result artifact together in the pull request. Rerun affected checks when the source
or benchmark changes.

`node tools/science.js` checks evidence records and report freshness. It rejects known runtime,
export and inventory scripts as numerical evidence. It does not execute recorded commands or
verify their scientific content. A renamed smoke test or fabricated result would still be false
evidence; a reviewer must inspect and reproduce the claimed check.

After review, **partially validated** means only the bounded claims supported by the recorded
tests. **Validated within stated limits** additionally requires reviewed numerical and print
coverage, a domain describing parameters, conditions, resolution and precision, a review date and
result artifact. Neither label certifies arbitrary formulas, all parameter values, physical truth
or novelty. Keep unresolved limits visible in the record and user-facing explanation.
