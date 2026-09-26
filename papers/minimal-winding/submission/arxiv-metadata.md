# arXiv submission metadata

**Deferred (owner's decision, 2026-09-25).** arXiv asked this account for an endorsement to submit to
physics.flu-dyn, so the paper is not going to arXiv for now; the Zenodo release 2.1.0,
doi:10.5281/zenodo.22966989, is the preprint of record. Keep this file for when an endorsement arrives.

Fill the arXiv form with the fields below.

- **Files to upload:** `minimal-winding-arxiv.zip`, which `sh tools/arxiv-bundle.sh minimal-winding` makes: the LaTeX source [`../paper/minimal-winding.tex`](../paper/minimal-winding.tex) without its maintenance comment lines at the top, and the figures `figures/minimal-winding.pdf`, `figures/minimal-winding-paths.pdf` and `figures/alpha-winding.pdf` at that folder path. The source is plain `article` with standard packages (among them `booktabs` and `longtable`) and compiles without warnings after three `pdflatex` runs (arXiv reruns LaTeX as needed). arXiv's build is the same as [`../paper/minimal-winding.pdf`](../paper/minimal-winding.pdf); compare its preview with that PDF before you submit. arXiv makes the source downloadable.
- **Title:** Minimal Winding in the Self-Similar Collapse of Point Vortices
- **Authors:** Chase Hendrick
- **Primary category:** physics.flu-dyn (Fluid Dynamics)
- **Cross-lists:** math-ph (Mathematical Physics), math.DS (Dynamical Systems)
- **MSC class:** 76B47, 37N10, 76U60, 65G20
- **Comments:** `38 pages, 3 figures, 2 tables. Includes computer-assisted proofs in interval arithmetic. Verification programs and data: https://github.com/ChaseHendrick/minimal-winding`
  - The page count is the LaTeX build's, which is the PDF in the repository.
- **License:** arXiv.org perpetual, non-exclusive license (**decided 2026-09-25**). You keep every right: anyone can read and download the paper, nobody may republish or adapt it without your permission, and a journal can still take a copyright transfer when it accepts the paper. CC BY 4.0 would let anyone reuse and republish the text with attribution; choose it only if a funder or journal requires open reuse. The choice is irrevocable for the version you submit, though a later version may carry a different license.
- **Report number, journal reference, DOI:** leave blank.

## Abstract (plain text with TeX math, 1,875 characters; the limit is 1,920)

```
In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the angle $P$ through which the configuration turns while the square of its size decreases by the factor $e$ measures how tightly the spiral winds; for the Euler equation $P=|\omega_0| t_c$, the initial angular velocity times the collapse time. For three Euler vortices with circulations $(1,\mu,-\mu/(1+\mu))$, $0<\mu\le 1$, the collapsing configurations form two arcs, one for each orientation of the triangle, and $P$ has exactly one critical point, a minimum, on each. The squared minima are roots of an explicit cubic, and the smaller one increases from $\sqrt3/2$, approached as $\mu\to 0$, to $\sqrt2$ at $\mu=1$. Hence $P>\sqrt3/2$ for every self-similar collapse of three point vortices, and the constant is sharp: every vortex travels more than twice its initial distance from the collision point. In the $\alpha$-models, where a vortex induces the velocity $\Gamma r^{-\alpha-1}/(2\pi)$, every self-similar collapse of three vortices has $P>\sqrt{3+\alpha}/(2+\alpha)$ for $\alpha>-2$, again sharply. For two concentric regular $n$-gons, with or without a vortex at the center, $P$ has a closed form, and its minimum is explicit and exceeds $\sqrt3/2$. A strong vortex with weak, tight opposite-signed pairs has $P>\sqrt3/2$ once the pairs are weak enough. For more vortices the bound fails. Computer-assisted proofs show that four, five and six Euler vortices collapse self-similarly with $P<\sqrt3/2$, that $P$ has strict local minima $0.7978967838\ldots$, $0.7448144569\ldots$ and $0.7136801485\ldots$ on these collapses, that for $\alpha=1$ and $\alpha=2$ four vortices go below the three-vortex bounds, and that eleven vortices in the $\alpha=2$ model and sixty in the SQG model collapse without rotating. Numerically, sixty-one Euler vortices reach $P=0.498\ldots$.
```

## Endorsement

Needed: arXiv asked for an endorsement at the first attempt to submit to physics.flu-dyn (2026-09-25).
An earlier note here said none was needed, which was wrong.
