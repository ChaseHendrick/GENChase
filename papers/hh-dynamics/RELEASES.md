# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and has not been
peer reviewed.

## 1.0.2 (2026-09-28)

A checking release of the same preprint. The manuscript is unchanged. This archive adds `code/check_quote.py`, `code/check_abstract.py` and `code/check_hypotheses.py`. The Hopf intervals and the period from 16.0058 to 16.0140 are the outward roundings of the certificates. The zero-current leak is a prefix of the digits the two ends share. Stability stays off the Hopf points. `code/hypotheses.json` names Theorems 1, 2 and 4 and keeps Du-Hassard, Hassard 1978 and Rinzel-Miller unread.

## 1.0.1 (2026-09-27)

**DOI:** [10.5281/zenodo.23002943](https://doi.org/10.5281/zenodo.23002943)

A spelling release of *Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952 Parameters:
Computer-Assisted Proofs*. The preprint and the texts of this repository now write "traveling", the American spelling,
in every sentence of the project's own. Titles of cited works and quotations keep their authors' spelling. No theorem,
program, number or certificate changed; the PDF was rebuilt from the edited source.

## 1.0.0 (2026-09-27)

**DOI:** [10.5281/zenodo.22996260](https://doi.org/10.5281/zenodo.22996260)

The first public release of the preprint *Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952
Parameters: Computer-Assisted Proofs* (30 pages), with the programs that prove its results and their output.

### What the paper shows

The space-clamped Hodgkin-Huxley equations with Hodgkin and Huxley's constants are the standard model of the action
potential, and their bifurcations have been known from numerical computation since the 1970s. The paper proves several
of them for every leak reversal potential E_l in [10.59, 10.62] mV, an interval that contains the 10.613 printed by
Hodgkin and Huxley and the value 10.5989... that makes the resting current zero, as their Table 3 says it should.

- **The branch of equilibria** (Theorems 1 and 2, computer-assisted). For every applied current J in [0, 200] uA/cm2
  there is exactly one equilibrium. It is asymptotically stable below the first Hopf point J_H1 and above the second,
  J_H2, and has exactly two eigenvalues with positive real part between them; at J_H1 and J_H2 a simple pair crosses
  the imaginary axis transversally, and nowhere else. At E_l = 10.613 the Hopf points lie in
  [9.775437995393, 9.775437995394] and [154.522433665808, 154.522433665809] uA/cm2, and both move by exactly
  0.3 (10.613 - E_l).
- **Criticality** (Theorem 2(e) and Corollary 3, computer-assisted with the cited Andronov-Hopf theorem). The first
  Lyapunov coefficient is enclosed away from 0: positive at J_H1 (subcritical) and negative at J_H2 (supercritical).
- **Bistability at J = 8** (Theorem 4 and Corollary 6, computer-assisted). For every E_l in the interval a locally
  asymptotically stable equilibrium coexists with an orbitally asymptotically stable periodic orbit, a train of action
  potentials with period in [16.005827509, 16.013912063] ms reaching u >= 95.953 mV.
- **Two periodic orbits at three values of E_l** (Theorem 5 and Corollary 7, computer-assisted). At E_l = 10.613, the
  zero-current value and 10.599, a stable orbit and a saddle-type orbit with narrow enclosures of their periods and
  Floquet multipliers; the stable one is the orbit of Theorem 4.
- **Numerical:** the fold of cycles near J = 6.26 that bounds the bistable range from below, unstable orbits between
  J = 8.5 and J_H1 and stable small orbits below J_H2 whose amplitudes agree with the proved Lyapunov coefficients,
  and high-precision values of the orbits. Nothing is claimed about the basins of attraction or about other
  attractors.

### Checked by computer

- `code/certify_equilibria_hopf.py`: Proposition 2.3, Theorems 1 and 2 (Arb ball arithmetic at 256 bits; 40
  checks: 17 proof checks, 6 consistency checks, 5 negative controls, 8 self-tests, 4 cross-checks), seconds.
- `code/certify_bistability.py`: Theorems 4 and 5 and Corollary 6 (Arb at 96 bits with a C^1 Lohner-type Taylor
  integrator, the Krawczyk test and a contraction argument on Poincare sections; 93 checks: 36 proof checks, 27 negative controls, 23 self-tests, 7 numerical-only checks), about
  53 minutes with two worker processes.
- `code/identify_stable_orbit.py`: Corollary 7 (33 checks: 19 proof checks, 6 negative controls, 8 cross-checks), about 4 minutes with two worker
  processes.
- `code/mutation_study.py`: 17 deliberate mutations of the programs, each on its own copy; every one not marked
  weak stops the program (not part of any proof).
- `code/numerics_h2.py`: the small cycles below J_H2 (numerical).
- Each certificate prints every check, stops at the first failed check with a nonzero exit status, rounds every printed
  bound outward and re-reads it as an exact rational.

### Files

- `paper/hh-dynamics.pdf`: the paper. `paper/hh-dynamics.tex` is its LaTeX source, and `paper/figures/` its figures.
- `code/`: the certificate programs, the model in ball arithmetic, the integrator and certificate modules, the
  numerical programs, the mutation study, the scripts that write the manuscript's numbers and figures, and
  `requirements.txt`.
- `data/`: the outputs of the programs.
- `work/`: two numerical studies in progress, not part of the paper: the chaotic dynamics near J = 7.86 and the
  propagated action potential.

### Reproduce

```
python3 -m pip install -r code/requirements.txt
python3 code/certify_equilibria_hopf.py
python3 code/certify_bistability.py --workers 2
python3 code/identify_stable_orbit.py --workers 2
python3 code/numerics_h2.py
python3 code/mutation_study.py --workers 2
python3 code/hh_make_numbers.py
python3 code/hh_make_figures.py
```

### License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/` and the
data in `data/` are licensed under the Apache License 2.0, and so are the programs and data in `work/`.
