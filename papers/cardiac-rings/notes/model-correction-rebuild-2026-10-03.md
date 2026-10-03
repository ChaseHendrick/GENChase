# Model wording correction: rebuild checkpoint (2026-10-03)

Status: corrected source prepared; final PDF build and visual review pending. This checkpoint supplies no new
theorem, numerical certificate or extension claim. The released 1.1.0 PDF and immutable tag remain untouched.

## Source and correction scope

The corrected `paper/cardiac-rings.tex` has SHA-256
`c656378f53b929c1a93690878f86bb1ca8a405f1c24c5b487e6b3d80442f38b2`.
The source diff consists only of the model-description changes:

1. The capacitance ratio applies to membrane-current contributions to the calcium and sodium equations. Internal
   calcium uptake, leak, release and transfer terms do not carry that factor.
2. Holding intracellular potassium fixed modifies the differential equations. It does not restrict the full
   19-state model to a conserved-charge leaf, because the omitted potassium balance is generally nonzero. The
   theorems continue to concern the stated 18-state model.

The supporting formula audit is retained in `work/cardiac-model-audit-2026-10-03/REPORT.md` and
`translation-controls.json`. Its 49 sampled checks and targeted capacitance/charge controls establish the stated
audit scope; they are not a proof of global symbolic equivalence. Frozen scientific model/program/result bytes
were not changed by this correction.

The registered historical PDF remains SHA-256
`ad23140dee90edaafc65c8571896089a81b464bc737cae88a1adecae37de22a1`.
The four retained figure PDFs have SHA-256:

| Figure | SHA-256 |
| --- | --- |
| alln-pieces.pdf | 62f4813d72f1be4c2da34be5010df1937a83575b355d3d1f300ab472f5a4ccb9 |
| cell-orbit.pdf | 1f3d8b190baf4d208f1c344b63067ef3a9505d70df9e39bf9f2149b020569b21 |
| branch-hopf.pdf | d807da1fd1b69ff6f21d6db4411b540ab008f7d933cc079a2581349dfa33ed72 |
| ring-wave.pdf | b0c9c14400c19ae302a923a6b63924927402c7ca25d068c166d73f69b1acdd69 |

## Actual bounded local attempt

No local `pdflatex`, MacTeX or BasicTeX executable was available. An existing Tectonic 0.17.0 binary was located at
`/Users/chasehendrick/Documents/Codex/2026-09-20/co/work/vortex-note-tools/tectonic` and executed successfully for
its version/help checks. No TeX installation was performed.

The complete paper directory was copied to the isolated
`work/cardiac-model-wording-draft-2026-10-03/paper`, and its copied old PDF was removed before compilation.
`input-manifest.json` binds the corrected source, all figure inputs and historical PDF. With
`TECTONIC_CACHE_DIR=work/tectonic-cache`, `SOURCE_DATE_EPOCH=1790999291` and `FORCE_SOURCE_DATE=1`, the command was:

```text
cardiac-bounded-run.py --seconds 180 --rss-mib 2500 --log-mib 5
  --log /private/tmp/cardiac-model-wording-pdf-2026-10-03.log --
  /usr/bin/nice -n10 tectonic --only-cached --keep-logs
  --keep-intermediates --reruns 2 --outdir . cardiac-rings.tex
```

This is a wrapped display of the actual argument vector, not a shell command split over executable lines. The
supervisor receipt contains the exact executable paths and arguments. Actual exit code was 1, elapsed time
0.52836 seconds and sampled aggregate peak RSS 198.828125 MiB. The cache-only engine stopped at source line 341:
`OT1/lmss/m/n/12=rm-lmss12` metric missing. It produced no PDF. Its intermediate first-pass warnings do not establish
final reference resolution or final layout. The log, supervisor receipt and TeX log remain preserved. An earlier
supervisor invocation with incorrectly concatenated argument/value tokens was rejected by argparse before build;
the receipt above is the corrected actual compilation attempt.

## Required build route and acceptance

Use the existing `.github/workflows/cardiac-package-check.yml` after the owner pushes the corrected source branch.
It can be explicitly dispatched on that branch, or triggered by a push whose head message contains
`[cardiac manuscript]`. The job has a 15-minute outer limit, bounded dependency/build steps, read-only repository
permissions and an always-run artifact upload. It builds through `tools/paper-build.sh`, then independently builds
three more pdfLaTeX passes and requires byte-identical PDFs and no unresolved citations/references. No workflow
modification or remote dispatch was performed for this checkpoint.

The exact dispatch route, once the source is committed and pushed, is:

```sh
gh workflow run cardiac-package-check.yml --repo ChaseHendrick/GENChase \
  --ref codex/cardiac-stability-extension-2026-10-03
```

Before replacing the registered PDF, download the actual artifact, match its source and figure hashes, confirm
successful final build and identical rebuild, inspect all PDF pages and fonts/metadata, and inspect the corrected
model page at reading size. Compare changed pagination and figures against the preserved 1.1.0 PDF. Record any
clipping, overlap, warnings or citation failures. No page, font or metadata acceptance is asserted here because no
corrected PDF exists yet. The rebuild is a manuscript packaging check, not scientific validation.
