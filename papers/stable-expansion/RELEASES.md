# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and has not been
peer reviewed.

## 1.0.0 (2026-09-26)

**DOI:** [10.5281/zenodo.22971173](https://doi.org/10.5281/zenodo.22971173)

The first public release of the preprint *Stable Self-Similar Expansion of Four and Five Point Vortices and
Confinement of Vortex Patches* (20 pages), with the programs that check its results and their output. It uses the
certification modules of *Minimal Winding in the Self-Similar Collapse of Point Vortices* (programs and data:
doi:10.5281/zenodo.22963796).

### What the paper shows

Point vortices can move self-similarly, keeping their shape while the configuration grows like √t and turns. For three
vortices such expanding configurations are stable, and Zbarsky (Commun. Math. Phys. 388, 2021) used this to show that
vortex patches placed at the three vortices stay confined for all time; he wrote that the result would most likely
carry over to four or more vortices, given sufficiently good stability.

- **Stable expansions of four and five vortices** (Theorems 1 and 2, computer-assisted). The circulations
  (−1, −5/2, −1/9, 4/5) and (−1, 3/7, 7/8, −9/7, −47/35) have self-similarly expanding configurations whose
  linearization in similarity variables has, besides the double eigenvalue 0 of the rotation and of the family of such
  configurations, only eigenvalues with real part −1 or −2. The configurations are enclosed by the Krawczyk method in
  ball arithmetic, and the spectrum is controlled through an exact lemma (Lemma 1: six eigenvalues are forced by the
  symmetries and the family, and the others come in pairs k, 2 − k) with enclosures of traces of powers of the
  Jacobian.
- **Nonlinear stability** (Theorem 3, Corollary 2, Proposition 1). Every motion with the same circulations that starts
  near one of the configurations stays within a bounded distance of an exactly self-similar expansion of the member of
  the family with the same energy, and an a priori estimate of the same kind holds for approximate solutions whose
  error is small and decays faster than the velocities.
- **Confinement of vortex patches** (Theorem 4). With that estimate in place of the one step of Zbarsky's proof that
  needs three vortices, his confinement theorem holds for the two configurations: patches stay within distance
  ε t^(1/4 + ε) of their centres of vorticity for all time, and the centres stay within a bounded distance of an
  exactly self-similar expansion. Appendix A writes out every estimate of his argument for any number of patches.
- **Numerical:** direct integrations, and a naive random search in which 52 of 342 converged four-vortex collapses
  and 32 of 543 converged five-vortex collapses, not checked for duplicates, reverse into linearly stable expansions.

### Checked by computer

- `code/verify_stable_expansion.py`: Theorems 1 and 2 (existence by the Krawczyk test, the hypotheses of Lemma 1 on
  the certified enclosures, the stability numbers and the simplicity of the eigenvalues on Re k = 1), for Theorem 3
  the exact vanishing of the sum of pairwise products of the circulations and the monotonicity of the energy along the
  family, two negative controls (an unstable four-vortex collapse, and an unstable five-vortex collapse that the
  stability test must refuse) and a positive three-vortex control, controls of the five-vortex trace recipe and of
  the Krawczyk test (a box without the zero, where it must fail), and direct integrations; 70 checks, 62 in ball or
  exact arithmetic (5 of them regression tests, identities that hold for every configuration) and 8 in binary64,
  seconds. It exits with status 1 if any check fails.
- `code/survey_expansions.py`: the random sample of Section 6 (numerical), about 10 minutes.

### Files

- `paper/stable-expansion.pdf`: the paper. `paper/stable-expansion.tex` is its LaTeX source.
- `code/`: the two programs, the certification modules `certify_ball_ad.py` and `certify_pipeline.py` of the
  minimal-winding paper (identical copies; their docstrings refer to `certify_collapses.py`, the
  minimal-winding program they were written for), and `requirements.txt`.
- `data/`: the binary64 starting points of the certified configurations and the controls, and the output of the
  programs.

### Reproduce

```
python3 -m pip install -r code/requirements.txt
python3 code/verify_stable_expansion.py
python3 code/survey_expansions.py
```

### License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/` and the
data in `data/` are licensed under the Apache License 2.0.
