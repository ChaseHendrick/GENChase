# arXiv submission metadata

Fill the arXiv form with the fields below.

- **Files to upload:** `minimal-winding-arxiv.zip`, which `sh tools/arxiv-bundle.sh minimal-winding` makes: the LaTeX source [`../paper/minimal-winding.tex`](../paper/minimal-winding.tex) without its maintenance comment lines at the top, and the figures `figures/minimal-winding.pdf` and `figures/minimal-winding-paths.pdf` at that folder path. The source is plain `article` with standard packages and compiles without warnings after three `pdflatex` runs (arXiv reruns LaTeX as needed). arXiv's build is the same as [`../paper/minimal-winding.pdf`](../paper/minimal-winding.pdf); compare its preview with that PDF before you submit. arXiv makes the source downloadable.
- **Title:** Minimal Winding in the Self-Similar Collapse of Three Point Vortices and of Two Concentric Vortex Polygons
- **Authors:** Chase Hendrick
- **Primary category:** physics.flu-dyn (Fluid Dynamics)
- **Cross-lists:** math-ph (Mathematical Physics), math.DS (Dynamical Systems)
- **MSC class:** 76B47, 37N10
- **Comments:** `20 pages, 2 figures, 1 table. Verification programs and data: https://github.com/ChaseHendrick/minimal-winding`
  - The page count is the LaTeX build's, which is the PDF in the repository.
- **License:** arXiv.org perpetual, non-exclusive license (**decided 2026-09-25**). You keep every right: anyone can read and download the paper, nobody may republish or adapt it without your permission, and a journal can still take a copyright transfer when it accepts the paper. CC BY 4.0 would let anyone reuse and republish the text with attribution; choose it only if a funder or journal requires open reuse. The choice is irrevocable for the version you submit, though a later version may carry a different license.
- **Report number, journal reference, DOI:** leave blank.

## Abstract (plain text with TeX math, 1,916 characters; the limit is 1,920)

```
In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the dimensionless number $P=|\omega_0|t_c$, the initial angular velocity times the collapse time, measures how tightly the spiral winds. We minimize $P$ over two classical collapsing families. Every self-similar collapse of three point vortices can be normalized to circulations $(1,\mu,-\mu/(1+\mu))$ with $0<\mu\le 1$ and zero angular impulse. For each $\mu$ the collapsing configurations form two arcs, one for each orientation of the vortex triangle, and $P$ has exactly one critical point, a minimum, on each. The squares of the two minima are roots of an explicit cubic whose coefficients are polynomials in $\mu$, and for $\mu<1$ the two minima differ. The smaller one increases strictly from $\sqrt3/2$, approached as $\mu\to 0$, to $\sqrt2$ at $\mu=1$. Hence $P>\sqrt3/2$ for every self-similar collapse of three point vortices, and the constant is sharp; equivalently, every vortex travels more than twice its initial distance from the collision point. For $\mu=1/2$ the two minima are $1.0647059762\ldots$ and $2.2038550160\ldots$, the positive roots of $8748\xi^6-49005\xi^4+27794\xi^2+18723$, and they are not expressible by real radicals. For two concentric regular $n$-gons with circulations $x_n$ and $-1$, $P=(K_n-\sqrt{2n-1}\cos n\theta)/(2n\sin n\theta)$ in terms of the relative rotation $\theta$, with an explicit constant $K_n$, and the minimum over $\theta$ is $\sqrt{K_n^2-2n+1}/(2n)$; for pentagons it is $\sqrt{31682}/80$. With a vortex of any circulation added at the center, the minimum over $\theta$ is still explicit and exceeds $\sqrt3/2$ for every $n$, and the constant $\sqrt3/2$ is again sharp. A strong vortex with weak, tight opposite-signed pairs has $P\ge\sqrt3/2-o(1)$ as the pairs weaken. All formulas are also checked against the Biot-Savart velocities in high-precision arithmetic.
```

## Endorsement

Not needed: the author's arXiv account can already submit to physics.flu-dyn (2026-09-24).
