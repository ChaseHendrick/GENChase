# Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Preprint**, archived on Zenodo with its programs and data ([doi:10.5281/zenodo.22971173](https://doi.org/10.5281/zenodo.22971173)), not peer reviewed. It uses the certification modules of *Minimal Winding in the Self-Similar Collapse of
Point Vortices* ([ChaseHendrick/minimal-winding](https://github.com/ChaseHendrick/minimal-winding),
[doi:10.5281/zenodo.22963796](https://doi.org/10.5281/zenodo.22963796)).

**[Read the preprint (PDF, 20 pages)](paper/stable-expansion.pdf)**

## Abstract

Point vortices can move self-similarly, keeping their shape while the configuration grows like $\sqrt{t}$ and turns. For
three vortices such expanding configurations are stable, and Zbarsky used this to show that vortex patches placed at the
three vortices stay confined for all time; he wrote that the result would most likely carry over to stably growing
systems of four or more vortices, given sufficiently good stability. We give such configurations of four and five
vortices, with the circulations $(-1, -5/2, -1/9, 4/5)$ and $(-1, 3/7, 7/8, -9/7, -47/35)$. In similarity variables
their linearization has, besides the double eigenvalue $0$ of the rotation and of the one-parameter family of such
configurations, only eigenvalues with real part $-1$ or $-2$. The proof is computer-assisted: the configurations are
enclosed by the Krawczyk method in ball arithmetic, and the spectrum is controlled through an exact lemma, which shows
that six eigenvalues are forced by the rotation, the scaling, the translations and the family and that the others come
in pairs $k$, $2 - k$, together with enclosures of traces of powers of the Jacobian. The stability is nonlinear: every
motion with the same circulations that starts near one of the two configurations stays within a bounded distance of an
exactly self-similar expansion of a nearby member of the family, the member with the same energy, and an a priori
estimate of the same kind holds for approximate solutions whose error is small and decays faster than the velocities.
With this estimate in place of the one step of Zbarsky's proof that needs three vortices, his confinement theorem holds
for the two configurations: vortex patches placed at the vortices stay within distance $\varepsilon t^{1/4 +
\varepsilon}$ of their centres of vorticity for all time, and the centres stay within a bounded distance of an exactly
self-similar expansion of a single member of the family. The proof carries his argument over to any number of
patches, with every estimate written out. Linear
stability is an open condition; in a naive random search, $52$ of $342$ converged four-vortex collapses and $32$ of
$543$ converged five-vortex collapses, not checked for duplicates, reverse into linearly stable expansions.

## Status of the results

- **Proved:** Lemma 1 (six eigenvalues forced by the symmetries and the family; the rest in pairs $k$, $2 - k$),
  Theorems 1 and 2 and Corollary 1, computer-assisted (Krawczyk test in FLINT/Arb ball arithmetic, with enclosures of
  traces of powers of the Jacobian); Theorem 3, Corollary 2 and Proposition 1 (nonlinear stability, its sharp rate,
  the limit fixed by the energy, and the forced version), from those certificates and the certified monotonicity of the
  energy along the family.
- **Proved:** Theorem 4 (confinement of vortex patches), which follows the argument of Zbarsky, Commun. Math.
  Phys. 388 (2021) 707-733, with Proposition 1 in place of the one step that needs three vortices. Appendix A writes
  out every estimate for any number of patches; the other patches act on a patch only through the strain of their
  field, and two slips of his arXiv version are corrected there.
- **Numerical:** the direct integrations and the random sample of Section 6.
- **Checked:** independent adversarial readings of every section and of the programs, signed off by the owner
  (`notes/QUALITY.md`, item 6).
- **Limitation:** the section, theorem and equation numbers of Zbarsky's paper cited here, and the two slips
  corrected in Appendix A, are those of arXiv:1912.10862v2; the published CMP version was not accessible for
  comparison.

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript: [`stable-expansion.tex`](paper/stable-expansion.tex) (LaTeX, the only source) and its build [`stable-expansion.pdf`](paper/stable-expansion.pdf) |
| [`code/`](code/) | The programs below, the certification modules `certify_ball_ad.py` and `certify_pipeline.py` of the minimal-winding paper (identical copies; their docstrings refer to `certify_collapses.py`, the minimal-winding program they were written for), and [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The binary64 starting points of the certified configurations and the controls, and the output of the programs |

| Program | What it checks | Checks | Time |
|---|---|---:|---|
| [`verify_stable_expansion.py`](code/verify_stable_expansion.py) | Theorems 1 and 2: existence by the Krawczyk test, the hypotheses of Lemma 1 on the certified enclosures, the stability numbers and the simplicity of the eigenvalues on Re k = 1; for Theorem 3, the exact vanishing of the sum of pairwise products of the circulations and the monotonicity of the energy along the family; two negative controls (an unstable four-vortex collapse, and an unstable five-vortex collapse that the stability test must refuse) and a positive three-vortex control, with their side conditions; controls of the five-vortex trace recipe (on the four- and three-vortex matrices) and of the Krawczyk test (a box without the zero, where it must fail); direct integrations (binary64) | 62 in ball or exact arithmetic (5 of them regression tests, identities that hold for every configuration), 8 in binary64 | seconds |
| [`survey_expansions.py`](code/survey_expansions.py) | The random sample of Section 6 (numerical) | | 10 min |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
python3 code/verify_stable_expansion.py
python3 code/survey_expansions.py
cd paper && pdflatex stable-expansion.tex && pdflatex stable-expansion.tex && pdflatex stable-expansion.tex
```

Each program writes its report to `data/`; the verification program exits with an error if any check fails.

## Cite

Until the paper is published in a journal:

```bibtex
@misc{hendrick2026expansion,
  author = {Hendrick, Chase},
  title  = {Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches},
  year   = {2026},
  note   = {Preprint},
  doi    = {10.5281/zenodo.22971173},
  url    = {https://github.com/ChaseHendrick/stable-expansion}
}
```

## License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/` and the
data in `data/` are under the Apache License 2.0. The `LICENSE` file has both.
