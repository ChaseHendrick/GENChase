# arXiv submission metadata

Fill the arXiv form with the fields below.

- **Files to upload:** the author's private copy, which adds a contact email under the affiliation. The public repository deliberately leaves out the email. Either format works:
  - **LaTeX source (preferred by arXiv).** Upload the private `.tex` together with `figures/minimal-winding.pdf`, keeping that folder path. It is [`../unequal-mu-n5-floors-2026-09-23.tex`](../unequal-mu-n5-floors-2026-09-23.tex) with the email added and the four comment lines at the top removed. The source is plain `article` with standard packages, and it compiles without warnings in two `pdflatex` runs. arXiv makes the source downloadable. The private copy then has no comments, so the source shows nothing that the PDF does not.
  - **PDF only.** arXiv accepts a PDF that was not produced from TeX. Typst embeds its fonts as CID fonts, not Type 3.
- **Title:** Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons
- **Authors:** Chase Hendrick
- **Primary category:** physics.flu-dyn (Fluid Dynamics)
- **Cross-lists:** math-ph (Mathematical Physics), math.DS (Dynamical Systems)
- **MSC class:** 76B47, 37N10
- **Comments:** `11 pages, 1 figure, 1 table. Verification programs and data: https://github.com/SharpMeow/GENChase/tree/main/research`
  - The page count is for the LaTeX build. For the PDF-only route with the Typst PDF, write 12 pages.
- **License:** CC BY 4.0 (Creative Commons Attribution 4.0). It is compatible with most journals, including Regular and Chaotic Dynamics.
- **Report number, journal reference, DOI:** leave blank.

## Abstract (plain text with TeX math, 1,636 characters; the limit is 1,920)

```
In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the dimensionless number $P=|\omega_0|t_c$, the initial angular velocity times the collapse time, measures how tightly the spiral winds. We minimize $P$ over two classical collapsing families. Every self-similar collapse of three point vortices can be normalized to circulations $(1,\mu,-\mu/(1+\mu))$ with $0<\mu\le 1$ and zero angular impulse. For each $\mu$ the collapsing configurations form two arcs, one for each orientation of the vortex triangle, and $P$ has exactly one critical point, a minimum, on each. The squares of the two minima are roots of an explicit cubic whose coefficients are polynomials in $\mu$, and for $\mu<1$ the two minima differ. The smaller one increases strictly from $\sqrt3/2$, approached as $\mu\to 0$, to $\sqrt2$ at $\mu=1$. Hence $P>\sqrt3/2$ for every self-similar collapse of three point vortices, and the constant is sharp; equivalently, every vortex travels more than twice its initial distance from the collision point. For $\mu=1/2$ the two minima are $1.0647059762\ldots$ and $2.2038550160\ldots$, the positive roots of $8748\xi^6-49005\xi^4+27794\xi^2+18723$, and they are not expressible by real radicals. For two concentric regular $n$-gons with circulations $x_n$ and $-1$, $P=(K_n-\sqrt{2n-1}\cos n\theta)/(2n\sin n\theta)$ in terms of the relative rotation $\theta$, with an explicit constant $K_n$, and the minimum over $\theta$ is $\sqrt{K_n^2-2n+1}/(2n)$; for pentagons it is $\sqrt{31682}/80$. All formulas are also checked against the Biot-Savart velocities in high-precision arithmetic.
```

## Endorsement

A first submission to physics.flu-dyn needs one endorsement from an established arXiv author in that category.

1. Start the submission. arXiv then shows an endorsement code.
2. Send the code to a potential endorser with the request in [`endorsement-request.md`](endorsement-request.md).

Good candidates are authors who have themselves posted recent point-vortex papers to physics.flu-dyn or math.DS. Ask one person at a time.
