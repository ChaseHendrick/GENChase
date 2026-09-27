# Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952 Parameters: Computer-Assisted Proofs

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Preprint**, archived on Zenodo with its programs and data ([doi:10.5281/zenodo.23002943](https://doi.org/10.5281/zenodo.23002943)), not peer reviewed.

**[Read the preprint (PDF, 30 pages)](paper/hh-dynamics.pdf)**, built from [`paper/hh-dynamics.tex`](paper/hh-dynamics.tex).

## Abstract

The space-clamped Hodgkin-Huxley equations with Hodgkin and Huxley's constants are the standard model of the action
potential, and their bifurcations are known from numerical computation. We prove several of them with computer
assistance in ball arithmetic, for every leak reversal potential E_l in [10.59, 10.62] mV, an interval that contains
the value 10.613 printed by Hodgkin and Huxley and the value 10.5989... that makes the resting current zero, as their
Table 3 says it should. For every applied current J in [0, 200] uA/cm2 there is exactly one equilibrium. There are
two Hopf points J_H1 < J_H2 in this range: the equilibrium is asymptotically stable for J < J_H1 and for J > J_H2, it
has exactly two eigenvalues with positive real part for J_H1 < J < J_H2, and no eigenvalue lies on the imaginary axis
at any current of the range other than J_H1 and J_H2. At E_l = 10.613 the Hopf points lie at J_H1 in
[9.775437995393, 9.775437995394] and J_H2 in [154.522433665808, 154.522433665809] uA/cm2, and both move by exactly
0.3 (10.613 - E_l) when E_l changes. The eigenvalues cross the imaginary axis transversally, and the first Lyapunov
coefficient is positive at J_H1 and negative at J_H2: the lower Hopf bifurcation is subcritical and the upper one
supercritical. At J = 8, for every E_l in the interval, a locally asymptotically stable equilibrium coexists with an
orbitally asymptotically stable periodic orbit, a train of action potentials with period between 16.0058 and 16.0140
ms: the model is bistable there. At three values of E_l we also enclose a periodic orbit of saddle type. The proofs
combine a Routh-Hurwitz analysis along the branch of equilibria with a C^1 Lohner-type Taylor integrator, the Krawczyk
test and a contraction argument on Poincare sections. Nothing is claimed about the basins of attraction or about other
attractors.

## Status of the results

Every result carries one label, as in the manuscript: **computer-assisted** (a written proof in which finitely many
inequalities are decided in ball arithmetic by a program named here), **proved** (a written proof with no
computation), **cited** (a published theorem used as stated, with its hypotheses checked), or **numerical** (no error
control; never used in a proof).

- **Computer-assisted** (`code/certify_equilibria_hopf.py`, 40 checks: 17 proof checks, 6 consistency checks, 5 negative controls, 8 self-tests, 4 cross-checks; about 10 seconds):
  - Theorem 1: exactly one equilibrium for every J in [0, 200] and every E_l in [10.59, 10.62].
  - Theorem 2: the equilibrium is asymptotically stable for J < J_H1 and J > J_H2, unstable with exactly two
    eigenvalues in Re > 0 in between; at J_Hi a simple pair crosses transversally; J_H1 and J_H2 enclosed to 1e-12
    at E_l = 10.613, 10.5989... and 10.599; first Lyapunov coefficient l1 > 0 at J_H1 and l1 < 0 at J_H2.
  - Proposition 2.3: the zero-current leak potential 10.5989209693916785221988785... as an interval.
  - Remark 3.1: the same checks give exactly one equilibrium for every J in [0, 4089.4815) and its stability for every
    J in (J_H2, 4089.4815).
- **Computer-assisted, with a cited theorem** (Kuznetsov's statement of the Andronov-Hopf theorem, Scholarpedia
  1(10):1858; Theorem H of the manuscript): Corollary 3, the lower Hopf bifurcation is subcritical and the upper one
  supercritical (local).
- **Computer-assisted** (`code/certify_bistability.py`, 93 checks: 36 proof checks, 27 negative controls, 23 self-tests, 7 numerical-only checks; about 53 minutes with two worker processes on a shared machine):
  - Theorem 4: at J = 8 and for every E_l in [10.59, 10.62], an orbitally asymptotically stable periodic orbit
    through {u = 20, du/dt > 0} with minimal period in [16.005827509, 16.013912063] ms, reaching u >= 95.953 mV,
    with nontrivial Floquet multipliers |mu| <= 0.5446.
  - Theorem 5: at E_l = 10.613, 10.599 and every E_l in a ball of radius below 1e-25 about 10.5989..., the stable
    orbit with its period enclosed in a ball of radius below 1e-13 ms, and a periodic orbit of saddle type through
    {u = 5, du/dt > 0} with a real multiplier in [10.30, 10.54]. Each section point is unique only in its Krawczyk
    box (half-widths at most about 1.2e-15 for the stable orbit, from about 1e-15 to 2.1e-14 for the saddle); the
    printed intervals are enclosures, not boxes of uniqueness.
  - Corollary 6: bistability at J = 8 for every E_l in [10.59, 10.62], equivalently for E_l = 10.613 and every J in
    [7.9931, 8.0021]. Nothing is claimed about other attractors, the basins, or whether the saddle-type orbit lies
    on the boundary between them; the orbits are unique only within their boxes.
- **Computer-assisted** (`code/identify_stable_orbit.py`, 33 checks: 19 proof checks, 6 negative controls, 8 cross-checks; about 4 minutes with two worker processes): Corollary 7, at E_l = 10.613, 10.5989... (the
  ball) and 10.599 the stable orbit of Theorem 5 is the orbit of Theorem 4: its section point lies in the interior of
  the stage-4b box of every piece of the E_l interval that contains the value. The program recomputes those boxes with
  the function and arguments of stage 4b (its lines agree with those of `data/certify_bistability.txt`) and prints
  them exactly.
- **Proved** (no computation): the lemmas of the manuscript's Sections 2, 4 and 5 (the Jacobian and its
  characteristic polynomial, the quartic lemma, linearized stability, the enclosures of Psi, the l1 of the test
  system, the validated integration and Poincare-map lemmas, Gershgorin's discs, orbital asymptotic stability and
  the saddle-type instability, and the consequence of Rump's form of the Krawczyk test that the manuscript uses).
- **Cited** (published theorems used as stated, hypotheses checked in the text): Theorem H, the Andronov-Hopf theorem
  with the first Lyapunov coefficient (Kuznetsov, Scholarpedia); Theorem K, Rump's Theorem 13.3 (Acta Numer. 2010).
- **Numerical only** (manuscript, Section 8): the fold of cycles near J = 6.26, so the bistable range (J_LPC, J_H1)
  as an interval of J; uniqueness of the equilibrium beyond J = 4089; unstable orbits between J = 8.5 and 9.75, and
  stable small orbits just below J_H2 (`code/numerics_h2.py`, `data/numerics_h2.txt`), whose amplitudes agree with
  the sizes of l1 at the two Hopf points predicted by the normal form; high-precision values of the orbits.
- **Earlier work:** Guckenheimer and Labouriau (1993, p. 941) state the unique equilibrium for every current, without
  proof; Labouriau's thesis (1983, Chapter IV) computes the Hopf points and the directions of bifurcation in floating
  point; Labouriau (1985, 1989) and Hassard and Shiau (1989, 1991, 1996) studied the degenerate Hopf bifurcations of
  the model. Du and Hassard (2001) computed Hopf bifurcation coefficients of the model in interval arithmetic; only
  its first page could be read, so no priority is claimed for Theorems 1 and 2 or Corollary 3. The novelty claimed is
  limited to a stable periodic orbit of large amplitude away from the Hopf points and to bistability, and is limited
  by the unread part of Du and Hassard as well. The searches, and what they did not reach, are in the manuscript's
  Section 10.
- **Checks made within the project**, by separate AI agent sessions (none is an outside review): on 2026-09-27,
  readings of the manuscript's mathematics, of its computations (with 15 deliberate mutations of the programs) and of
  its claims and literature; a fourth reading of the parts revised in answer to them; a fifth of the changes to the
  programs that followed (new controls for the five mutations that had passed every check, the check that the sets
  integrated contain the boxes of the proofs, the stopping rules, the options of stage 4b); and a sixth of the fixes of
  the fifth. Every must-fix finding is fixed.
- **Mutation study** (`code/mutation_study.py`, `data/mutation_study.txt`; not part of any proof): 17 mutations of the programs, each run on its own copy after unmutated baselines: the 16 not marked weak, among them the five that had passed every check in the computation reading of 2026-09-27, all stop the program at a failed check; the one marked weak, a change far below the enclosure radii, passes.
- **Runs:** all programs were run on 2026-09-27 as committed, with at most two worker processes (`certify_bistability.py` in full, 53 minutes, no piece read from a checkpoint); every check passed. Apart from run times, the checks and controls added since, the stage-4b header and the covering field of its piece lines, a path, the counts and the summary's paragraph on the Hopf program, the output of `certify_bistability.py` repeats its output of 2026-09-26 line for line.
- Every non-rigorous part of the programs is labelled as such where it runs (self-tests, cross-checks, numerical-only
  checks, candidate generation, the high-precision refinement of stage 6), and none of them enters a proof.
- **In progress, in [`work/`](work/README.md), not part of the paper:** the chaotic dynamics near J = 7.86
  ([`work/chaos/`](work/chaos/REPORT.md), numerical) and the propagated action potential at Hodgkin and Huxley's own
  constants ([`work/traveling-wave/`](work/traveling-wave/REPORT.md), work in progress).

## The model

In the modern sign convention (u the depolarization from rest in mV, J the applied depolarizing current in uA/cm2),
with Hodgkin and Huxley's eqs. (7), (12), (13), (15), (16), (20), (21), (23), (24), (26) and Table 3, column 2, at
6.3 C:

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l),   dx/dt = alpha_x(u)(1 - x) - beta_x(u) x.

Table 3 prints V_l = -10.613 mV and calls it the "exact value chosen to make the total ionic current zero at the
resting potential"; with the printed rate functions that value is 10.5989..., which is the 10.599 of Fukai et al., of
Guckenheimer and Labouriau and of Guckenheimer and Oliva. The programs treat E_l as the interval [10.59, 10.62]. Since
E_l enters the equations only through J + 0.3 E_l, a statement for J = 8 and every E_l in [10.59, 10.62] is also a
statement for E_l = 10.613 and every J in [7.9931, 8.0021].

## Programs

| Program | What it proves |
|---|---|
| [`certify_equilibria_hopf.py`](code/certify_equilibria_hopf.py) | Theorems 1 and 2 and Proposition 2.3: exactly one equilibrium for every J in [0, 200]; the Routh-Hurwitz signs along the branch; exactly two Hopf points, both simple, with transversal crossing; the first Lyapunov coefficients, enclosed away from 0; tests of the l1 formula on systems with known l1, negative controls, and independent SymPy/mpmath cross-checks of l1 and of the transversality |
| [`hh_ball.py`](code/hh_ball.py) | The model in ball arithmetic: truncated power series over complex balls, and x/(e^x - 1) through its Bernoulli series near 0 with a rigorous tail, so that no ball containing 0 is ever divided by |
| [`certify_bistability.py`](code/certify_bistability.py) | Theorems 4 and 5 and the equilibrium part of Corollary 6 (stages 0 to 7: integrator self-tests and negative controls, numerics, the equilibrium, Krawczyk proofs of the periodic orbits with enclosed periods and Floquet multipliers, the stable orbit over the whole E_l interval, negative controls of the certificates, a high-precision refinement, the summary; its Theorems A, B and C are the manuscript's Corollary 6, Theorem 5 and Theorem 4). Options: `--workers N` for stage 4b (default 2), `--resume` (pieces from a checkpoint, marked as such), `--no-ball`, `--quick` |
| [`identify_stable_orbit.py`](code/identify_stable_orbit.py) | Corollary 7: the stable orbit of Theorem 5 is the orbit of Theorem 4 at the three values (the stage-4b boxes of the pieces that contain them, recomputed and printed exactly, and the Krawczyk sets of Theorem 5 inside them) |
| [`hh_lohner.py`](code/hh_lohner.py), [`certlib.py`](code/certlib.py), [`ball_stable.py`](code/ball_stable.py), [`outward.py`](code/outward.py), [`hh_arb.py`](code/hh_arb.py) | The C^0/C^1 Lohner Taylor integrator and Poincare maps (refusing an initial set off its section), the Krawczyk and multiplier certificates and the check that a run integrated the box of the proof, the stable orbit over the E_l interval, outward decimal rounding, and the model in Arb |
| [`tests_integrator.py`](code/tests_integrator.py), [`testsys.py`](code/testsys.py) | Exact test systems and negative controls for the integrator and the certificate code |
| [`mutation_study.py`](code/mutation_study.py) | Deliberate mutations of the programs, each run on its own copy after unmutated baselines (not part of any proof) |
| [`hh_numerics.py`](code/hh_numerics.py), [`hh_float.py`](code/hh_float.py), [`shoot_float.py`](code/shoot_float.py), [`hp_refine.py`](code/hp_refine.py), [`numerics_h2.py`](code/numerics_h2.py) | Numerical only: candidates, the fold of cycles, a high-precision refinement and the small cycles below J_H2 (not trusted) |
| [`hh_make_numbers.py`](code/hh_make_numbers.py), [`hh_make_figures.py`](code/hh_make_figures.py) | The numbers and tables of the manuscript, rounded outward from the reports in exact rational arithmetic, and its figures |

```
python3 -m pip install -r code/requirements.txt
python3 code/certify_equilibria_hopf.py
python3 code/certify_bistability.py --workers 2
python3 code/identify_stable_orbit.py --workers 2
python3 code/numerics_h2.py
python3 code/mutation_study.py --workers 2
python3 code/hh_make_numbers.py
python3 code/hh_make_figures.py
cd paper && pdflatex hh-dynamics && pdflatex hh-dynamics && pdflatex hh-dynamics
```

The outputs are in `data/certify_equilibria_hopf.txt`, `data/certify_bistability.txt`,
`data/identify_stable_orbit.txt`, `data/numerics_h2.txt` and `data/mutation_study.txt`. The only trusted library is
python-flint (FLINT/Arb); numpy, scipy, SymPy and mpmath only propose candidates and reference values.

## License

The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0, and so are the programs and
data in `work/`; see NOTICE. The text of the manuscript is Copyright (c) 2026 Chase Hendrick, all rights reserved.
