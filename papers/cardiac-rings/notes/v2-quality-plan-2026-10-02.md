# Version 1.1.0 quality and synchronization plan

The released 1.0.0 manuscript and its certificates remain the accepted publication. This plan does not admit the
new conductance branch or Hopf bridge. The final source fixes, numerical reruns and manuscript checks below are
required before publishing 1.1.0.

1. **Proof source and argument.** Resolve all recorded Hopf and uniform-stability findings, then obtain the
   separate in-project fix checks. Bind each final certificate to sources captured before calculation. Preserve
   historical logs. Require exactly 712 branch pieces, 57 groups and 711 rederived gluings; current Theorem A
   evidence and all 68 amplitude-piece reproofs; source-bound stability units covering every final branch piece.
   Recompute the bridge gluing against the final branch and its exact uniqueness radii. Run actual negative controls.
2. **Manuscript claims.** Add a fourth result with separate statements for conductance-branch existence,
   local uniqueness, continuity and minimal period; uniform stability on its exact covered interval; and existence
   and branch identification through the amplitude bridge to the Hopf point. Do not claim quantitative uniform
   stability throughout the bridge. Isolated stable points and the qualitative small-amplitude Hopf conclusion
   must remain distinct. Credit Erhardt's numerical prediction and existing validated-continuation and
   desingularization methods. No historical-priority claim follows from the scoped searches.
3. **Figures and numerical data.** Rebuild branch-hopf.pdf from admitted records, inspect every panel at publication
   size, and keep labels and legends outside the data axes. Provide a caption identifying rigorous enclosures and
   ordinary numerical samples. Audit figure-source digests and fonts, axis units, consistent conductance notation,
   and grayscale readability. Reinspect existing figures after pagination changes.
4. **Independent review and reproduction.** Have a separate reviewer read the new theorem statements, arguments,
   abstract, figures, limits and evidence links. Run reproduction from the companion folder after synchronization.
   A green software CI check alone does not validate a scientific claim. No outside or human review is claimed.
5. **Exact companion synchronization.** Canonical files are in research/cardiac-cycle-certificates. Copy the reviewed
   programs and arguments byte for byte into the companion, followed by final logs and collected records. Update
   run_all.sh targets, README, RELEASES.md and notes/QUALITY.md. Verify copied bytes and every new evidence reference.
   Record the actual runtime, including the platform-specific python-flint wheel hash. Preserve upstream licenses.
6. **Publication package.** Build and inspect the complete manuscript PDF with the repository's multi-file paper
   build. Keep Chase Hendrick's author metadata, chase@hendrickresearch.com and ORCID. Manuscript rights and code/data
   licensing remain distinct. Check title capitalization, citation labels and PDF metadata. Update the registry and
   generated status, then require successful applicable CI and resolved PR review findings before merging PR #264.
7. **Release and archive verification.** Release through the papers workflow with version 1.1.0. Archive as a Zenodo
   Publication / Preprint. Download the actual deposited source ZIP and confirm that it contains the built manuscript
   PDF. Record its archive hash, PDF entry and version DOI; then update archiveVersion/codeDoi and regenerate the paper
   index in a follow-up PR. Keep previous archives and releases. GENChase itself does not go to Zenodo.

Submission work still includes a dedicated forward-citation search of Erhardt (2025) and full readings of the new
methodology references. Those remaining literature checks must not be represented as completed.
