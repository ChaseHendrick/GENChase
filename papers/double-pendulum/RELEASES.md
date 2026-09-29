# Releases

Each release of this paper's programs and data is archived on Zenodo with its own DOI.

## 1.0.3 (2026-09-29)

**DOI:** [10.5281/zenodo.23048242](https://doi.org/10.5281/zenodo.23048242). Publication / Preprint; both the actual GitHub source ZIP and the downloaded Zenodo ZIP contain the reviewed manuscript PDF byte for byte.

Publication figures, contact and rights update. Adds a vector section/enclosure figure from the stored design centres and certified endpoint bounds, with source checksums. The manuscript uses the updated public research contact. Manuscript rights are stated outside the scientific abstract, preserving the existing policy and earlier license grants. Archive metadata identifies mixed component rights rather than applying the code license to the whole preprint ZIP. Reference-list reading-status annotations have been removed where present. No theorem, proof program or certificate changes. The release includes its rebuilt manuscript PDF; previous archives remain unchanged.

## 1.0.2 (2026-09-29)

**DOI:** [10.5281/zenodo.23047057](https://doi.org/10.5281/zenodo.23047057). Publication / Preprint; the downloaded archive ZIP contains the registered manuscript PDF.

Publication metadata and packaging update. The manuscript now identifies the public companion and its immutable checking-release archive. The source ZIP includes the rebuilt manuscript PDF. Citation metadata includes a usable publication locator and explains the component license terms. No theorem, proof program, certificate or scientific claim changes. Earlier archives remain available unchanged.

## 1.0.1 (2026-09-28)

**DOI:** [10.5281/zenodo.23028523](https://doi.org/10.5281/zenodo.23028523) (2026-09-29). The previous archive is unchanged.

A checking release of the same preprint. The manuscript is unchanged. This archive adds `code/check_main.py`, `code/check_interval.py`, `code/check_horseshoe.py`, `code/check_field.py`, `code/check_abstract.py` and `code/check_hypotheses.py`. The three energies and their cone logs support the printed orbit bounds. The entropy figures 0.1016 and 0.0138 stay strictly under the horseshoe certificate. `code/hypotheses.json` names those three theorems and keeps Bolotin-Negrini and the later Smale-Birkhoff sources unread. Meromorphic non-integrability stays open.

## 1.0.0 (2026-09-27)

**DOI:** [10.5281/zenodo.22997540](https://doi.org/10.5281/zenodo.22997540)

**DOI:** added on release.

The first public release of the preprint *Chaos and Analytic Non-Integrability of the Classical Double Pendulum: A
Computer-Assisted Proof* (23 pages), with the programs that check its results, their configurations and their output.
It has had an adversarial reading within the project (`notes/review-1.md`, with its Response section) and no outside
review.

### What the paper shows

The planar double pendulum with equal masses and equal lengths, in units m = l = g = 1 with the lower rest state at
energy E = −3, at the physical parameters and without a small parameter:

- **A transversal homoclinic orbit** (Theorem 1, computer-assisted). At each of the energies E = −1/2, 0 and 1/2,
  exactly, the flow on the energy level has a symmetric hyperbolic periodic orbit (a fixed point of the Poincaré return
  map on the section θ1 = 0, with a real eigenvalue of modulus greater than 2.8834, 3.5238 and 2.9987) whose stable and
  unstable manifolds intersect transversally at a point of the symmetry line of the time reversal.
- **On an interval of energies** (Theorem 2, computer-assisted). The same holds simultaneously for every energy in
  [−10^−10, 10^−10].
- **Topological horseshoes and entropy** (Theorem 3, computer-assisted, and Corollary 1, proved from it). At each of
  the three energies, explicit covering relations between h-sets give a compact invariant set of the return map that is
  semiconjugate to a subshift of finite type (a topological horseshoe; hyperbolicity and a conjugacy are not claimed).
  The topological entropy of the return map on it is at least 0.0906, 0.1016 and 0.0906 per return at E = −1/2, 0 and
  1/2, and that of the flow on the level at least 0.0213, 0.0138 and 0.0129 per unit time. No horseshoe is proved on
  the energy interval.
- **No analytic invariant function on these levels** (Corollary 2, proved from Theorems 1 and 2 by Kozlov's argument,
  written out with a local λ-lemma proved in the paper). Every real-analytic function on such a level, or on a
  neighbourhood of it, that is invariant under the flow is constant on the level.
- **No real-analytic first integral near the level E = 0** (Corollary 3, proved from Theorem 2). There is no
  real-analytic first integral functionally independent of the energy on any connected open set that contains the level
  E = 0.
- **Written lemmas** (proved in the paper): the energy levels and the section, the reversibility, the Krawczyk lemma,
  hyperbolicity from cone conditions, the local unstable manifold by a graph transform, the symmetric transversal
  crossing, the entropy of the flow from that of a section map, a local λ-lemma, and covering relations to a
  semiconjugacy and an entropy bound.
- **Numerical, not part of a proof:** how the periodic orbits, the homoclinic crossings and the h-sets were found,
  Poincaré sections, and a high-precision check of the crossing without error control.
- **Not proved:** meromorphic (Liouville) non-integrability in the sense of Morales-Ruiz and Ramis; any energy other
  than those stated.

**Novelty, stated conditionally.** As far as we could find, neither the chaos nor the non-integrability of the equal
double pendulum had been proved. The one non-perturbative earlier result, Bolotin and Negrini (Russ. J. Math. Phys. 5,
1997), is known to us only from search snippets. On that text, its condition fails at equal masses and lengths, and it
concerns energies near the upright equilibrium (E = 3). The claim that global analytic non-integrability (Corollary 3)
and chaos in the equal case had not been proved is conditional on that reading, until the printed paper is read. The
results on the levels −1/2 ≤ E ≤ 1/2 do not depend on it.

### Checked by computer

All proofs by computer use interval arithmetic with outward rounding in CAPD (pinned commit 03dc5628, fetched by
`code/build.sh`), or exact arithmetic. Each program reports FAIL and exits with a non-zero status if a check fails.

- `code/check_field.py`: the vector field given to CAPD is exactly Hamilton's equations of the double pendulum, and the
  section lift solves H = E (exact, SymPy; seconds).
- `code/prove.cpp`: Theorems 1 and 2. The fixed point by the Krawczyk method and its symmetry; the cone conditions
  (C1)–(C3) on the local box; the transversal crossing of the symmetry line, conditions (C5)–(C6)
  (`configs/E0.cfg`, `Ehalf.cfg`, `Eminushalf.cfg`, `E0_interval.cfg`; 3 to 10 minutes each).
- `code/cones.cpp`: condition (C4) of the graph transform and the local λ-lemma: a derivative bound over the local box,
  and the position of the fixed point in it. Stage 1 is repeated with an exact comparison (about 10 seconds each).
- `code/horseshoe_check.cpp`: Theorem 3. The covering relations (28, 24 and 28 at E = −1/2, 0 and 1/2), the pairwise
  disjointness of the h-sets, the return-time bound and the entropy bound (`configs/horseshoe_*.cfg`; 5 to 15 minutes
  each).
- Controls, each of which must fail:
  - four coarse controls: the integrable limit, two mutated configurations, and three covering relations that must not
    hold;
  - five near misses: a thin target, a wide target and an overlapping h-set for one true covering relation, and (C4)
    over the stable direction and with the fixed point off centre. For each near miss, `run_all.sh` checks that it
    fails for its stated reason.
- `code/crosscheck/`: an independent rigorous integrator in Arb (python-flint), written without CAPD. It verifies the
  Krawczyk condition for the fixed point at E = 0 on a box of radius 10^−17, and gives point enclosures at E = ±1/2.
  `edges_nr.py` is a high-precision numerical check of the crossing.
- The proofs also trust CAPD's integrator and Poincaré map, the compiler and the floating-point rounding. That no
  upward crossing of the section is skipped rests on a reading of CAPD's code, set out in Sect. 8 of the paper.

### Files

- `paper/double-pendulum.pdf`: the paper. `paper/double-pendulum.tex` is its LaTeX source.
- `code/`: the programs and the header `rig.h`, together with:
  - `build.sh` (fetches and builds CAPD at the pinned commit);
  - `run_all.sh` (reruns every computer-assisted step on the committed configurations);
  - `designs.sh` (regenerates the h-set designs and compares them with the committed configurations);
  - the numerical tools `horseshoe_design.cpp`, `scan.cpp`, `manifold.cpp` and `explore.cpp`;
  - `requirements.txt`.
- `configs/`: the inputs of the proofs and of the controls.
- `data/`: the reports the programs write.
- `notes/`: the quality record and the in-project review with its response.

### Reproduce

```
python3 -m pip install -r code/requirements.txt
sh code/run_all.sh            # builds CAPD and the programs; about 85 minutes on 2 threads
sh code/designs.sh            # optional: regenerate the h-set designs and compare
cd code/crosscheck && for c in kraw3 otherE edges_nr; do python3 $c.py > ../../data/crosscheck_$c.txt; done
```

`NT` sets the number of threads, and `CAPD_CONFIG` can point at an existing CAPD build.

### License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/`, the
configurations in `configs/` and the reports in `data/` are licensed under the Apache License 2.0. CAPD (GPL) is not
included.
