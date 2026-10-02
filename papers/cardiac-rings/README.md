# Stable Rotating Waves in Rings of a Modified Ventricular Myocyte Model Near a Hopf Point: Computer-Assisted Proofs in Fourier Space

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Draft** (status "draft" in `papers/papers.json`).
The manuscript is [`paper/cardiac-rings.tex`](paper/cardiac-rings.tex), and its PDF
[`paper/cardiac-rings.pdf`](paper/cardiac-rings.pdf) (26 pages) is built from it with pdflatex. The programs and records come from `research/cardiac-cycle-certificates/` in
GENChase, their canonical location; the copies here are byte-identical, and the hashes stored in the records refer to
paths relative to that folder, which `code/` reproduces. The quality record is [`notes/QUALITY.md`](notes/QUALITY.md).

## Abstract

We study an 18-dimensional modification, due to Erhardt, of the ten Tusscher-Panfilov 2006 endocardial ventricular
cell model, with reduced repolarization reserve and the slow delayed rectifier conductance G_Ks = 0.0275 nS/pF, a
value about 1.5% below the supercritical Hopf point that Erhardt computed numerically for this model. For the single
cell we give two computer-assisted proofs, sharing no library, that a periodic orbit exists and is locally orbitally
asymptotically stable: a time-domain proof with CAPD, which encloses the period in [53.5855190480139,
53.585519630722438] ms and bounds the 17 nontrivial Floquet multipliers of its orbit in modulus by 0.998642, and a
space-time Fourier proof in Arb ball arithmetic, which encloses the period of its orbit in an interval of width less
than 2e-25 ms and bounds its 17 nontrivial multipliers by 0.99785888. An exact rational check shows that a point of
the second orbit lies in the ball that the first proof shows the return map to map into itself as a contraction, so
the two proofs are about the same orbit. For rings of N = 8, 16, 32 and 64 identical cells with voltage-only diffusive coupling of
strength N^2/64000 per ms we prove, in Fourier space, that a rotating 1-wave x_j(t) = phi(omega t + 2 pi j/N)
exists, is locally unique, has minimal period enclosed in an interval of width less than 2e-25 ms, is not synchronous, and is
locally exponentially orbitally stable with asymptotic phase: the Floquet multiplier 1 is algebraically simple, and
the other 18N - 1 multipliers have modulus less than e^(-delta T) with delta = 5e-6 per ms. Existence is proved by a
radii-polynomial argument in a weighted l^1 space, with rigorous strip covers, aliasing bounds and a polydisc Cauchy
majorant for the non-polynomial ionic currents. Stability is proved through one Hill operator: its spectrum on a
half-open strip of height omega N gives every Floquet multiplier of the ring with its algebraic multiplicity, and
spectrum is excluded from {Re mu >= -delta}, apart from a simple eigenvalue 0, by a Riesz-projection homotopy with a
Schur-complement small-gain test and an explicit tail resolvent bound. The identification of these orbits with the
Hopf branch is numerical, and nothing is claimed for a continuum cable or for tissue.

## Status of the results

- **Computer-assisted** (written proofs in `paper/cardiac-rings.tex`, inequalities decided in interval or ball
  arithmetic):
  - Theorem A(i), the cell by CAPD: record `data/cell-gks0.0275.json` (verified; 732 s).
  - Theorem A(iii), the two cell proofs enclose the same orbit: `code/fourier/link_cell.py` (exact rationals,
    standard library), output `data/link_cell.txt`. Part (i) assumes that the CAPD program evaluates Erhardt's
    function and part (ii) that the Arb program does; (iii) uses both assumptions together. The two programs were
    compared at 104 points by the tests, not proved equal.
  - Theorem A(ii) and Theorem B, the cell and the rings N = 8, 16, 32, 64 in Fourier space: records
    `data/fourier-existence-N*.json` (Stage E, the existence proof) and `data/fourier-stability-N*.json` (Stage S,
    the stability proof).
  - The records keep the status their programs wrote ("computed; awaiting adversarial review"). The in-project review
    outcome, "passed in-project adversarial review", is recorded in `data/fourier-review-status.json`, outside the
    hashed records, so that recording it does not break the hash chain from Stage S to Stage E.
- **Numerical, not proved** (Section 7 of the manuscript): the floating-point leading exponents; the sharpness of the
  N = 8 certificate (passes at delta = 6.32095e-6, fails at 6.321e-6, in runs not kept as records); the Hopf point
  (`data/numerics-hopf-orbit.json`); and that these orbits lie on the branch born at Erhardt's Hopf point.
- **Consistency check, not a publication:** an independent computation with CAPD in the same project, on the owner's
  machine (`docs/CARDIAC-HANDOFF-2026-09-30.md` of GENChase), enclosed the periods of the cell and of the 8- and
  16-cell waves in intervals that contain the periods proved here.
- **Not claimed:** anything about the published 19-state TP06 cell, action potentials, reentry, a continuum cable,
  tissue, other N or uniformity in N. A certified branch on an interval of G_Ks (the project's "rec 2") is in progress
  in `research/cardiac-cycle-certificates/fourier/branch.py`; no result of it is used here.
- **Checks made:** in-project adversarial readings of the programs and of the stability lemmas, and a second reading
  of their fixes, are copied in [`review/`](review/README.md), with a first reading of this manuscript
  (`review/manuscript-reading-1-2026-10-01.md`) and a second reading of the revised draft
  (`review/manuscript-reading-2-2026-10-01.md`), whose corrections are made and listed in `review/fix-check-2026-10-01.md`. On 2026-10-01 the proofs for N = 1 and 8 were rerun from the copies in `code/`
  (`notes/rerun-2026-10-01.md`).
- **Novelty:** the project's logged searches (RESEARCH.md of GENChase, entries of 2026-09-30 and 2026-10-01 on
  cardiac work) found no earlier computer-assisted proof of a periodic orbit of a detailed ionic cardiac cell model
  and none of a rotating wave in a ring of coupled cells. Nothing more is claimed. The oscillation of the cell is
  predicted by Erhardt's numerical continuation (Front. Phys. 13 (2025) 1569121), and the existence of rotating waves
  near a Hopf point of a ring is the generic expectation of Z_N-equivariant Hopf theory.

## The model

A. H. Erhardt's 18-state K_i-clamped, smoothed TP06 endocardial model (`fun_eval` of
`bifurcation analysis/TP06_18d_endo_bif.m`, repository
andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations, commit
dc78f86, MIT License), which differs from the published TP06 cell in four ways: K_i is held at 138.3 mM; the Heaviside
switch at V = -40 mV in the h and j rates is replaced by 1/(1 + exp(-5(V + 40))); G_Kr = 0.0153 and G_CaL = 0.000199
(0.1 and 5 times the endocardial values), with G_Ks = 0.0275; and C_m = 1 also multiplies the Ca_i, Ca_ss and Na_i
fluxes, so every concentration flux is 5.405 times its value in the original convention. The ring is
dx_j/dt = f(x_j) + c E (x_{j-1} - 2 x_j + x_{j+1}), c = N^2/64000 per ms, E the projection on V.

## Programs

| Path | What it is |
|---|---|
| `code/run_all.sh` | Provenance check of the copies against the records' hashes, the link of the two cell proofs, and an optional rerun of Stage E and Stage S in a scratch folder with a comparison against `data/` |
| `code/fourier/arbmodel.py`, `code/fourier/tp06_18d_arb.py` | The exact Arb model: every decimal of the reference translation as an exact rational (generated file, freshness checked) |
| `code/fourier/fourier_eval.py` | Strip covers, Cauchy estimate, aliased DFT with its error bound (Section 4.1) |
| `code/fourier/existence.py` | Stage E: the radii-polynomial existence proof (Section 4) |
| `code/fourier/stability.py` | Stage S: the Hill-operator certificate (Section 5) |
| `code/fourier/link_cell.py` | The exact check that the Fourier cell orbit's section point lies in the CAPD ball (Lemma 6.1) |
| `code/fourier/LEMMAS-stability.md` | The stability lemmas as they were reviewed; Section 5 of the paper writes them out |
| `code/fourier/centre.py`, `code/fourier/data/` | Untrusted Newton solver for the centres, and the centres as exact dyadic numbers |
| `code/fourier/check_records.py` | Rechecks every hash stored in the Fourier records |
| `code/fourier/test_*.py` | Tests and negative controls (the reviews ran them; no stored log of a full run is kept here) |
| `code/model/` | The reference translation (`tp06_18d.py`), the CAPD field (`tp06_capd.hpp`, `setup.hpp`) and the scales |
| `code/proofs/` | The CAPD route: `verify.cpp` (the verifier), `certify.py` (the driver that writes the record), the untrusted `orbit_newton.cpp` and `frame.py`, and the CAPD patch |
| `code/candidates/` | The cell orbit and the frame file that `data/cell-gks0.0275.json` hashes |
| `code/numerics/` | Not part of any proof: the CAPD-against-Python field comparison and the Hopf computation |

## Reproduce

From this folder, with python-flint 0.9.0 (`pip install -r code/requirements.txt`):

```
sh code/run_all.sh                 # provenance ("90 hashes checked; all match") and the link ("LINKED")
sh code/run_all.sh 1,8             # rerun Stage E and Stage S for N = 1 and 8 (about 5 minutes)
sh code/run_all.sh 1,8,16,32,64    # all five (about 25 minutes; Stage S at N = 64 needs about 3.6 GB)
```

The script stages `code/` in a scratch folder, because the programs write their records to `<root>/results`, and never
touches `data/`. Expect the period enclosures and the stability bounds to agree exactly with `data/`, and the binary
values of Y0, Z1, Z2 and r_existence to differ in their last digits (`notes/rerun-2026-10-01.md`): `existence.py` does
not pin BLAS threads, so its untrusted floating-point inverse is not bit-reproducible (a fix is queued in the project).
What is certified are the stored records in `data/`; the Stage S records hash the Stage E records they read.

The CAPD certificate of Theorem A(i) needs CAPD 6.1.0 at commit 03dc5628203334b214bb7d9fd63788a175521005, built with
multiprecision (GMP and MPFR), with `git apply code/proofs/capd-6.1.0-genchase.patch` from the CAPD source root, and
`verify.cpp` built with g++ and `-frounding-math`. Then
`python3 code/proofs/certify.py <verify binary> code/candidates/cell_frameF.txt <record.json> --N 1 --gks 0.0275 --env VERIFY_MP_BITS=128 --env VERIFY_MP_TOL=1e-24 --env VERIFY_MP_ORDER=30`.
`certify.py` contains the absolute path of the patched header in the session where it ran (`CAPD_PATCHED_HEADER`);
edit it to point at your CAPD installation, or the record will say that the patch was not detected. The copy here is
unchanged so that it matches the canonical file.

The manuscript is built with `sh tools/paper-build.sh cardiac-rings` from the GENChase root (pdflatex, three runs),
which writes `paper/cardiac-rings.pdf`, the file registered as `pdf` in `papers/papers.json`.

## License

The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0; see NOTICE. The model
translation follows A. H. Erhardt's MIT-licensed source. Manuscript text is Copyright (c) 2026 Chase Hendrick, all
rights reserved.
