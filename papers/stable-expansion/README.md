# Linearly Stable Self-Similar Expansion of Four and Five Point Vortices

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Draft**, not peer reviewed. It uses the certification modules of *Minimal Winding in the Self-Similar Collapse of
Point Vortices* ([ChaseHendrick/minimal-winding](https://github.com/ChaseHendrick/minimal-winding),
[doi:10.5281/zenodo.22963796](https://doi.org/10.5281/zenodo.22963796)).

**[Read the draft (PDF, 6 pages)](paper/stable-expansion.pdf)**

## Abstract

Point vortices can move self-similarly, keeping their shape while the configuration grows like $\sqrt{t}$ and turns.
For three vortices such expanding configurations are stable, and Zbarsky used this to show that vortex patches placed
at the three vortices stay confined for all time; he noted that the extension to four or more vortices needs a
self-similarly expanding configuration with good stability, and that none was known. We give two. For the
circulations $(-1, -5/2, -1/9, 4/5)$ and $(-1, 3/7, 7/8, -9/7, -47/35)$ there are self-similarly expanding
configurations of four and five Euler point vortices whose linearization in similarity variables has, besides the
double eigenvalue $0$ of the rotation and of the one-parameter family of such configurations, only eigenvalues with
real part $-1$ or $-2$: every perturbation transverse to the rotation and to the family decays at least like the
inverse of the size of the configuration. The proof is computer-assisted: the configurations are enclosed by the
Krawczyk method in ball arithmetic, and the spectrum is controlled through an exact lemma, which shows that six
eigenvalues are forced by the symmetries and that the others come in pairs $k$, $2 - k$, together with enclosures of
traces of powers of the Jacobian. The property is open, so such configurations form open sets; in a random sample
about one four-vortex collapse in seven and one five-vortex collapse in seventeen reverses into a stable expansion.
We do not address whether this linear stability suffices for Zbarsky's confinement argument.

## Status of the results

- **Proved:** Lemma 1 (six eigenvalues forced by the symmetries and the family; the rest in pairs $k$, $2 - k$),
  Theorems 1 and 2 and Corollary 1, computer-assisted (Krawczyk test in FLINT/Arb ball arithmetic, with enclosures of
  traces of powers of the Jacobian).
- **Numerical:** the direct integrations and the random sample of Section 4.
- **Not shown:** nonlinear stability, and whether this linear stability is enough for Zbarsky's confinement argument.
- **Pending before this draft can advance:** a second reader, and the full text of Kallyadan and Shukla,
  Phys. Rev. Fluids 7 (2022) 114701 (only its abstract has been seen).

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript: [`stable-expansion.tex`](paper/stable-expansion.tex) (LaTeX, the only source) and its build [`stable-expansion.pdf`](paper/stable-expansion.pdf) |
| [`code/`](code/) | The programs below, the certification modules `certify_ball_ad.py` and `certify_pipeline.py` of the minimal-winding paper (unchanged), and [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The binary64 starting points of the certified configurations and the controls, and the output of the programs |

| Program | What it checks | Checks | Time |
|---|---|---:|---|
| [`verify_stable_expansion.py`](code/verify_stable_expansion.py) | Theorems 1 and 2: existence by the Krawczyk test, the hypotheses of Lemma 1 on the certified boxes, the stability numbers; an unstable four-vortex control and a three-vortex control; direct integrations (binary64) | 46 | 1 min |
| [`survey_expansions.py`](code/survey_expansions.py) | The random sample of Section 4 (numerical) | | 10 min |

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

Until the paper has a DOI of its own:

```bibtex
@misc{hendrick2026expansion,
  author = {Hendrick, Chase},
  title  = {Linearly Stable Self-Similar Expansion of Four and Five Point Vortices},
  year   = {2026},
  note   = {Draft}
}
```

## License

The manuscript in `paper/` is Copyright (c) 2026 Chase Hendrick, all rights reserved. The programs in `code/` and the
data in `data/` are under the Apache License 2.0. The `LICENSE` file has both.
