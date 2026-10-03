# Model wording correction: rebuild checkpoint (2026-10-03)

Status: corrected source built and scoped PDF packaging review completed, as recorded below. This checkpoint supplies no new
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
clipping, overlap, warnings or citation failures. No page, font or metadata acceptance was asserted at the local
attempt checkpoint because no corrected PDF existed then. The rebuild is a manuscript packaging check, not
scientific validation.

## Actual cloud build and scoped PDF review

Run `37101156156` on committed source head `d6c19d05ba041c25324186a4b8c9ce6d84c4d66b` completed successfully.
The job ran from 2026-10-03 05:51:14 UTC to 05:52:39 UTC, including dependency setup. The repository build and
independent three-pass rebuild passed and their PDFs were byte-identical. The runtime was pdfTeX
3.141592653-2.6-1.40.25, TeX Live 2023/Debian, on the declared Ubuntu 24.04 runner. Actual source and all figure
inputs match the hashes above and the current working tree. The final compiler log has no unresolved citations or
references. The artifact remains in `work/cardiac-model-correction-package-37101156156`.

The corrected 73-page PDF has SHA-256
`99203ed5f186a1cb3dda6c329a973d8b547726461559ba708fd2cce70f5e07e9`.
All 45 used fonts are embedded, all extracted text spans lie within the page boxes, and the metadata gives the
registered title and Chase Hendrick as author. Creation/modification time is 2026-10-03 05:51:07 UTC, as fixed by
the source commit epoch. Five contact sheets cover every page; only pages 5 and 6 differ in the image comparison
at scale 0.65. The other 71 pages, including the four scientific figures and bibliography, are pixel-identical at
that scale. Pages 5 and 6 were additionally rendered and inspected at scale 1.5. The corrected model paragraph is
readable, the additional potassium-clamp clarification fits, and no overlap, clipping or caption collision was found.
This is a conversion/layout consistency check by the correction's author, not a newly independent proof review.

The unchanged 2.69937-pt proof-box protrusion and three underfull spacing diagnostics remain visible in the saved
compiler diagnostics; the page inspection found no collision or clipping from them. Metadata, font, geometry,
source/figure binding and visual scope are recorded in `model-correction-pdf-review-37101156156.json`, SHA-256
`beddefdbb161e5389a46d9cc071a6bf96ed72df3a9302c99336221645defd2fa`.

After these actual checks, the registered working-tree PDF was replaced by the corrected PDF. The former registered
1.1.0 PDF is preserved byte-for-byte as `published-1.1.0-preserved.pdf` in the private artifact directory. No remote
release, tag or historical archive was changed. The scientific model/program/result bytes, theorem statements and
figure inputs remain unchanged. Prospective quality-upgrade obligations for new research claims remain open.

The ordinary `node tools/paper-check.js --paper cardiac-rings` exited 0 after the PDF replacement, reporting 73
pages and a clean companion stage. Its note explicitly reserves prospective adoption checks for a new release with
`--release`; this ordinary pass does not close the seven open quality-upgrade items. `git diff --check` passed.
