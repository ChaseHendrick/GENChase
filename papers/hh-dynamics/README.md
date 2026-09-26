# Rigorous Dynamics of the Hodgkin-Huxley Equations at the 1952 Parameters

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Work in progress** (drafted in this repository by the owner's decision of 2026-09-26). No manuscript yet; this folder
holds the verification programs and their output as the results are proved.

## Abstract

The space-clamped Hodgkin-Huxley equations with Hodgkin and Huxley's own constants are the canonical model of the
action potential, and their bifurcation structure is usually quoted from numerical computations. We prove parts of it
with computer assistance in ball arithmetic. For every applied current between 0 and 200 uA/cm2 there is exactly one
equilibrium. It is asymptotically stable below a subcritical Hopf bifurcation and above a supercritical one, and
between them it has exactly two eigenvalues with positive real part; no eigenvalue lies on the imaginary axis at any
other current in that range. With the leak potential 10.613 mV printed by Hodgkin and Huxley the Hopf points are at
J = 9.7754... and 154.5224... uA/cm2; with 10.5989..., the value that makes the resting current exactly zero as their
Table 3 says it should, both move up by 0.3 times the difference, to 9.7797... and 154.5267... uA/cm2. The
qualitative statements hold for every leak potential in [10.59, 10.62]. Below the lower Hopf point, at J = 8 uA/cm2
and for every leak potential in [10.59, 10.62], we prove bistability of rest and repetitive firing: a locally
asymptotically stable equilibrium coexists with an orbitally asymptotically stable periodic orbit, a train of action
potentials with period between 16.0058 and 16.0140 ms. At three leak potentials we also enclose an unstable periodic
orbit of saddle type. Planned: the chaos that Guckenheimer and Oliva (2002) found numerically near J = 7.86 and did
not prove.

## Status of the results

- **Proved (computer-assisted):** the equilibrium and Hopf statements above (`code/certify_equilibria_hopf.py`,
  27 checks, about ten seconds), and the bistability at J = 8 (`code/certify_bistability.py`, 84 checks: 30 proof
  checks, 24 negative controls, 23 self-tests and 7 numerical-only checks; about 40 minutes on four cores).
- **Independent reading of the bistability program:** a check of the model against the 1952 equations and 13
  deliberate mutations of the code. What it found is fixed: 10 of the 13 mutations had passed unnoticed, printed
  decimal bounds were rounded to nearest rather than outward, a Poincare map could be started off its section
  without an error, the certificates lacked negative controls that run their own code, and the summary needed
  corrections (it said "the unstable orbit", which is unique only within its box). All 13 mutations now stop the
  program. The fixes have not had a second reading.
- **In progress, in `work/`:**
  - [`work/chaos/`](work/chaos/REPORT.md): Guckenheimer and Oliva's chaotic orbits relocated numerically (their
    periodic points are fixed points of the return map crossed with u increasing, not decreasing), with a horseshoe
    candidate that avoids their multiplier of 2.8e7 and a plan and cost estimate for a computer-assisted proof.
    Numerical evidence, not a proof.
  - [`work/traveling-wave/`](work/traveling-wave/REPORT.md): the propagated action potential at Hodgkin and Huxley's
    own constants. No existence proof was found in the literature reached. The first rigorous stage is done: the
    shooting in the speed switches between 18.7321608 and 18.7321609 m/s at 18.5 C (numerically 18.7322 m/s; Hodgkin
    and Huxley computed 18.8 m/s by hand). The closing step, which would prove the pulse, is not done.
- Nothing here is numerical evidence presented as proof: the program prints what it proves, and its only
  non-rigorous parts are self-tests and an independent cross-check in mpmath.

## The model

In the modern sign convention (u the depolarization from rest in mV, J the applied depolarizing current in uA/cm2),
with Hodgkin and Huxley's eqs. (12), (13), (20), (21), (23), (24), (26) and Table 3, column 2, at 6.3 C:

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l),   dx/dt = alpha_x(u)(1 - x) - beta_x(u) x.

Table 3 prints V_l = -10.613 mV and calls it the "exact value chosen to make the total ionic current zero at the
resting potential"; with the printed rate functions that value is 10.5989..., which is the 10.599 of Guckenheimer and
Oliva. The programs treat E_l as the interval [10.59, 10.62]. Since E_l enters the equations only through
J + 0.3 E_l, a statement for J = 8 and every E_l in [10.59, 10.62] is also a statement for E_l = 10.613 and every J in
[7.9931, 8.0021].

## The bistability theorem (J = 8)

`certify_bistability.py` proves, in ball arithmetic, for J = 8 uA/cm2:

- **Theorem A.** For every E_l in [10.59, 10.62] there is exactly one equilibrium, near u = 4.65 mV, and it is locally
  asymptotically stable (Routh-Hurwitz with enclosed coefficients).
- **Theorem B.** At each of E_l = 10.613 (Hodgkin and Huxley), 10.5989... (the zero-current value, as a rigorous ball)
  and 10.599 (Guckenheimer and Oliva) there are two periodic orbits:
  - (i) one through {u = 20, du/dt > 0} with period near 16.008 to 16.012 ms, enclosed to about 5e-13 ms, whose
    nontrivial Floquet multipliers are enclosed in discs about 0.0709 and 0 of radius below 5e-9: orbitally
    asymptotically stable;
  - (ii) one through {u = 5, du/dt > 0} with period near 14.34 to 14.37 ms and a real multiplier in [10.30, 10.54]:
    unstable, of saddle type.
- **Theorem C.** For every E_l in [10.59, 10.62] there is a periodic orbit through {u = 20, du/dt > 0} with minimal
  period in [16.005827509, 16.013912063] ms, reaching u >= 95.953 mV, whose nontrivial Floquet multipliers have
  modulus at most 0.5446: orbitally asymptotically stable.
- **Bistability.** By Theorems A and C, for every E_l in [10.59, 10.62] a locally asymptotically stable equilibrium and
  an orbitally asymptotically stable periodic orbit coexist. That is the whole claim: nothing is claimed about other
  attractors, the basins, or whether the unstable orbit of Theorem B lies on the boundary between them. The orbits
  are unique only within their enclosing boxes.

Numerical only (not proved): the fold of cycles near J = 6.26, so the bistability window (J_LPC, J_H1) as an interval
of J; uniqueness of the equilibrium for J > 200; an unstable orbit for other leak potentials. The exact enclosures are
printed in `data/certify_bistability.txt`, stage 7, with every decimal bound rounded outward from its ball.

## Programs

| Program | What it proves |
|---|---|
| [`certify_equilibria_hopf.py`](code/certify_equilibria_hopf.py) | Exactly one equilibrium for every J in [0, 200]; the Routh-Hurwitz signs along the branch; exactly two Hopf points, both simple, with transversal crossing; the first Lyapunov coefficients, enclosed away from 0 (subcritical at the lower point, supercritical at the upper one); negative controls and an independent SymPy/mpmath cross-check |
| [`hh_ball.py`](code/hh_ball.py) | The model in ball arithmetic: truncated power series over complex balls, and x/(e^x - 1) through its Bernoulli series near 0 with a rigorous tail, so that no ball containing 0 is ever divided by |
| [`certify_bistability.py`](code/certify_bistability.py) | Theorems A to C and the bistability at J = 8 (stages 0 to 7: integrator self-tests and negative controls, numerics, the equilibrium, Krawczyk proofs of the periodic orbits with enclosed periods and Floquet multipliers, the stable orbit over the whole E_l ball, negative controls of the certificates, a high-precision refinement, the summary) |
| [`hh_lohner.py`](code/hh_lohner.py), [`certlib.py`](code/certlib.py), [`ball_stable.py`](code/ball_stable.py), [`outward.py`](code/outward.py), [`hh_arb.py`](code/hh_arb.py) | The C^0/C^1 Lohner Taylor integrator and Poincare maps (refusing an initial set off its section), the Krawczyk and multiplier certificates, the stable orbit over the E_l ball, outward decimal rounding, and the model in Arb |
| [`tests_integrator.py`](code/tests_integrator.py), [`testsys.py`](code/testsys.py) | Exact test systems and negative controls for the integrator and the certificate code |
| [`hh_numerics.py`](code/hh_numerics.py), [`hh_float.py`](code/hh_float.py), [`shoot_float.py`](code/shoot_float.py), [`hp_refine.py`](code/hp_refine.py) | Numerical only: candidates, the fold of cycles and a high-precision refinement (not trusted) |

```
python3 -m pip install -r code/requirements.txt
python3 code/certify_equilibria_hopf.py
python3 code/certify_bistability.py
```

The outputs are in `data/certify_equilibria_hopf.txt` and `data/certify_bistability.txt`. The only trusted library is
python-flint (FLINT/Arb); numpy, scipy and mpmath only propose candidates and reference values.

## License

The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0; see NOTICE.
