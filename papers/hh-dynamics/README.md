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
qualitative statements hold for every leak potential in [10.59, 10.62]. Planned: the coexistence of rest and
repetitive firing between the fold of limit cycles and the lower Hopf point, and the chaos that Guckenheimer and
Oliva (2002) found numerically near J = 7.86 and did not prove.

## Status of the results

- **Proved (computer-assisted):** the equilibrium and Hopf statements above (`code/certify_equilibria_hopf.py`,
  27 checks, about ten seconds).
- **In progress:** a validated integrator for the bistability proof; the chaos question.
- Nothing here is numerical evidence presented as proof: the program prints what it proves, and its only
  non-rigorous parts are self-tests and an independent cross-check in mpmath.

## The model

In the modern sign convention (u the depolarization from rest in mV, J the applied depolarizing current in uA/cm2),
with Hodgkin and Huxley's eqs. (12), (13), (20), (21), (23), (24), (26) and Table 3, column 2, at 6.3 C:

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l),   dx/dt = alpha_x(u)(1 - x) - beta_x(u) x.

Table 3 prints V_l = -10.613 mV and calls it the "exact value chosen to make the total ionic current zero at the
resting potential"; with the printed rate functions that value is 10.5989..., which is the 10.599 of Guckenheimer and
Oliva. The programs treat E_l as the interval [10.59, 10.62].

## Programs

| Program | What it proves |
|---|---|
| [`certify_equilibria_hopf.py`](code/certify_equilibria_hopf.py) | Exactly one equilibrium for every J in [0, 200]; the Routh-Hurwitz signs along the branch; exactly two Hopf points, both simple, with transversal crossing; the first Lyapunov coefficients, enclosed away from 0 (subcritical at the lower point, supercritical at the upper one); negative controls and an independent SymPy/mpmath cross-check |
| [`hh_ball.py`](code/hh_ball.py) | The model in ball arithmetic: truncated power series over complex balls, and x/(e^x - 1) through its Bernoulli series near 0 with a rigorous tail, so that no ball containing 0 is ever divided by |

```
python3 -m pip install -r code/requirements.txt
python3 code/certify_equilibria_hopf.py
```

The output is in `data/certify_equilibria_hopf.txt`.

## License

The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0; see NOTICE.
