# Minimal Winding in the Self-Similar Collapse of Point Vortices

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

Preprint, prepared for arXiv (physics.flu-dyn; cross-lists math-ph, math.DS). Not yet peer reviewed.

**[Read the paper (PDF, 36 pages)](paper/minimal-winding.pdf)**

## Abstract

In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the angle
$P$ through which the configuration turns while the square of its size decreases by the factor $e$
measures how tightly the spiral winds; for the Euler equation $P = |\omega_0| t_c$, the initial angular
velocity times the collapse time. For three Euler vortices with circulations $(1, \mu, -\mu/(1 + \mu))$,
$0 < \mu \le 1$, the collapsing configurations form two arcs, one for each orientation of the triangle,
and $P$ has exactly one critical point, a minimum, on each. The squared minima are roots of an explicit
cubic, and the smaller one increases from $\sqrt{3}/2$, approached as $\mu \to 0$, to $\sqrt{2}$ at $\mu
= 1$. Hence $P > \sqrt{3}/2$ for every self-similar collapse of three point vortices, and the constant
is sharp: every vortex travels more than twice its initial distance from the collision point. In the
$\alpha$-models, where a vortex induces the velocity $\Gamma r^{-\alpha-1}/(2\pi)$, every self-similar
collapse of three vortices has $P > \sqrt{3 + \alpha}/(2 + \alpha)$ for $\alpha > -2$, again sharply.
For two concentric regular $n$-gons, with or without a vortex at the center, $P$ has a closed form, and
its minimum is explicit and exceeds $\sqrt{3}/2$. A strong vortex with weak, tight opposite-signed pairs
has $P > \sqrt{3}/2$ once the pairs are weak enough. For more vortices the bound fails. Computer-assisted
proofs show that four, five and six Euler vortices collapse self-similarly with $P < \sqrt{3}/2$, that
$P$ has strict local minima $0.7978967838\ldots$, $0.7448144569\ldots$ and $0.7136801485\ldots$ on these
collapses, that for $\alpha = 1$ and $\alpha = 2$ four vortices go below the three-vortex bounds, and
that eleven vortices in the $\alpha = 2$ model and sixty in the SQG model collapse without rotating.
Numerically, sixty-one Euler vortices reach $P = 0.498\ldots$.

## Contents

| Folder | What is in it |
|---|---|
| [`paper/`](paper/) | The manuscript: [`minimal-winding.tex`](paper/minimal-winding.tex) (LaTeX, the only source, which arXiv and journals receive), its build [`minimal-winding.pdf`](paper/minimal-winding.pdf), and [`figures/`](paper/figures/) |
| [`code/`](code/) | The programs below and [`requirements.txt`](code/requirements.txt) |
| [`data/`](data/) | The output of the twelve verification programs, the inputs of the certification, and the stored many-vortex configurations of Section 7 |

| Program | What it checks |
|---|---|
| [`verify_general_mu.py`](code/verify_general_mu.py) | Three Euler vortices, the general-μ theory (Theorem 1): 121 checks, exact and at 50 digits, about 30 s |
| [`verify_floors_independent.py`](code/verify_floors_independent.py) | μ = 1/2 and the rings, independently, with interval enclosures, about a minute |
| [`verify_direct_proof.py`](code/verify_direct_proof.py) | Every identity in the direct proof of Corollary 1, exact, a few seconds |
| [`verify_central_vortex.py`](code/verify_central_vortex.py) | Proposition 3, two rings with a central vortex, and the leading-order relations used in the proof of Theorem 3: 80 checks, about 10 s |
| [`verify_strong_vortex.py`](code/verify_strong_vortex.py) | Theorem 3, a strong vortex with weak pairs: every identity in the proof, its explicit constants, exact self-similar solutions checked by Biot–Savart, and negative controls; 143 checks, about 17 s |
| [`verify_pairs_bound.py`](code/verify_pairs_bound.py) | Proposition 4, the bound at a fixed circulation for weak pairs: every identity in the proof and in Remark 6 exactly (SymPy), the remainder bounds on random configurations with negative controls, and 90 exact self-similar collapses checked by Biot–Savart at 50 digits; 69 checks, about 30 s |
| [`verify_alpha_winding.py`](code/verify_alpha_winding.py) | The α-models: Lemmas 5 and 6, Theorem 2 and Corollary 2 at high precision, about 15 s |
| [`verify_alpha_below.py`](code/verify_alpha_below.py) | Remark 4, Theorem 2 for −2 < α ≤ −1: every identity exactly (SymPy), the constants and an independent interval subdivision in Arb ball arithmetic, Biot–Savart at 50 to 950 digits, near-extremal collapses and negative controls; about 15 s |
| [`verify_alpha_equal_circulations.py`](code/verify_alpha_equal_circulations.py) | Remark 5, two equal circulations in the α-models, exact and at 40 digits, about 10 s |
| [`certify_collapses.py`](code/certify_collapses.py) | The computer-assisted proofs of Theorem 4 and Theorem 5(a) (four to six Euler vortices, four vortices at α = 1 and 2, eleven vortices without rotation at α = 2) in FLINT/Arb ball arithmetic through python-flint at 320 bits, with the Krawczyk operator and interval second-order automatic differentiation, and controls; its modules are the other `certify_*.py` files and its inputs are in `data/certify-inputs/`; 92 checks, about a minute |
| [`certify_sqg60.py`](code/certify_sqg60.py) | The computer-assisted proof of Theorem 5(b): sixty SQG vortices collapse without rotation, in the same ball arithmetic, reusing the `certify_*.py` modules; its input is `data/collapse-sqg-n60-no-rotation.json`; 11 checks, about half a minute |
| [`verify_many_vortices.py`](code/verify_many_vortices.py) | The numerical results of Section 7 from the stored configurations: the minimizers for N = 7 to 12, 33, 61 and 603, the two-arm family and its fit, and an independent, non-rigorous refinement of the now-certified SQG collapse of sixty vortices without rotation; about a minute |
| [`plot_minimal_winding.py`](code/plot_minimal_winding.py), [`plot_alpha_winding.py`](code/plot_alpha_winding.py) | Figures 1 and 2, and Figure 3 |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
python3 code/verify_general_mu.py
python3 code/verify_floors_independent.py --json data/verify-floors-independent-2026-09-23.json
python3 code/verify_direct_proof.py
python3 code/verify_central_vortex.py
python3 code/verify_strong_vortex.py
python3 code/verify_pairs_bound.py
python3 code/verify_alpha_winding.py
python3 code/verify_alpha_below.py
python3 code/verify_alpha_equal_circulations.py
python3 code/certify_collapses.py
python3 code/certify_sqg60.py
python3 code/verify_many_vortices.py
python3 code/plot_minimal_winding.py
python3 code/plot_alpha_winding.py
cd paper && pdflatex minimal-winding.tex && pdflatex minimal-winding.tex && pdflatex minimal-winding.tex
```

Each verification program exits with an error if any check fails and writes its report to `data/`.

## Cite

Until the arXiv identifier exists:

```bibtex
@misc{hendrick2026minimal,
  author = {Hendrick, Chase},
  title  = {Minimal Winding in the Self-Similar Collapse of Point Vortices},
  year   = {2026},
  note   = {Preprint},
  url    = {https://github.com/ChaseHendrick/minimal-winding}
}
```

## License

The manuscript in `paper/`, its figures included, is Copyright (c) 2026 Chase Hendrick, all rights
reserved. The programs in `code/` and the data in `data/` are under the Apache License 2.0. The
`LICENSE` file has both.
