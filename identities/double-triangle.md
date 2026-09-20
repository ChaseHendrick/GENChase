# Double-triangle spin–collapse bound

**A proved formula and sharp bound; candidate fourth GENChase identity, with historical priority under investigation.** Derived in this project with AI assistance on 2026-09-20. The underlying two-ring collapse is classical (Aref 1982; Koiller et al. 1985), and is not claimed as new.

Open `studio.html#double-triangle-bound/double-triangle`. The plate integrates all six point-vortex equations, compares the result with the formula, and offers a deliberately displaced-vortex control. The geometry name is a descriptive project label, not an established attribution.

## Statement

Let $\varphi=(1+\sqrt5)/2$, $\zeta=e^{2\pi i/3}$ and $0<\theta<\pi/3$. Place six point vortices at

$$
a_k=\varphi e^{i\theta}\zeta^k,\quad \Gamma(a_k)=-1,
\qquad b_k=\zeta^k,\quad \Gamma(b_k)=\varphi^2,
\qquad k=0,1,2.
$$

The two concentric equilateral triangles have circumradius ratio $\varphi$. The angle $\theta$ is their relative rotation, not an interior triangle angle. Use the conventional planar point-vortex equation

$$
\dot z_j=\frac{i}{2\pi}\sum_{\ell\ne j}\Gamma_\ell
\frac{z_j-z_\ell}{|z_j-z_\ell|^2}.
$$

These configurations collapse self-similarly. If $\omega_0$ is the initial angular velocity about the origin and $t_c$ the collision time, then

$$
\boxed{\omega_0t_c=
\frac{11-\sqrt5\cos(3\theta)}{6\sin(3\theta)}
\ge\frac{\sqrt{29}}3.}
$$

Equality holds uniquely on the specified arc at

$$
\boxed{\cos(3\theta_*)=\frac{\sqrt5}{11},\qquad
\theta_*=26.0904111913\ldots{}^\circ.}
$$

The minimum is $1.7950549357115\ldots$. At $\theta=30^\circ$, the product is $11/6$. Scaling or translating the geometry, rotating it as a whole, or multiplying all circulations by the same **positive** factor does not change this product. Reversing all circulations or reflecting the geometry reverses the time orientation; the corresponding expanding solutions are excluded from this positive-time collapse statement. The endpoints of the arc are relative equilibria, not finite-time collapses.

## Why the previously rejected geometry works

Set $x=\varphi^2=(3+\sqrt5)/2$. Then

$$
x^2-3x+1=0.
$$

For two three-vortex rings of per-vortex strengths $-1$ and $x$, the virial is

$$
\sum_{i<j}\Gamma_i\Gamma_j=3+3x^2-9x=0.
$$

The center of vorticity is the origin, and the angular impulse is

$$
I=\sum_j\Gamma_j|z_j|^2=-3\varphi^2+3x=0.
$$

The old ledger tested ratios $1,1/2,2$, none of which solves $x^2-3x+1=0$. Failure at those ratios does not exclude the two-ring collapse family. Rotational symmetry of order three is also not reflection symmetry: generically the two relatively rotated triangles have no common reflection axis.

These conserved-quantity conditions alone would not suffice for general six-vortex data. The velocity calculation below proves similarity for this particular family.

## Derivation from all six velocities

For a regular three-vortex ring, the two other vortices contribute

$$
\sum_{\ell\ne k}\frac{1}{\bar z_k-\bar z_\ell}=\frac1{\bar z_k}.
$$

For a different ring with representative $b$, the root-of-unity sum gives

$$
\sum_{k=0}^2\frac1{w-\bar b\,\zeta^{-k}}
=\frac{3w^2}{w^3-\bar b^3}.
$$

Let $\alpha=3\theta$, $R=\varphi^3$, $E=e^{-i\alpha}$, and $D=|RE-1|^2=1+R^2-2R\cos\alpha$. Dividing each velocity by its position gives the same coefficient on each of the two rings:

$$
\frac{\dot a_k}{a_k}
=\frac{i}{2\pi}\left[-\frac1x+
\frac{3RE}{RE-1}\right],
\qquad
\frac{\dot b_k}{b_k}
=\frac{i}{2\pi}\left[x+\frac3{RE-1}\right].
$$

Their difference is $i(3-x-1/x)/(2\pi)=0$. Thus all six have the common coefficient $A+iB$. Rationalizing the second expression yields

$$
A=-\frac{3R\sin\alpha}{2\pi D},\qquad
B=\frac{R(11-\sqrt5\cos\alpha)}{2\pi D}.
$$

For the simplification of $B$, use

$$
x(1+R^2)-3=11R,\qquad 3-2x=-\sqrt5.
$$

In the stated interval $D>0$, $A<0$, and $B>0$. Homogeneity of the vortex equations gives

$$
z_j(t)=z_j(0)\sqrt{1+2At}\,
\exp\left[\frac{iB}{2A}\log(1+2At)\right],
\qquad 0\le t<t_c=-\frac1{2A}.
$$

Consequently $\omega_0=B$, and $\omega_0t_c=-B/(2A)$ is exactly the boxed formula. The instantaneous angular velocity grows as $B/(1-t/t_c)$; the time-dependent invariant is $\omega(t)(t_c-t)=\omega_0t_c$.

## Exact sharp minimum

Write $c=\cos\alpha$ and $s=\sin\alpha>0$. The identity

$$
(11-\sqrt5c)^2-116s^2=(11c-\sqrt5)^2
$$

proves the bound because $11-\sqrt5c>0$. Equality requires $c=\sqrt5/11$, attained exactly once for $\alpha\in(0,\pi)$. Equivalently,

$$
\frac{d}{d\theta}\left(\frac{11-\sqrt5\cos3\theta}{6\sin3\theta}\right)
=\frac{\sqrt5-11\cos3\theta}{2\sin^2 3\theta},
$$

where the derivative uses radians. It is negative before $\theta_*$ and positive after it. This is an exact algebraic proof, not a minimum inferred from a plot or an integer-relation fit.

## Independent computation and controls

Run `node tools/double-triangle-check.js`. It extracts the actual module from `studio.html` and checks:

- 1,199 angles from $0.05^\circ$ through $59.95^\circ$ against direct all-pairs Biot–Savart velocities, plus a reflected configuration to check the expanding time orientation.
- The minimum, the $30^\circ$ value, and invariance under changes of scale, translation, and overall rotation.
- All six integrated trajectories through $0.9t_c$ at $4^\circ$, $\theta_*$, $30^\circ$, and $56^\circ$, against the exact similarity solution.
- A time-step-halving error estimate, plus a displaced-vortex control and a deliberately anisotropic velocity-kernel mutation.

On the initial validation, the maximum relative error of the closed product was $3.3\times10^{-13}$; the maximum absolute coefficient error was $4.5\times10^{-16}$. At the minimizer, the maximum trajectory error normalized by initial RMS radius was $5.2\times10^{-11}$; across the four tested trajectories it was below $3.4\times10^{-7}$. Moving one vortex produced a velocity similarity residual of $0.173$ and a normalized shape error of $0.438$.

The plate's curve uses the formula, its dots use direct velocities, and its trajectories use numerical integration. Its checks therefore can disagree. The displayed `ODE Δ/15` is the RK4 step-halving estimate, not a statistical confidence interval or a rigorous error enclosure. The initial product has no sampling error. Floating-point evaluation and integration still have numerical error. For Broken, the fitted contraction scale is not identified as an actual collision time; the product is shown as not applicable.

A uniform multiplier of the whole velocity kernel cancels out of the dimensionless product. This product alone cannot detect that error. The regression script additionally checks the dimensional coefficients $A,B$ for the stated $2\pi$ kernel.

## Literature comparison and remaining priority question

Two-ring self-similar collapse is established prior work. Koiller et al. (1985), §11, Proposition 12 and equations (11.1)–(11.5), give the circulation condition, square-root contraction and logarithmic-spiral motion. Their general ring reduction specializes to the configuration above. This note does **not** claim the motion, the golden-ratio circulation condition, or the idea of a spiral pitch as new.

The prospective contribution is the explicit six-vortex product, its sharp $\sqrt{29}/3$ minimum, and its equality angle. Searches on 2026-09-20 did not locate that formula or extremum. However, the 1985 paper was accessible only through search-indexed text, including pages 27, 59 and 60; direct PDF retrieval timed out and the author's Academia copy was inaccessible. O'Neil's 2007 triple-ring article was available as an abstract and introductory excerpts. These limitations prevent a complete priority check. **A correct theorem is established here; historical novelty is not.** Do not promote this candidate to a verified first-discovery claim based solely on these searches.

The next useful check is full-text examination of Koiller et al., Aref's 1982 paper, and later work citing the two-ring collapse calculation, specifically for an optimized spiral pitch or a bound equivalent to $\sqrt{29}/3$. The query log is in [RESEARCH.md](../RESEARCH.md).

References:

1. H. Aref, *Point vortex motions with a center of symmetry*, Physics of Fluids **25**, 2183–2187 (1982). [DOI](https://doi.org/10.1063/1.863710).
2. J. Koiller, S. Pinto de Carvalho, R. Rodrigues da Silva, and L. C. Gonçalves de Oliveira, *On Aref's vortex motions with a symmetry center*, Physica D **16**, 27–61 (1985), especially §11. [DOI](https://doi.org/10.1016/0167-2789(85)90084-3); [indexed PDF](https://citeseerx.ist.psu.edu/document?doi=623e1e94be8d0a3b647f8c68c907a0c077483f33&repid=rep1&type=pdf).
3. K. A. O'Neil, *Relative equilibrium and collapse configurations of heterogeneous vortex triple rings*, Physica D **236**, 123–130 (2007). [DOI](https://doi.org/10.1016/j.physd.2007.07.015).
4. V. Banica and E. Miot, *Evolution, interaction and collisions of vortex filaments* (2012), §3 and reference 41, used to identify the 1985 primary source. [Author PDF](https://www-fourier.univ-grenoble-alpes.fr/~miote/BM-surveyweb.pdf).
