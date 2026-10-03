# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and has not been
peer reviewed.

## 1.1.0 (2026-10-03)

**DOI:** [10.5281/zenodo.23114240](https://doi.org/10.5281/zenodo.23114240). Publication / Preprint.

The actual GitHub and Zenodo source ZIPs were downloaded and verified: all 186 files match the reviewed package,
including the complete manuscript PDF and all 84 code/data files. Earlier immutable releases remain available.

The 73-page preprint adds computer-assisted Theorem D for the single cell: a 712-piece conductance family with 711 gluings,
63 group or subgroup uniform-stability certificates covering the entire lower interval, and a 68-piece amplitude
family with 67 gluings and a fresh bridge to the supercritical Hopf equilibrium. The lower-interval multiplier
bound is 0.998413816 at requested delta = 3e-5 per ms. Historical all-N and cable results retain their original scope.
The fresh G_Ks = 0.02778 point proof is existence-only; no old pointwise stability receipt is inherited. Uniform
stability is not established on the whole amplitude bridge, and the conductance projection need not be monotone.

The proof records and written arguments passed separate in-project adversarial readings and fix checks. The seven
original piece controls, thirteen original group/half controls plus an additional half comparison, and all 117
original Hopf checks passed. A fresh staging from committed companion bytes passed `alln,continuation` in 29.64 s
with 436 MiB sampled peak RSS. This rederives collection, gluing and identification; it does not rerun every numerical
piece proof. The failed original stability workflow remains recorded: all six raw numerical shard outputs were
recovered and accepted with stronger exact self-map checks, without changing any scientific program or bound.

Four figures present the cell, ring wave, all-size existence pieces and conductance/Hopf extension. The manuscript,
code, data and source-bound review receipts are included together. Separate layout and manuscript reviews, the
quality record and the release checks document their scope. No outside or human review is claimed. The prior
1.0.0 release and archive remain available; the registry now identifies the verified 1.1.0 version DOI. The archive is a Publication / Preprint, with manuscript rights
distinct from the code and data licenses.

The reproduction script adds `continuation` (alias `branch`) without redoing every amplitude or conductance piece
by default. It checks collectors in scratch directories. Exact original all-N source bytes are archived as
`code/fourier/branch-1.0.0.py`; their hash is checked before reconstructing the historical execution layout. Original
1.0 records and its deposited archive are preserved. Python 3.12, the pinned Linux python-flint 0.9.0 wheel and the
native runtime controls document the new producer trust base; runtime differences are not bitwise portability.

Method credits include the established analytic continuation/desingularization and gluing work of van den Berg,
Queirolo and Lessard. The full published 2021 Hopf article and full 2019 continuation preprint were read, with access
limits and the bounded Erhardt forward-citation search recorded in
`review/method-reading-and-forward-citations-2026-10-02.md`. No historical-priority claim follows.

## 1.0.0 (2026-10-02)

**DOI:** [10.5281/zenodo.23101322](https://doi.org/10.5281/zenodo.23101322). Publication / Preprint.

The first public release of the preprint *Stable Rotating Waves in Rings of a Modified Ventricular Cell Model:
Computer-Assisted Proofs* (45 pages), with the programs that prove its results and
their output.

### What the paper shows

The model is A. H. Erhardt's 18-state modification of the ten Tusscher-Panfilov 2006 endocardial ventricular cell,
with reduced repolarization reserve and G_Ks = 0.0275 nS/pF, about 1.5 per cent below the first supercritical Hopf point
that Erhardt computed numerically. Rings of N identical cells are coupled through the voltage alone, with strength
N^2/64000 per ms.

- **The cell** (Theorem A, computer-assisted). A periodic orbit exists and is locally orbitally asymptotically stable,
  by two proofs that share only the multiprecision libraries GMP and MPFR (separate builds): a time-domain proof with CAPD, which encloses the period in
  [53.5855190480139, 53.585519630722438] ms and bounds the 17 nontrivial Floquet multipliers in modulus by 0.998642,
  and a space-time Fourier proof in Arb ball arithmetic, which encloses the period in an interval of width less than
  2e-25 ms and bounds the 17 nontrivial multipliers by 0.99785888. An exact rational check shows that the two proofs
  are about the same orbit.
- **Rings of 8, 16, 32 and 64 cells** (Theorem B, computer-assisted). A rotating 1-wave
  x_j(t) = phi(omega t + 2 pi j/N) exists, is locally unique, is not synchronous, has its minimal period enclosed in an
  interval of width less than 2e-25 ms, and is locally exponentially orbitally stable with asymptotic phase: the
  Floquet multiplier 1 is algebraically simple, and the other 18N - 1 multipliers have modulus less than e^(-delta T)
  with delta = 5e-6 per ms.
- **Every ring size and the cable** (Theorem C, computer-assisted). With epsilon = 1/N^2 treated as an interval
  parameter on [0, 1/64], covered by 73 pieces glued by ball inclusion, a locally unique rotating 1-wave exists for
  every N >= 8, and a locally unique traveling wave for the continuum cable u_t = f(u) + D u_xx (voltage only,
  D = 1/64000 per ms, on a ring of unit length). They form one family, continuous in epsilon, so the ring waves
  converge to the cable wave as N tends to infinity. Their stability is proved only for N = 8, 16, 32 and 64.
- **Numerical, not proved:** the floating-point leading exponents, the Hopf point, that these orbits lie on the branch
  born at Erhardt's first Hopf point (an inference: no branch was continued in G_Ks), the negative controls of Theorem C, and the comparison with the weak-coupling phase
  reduction (Remark 7.1), which predicts the period shifts to within 0.82 per cent and the leading exponents to within
  3.5 per cent, and fails for the short-wavelength ring modes when N >= 16.

Existence is proved by a radii-polynomial argument in a weighted l^1 space, with rigorous strip covers, aliasing bounds
and a polydisc Cauchy majorant for the non-polynomial ionic currents. Stability is proved through one Hill operator,
whose spectrum on a half-open strip gives every Floquet multiplier of the ring with its algebraic multiplicity;
spectrum is excluded from {Re mu >= -delta}, apart from the eigenvalues i omega N Z (the translates of the eigenvalue
0), each algebraically simple, by a Riesz-projection homotopy with a
Schur-complement small-gain test and an explicit tail resolvent bound. Nothing is claimed for the published 19-state
TP06 cell, for action potentials, reentry or tissue, for N < 8, or for stability uniformly in N. The project's
prior-article searches (scope in Section 9 of the manuscript) found no earlier computer-assisted proof of a periodic orbit of a detailed ionic cardiac cell
model and none of a rotating wave in a ring of diffusively coupled cells; they did not cover traveling waves of continuum cables,
and no novelty is claimed for the cable wave.

### Checked by computer

- `code/run_all.sh`: checks the copies in `code/` and `data/` against the 90 hashes stored in the Fourier records and
  the 15 stored in the record of Theorem C, and runs the exact link of the two cell proofs
  (`code/fourier/link_cell.py`). With arguments it reruns Stage E and Stage S for chosen N (about 5 minutes for N = 1
  and 8, about 25 minutes for all five) or re-derives the gluing and the Stage E identifications of Theorem C in Arb
  (`alln`, under a minute), and compares the results with `data/`.
- `code/fourier/test_*.py`: the tests and negative controls of the Fourier route. `code/fourier/test_alln.py`
  re-proves four of the 73 pieces of Theorem C from their stored inputs (about 10 to 15 minutes on a shared
  machine).
- The CAPD certificate of Theorem A(i), `data/cell-gks0.0275.json`, took 732 s; rerunning it needs CAPD 6.1.0 with the
  patch in `code/proofs/`.
- On 2026-10-01 the existence and stability programs for N = 1 and N = 8 were rerun from the copies in `code/`: the
  period and frequency enclosures and every stability bound agreed exactly with the records, and the binary values of
  Y0, Z1, Z2 and r_existence differed in late digits (the reruns used one BLAS thread, and the stored records do not
  record their thread settings). On 2026-10-02 the rest was rerun from the copies: the CAPD certificate (all 28 keys
  of the verifier's output identical to the record; only the binary's hash and the run time differ), Stage E and
  Stage S for N = 16, 32 and 64 (enclosures and stability bounds identical, Y0, Z1, Z2 and r_existence different in
  late digits), the collection step of Theorem C (identical) and `code/fourier/test_alln.py` (13 tests passed, four
  pieces re-proved bit for bit); 69 of the 73 pieces of Theorem C were not re-proved from these copies. The proof for
  N = 1 was also rerun from a fresh copy of this folder with its `code/requirements.txt`.
- The checks made within the project by separate AI agent sessions instructed to find errors are in `review/`, with
  an index in `review/README.md`; none is an outside review.

### Files

- `paper/cardiac-rings.pdf`: the paper. `paper/cardiac-rings.tex` is its LaTeX source, and `paper/figures/` holds its
  three figures with their sources manifest.
- `code/`: the programs of the Fourier route (`code/fourier/`, with the stability lemmas in
  `code/fourier/LEMMAS-stability.md`), of the CAPD route (`code/proofs/`, `code/candidates/`), the model
  (`code/model/`), the numerical comparisons (`code/numerics/`, not part of any proof), `run_all.sh`,
  `requirements.txt` and `plot_cardiac_rings.py`, which draws the figures from stored files (not part of any proof).
- `data/`: the records of the proofs, the in-project review status, the output of the link, and two numerical
  records.
- `review/`: the in-project readings of the programs, the lemmas and the manuscript.

### Reproduce

```
python3 -m pip install -r code/requirements.txt
sh code/run_all.sh
sh code/run_all.sh alln
sh code/run_all.sh 1,8,16,32,64
python3 code/plot_cardiac_rings.py
```

The README gives the build of the CAPD certificate and the run of `code/fourier/test_alln.py`.

### License

The manuscript in `paper/`, its figures included, is Copyright (c) 2026 Chase Hendrick, all rights reserved. The
programs in `code/` and the data in `data/` are licensed under the Apache License 2.0. The model translation follows
A. H. Erhardt's MIT-licensed source, and the CAPD patch in `code/proofs/` is subject to CAPD's own license (see
`NOTICE`).
