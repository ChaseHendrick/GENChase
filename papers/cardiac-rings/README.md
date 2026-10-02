# Stable Rotating Waves in Rings of a Modified Ventricular Cell Model: Computer-Assisted Proofs

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Preprint**, release 1.0.0 (2026-10-02), with the programs that prove its results and their output. Not peer reviewed. The checks made of it, all within the project by separate AI agent sessions instructed to find errors, are
in [`review/`](review/README.md); none is an outside review.

**[Read the paper (PDF, 45 pages)](paper/cardiac-rings.pdf)**, built from [`paper/cardiac-rings.tex`](paper/cardiac-rings.tex).

## Abstract

We give computer-assisted proofs for Erhardt's 18-state modification of the ten Tusscher-Panfilov 2006 endocardial
ventricular cell model at slow delayed rectifier conductance G_Ks = 0.0275 nS/pF, 1.46 per cent below the first
supercritical Hopf point he computed numerically. Rings of N identical cells, coupled diffusively through the voltage with strength N^2/64000 per ms,
discretize the cable u_t = f(u) + D u_xx, D = 1/64000 per ms, on a ring of length 1. Rotating waves there are expected
from equivariant Hopf theory; we prove them at explicit parameters.

For one cell, two proofs (CAPD and Arb, sharing only GMP and MPFR) give an orbitally asymptotically stable periodic
orbit, with 17 nontrivial Floquet multipliers below 0.998642 and 0.997859 respectively, and an exact rational check
shows both enclose the same orbit. For N = 8, 16, 32, 64 a rotating 1-wave exists, is locally unique and not
synchronous, has minimal period T = 2 pi/omega enclosed to within 2e-25 ms, and is locally exponentially orbitally
stable: the multiplier 1 is algebraically simple and the other 18N - 1 have modulus below e^(-delta T) < 0.9997321,
delta = 5e-6 per ms. A locally unique rotating 1-wave also exists for every N >= 8, and a traveling wave for the cable,
the limit of the ring waves.

Existence is a radii-polynomial argument in a weighted l^1 space, made uniform over epsilon in [0, 1/64] (1/N^2 for the
rings, 0 for the cable) in 73 pieces glued by ball inclusion. Stability rests on one Hill operator whose spectrum gives
every Floquet multiplier with its algebraic multiplicity; a Riesz-projection homotopy shows it meets {Re mu >= -delta}
only in the eigenvalues i omega N Z, each algebraically simple. Stability is proved only for the cell and these four
rings; the link to the Hopf branch is only numerical, and nothing is claimed for tissue.

## Status of the results

- **Computer-assisted** (written proofs in `paper/cardiac-rings.tex`, inequalities decided in exact rational,
  interval or ball arithmetic):
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
  - Theorem C, every ring size N >= 8 and the continuum cable (existence, local uniqueness, minimal period, continuity
    in epsilon = 1/N^2, convergence as N tends to infinity): record `data/fourier-existence-alln.json` (73 pieces of
    [0, 1/64]), written by `code/fourier/alln.py` from the run log `code/fourier/data/alln/pieces.jsonl`. For
    N = 8, 16, 32, 64 the record identifies the wave with the wave of Theorem B, so Theorem B's stability applies to it;
    for every other N, and for the cable, stability is not claimed. Four constants that the theorem states for all
    pieces together (the largest r_ex, the smallest r_un, the smallest r_un times the smallest weight, which gives the
    unweighted uniqueness radius 1.05e-6, and the largest weight) are read off the record by an exact rational check,
    given with its output in `review/third-reading-2026-10-02.md`. The record's `theorem` string writes the profile
    equation as omega phi' = f(phi) - L_eps phi, with L_eps acting on mode m as +d_m(eps) E; this is the negative of
    the manuscript's L_eps, so the two equations are the same. The program had an in-project adversarial reading
    (`review/alln-existence-review-2026-10-02.md`: nothing unsound, four weak tests and four minor items, fixed by the
    program's author without changing any bound, `review/alln-existence-fixcheck-2026-10-02.md`); the record keeps the
    status its program wrote, and `data/fourier-review-status.json` does not list it yet.
- **Proved** (written proofs, no computation of their own): the lemmas, propositions, corollaries and theorems of
  Sections 4 and 5 on which the computer-assisted theorems rest, among them Theorem 5.3 (Hill sectors) and the
  certificate theorems of Section 5, whose hypotheses the programs check, and Appendix A, which proves the facts about
  operators with compact resolvent from elementary facts (Kato is cited as "see also" only). Lemma 6.1, the link of
  the two cell proofs, is computer-assisted (exact rationals, `code/fourier/link_cell.py`).
- **Numerical, not proved** (Section 7 of the manuscript): the floating-point leading exponents; the sharpness of the
  N = 8 certificate (passes at delta = 6.32095e-6, fails at 6.321e-6, in runs not kept as records); the Hopf point
  (`data/numerics-hopf-orbit.json`); that these orbits lie on the branch born at Erhardt's first Hopf point (an
  inference from these observations: no branch was continued in G_Ks); the negative
  controls of Theorem C; and the comparison with the weak-coupling phase reduction (Remark 7.1,
  `code/numerics/phase_reduction.py`, `data/numerics-phase-reduction.json`), which predicts the period shifts to within
  0.82 per cent and the leading exponents to within 3.5 per cent, and fails for the short-wavelength ring modes when
  N >= 16.
- **Consistency check, not part of this paper:** an independent computation with CAPD made earlier in the project,
  whose records stay in the project's development repository, enclosed the periods of the cell and of the 8- and
  16-cell waves in intervals that contain the periods proved here.
- **Not claimed:** anything about the published 19-state TP06 cell, action potentials, reentry or tissue; N < 8;
  stability for N other than 8, 16, 32, 64, for the cable, or uniformly in N; a rate of convergence as N tends to
  infinity. A certified branch of these orbits on an interval of G_Ks toward the Hopf point is future work; no result
  of it is used or claimed here.
- **Checks made:** in-project adversarial readings of the programs and of the stability lemmas, and a second reading
  of their fixes; a review of the CAPD verifier, which led to its hardening and to the CAPD patch in `code/proofs/`; a
  first reading of this manuscript (`review/manuscript-reading-1-2026-10-01.md`) and a second reading of the revised
  draft (`review/manuscript-reading-2-2026-10-01.md`), whose corrections are made and listed in
  `review/fix-check-2026-10-01.md`; a reading of Appendix A (`review/appendixA-reading-2026-10-02.md`); and the
  reading of the program of Theorem C above; and a third reading of the whole manuscript on 2026-10-02, in five parts
  with every finding checked by two further sessions (`review/third-reading-2026-10-02.md`: no gap in the proofs;
  its confirmed findings are fixed, and the fixes have not been read by a further reader). The index of these files
  is [`review/README.md`](review/README.md). On 2026-10-01 the proofs for N = 1 and 8 were rerun from the copies in
  `code/`; on 2026-10-02 the CAPD certificate, the proofs for N = 16, 32 and 64, the collection step of Theorem C and
  `code/fourier/test_alln.py` (13 tests, four of the 73 pieces re-proved bit for bit), and the proof for N = 1 again
  from a fresh copy of this folder with its `code/requirements.txt`; Section 8 of the manuscript gives the outcome.
  None of these checks is an outside review.
- **Earlier work, as far as the searches reached:** the prior-article searches of 2026-09-30 and 2026-10-01, whose
  scope and limits Section 9 of the manuscript records, found no earlier computer-assisted proof of a periodic orbit
  of a detailed ionic cardiac cell model and none of a rotating wave in a ring of diffusively coupled cells; the
  nearest computer-assisted precedent for the cyclic-shift symmetry is Kapela and Zgliczynski's N-body choreographies
  (Nonlinearity 16 (2003) 1899-1918), which the paper cites. Nothing more is claimed; in particular the searches did not
  cover traveling waves of continuum cables, and no novelty is claimed for the cable wave of Theorem C. The
  oscillation of the cell is predicted by Erhardt's numerical continuation (Front. Phys. 13 (2025) 1569121), and the
  existence of rotating waves near a Hopf point of a ring is the generic expectation of Z_N-equivariant Hopf theory.

## The model

A. H. Erhardt's 18-state K_i-clamped, smoothed TP06 endocardial model (`fun_eval` of
`bifurcation analysis/TP06_18d_endo_bif.m`, GitHub repository
andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations, commit
dc78f86, MIT License), which differs from the published TP06 cell in four ways: K_i is held at 138.3 mM; the Heaviside
switch at V = -40 mV in the h and j rates is replaced by 1/(1 + exp(-5(V + 40))); G_Kr = 0.0153 and G_CaL = 0.000199
(0.1 and 5 times the endocardial values), with G_Ks = 0.0275; and C_m = 1 also multiplies the Ca_i, Ca_ss and Na_i
fluxes, so every concentration flux is 5.405 times its value in the convention of the CellML-derived version of
TP06 in the same repository, which uses 0.185 for the cell capacitance. The ring is
dx_j/dt = f(x_j) + c E (x_{j-1} - 2 x_j + x_{j+1}), c = N^2/64000 per ms, E the projection on V.

## Programs

The programs and records were computed in the project's study of these orbits. `code/` reproduces the layout of the
study's folder, to which the paths hashed in the records are relative. Every file in `code/` that the study also has
is a byte-identical copy of the study's file, except `code/fourier/LEMMAS-stability.md`, which is kept at the version
this paper uses (the study's file has since gained a section 10 for a branch in G_Ks, which this paper does not use),
with its references to the manuscript, to the reading of the lemmas and to the Appendix A reading written relative
to this folder, and its section 4.1 brought up to date with the records;
`code/run_all.sh`, `code/requirements.txt` and `code/plot_cardiac_rings.py` were written for this folder, and no
record hashes them. The JSON records in `data/` are byte-identical copies of the study's records, and
`data/link_cell.txt` is the output of `code/fourier/link_cell.py`. `data/fourier-review-status.json` is likewise
copied unchanged, so it speaks of the study folder: its `reviews/` paths name the study's folder of readings, whose
files are copied here in `review/`; `repository_commit_at_review` is a commit of the project's development
repository; and its `check` command, `python3 fourier/check_records.py`, is the provenance step that `code/run_all.sh`
runs in a scratch copy of `code/` with the records of `data/` copied to `results/`. The seed orbit
`code/fourier/data/orbit_N1_M64.json` names its source as a scratchpad run of a non-rigorous prototype that is not
copied here; it is used only as the starting guess of the untrusted Newton iteration and as test points, never as a
bound. The prototypes `rw_fourier.py` and `hill.py` cited in section 1 of `code/fourier/LEMMAS-stability.md` are in
the study's folder `prototypes/fourier-feasibility/` and are not copied here either, and the toy model cited there was
a scratch check, not part of any proof, whose program is not kept.

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript, [`cardiac-rings.tex`](paper/cardiac-rings.tex), its PDF, [`cardiac-rings.pdf`](paper/cardiac-rings.pdf), and its figures in [`figures/`](paper/figures/) with their sources manifest |
| [`code/`](code/) | The programs below, [`run_all.sh`](code/run_all.sh) and [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The CAPD record of the cell, the Stage E and Stage S records for N = 1, 8, 16, 32, 64, the record of Theorem C, the in-project review status, the output of the link, and two numerical records |
| [`review/`](review/README.md) | The in-project readings of the programs, the lemmas and the manuscript, with an index |

| Path | What it is |
|---|---|
| `code/run_all.sh` | Provenance check of the copies against the records' hashes, the link of the two cell proofs, and an optional rerun of Stage E and Stage S in a scratch folder with a comparison against `data/` |
| `code/fourier/arbmodel.py`, `code/fourier/tp06_18d_arb.py` | The exact Arb model: every decimal of the reference translation as an exact rational (generated file, freshness checked) |
| `code/fourier/fourier_eval.py` | Strip covers, Cauchy estimate, aliased DFT with its error bound (Section 4.1) |
| `code/fourier/existence.py` | Stage E: the radii-polynomial existence proof (Section 4) |
| `code/fourier/stability.py` | Stage S: the Hill-operator certificate (Section 5) |
| `code/fourier/link_cell.py` | The exact check that the Fourier cell orbit's section point lies in the CAPD ball (Lemma 6.1) |
| `code/fourier/alln.py`, `code/fourier/branch.py` | Theorem C: the family in epsilon = 1/N^2, its pieces, gluing and Stage E identifications (Section 4.8); `alln.py` calls the bound assembly, the Hessian cover, the center distance and the piece-order check of `branch.py`. `branch.py` is an identical copy of the file the Theorem C record hashes; its other functions and its docstrings belong to the study's work in progress on a branch in G_Ks, which they call "Theorem C" (not this paper's Theorem C), and they refer to files and records that are not part of this folder |
| `code/fourier/data/alln/` | The run log of Theorem C (`pieces.jsonl`, the exact inputs and bounds of every piece, hashed by the record), its controls and the code version at launch |
| `code/fourier/LEMMAS-stability.md` | The stability lemmas in the version this paper uses; Section 5 of the paper writes them out |
| `code/fourier/centre.py`, `code/fourier/data/` | Newton solver for the centers (untrusted), the small trusted helpers that `existence.py` and `alln.py` call (`level_exact`, `Layout`, `load` / `text_to_dyadic`, `dyadic_to_text`), and the centers as exact dyadic numbers |
| `code/fourier/check_records.py` | Rechecks every hash stored in the Fourier records; run it through `sh code/run_all.sh`, which stages `data/` as `results/` (run directly in `code/`, it finds no records) |
| `code/fourier/test_*.py` | Tests and negative controls (the reviews ran them; no stored log of a full run is kept here) |
| `code/plot_cardiac_rings.py` | Not part of any proof: draws the figures in `paper/figures/` from stored files only (the centers hashed by the Stage E records, the stored enclosures of the Theorem C record) and writes `paper/figures/sources.json` with the input hashes and package versions; needs numpy and matplotlib |
| `code/model/` | The reference translation (`tp06_18d.py`), the CAPD field (`tp06_capd.hpp`, `setup.hpp`) and the scales |
| `code/proofs/` | The CAPD route: `verify.cpp` (the verifier), `certify.py` (the driver that writes the record), the untrusted `orbit_newton.cpp` and `frame.py`, and the CAPD patch |
| `code/candidates/` | The cell orbit and the frame file that `data/cell-gks0.0275.json` hashes |
| `code/numerics/` | Not part of any proof: the CAPD-against-Python field comparison, the Hopf computation and the phase-reduction comparison (`phase_reduction.py`, Remark 7.1) |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
sh code/run_all.sh                 # provenance ("90 hashes checked", and "15 hashes checked" for Theorem C) and the link ("LINKED")
sh code/run_all.sh alln            # Theorem C: re-derive the gluing and the Stage E identifications in Arb (under a minute)
sh code/run_all.sh 1,8             # rerun Stage E and Stage S for N = 1 and 8 (about 5 minutes)
sh code/run_all.sh 1,8,16,32,64    # all five (about 25 minutes; Stage S at N = 64 needs about 3.6 GB)
python3 code/plot_cardiac_rings.py # the figures (seconds; numpy and matplotlib; no proof is rerun)
```

Four of the 73 pieces of Theorem C (those containing eps = 0 and 1/4096, 1/1024, 1/256 and 1/64) are re-proved from
their stored inputs by `code/fourier/test_alln.py` (about 10 to 15 minutes on a shared machine; the command is in its
docstring), run in a folder staged as `run_all.sh` stages one (the
contents of `code/`, with `data/fourier-*.json` copied to `results/`).

The script stages `code/` in a scratch folder, because the programs write their records to `<root>/results`, and never
touches `data/`. Expect the period enclosures and the stability bounds to agree exactly with `data/`, and the binary
values of Y0, Z1, Z2 and r_existence to differ from about the 14th significant digit (Y0 only beyond its 25 printed
digits): `run_all.sh` runs `existence.py` with one BLAS thread, the stored records do not record their thread
settings, and the untrusted floating-point inverse may depend on them (Section 8 of the manuscript). What is
certified are the stored records in `data/`; the Stage S records hash the Stage E records they read.

The CAPD certificate of Theorem A(i) needs CAPD 6.1.0 at commit 03dc5628203334b214bb7d9fd63788a175521005, configured
with CMake with CAPD_INTERVAL_TYPE=FILIB (the default; filib is bundled in capdExt/filibsrc) and
CAPD_ENABLE_MULTIPRECISION=true (GMP and MPFR), with `git apply code/proofs/capd-6.1.0-genchase.patch` from the CAPD
source root. Build the verifier from `code/` with
`g++ -O2 -std=c++17 proofs/verify.cpp -o verify $(<capd-install>/bin/capd-config --cflags --libs)` (capd-config
supplies `-frounding-math`, `-D__USE_FILIB__` and `-D__HAVE_MPFR__`). Then
`python3 code/proofs/certify.py <verify binary> code/candidates/cell_frameF.txt <record.json> --N 1 --gks 0.0275 --env VERIFY_MP_BITS=128 --env VERIFY_MP_TOL=1e-24 --env VERIFY_MP_ORDER=30`.
Compare the new record with `data/cell-gks0.0275.json`: the keys `verified`, `verifier_exit`, `claim`,
`settings_env`, the hashes of the frame and of the four sources, `capd_commit`, `capd_patch`, `stdout_tail`,
`stderr_tail` and the whole `verifier` object (28 keys) should be identical; `hashes.verify_binary`, `wall_seconds`,
`repository_commit` and the dirty flag will differ. The stored record was written by an earlier version of
`certify.py`, which wrote `working_tree_dirty` (the current one writes `sources_dirty`), and its fields
`sources_match_commit` and `note` were added by hand. Outside a git checkout `repository_commit` is empty and
`sources_dirty` carries no information. The rerun of 2026-10-02 found all of the first group identical.
`certify.py` contains the absolute path of the patched header in the session where it ran (`CAPD_PATCHED_HEADER`);
edit it to point at your CAPD installation, or the record will say that the patch was not detected. The copy here is
unchanged so that it matches the study's file.

The comparison of the two translations of the model (Theorem A(iii)) is `test_b_capd` in
`code/fourier/test_arbmodel.py`. Build the field printer against the same CAPD installation, from `code/`, with
`g++ -O2 -std=c++17 numerics/compare_rhs.cpp -o compare_rhs $(capd-config --cflags --libs)`, then run
`python3 code/fourier/test_arbmodel.py --capd <compare_rhs>` (about 15 s), adding `--wheel <the python-flint 0.9.0
wheel>` to check the wheel's SHA-256 against the pin in `code/fourier/arbmodel.py`; the wheel hash is checked only when
the wheel is given. These two commands were not rerun from this folder.

The manuscript is built with `pdflatex cardiac-rings.tex`, run three times in `paper/`.

## Cite

Until the paper is published in a journal:

```bibtex
@misc{hendrick2026cardiac,
  author = {Hendrick, Chase},
  title  = {Stable Rotating Waves in Rings of a Modified Ventricular Cell Model: Computer-Assisted Proofs},
  year   = {2026},
  note   = {Preprint},
  url    = {https://github.com/ChaseHendrick/cardiac-rings}
}
```

## License

The manuscript in `paper/`, its figures included, is Copyright (c) 2026 Chase Hendrick, all rights reserved. The
programs in `code/` and the data in `data/` are under the Apache License 2.0 (see `NOTICE`). The model translation
follows A. H. Erhardt's MIT-licensed source, and `code/proofs/capd-6.1.0-genchase.patch` is subject to CAPD's own
license; `NOTICE` says which files these are. The `LICENSE` file has the manuscript notice and the Apache License.
