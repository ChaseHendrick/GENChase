# Minimal Winding in the Self-Similar Collapse of Three Point Vortices and of Two Concentric Vortex Polygons

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

Preprint, prepared for arXiv (physics.flu-dyn; cross-lists math-ph, math.DS). Not yet peer reviewed.

**[Read the paper (PDF, 20 pages)](paper/minimal-winding.pdf)**

## Abstract

In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the
dimensionless number $P = |\omega_0| t_c$, the initial angular velocity times the collapse time,
measures how tightly the spiral winds. We minimize $P$ over two classical collapsing families. Every
self-similar collapse of three point vortices can be normalized to circulations
$(1, \mu, -\mu/(1+\mu))$ with $0 < \mu \le 1$ and zero angular impulse. For each $\mu$ the collapsing
configurations form two arcs, one for each orientation of the vortex triangle, and $P$ has exactly one
critical point, a minimum, on each. The squares of the two minima are roots of an explicit cubic whose
coefficients are polynomials in $\mu$, and for $\mu < 1$ the two minima differ. The smaller one
increases strictly from $\sqrt{3}/2$, approached as $\mu \to 0$, to $\sqrt{2}$ at $\mu = 1$. Hence
$P > \sqrt{3}/2$ for every self-similar collapse of three point vortices, and the constant is sharp;
equivalently, every vortex travels more than twice its initial distance from the collision point. For
$\mu = 1/2$ the two minima are $1.0647059762\ldots$ and $2.2038550160\ldots$, the positive roots of
$8748\xi^6 - 49005\xi^4 + 27794\xi^2 + 18723$, and they are not expressible by real radicals. For two
concentric regular $n$-gons with circulations $x_n$ and $-1$,
$P = (K_n - \sqrt{2n-1}\cos n\theta)/(2n \sin n\theta)$ in terms of the relative rotation $\theta$,
with an explicit constant $K_n$, and the minimum over $\theta$ is $\sqrt{K_n^2 - 2n + 1}/(2n)$; for
pentagons it is $\sqrt{31682}/80$. With a vortex of any circulation added at the center, the minimum
over $\theta$ is still explicit and exceeds $\sqrt{3}/2$ for every $n$, and the constant $\sqrt{3}/2$ is
again sharp. A strong vortex with weak, tight opposite-signed pairs has $P \ge \sqrt{3}/2 - o(1)$ as the
pairs weaken. All formulas are also checked against the Biot–Savart velocities in high-precision
arithmetic.

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript: [`minimal-winding.tex`](paper/minimal-winding.tex) (LaTeX, the source arXiv and journals receive), its build [`minimal-winding.pdf`](paper/minimal-winding.pdf), a Typst copy of the same text, and [`figures/`](paper/figures/) |
| [`code/`](code/) | [`verify_general_mu.py`](code/verify_general_mu.py) (the general-μ theory, 121 checks, about 30 s), [`verify_floors_independent.py`](code/verify_floors_independent.py) (μ = 1/2 and the rings, independently, about a minute), [`verify_direct_proof.py`](code/verify_direct_proof.py) (every identity in the direct proof of Corollary 1, exact, a few seconds), [`verify_central_vortex.py`](code/verify_central_vortex.py) (Proposition 3, two rings with a central vortex, and the leading-order relations used in the proof of Theorem 2: exact identities, Biot–Savart at 50 digits and negative controls, about 10 s), [`verify_strong_vortex.py`](code/verify_strong_vortex.py) (Theorem 2, a strong vortex with weak pairs: every identity in the proof, exact self-similar solutions checked by Biot–Savart, and negative controls, XX checks, under a minute), [`plot_minimal_winding.py`](code/plot_minimal_winding.py) (the two figures), [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The output of the five verification programs |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
python3 code/verify_general_mu.py
python3 code/verify_floors_independent.py --json data/verify-floors-independent-2026-09-23.json
python3 code/verify_direct_proof.py
python3 code/verify_central_vortex.py
python3 code/verify_strong_vortex.py
python3 code/plot_minimal_winding.py
cd paper && pdflatex minimal-winding.tex && pdflatex minimal-winding.tex && pdflatex minimal-winding.tex
```

Each verification program exits with an error if any check fails. `verify_general_mu.py` prints the
report kept in `data/verify-general-mu-2026-09-23.txt`, `verify_central_vortex.py` the one kept in
`data/verify-central-vortex-2026-09-25.txt`, and `verify_strong_vortex.py` the one kept in
`data/verify-strong-vortex-2026-09-25.txt`.

## Cite

Until the arXiv identifier exists:

```bibtex
@misc{hendrick2026minimal,
  author = {Hendrick, Chase},
  title  = {Minimal Winding in the Self-Similar Collapse of Three Point Vortices and of Two Concentric Vortex Polygons},
  year   = {2026},
  note   = {Preprint},
  url    = {https://github.com/ChaseHendrick/minimal-winding}
}
```

## License

The manuscript in `paper/`, its figures included, is Copyright (c) 2026 Chase Hendrick, all rights
reserved. The programs in `code/` and the data in `data/` are under the Apache License 2.0. The
`LICENSE` file has both.
