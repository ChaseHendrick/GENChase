# The propagated action potential of Hodgkin and Huxley at their 1952 constants: a computer-assisted existence proof

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Draft** (2026-09-27), drafted in this repository under the owner's decision of 2026-09-26 on results produced in
this project's sessions. The manuscript is [`paper/paper.md`](paper/paper.md). Nobody outside the project has
reviewed it, and the adversarial second reading is still to be done (see [`notes/QUALITY.md`](notes/QUALITY.md)).

## Claims, labelled

- **Computer-assisted (proved by programs in ball arithmetic, with negative controls):** at 18.5 C and at 6.3 C, with
  Hodgkin and Huxley's rate functions and constants as printed (leak potential 10.613 mV), their travelling-wave
  equation (J. Physiol. 117 (1952), eq. (31)) has a pulse, an orbit homoclinic to rest. At 18.5 C the conduction speed
  for the fibre of their p. 528 lies in (18.731888247880483540468313433296243876955750772, ...776) m/s; at 6.3 C see
  the manuscript. The same at 18.5 C with the zero-current leak potential.
- **Numerical, not proved:** the speed parameter to about 58 digits by high-precision shooting; the profile.
- **Not claimed:** uniqueness, stability, other temperatures, the slow pulse.
- **Priority, conditional:** no earlier existence proof for the unmodified equations was found in the searches
  logged in RESEARCH.md and `papers/hh-dynamics/work/traveling-wave/prior-art-log.md`. Hastings (1976) was read on
  pp. 229-230 only and Foote and Chen (1981) not at all; zbMATH Open has no review of either. Carpenter (1977) was
  read in full and treats modified systems with small parameters.

## Why a separate paper

The rules of this repository give every manuscript its own folder, its own entry in `papers/papers.json` and its own
quality record. The Hodgkin-Huxley manuscript in `papers/hh-dynamics/` (space-clamped equilibria, Hopf points,
bistability) is being written separately. The pulse concerns the cable equation, a different system, and has its own
prior-article question. The programs and certificates stay with the other Hodgkin-Huxley work in
[`papers/hh-dynamics/work/traveling-wave/`](../hh-dynamics/work/traveling-wave/REPORT.md), whose REPORT has every
detail. Plans for a temperature interval and for spectral stability are in its Section 8. They are not part of this
paper.

## Reproduce

See Section 7 of the manuscript. About an hour of CPU per temperature, one process at a time.
