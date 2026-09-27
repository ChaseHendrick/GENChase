# Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952 Parameters: Computer-Assisted Proofs

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Draft manuscript** (drafted in this repository by the owner's decision of 2026-09-26):
[`paper/hh-dynamics.tex`](paper/hh-dynamics.tex), built as [`paper/hh-dynamics.pdf`](paper/hh-dynamics.pdf). Its quality
record is not complete: the written proofs have not had a second reading, and some sources are unread (see
"Status of the results").

## Abstract

The space-clamped Hodgkin-Huxley equations with Hodgkin and Huxley's constants are the standard model of the action
potential, and their bifurcations are known from numerical computation. We prove several of them with computer
assistance in ball arithmetic, for every leak reversal potential E_l in [10.59, 10.62] mV, an interval that contains
the value 10.613 printed by Hodgkin and Huxley and the value 10.5989... that makes the resting current zero, as their
Table 3 says it should. For every applied current J in [0, 200] uA/cm2 there is exactly one equilibrium. It is
asymptotically stable except for J between two Hopf points, where it has exactly two eigenvalues with positive real
part, and no eigenvalue lies on the imaginary axis at any other current in that range. At E_l = 10.613 the Hopf
points lie at J = 9.7754... and 154.5224... uA/cm2 (at the zero-current value 10.5989..., at 9.7796... and
154.5266...); both move by exactly 0.3 (10.613 - E_l). The eigenvalues cross the imaginary axis transversally, and
the first Lyapunov coefficient is positive at the lower Hopf point and negative at the upper one: the lower Hopf
bifurcation is subcritical and the upper one supercritical. At J = 8, for every E_l in the interval, a locally
asymptotically stable equilibrium coexists with an orbitally asymptotically stable periodic orbit, a train of action
potentials with period between 16.0058 and 16.0140 ms: the model is bistable there. At three values of E_l we also
enclose a periodic orbit of saddle type. Nothing is claimed about the basins of attraction or about other attractors.

## Status of the results

Every result carries one label, as in the manuscript: **computer-assisted** (a written proof in which finitely many
inequalities are decided in ball arithmetic by a program named here), **proved** (a written proof with no
computation), **cited** (a published theorem used as stated, with its hypotheses checked), or **numerical** (no error
control; never used in a proof).

- **Computer-assisted** (`code/certify_equilibria_hopf.py`, 38 checks: 17 proof checks, 6 consistency checks, 5
  negative controls, 8 self-tests, 2 cross-checks; about 13 seconds):
  - Theorem 1: exactly one equilibrium for every J in [0, 200] and every E_l in [10.59, 10.62].
  - Theorem 2: the equilibrium is asymptotically stable for J < J_H1 and J > J_H2, unstable with exactly two
    eigenvalues in Re > 0 in between; at J_Hi a simple pair crosses transversally; J_H1 and J_H2 enclosed to 1e-12
    at E_l = 10.613, 10.5989... and 10.599; first Lyapunov coefficient l1 > 0 at J_H1 and l1 < 0 at J_H2.
  - Proposition 2.3: the zero-current leak potential 10.5989209693916785221988785... as an interval.
- **Computer-assisted, with a cited theorem** (Kuznetsov's statement of the Andronov-Hopf theorem, Scholarpedia
  1(10):1858): Corollary 3, the lower Hopf bifurcation is subcritical and the upper one supercritical (local).
- **Computer-assisted** (`code/certify_bistability.py`, 84 checks: 30 proof checks, 24 negative controls, 23
  self-tests, 7 numerical-only checks; about 40 minutes on four cores):
  - Theorem 4: at J = 8 and for every E_l in [10.59, 10.62], an orbitally asymptotically stable periodic orbit
    through {u = 20, du/dt > 0} with minimal period in [16.005827509, 16.013912063] ms, reaching u >= 95.953 mV,
    with nontrivial Floquet multipliers |mu| <= 0.5446.
  - Theorem 5: at E_l = 10.613, 10.5989... (as a ball) and 10.599, the stable orbit with its period in an interval of width below 1e-12 ms, and a
    periodic orbit of saddle type through {u = 5, du/dt > 0} with a real multiplier in [10.30, 10.54].
  - Corollary 6: bistability at J = 8 for every E_l in [10.59, 10.62], equivalently for E_l = 10.613 and every J in
    [7.9931, 8.0021]. Nothing is claimed about other attractors, the basins, or whether the saddle-type orbit lies
    on the boundary between them; the orbits are unique only within their boxes.
- **Proved** (no computation): the lemmas of the manuscript's Sections 2, 4 and 5 (the Jacobian and its
  characteristic polynomial, the quartic lemma, linearized stability, the enclosures of Psi, the l1 of the test
  system, the validated integration and Poincare-map lemmas, Gershgorin's discs, orbital asymptotic stability and
  the saddle-type instability).
- **Numerical only** (manuscript, Section 8): the fold of cycles near J = 6.26, so the bistable range (J_LPC, J_H1)
  as an interval of J; uniqueness of the equilibrium for J > 200; unstable orbits between J = 8.5 and 9.75, whose
  amplitudes agree with the size of l1 predicted by the Hopf normal form; high-precision values of the orbits.
- **Prior articles:** Du and Hassard (2001) computed Hopf coefficients of the model in interval arithmetic; only its
  first page has been read, so no priority is claimed for the Hopf enclosures or the signs of l1. The searches and
  what they did not reach are in RESEARCH.md (2026-09-25 to 2026-09-27) and in the manuscript's Section 10.
- **Checks made within the project**, by separate AI agent sessions, not by anyone outside it: an independent reading
  of `certify_bistability.py` (the model against the 1952 equations and 13 deliberate mutations of the code; 10 of
  the 13 first passed unnoticed, and all now stop the program; its mutation list and harness are not in this folder,
  and the fixes have not had a second reading). The changes of 2026-09-27 to `certify_equilibria_hopf.py` (typed
  checks, tests of the l1 formula on systems with known l1, new negative controls, outward-rounded prints) and the
  written proofs of the manuscript have not been read by a second reader.
- **Runs:** `certify_equilibria_hopf.py` was rerun on 2026-09-27 (38 checks passed). `data/certify_bistability.txt` is
  the full run of 2026-09-26; every stage except 4b was rerun on 2026-09-27 in one process (82 checks passed, and the
  output agrees line for line apart from run times and the parts that stage 4b prints:
  `data/certify_bistability_no_ball_2026-09-27.txt`).
- Every non-rigorous part of the programs is labelled as such where it runs (self-tests, cross-checks, numerical-only
  checks, candidate generation, the high-precision refinement of stage 6), and none of them enters a proof.
- **In progress, in `work/`, not part of the manuscript:**
  - [`work/chaos/`](work/chaos/REPORT.md): Guckenheimer and Oliva's chaotic orbits relocated numerically (their
    periodic points are fixed points of the return map crossed with u increasing, not decreasing), with a horseshoe
    candidate that avoids their multiplier of 2.8e7 and a plan and cost estimate for a computer-assisted proof.
    Numerical evidence, not a proof.
  - [`work/traveling-wave/`](work/traveling-wave/REPORT.md): the propagated action potential at Hodgkin and Huxley's
    own constants. No existence proof was found in the literature reached. The first rigorous stage is done: the
    shooting in the speed switches between 18.7321608 and 18.7321609 m/s at 18.5 C (numerically 18.7322 m/s; Hodgkin
    and Huxley computed 18.8 m/s by hand). The closing step, which would prove the pulse, is not done.

## The model

In the modern sign convention (u the depolarization from rest in mV, J the applied depolarizing current in uA/cm2),
with Hodgkin and Huxley's eqs. (12), (13), (20), (21), (23), (24), (26) and Table 3, column 2, at 6.3 C:

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l),   dx/dt = alpha_x(u)(1 - x) - beta_x(u) x.

Table 3 prints V_l = -10.613 mV and calls it the "exact value chosen to make the total ionic current zero at the
resting potential"; with the printed rate functions that value is 10.5989..., which is the 10.599 of Fukai et al. and
of Guckenheimer and Oliva. The programs treat E_l as the interval [10.59, 10.62]. Since E_l enters the equations only
through J + 0.3 E_l, a statement for J = 8 and every E_l in [10.59, 10.62] is also a statement for E_l = 10.613 and
every J in [7.9931, 8.0021].

## Programs

| Program | What it proves |
|---|---|
| [`certify_equilibria_hopf.py`](code/certify_equilibria_hopf.py) | Theorems 1 and 2 and Proposition 2.3: exactly one equilibrium for every J in [0, 200]; the Routh-Hurwitz signs along the branch; exactly two Hopf points, both simple, with transversal crossing; the first Lyapunov coefficients, enclosed away from 0; tests of the l1 formula on systems with known l1, negative controls and an independent SymPy/mpmath cross-check |
| [`hh_ball.py`](code/hh_ball.py) | The model in ball arithmetic: truncated power series over complex balls, and x/(e^x - 1) through its Bernoulli series near 0 with a rigorous tail, so that no ball containing 0 is ever divided by |
| [`certify_bistability.py`](code/certify_bistability.py) | Theorems 4 and 5 and the equilibrium part of Corollary 6 (stages 0 to 7: integrator self-tests and negative controls, numerics, the equilibrium, Krawczyk proofs of the periodic orbits with enclosed periods and Floquet multipliers, the stable orbit over the whole E_l interval, negative controls of the certificates, a high-precision refinement, the summary; its Theorems A, B and C are the manuscript's Corollary 6, Theorem 5 and Theorem 4) |
| [`hh_lohner.py`](code/hh_lohner.py), [`certlib.py`](code/certlib.py), [`ball_stable.py`](code/ball_stable.py), [`outward.py`](code/outward.py), [`hh_arb.py`](code/hh_arb.py) | The C^0/C^1 Lohner Taylor integrator and Poincare maps (refusing an initial set off its section), the Krawczyk and multiplier certificates, the stable orbit over the E_l interval, outward decimal rounding, and the model in Arb |
| [`tests_integrator.py`](code/tests_integrator.py), [`testsys.py`](code/testsys.py) | Exact test systems and negative controls for the integrator and the certificate code |
| [`hh_numerics.py`](code/hh_numerics.py), [`hh_float.py`](code/hh_float.py), [`shoot_float.py`](code/shoot_float.py), [`hp_refine.py`](code/hp_refine.py) | Numerical only: candidates, the fold of cycles and a high-precision refinement (not trusted) |
| [`make_numbers.py`](code/make_numbers.py), [`make_figures.py`](code/make_figures.py) | The numbers and tables of the manuscript, rounded outward from the reports in exact rational arithmetic, and its figures |

```
python3 -m pip install -r code/requirements.txt
python3 code/certify_equilibria_hopf.py
python3 code/certify_bistability.py
python3 code/make_numbers.py
python3 code/make_figures.py
sh ../../tools/paper-build.sh hh-dynamics
```

The outputs are in `data/certify_equilibria_hopf.txt` and `data/certify_bistability.txt`; the rerun of 2026-09-27 without
stage 4b is `data/certify_bistability_no_ball_2026-09-27.txt`. The only trusted library is
python-flint (FLINT/Arb); numpy, scipy, SymPy and mpmath only propose candidates and reference values.

## License

The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0; see NOTICE. The text of
the manuscript is Copyright (c) 2026 Chase Hendrick, all rights reserved.
