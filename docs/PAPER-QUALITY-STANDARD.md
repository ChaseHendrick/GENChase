# Paper quality standard

Effective prospectively from 2026-10-03. This standard explains the existing seven quality items; it does not
replace their names or revise the evidence attached to a historical release. Each new release records the version
of this standard it applies and the exact manuscript, programs, data and review records it covers. An older archive
is not certified against this standard merely because its quality record has seven checked items.

The record for each paper remains `papers/<id>/notes/QUALITY.md`. Apply the requirements relevant to that paper's
claims. An inapplicable requirement needs a short reason, not an invented experiment or certificate. A purely
analytic theorem does not need an interval computation; a numerical illustration does not need a spectral theorem.
Before a new release, all applicable requirements below need actual evidence. Planned work remains unchecked.

## 1. Complete proofs

Every theorem, proposition, lemma and corollary has a complete proof in the manuscript or an appendix. A cited
theorem is used with its precise hypotheses checked. An adapted argument is written out, including the steps that
change under the paper's assumptions. State the spaces, norms, domains, regularity and parameter ranges before
using them. Separate a conditional theorem from the certificate that discharges its conditions.

For model-based results, define the exact model before stating a theorem:

- Identify the primary model source, retained version and file hash, the implemented variant, state order,
  parameters, units, time convention and coordinate scales. A shared model name does not establish equivalence.
- List modifications, clamped variables, external forcing, extracellular constants and omitted equations.
  Distinguish modifying an equation from restricting to an invariant or conserved-charge leaf. State and check
  any conservation law used by the proof, including its units and signs.
- Distinguish membrane-current contributions from internal reaction or transfer terms when changing units or
  capacitance. Give the exact translation of each term affected by a conversion.
- Identify domain restrictions, positive concentrations, branch choices and denominator exclusions. If a removable
  singularity is replaced by an analytic extension, give that extension and its derivative bounds. If it is
  excluded instead, prove that the admitted domain excludes it.
- Provide a traceable formula comparison and targeted negative controls for material variant or scaling changes.
  Agreement at sampled points is a numerical fidelity check, not proof of global symbolic equivalence.

For an infinite-dimensional spectral argument, specify the complete operator, maximal or otherwise justified
domain, resolvent set used, finite projection, omitted directions and tail estimates. Include both signs of Fourier
indices and the complete spatial or symmetry sectors. Explain any fundamental strip, gauge redundancy or quotient
used to count eigenvalues. State whether the count is algebraic and prove the multiplicity claim. A phase eigenvector
alone does not prove a simple neutral eigenvalue. A finite truncation's spectrum alone does not prove the full spectrum.

If stability is asserted, distinguish spectral exclusion, linear decay and nonlinear orbital stability. Write the
argument connecting each claimed implication. In an infinite-dimensional or partially parabolic system, justify the
semigroup, its growth bound or an appropriate compactness/dichotomy argument; stable eigenvalues alone are
insufficient. Account for nondiffusing components and any essential spectrum. Isolate the phase direction and prove
the nonlinear remainder estimates in the stated space. Uniform parameter or system-size claims need uniform
projection, evolution and nonlinear estimates. A qualitative local theorem supplies no computed neighborhood size.

Maintain a theorem-by-theorem claim map identifying the exact domain, existence/identification inputs, spectral
count and decay bounds, nonlinear premises and their evidence or unresolved status. Do not transfer a nonlinear
conclusion between differently modified models or function spaces without proving that transfer. When a correction
changes a premise or the model description, update the manuscript and claim map, obtain a new scoped review and
rebuild the PDF before release. Previously accepted certificate bytes remain immutable; invalidate only the affected
scope explicitly rather than silently reinterpreting its old receipt.

## 2. Rigorous computation

Every computation used as a proof step is exact or uses outward interval arithmetic in a committed, fail-closed
program. State which quantities are inputs, numerical proposals, validated enclosures and accepted conclusions.
Never treat a floating-point eigensolver, residual, sampled curve or a synthetic fixture as a theorem certificate.

For each applicable certificate family:

- Declare the exact inequalities, finite and tail bounds, operator domain and counting theorem before running it.
  Preserve all required directions, endpoints, parameter domains and strict inequalities.
- Bind the accepted computation to exact source and input hashes, centers, scaling/weights and typed settings.
  Record arithmetic precision, runtime and platform. A changed source or input requires new evidence at the affected
  scope. A platform-dependent proposal may produce different valid bounds; it is not prior-bound reproduction.
- Record complete coverage and gluing/identification checks. Reject stale, missing, duplicate or malformed success
  records, nonfinite bounds, failed units and incomplete scopes. A resumed run binds every accepted unit to the
  declared final inputs. Keep failures and previous logs immutable.
- Add meaningful negative controls for the actual admission gate. Include boundary equalities and mutations that
  would admit an invalid bound, model, scope or source. Test timeouts and exceptions so they cannot leave a success
  receipt. Tests that only mirror the implementation are insufficient.
- Provide a complete witness when a finite matrix or column computation is essential: primitive enclosures,
  uncertainty and tail majorants, geometry, exact settings, all required columns and the resulting count. For a new
  computational spectral release, independently replay every accepted certificate's applicable inequalities from
  those witnesses. Declare any externally supplied operator or existence enclosures as premises; replay of later
  matrix bounds does not validate an omitted earlier premise.

Keep verification levels explicit: source/proof review, checking stored summary receipts, rerunning the original
producer, and independently reconstructing full witness inequalities are different kinds of evidence. State the
arithmetic libraries and mathematical premises each trusts. A hash proves identity, not the truth of an inequality.
Independent replay need not duplicate every native matrix eigensolver if a checked enclosure and verified inverse
provide the required theorem, but it must discharge the stated proof obligations for the whole claimed scope.

## 3. Every claim labelled

Label results proved, computer-assisted, formal or numerical in the paper and README. Match every quantitative
claim to its admitted domain, units and certificate. State exclusions and unresolved prerequisites next to the claim.
Do not infer nonlinear attraction from an unproved spectral implication, extend an endpoint certificate over a
parameter interval, or identify a connected curve with a unique monotone parameter graph without proof.

Model theorems establish properties of their stated equations. Numerical agreement or model provenance does not
establish physiological, clinical, experimental or empirical validity. A failed sufficient certificate neither proves
instability nor licenses weakening its gate. New research files are not release evidence until actually admitted.

## 4. Sources read

Read every proof-dependent source in full and record its exact version and reading scope. Check the primary model,
formula and theorem sources, including corrections relevant to the implemented variant. Record partial reading of
background sources honestly. A secondary summary cannot stand in for a primary theorem whose hypotheses matter.
Give established methods their source credit without claiming that their application is a new general method.

## 5. Prior article review

Log dated queries, databases, backward/forward citation checks and the publications examined in `RESEARCH.md`.
Compare the exact proposed theorem, model, parameter domain and rigor level with earlier results. Search absence
does not prove an open problem or a first proof. Bound novelty statements to actual coverage, and distinguish a new
application, a useful stronger result and a breakthrough claim. Update the review when the final theorem changes.

## 6. Adversarial second reading

An independent reader is briefed with the manuscript and programs and asked to find errors. Record findings,
their severity, fixes, negative controls and the exact final sources reviewed. Review the proof's hypotheses,
model translation, numerical admission logic, witness replay scope and final claim boundaries. Recheck substantive
changes after the initial reading. Resolved findings do not erase the original failure or broaden a review's scope.

In-project independent review satisfies this item when accurately identified. The owner's workflow does not require
an outside human reader as a blocking publication condition. Such feedback is welcome through
[REVIEWING.md](REVIEWING.md), but no outside, human or journal peer review is claimed without actual evidence.
An author checking conversion of their own draft is a consistency check, not an independent proof review.

## 7. Reproducible

Supply the exact commands, dependencies, platform assumptions, source/input manifests and expected bounded resource
use needed to reproduce the claimed computations from the companion. Separate quick controls, stored collection,
fresh full producer runs and independent witness replay. A successful quick command does not imply the full chain
was recomputed. Explain unavailable proprietary or external dependencies and keep the public reproduction scope exact.

Figure and manuscript evidence includes:

- Choose scientific visualizations appropriate to the claim: phase portraits, profiles, continuation diagrams,
  spectra, uncertainty bands or analytical diagrams only when they clarify the evidence. Plot complete relevant
  domains and distinguish a certified enclosure from a numerical sample. Decorative polish does not supply proof;
  avoid visual precision, color encodings or extrapolated curves that imply unsupported conclusions.
- Generate figures from identified data and record plotted domains, units, numerical/rigorous labels and provenance.
  Legends, point labels and numerical notes stay outside data panels in reserved space or captions. Preserve the
  plotted values when correcting layout. Inspect every regenerated figure at final manuscript size.
- Rebuild the final registered source, inspect every PDF page for clipping, overlaps, unreadable text and citation
  failures, and check embedded fonts, page count, title, author, references and metadata. A successful build is not
  scientific validation. Record any warnings and why they do not damage the result.
- Bind the final PDF to the exact source and build runtime. If byte-identical rebuilds are required, record actual
  independent builds and their hashes, not only a reproducible-build configuration.
- Run the paper and stage guards on tracked final inputs. Match companion README, citation metadata, version,
  licensing boundaries and DOI. Check the actual tag/release and deposited ZIP after publication: one valid archive
  root, complete expected member set and exact source, PDF, code/data and metadata bytes. Record type/subtype,
  version DOI and immutable tag commit. A passed archive check is a packaging check, not a mathematical review.
- Future paper packages use the filename `HendrickResearch_<paper-id>_<version>.zip`. Inspect the actual deposited
  filename as well as the contents. A branded release asset alone does not establish the name of a separate
  GitHub-generated archive deposited by Zenodo's integration. Follow the branded-package deposit route in the
  publishing runbook before a new release.

Use the registered title consistently, in the chosen sentence or title case, across source, PDF, README, citation
metadata and archive metadata. Keep the author/contact fields exact and public emails limited to the owner's
registered contact. Verify author, version, dates, DOI identifiers and archive publication type/subtype rather than
copying an older version's metadata. Bibliographic entries use source titles, authors, versions and identifiers;
reading-status comments belong in the research ledger, not citation titles or printed references. Record the exact
licensing of manuscript, code, data and third-party components and keep file-level exceptions with the package.
Do not infer one permissive license for a mixed-rights archive or silently change historical licensing.

Keep historical archives immutable. A revised source, standard or DOI registration does not silently change an old
tag or its certificate. Use [PUBLISHING-PAPERS.md](PUBLISHING-PAPERS.md) for the release sequence.

## Adoption record and prospective machine gates

The current `paper-check` enforces seven checked headings and nonempty evidence plus its existing bookkeeping
checks. It does not automatically validate all scientific obligations above. No checker behavior changes merely
because this document exists. New-release adoption is recorded explicitly in the paper's quality upgrade addendum.

Use this exact heading, metadata line and seven sequential item titles for a new release. Replace each evidence
placeholder with applicable actual evidence and remaining obligations. A genuinely inapplicable subrequirement needs
a reason in the item; it does not remove the item. Check an item only when its whole applicable scope is discharged.
The historical seven checked items remain untouched.

```markdown
## Quality standard adoption (2026-10-03)

**Quality standard:** 2026-10-03

- [ ] **U1. Complete proofs.** Evidence and remaining applicable obligations.
- [ ] **U2. Rigorous computation.** Evidence and remaining applicable obligations.
- [ ] **U3. Every claim labelled.** Evidence and remaining applicable obligations.
- [ ] **U4. Sources read.** Evidence and remaining applicable obligations.
- [ ] **U5. Prior article review.** Evidence and remaining applicable obligations.
- [ ] **U6. Adversarial second reading.** Evidence and remaining applicable obligations.
- [ ] **U7. Reproducible.** Evidence and remaining applicable obligations.
```

The prospective `--release` adoption gate requires the current standard date, one adoption section, one metadata
line, the exact seven unique sequential U item titles and nonempty evidence, with no open items. Ordinary historical
checks may report the prospective open work without retroactively invalidating an old release. This is a bookkeeping
gate; seven checked statements do not automatically verify the underlying model or scientific inequalities. The
checker implementation and its malformed/missing/duplicate/stale/open-item controls require separate review.

Before implementing stronger machine gates, review a per-paper, versioned evidence manifest and negative controls.
The proposed manifest binds the release source/PDF, applicable claim scopes, model provenance, accepted certificate
coverage, full witness/replay receipts where applicable, review disposition, reproducibility runtime and archive
expectations. Inapplicable fields require a reason. Checkers must fail on missing or stale applicable evidence and
must not infer acceptance from a Boolean or an unchecked prose promise. Older releases retain their historical
standard; adopting a stronger standard for a new version requires fresh applicable evidence. The registry/schema
and checker migration are separate reviewed work, not implicit changes to every existing paper.
