---
title: 'GENChase: seeded scientific simulations with validation records, provenance and print export'
tags:
  - JavaScript
  - WebGL
  - simulation
  - pattern formation
  - reproducibility
  - scientific visualization
  - generative art
authors:
  - name: Chase Hendrick
    orcid: 0009-0002-9754-6087
    affiliation: 1
affiliations:
  - name: Independent Researcher
    index: 1
date: 24 September 2026
bibliography: paper.bib
---

<!--
Draft for the Journal of Open Source Software, prepared with AI assistance. Before submitting,
check JOSS's current author guide (required sections, length, and its policy on AI assistance),
and work through docs/PUBLISHING.md. Figures below are a snapshot of 24 September 2026; the live
validation counts are in VALIDATION.md. `node tools/index.js` keeps the catalog count current.
-->

# Summary

GENChase is a browser studio of 130 techniques, each a seeded simulation of a published model:
partial differential equations such as Cahn–Hilliard phase separation [@cahn1958], lattice
models such as the Ising model [@onsager1944; @metropolis1953], membrane and population models
from neuroscience [@hodgkin1952; @montbrio2015], point-vortex collapse
[@grobli1877; @novikov1979], and growth processes, tilings and other dynamical systems. The
techniques share one engine that supplies a seeded random number generator, a recipe carried in
the URL hash, palettes, and a print path that exports at physical size. Every technique names
the paper it implements. Most measure a quantity that theory predicts from the state on screen
and print it beside the theoretical value, with an uncertainty or a stated reason why there is
none. Its PNG, PDF, TIFF, JPEG and SVG exports record how they were made, and a
machine-readable record per technique states how far its numerics have been checked. The studio
is written in JavaScript and WebGL2 and runs in the browser, from the hosted site, from a local
folder or as a single portable HTML file, with no installation or account.

# Statement of need

Simulated patterns serve both as scientific figures and as images in their own right, and in
both uses it is often hard to say how a given picture was made. An image taken from an
interactive demonstration rarely records its seed, parameters, code version or numerical
precision, and the demonstration rarely says whether its solver has been checked against
anything. GENChase is built so that a plate states its method. A recipe link reconstructs the
plate from the same build. Each PNG, PDF, TIFF, JPEG or SVG export embeds the recipe, a build
fingerprint, the SHA-256 of
the technique's source file, its validation status, and the renderer and precision that
produced the state. A per-technique record lists the independent benchmark, failure control,
command and result file behind any validation claim, together with its limitations.

The intended users are researchers and teachers who work with pattern-forming models and want
reproducible figures and access to the simulated state, and artists and printmakers who want
prints of real simulations with a documented method. For research use, selected techniques
export their state as NumPy arrays with metadata, and a command-line runner drives any recipe
headlessly, so a parameter sweep produces the same files a person would download from the
studio.

# State of the field

A survey of comparable public projects made on 24 September 2026 and recorded in the
repository's prior-article ledger (`RESEARCH.md`) found no public tool that combines per-technique
numerical validation records, per-model citations, seeded recipe links and physical-size print
or SVG export. That negative rests mostly on search snippets, because many hosts could not be
reached, and it is weaker than a page-by-page comparison. The closest in scientific rigor is
VisualPDE [@walker2023visualpde], a peer-reviewed browser solver for partial differential
equations with shareable links, a settable random seed and a page that checks it against
analytical solutions; the survey found no physical-size print export in it. The closest science-art studios are Simunauts, with 84 browser simulations
and seeded share links, and Morphon, with 63 simulations on iPhone and iPad; their validation
and print paths could not be checked. The generative-art platforms fxhash and Art
Blocks use the same seed-as-artwork model, in which a hash seeds a generator and must reproduce
the output, without scientific content. Educational collections such as PhET, Complexity
Explorables, the Falstad applets, the Wolfram Demonstrations Project and the NetLogo models
library offer many simulations, but the survey found no seeds, print export or validation
records in them.

# Functionality

- **One shell for every technique.** A technique registers its schema, defaults and a `create`
  function with the engine (API version 1, documented in `docs/ENGINE-API.md`). All randomness
  comes from the seeded generator, and the lint step rejects `Math.random` in simulation code.
  Recipes are versioned: when a default changes, the module declares the old value, so a link
  made before the change reprints at the value it was made at.
- **Print.** Exports are sized in inches at a chosen resolution: PNG, PDF with an embedded ICC
  profile, bleed and crop marks, TIFF, JPEG, and SVG where the picture is discrete marks. A grid
  simulation keeps its numerical resolution, so a larger print does not refine the solution, and
  the sheet states the field's own resolution.
- **Provenance.** `Studio.getProvenance()` returns the software, API and recipe versions, the
  build fingerprint, the source file and its SHA-256, the validation status, the recipe link,
  the structured witness of what the plate measured, and the device: the WebGL2 renderer or the
  CPU, and the render-target precisions the state used. It is embedded in PNG text chunks, the
  PDF Info dictionary, TIFF tags, a JPEG comment, SVG metadata and the print-job JSON; WebP
  carries none.
- **Research data.** `Studio.exportData()` writes an uncompressed `.npz` that `numpy.load`
  reads, with a `meta.json` holding the provenance and each array's shape, dtype and units. It
  is implemented for the six tabs of the shared PDE family (Cahn–Hilliard, Ohta–Kawasaki
  [@ohta1986], Active Model B+, Swift–Hohenberg, Kuramoto–Sivashinsky and the phase-field
  crystal [@elder2002]), the five multi-species reaction-diffusion tabs and the Ising model;
  other tabs export `meta.json` alone and say so. `node tools/run.js <hash> --out plate.npz
  --steps N` runs a recipe headlessly through the same path, with `--set key=value` for sweeps.

# Quality control and validation

The project separates verification (does the code solve its equation), validation (do the
equation and its parameters match the cited paper) and uncertainty quantification, following
@oberkampf2010.

**The evidence contract.** `validation/techniques.json` holds one record per technique with a
status (unvalidated, partially validated, or validated within stated limits), the source file's
fingerprint, the displayed equation and reference, limitations, remaining work and evidence.
Every numerical evidence entry must name an independent benchmark, a deliberate failure control
that the test detects, a reproducible command and a JSON result file. A status of validated
within stated limits also needs print evidence, a stated domain (parameters, conditions,
resolution and precision) and a review date. `node tools/science.js` rejects a record that lacks
any of these or that offers a runtime, export or inventory script as numerical evidence, fails
when a technique's source changes after its record was written, and generates `VALIDATION.md`.
It checks structure only: it does not run the commands or judge their adequacy, which is the
reviewer's job. `node tools/verify.js --print <id>` runs the recorded tests for a technique.

On 24 September 2026, of the 130 techniques, 48 were validated within stated limits, 3 partially
validated and 79 unvalidated. For example, the Cahn–Hilliard GPU passes agree with an
independent double-precision CPU stencil to a maximum field error of $9.99 \times 10^{-8}$
against an acceptance bound of $5 \times 10^{-7}$ in 16 noise-free float32 cases; the
Hodgkin–Huxley solver is compared with a separately written Dormand–Prince reference; and the
point-vortex collapse tabs are checked against analytic similarity trajectories and through
their actual print exports.

**The uncertainty gate.** `src/shared/stats.js` provides the integrated autocorrelation time
with an automatic window, standard errors of series and field means that account for
correlation, blocking, moving-block and slope bootstraps, and the Hill estimator for tail
exponents, all resampled from the plate's seed.
<!-- Owner: cite Sokal's automatic windowing and the Hill estimator here once you have checked the
sources; the repository does not record their bibliographic details. -->
A status line that prints a measurement against theory builds it with `U.stats.compare()`, which
refuses a comparison without a basis: sampled (with an error bar and its method, or the stated
reason the bar is pending), exact, deterministic, or true by construction. The last category
exists so that a check that cannot miss is labeled a regression test rather than presented as a
confirmed prediction. `node tools/lint.js` fails hand-written comparisons and any `compare()` or
witness call without a basis, and `node tools/stats-check.js` checks the harness against
closed-form answers, with negative controls (the naive error on an autocorrelated series and the
least-squares error on a single trajectory) that must undercover. The Ising tab, for example,
reports $|m|$ with an error bar from the integrated autocorrelation time and compares it with
Yang's exact spontaneous magnetization [@yang1952] below $0.95\,T_c$ at zero field.

**Tests and continuous integration.** GitHub Actions runs the build, inventory and lint checks on
every pull request and on pushes to the main branch, together with browser jobs that cover one technique per
architecture family and the recorded numerical reviews, in Chromium's headless shell with
software rendering. `node tools/check.js <id>` renders every preset, loads the same hash twice,
and checks that the plate is non-blank, deterministic and survives a tab switch; it also reports
the grid-scale checkerboard correlation that an explicit integrator produces past its step
bound. `node tools/provenance-check.js` reads the provenance back from every export button.

# Limitations

- Most techniques are unvalidated: 79 of 130 had no registered numerical evidence on 24
  September 2026, and a validated label applies only within its enumerated domain; for
  Cahn–Hilliard that is two recipes at fixed grids and times within the twelve-recipe PDE family
  review.
- Every validation record so far was reviewed inside the project. No outside domain expert has
  reviewed one yet; `docs/REVIEWING.md` describes how such a review is run and recorded.
- Continuous integration runs the GPU techniques on a software renderer. Results on physical
  GPUs and in half precision are not yet covered.
- Seeds do not guarantee identical pixels across solver revisions, hardware or simulation
  resolutions.
- Some sampled comparisons still read "error bar pending" because the seed ensembles that would
  set them have not been run, and state export is implemented for twelve tabs only.
- The lint rule that keeps hand-written comparisons out recognizes the phrasings this codebase
  has used, so a new phrasing can pass it, and neither the rule nor `compare()` judges whether a
  given error bar is adequate.
- The survey of comparable projects rests mostly on search snippets.

# AI usage disclosure

Generative AI was used to develop the software, its documentation and this paper: Anthropic's
Claude, used through the Claude Code tool. It was used for code generation and refactoring, for the
test and verification harnesses, for documentation, and for drafting and copy-editing this paper;
the repository's commit trailers record the sessions. Its output was checked as all code in the
repository is: by the numerical validation records and the failure controls that must fail, by the
continuous-integration checks, and by the author's review. The author made the design decisions,
reviewed and validated the AI-assisted output, and takes full responsibility for the accuracy,
originality and licensing of the software and of this paper.
<!-- Owner: JOSS requires this section. Add the model names and versions it asks for after
"Claude", and confirm that the last sentence is true before you submit. arXiv and Springer Nature
journals also require AI use to be reported in the manuscript, which is why the research papers
keep their one-line statement. -->

# Acknowledgements

The scientific models are the work of the researchers named in each technique's credit line and
in `TECHNIQUES.md`. This work received no external funding.

# References
