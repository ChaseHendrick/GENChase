# A sharp winding bound for the self-similar collapse of three point vortices in the alpha-models

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Draft.** Not peer reviewed and not cleared for submission.

**[Read the draft (PDF, 9 pages)](paper/alpha-winding.pdf)**

## Abstract

In the $\alpha$-models of two-dimensional flow a point vortex of circulation $\Gamma$ induces the
velocity $\Gamma r^{-\alpha-1}/(2\pi)$ at distance $r$; $\alpha = 0$ is the Euler equation and
$\alpha = 1$ the surface quasi-geostrophic equation. In a self-similar collapse of three point
vortices every vortex moves on a logarithmic spiral about the collision point, and the rotation per
unit decrease of the logarithm of the squared size, $P = |\mathrm{Im}\,\kappa|/(2|\mathrm{Re}\,\kappa|)$,
measures how tightly the spiral winds. We prove that $P > \sqrt{3+\alpha}/(2+\alpha)$ for every
self-similar collapse of three point vortices for every $\alpha > -1$, that is, whenever the velocity
induced by a vortex decays with distance, and that the constant is sharp: it is approached, but not
attained, as two weak vortices of opposite sign merge next to a strong one. Equivalently, every vortex
travels more than $(4+\alpha)/(2+\alpha)$ times its initial distance from the collision point, and its
path makes an angle larger than $\arccos((2+\alpha)/(4+\alpha))$ with the direction to that point. The
bound decreases from $\sqrt{3}/2$ in the Euler case to $2/3$ in the surface quasi-geostrophic case and
tends to $0$ as $\alpha \to \infty$. The proof rests on two elementary identities: the circulations of
a collapsing triangle are fixed, up to a factor, by its side lengths, and $P$ is a symmetric function
of the side lengths alone. For $\alpha = 0$ it gives a short proof of the Euler bound $\sqrt{3}/2$.
For four or more vortices in the Euler case the bound fails: numerically, four vortices reach
$P = 0.7978967838\ldots$ and sixty-one vortices $P = 0.4981844392\ldots$.

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript: [`alpha-winding.tex`](paper/alpha-winding.tex) (LaTeX), its build [`alpha-winding.pdf`](paper/alpha-winding.pdf), a Typst copy of the same text, and [`figures/`](paper/figures/) |
| [`code/`](code/) | [`verify_alpha_winding.py`](code/verify_alpha_winding.py) (every step in high-precision arithmetic), [`verify_alpha_extension.py`](code/verify_alpha_extension.py) (the interval-arithmetic step of Remark 1), [`plot_alpha_winding.py`](code/plot_alpha_winding.py) (the figure), [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The output of the two verification programs |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
python3 code/verify_alpha_winding.py
python3 code/verify_alpha_extension.py
python3 code/plot_alpha_winding.py
cd paper && pdflatex alpha-winding.tex && pdflatex alpha-winding.tex && pdflatex alpha-winding.tex
```

## License

The manuscript in `paper/`, its figures included, is Copyright (c) 2026 Chase Hendrick, all rights
reserved. The programs in `code/` and the data in `data/` are under the Apache License 2.0. The
`LICENSE` file has both.
