# Polygon collapse: a sharp bound for every order

See the [audit of all five candidates](NOVELTY-AUDIT.md): historical priority is unconfirmed for the earlier three results as well. The general polygon bound includes the parallelogram and double-triangle cases.

**Candidate fifth result, derived with AI assistance on 2026-09-20. The formula and its minimum are proved; historical novelty is unconfirmed.** This generalizes the [double-triangle result](double-triangle.md). The underlying two-ring collapse for arbitrary polygon order was already established by Koiller et al. (1985), §11. The prospective contribution is the simplified product and its explicit sharp minimum, not a new collapse family.

The eight-vortex square case is

$$
\boxed{\omega_0t_c=\frac{\sqrt7\,[55-9\cos(4\theta)]}{72\sin(4\theta)}
\ge\frac{\sqrt{322}}9,\qquad 0<\theta<\frac\pi4.}
$$

Equality holds uniquely at

$$
\boxed{\cos(4\theta_*)=\frac9{55},\qquad
\theta_*=20.1454931950\ldots{}^\circ.}
$$

The minimum is $1.9938176049918\ldots$. There are four vortices of circulation $-1$ at the vertices of the outer square, and four of circulation $x=(4+\sqrt7)/3$ on the inner square. Their circumradius ratio is $\sqrt{x}$; the relative rotation is $\theta$.

Open `studio.html#double-triangle-bound` and choose **Square minimum**. The retained URL keeps the earlier triangle recipes usable. The vertex-count control explores the same general theorem.

## General statement

For any integer $n\ge2$, define

$$
d_n=\sqrt{2n-1},\quad
x_n=\frac{n+d_n}{n-1},\quad
\eta_n=\log x_n=\operatorname{arcosh}\frac{n}{n-1},
$$

$$
K_n=(n-1)\sinh\left(\frac{n+2}{2}\eta_n\right),
\qquad F_n=\frac{\sqrt{K_n^2-d_n^2}}{2n}.
$$

Let $\zeta=e^{2\pi i/n}$. Put $n$ vortices of circulation $-1$ at
$a_k=\sqrt{x_n}e^{i\theta}\zeta^k$ and $n$ vortices of circulation $x_n$ at
$b_k=\zeta^k$, for $k=0,\ldots,n-1$ and $0<\theta<\pi/n$.
For $n=2$, a ring means two antipodal points. With the standard planar kernel

$$
\dot z_j=\frac{i}{2\pi}\sum_{\ell\ne j}\Gamma_\ell
\frac{z_j-z_\ell}{|z_j-z_\ell|^2},
$$

all these configurations collapse self-similarly, and

$$
\boxed{\omega_0t_c=
\frac{K_n-d_n\cos(n\theta)}{2n\sin(n\theta)}\ge F_n.}
$$

Equality occurs exactly once on this arc:

$$
\boxed{\theta_*=\frac1n\arccos\frac{d_n}{K_n}.}
$$

Here $\omega_0$ is the initial angular velocity and $t_c>0$ the total collision time. Uniform spatial scaling, translation, rotation, and a common positive multiplier of all circulations leave the product unchanged. Reflection selects the expanding time orientation. The arc endpoints are relative equilibria, not finite-time collapses.

This is one generalization. The square case is its first specialization beyond the triangle calculation, not evidence that every value of $n$ is a separate discovery. The theorem does not cover arbitrary $2n$-vortex configurations or independently chosen circulation and radius ratios.

## Derivation

Suppress the subscript $n$, write $R=x^{n/2}$, $\alpha=n\theta$, $E=e^{-i\alpha}$, and $D=|RE-1|^2$.
The zero-virial circulation condition is

$$
(n-1)(1+x^2)-2nx=0,
\qquad x+x^{-1}=\frac{2n}{n-1}.
$$

The geometry also has zero angular impulse:
$\sum_j\Gamma_j|z_j|^2=-nx+nx=0$.
These necessary conditions alone do not establish similarity. The velocity sums do.

For one regular $n$-gon and another concentric ring,

$$
\sum_{\ell\ne k}\frac1{\bar z_k-\bar z_\ell}
=\frac{n-1}{2\bar z_k},\qquad
\sum_{k=0}^{n-1}\frac1{w-\bar b\zeta^{-k}}
=\frac{nw^{n-1}}{w^n-\bar b^n}.
$$

Consequently,

$$
\frac{\dot a_k}{a_k}=\frac{i}{2\pi}
\left[-\frac{n-1}{2x}+\frac{nRE}{RE-1}\right],
\qquad
\frac{\dot b_k}{b_k}=\frac{i}{2\pi}
\left[\frac{(n-1)x}{2}+\frac{n}{RE-1}\right].
$$

Their difference is
$\frac{i}{2\pi}[n-(n-1)(x+x^{-1})/2]=0$.
Every vortex therefore has the same velocity/position coefficient $A+iB$.
Rationalizing gives

$$
A=-\frac{nR\sin\alpha}{2\pi D},\qquad
B=\frac{R(K-d\cos\alpha)}{2\pi D}.
$$

The two simplifications used here are

$$
n-(n-1)x=-d,
$$

$$
\frac{(n-1)x(1+R^2)/2-n}{R}
=\frac{n-1}{2}\left(x^{(n+2)/2}-x^{-(n+2)/2}\right)=K.
$$

Since $\eta>0$ and $(n+2)/2>1$, we have
$K>(n-1)\sinh\eta=d>0$.
Thus $A<0$ and $B>0$ throughout the specified arc. Homogeneity yields

$$
z_j(t)=z_j(0)\sqrt{1+2At}\,
\exp\left[\frac{iB}{2A}\log(1+2At)\right],
\qquad t_c=-\frac1{2A},\quad\omega_0=B.
$$

Taking $-B/(2A)$ proves the product formula. It also gives
$\omega(t)(t_c-t)=\omega_0t_c$.

## Sharp minimum and square specialization

With $c=\cos\alpha$, $s=\sin\alpha>0$,

$$
(K-dc)^2-(K^2-d^2)s^2=(Kc-d)^2.
$$

Both numerator and denominator of the product are positive. This identity proves the bound; equality requires $c=d/K$, attained exactly once on $(0,\pi)$.

For $n=4$, $\cosh\eta=4/3$, $\sinh\eta=\sqrt7/3$. The triple-angle identity gives

$$
K_4=3\sinh(3\eta)=\frac{55\sqrt7}{9},
\qquad
F_4=\frac{\sqrt{(55\sqrt7/9)^2-7}}8=\frac{\sqrt{322}}9.
$$

The same theorem recovers $F_2=3\sqrt5/4$ and $F_3=\sqrt{29}/3$. They are consistency checks, not additional discoveries.

There is also an immediate large-order asymptotic:

$$
\boxed{F_n\sim\frac14\exp\sqrt{n/2}\qquad(n\to\infty).}
$$

Indeed, $\eta_n=\sqrt{2/(n-1)}[1+O(n^{-1})]$, so
$((n+2)/2)\eta_n=\sqrt{n/2}+O(n^{-1/2})$.
Then $K_n\sim(n-1)e^{\sqrt{n/2}}/2$, and $d_n/K_n\to0$.
This is an asymptotic consequence of the proved expression, not a fitted growth curve or a stability claim.

## Numerical verification and limits

`node tools/polygon-collapse-check.js` extracts the actual implementation from the studio. It checks 599 angles for each order $n=2,\ldots,20$, totaling **11,381 configurations**, against direct all-pairs velocities. Maximum relative product discrepancy: $6.6\times10^{-13}$; maximum absolute error in $A,B$: $3.2\times10^{-15}$.

The suite also checks the exact minima, invariance under scale/translation/rotation, the expanding orientation, and full RK4 trajectories through $0.9t_c$ at three representative angles for each displayed order $n=2,3,4,5$. At the square minimum, maximum trajectory error normalized by initial RMS radius is $8.4\times10^{-11}$. Across those 12 trajectories the largest error is $1.8\times10^{-6}$. Displacing one vortex or making the velocity kernel anisotropic makes the controls fail.

The mathematical theorem holds for every integer $n\ge2$, but the interactive integrator is limited to $n\le5$. An exploratory $n=6$ trajectory near the edge of the arc amplified numerical perturbations enough to miss the error target. Restricting the display avoids presenting inaccurate trajectories as a confirmation. This is a numerical limitation; the direct velocity identities still passed through $n=20$. No claim of dynamical stability is made.

`ODE Δ/15` is the fourth-order step-halving estimate, not a rigorous enclosure. At $n=5$ near the arc boundary, the exact error was about 2.7 times this estimate. The analytic trajectory comparison is an additional check. A uniform error in the kernel's overall multiplier cancels from the dimensionless product; checking the dimensional $A,B$ coefficients detects it.


## Explicit n = 5 radical (2026-09-23)

The general theorem already covers every $n\ge2$. Clearing radicals at $n=5$ gives the first in-repo explicit specialization beyond $F_2,F_3,F_4$:

$$
\boxed{\omega_0 t_c=\frac{127\sqrt{2}-24\cos(5\theta)}{80\sin(5\theta)}
\ge\frac{\sqrt{31682}}{80},\qquad 0<\theta<\frac{\pi}{5}.}
$$

Equality at $\cos(5\theta_*)=12\sqrt{2}/127$. Float64 verify: `tools/verify-new-formula-candidate.js`. **Proved candidate; priority unconfirmed.** This is a specialization of candidate 5, not a separate discovery. Draft: [`sources/new-formula-candidate-2026-09-23.md`](sources/new-formula-candidate-2026-09-23.md).

## Prior articles and status

Koiller et al. (1985), §11, Proposition 12, already treat collapse of two regular $n$-gons. Aref (1982) is foundational, and O'Neil (2007) explicitly identifies two-ring collapse as known before studying triple rings. The general family, the virial condition, and logarithmic spirals belong to that literature.

Targeted searches for the square expression, $\sqrt{322}/9$, optimized polygon spiral pitch, and a hyperbolic-sine expression for the minimum did not locate an earlier statement. This is limited negative evidence. The 1985 paper was read in full on 2026-09-23 (`sources/koiller1985-read-2026-09-23.md`): it states the two-ring family and log-spiral rates, not these optimized floors. The 2007 paper was accessible as its abstract/introduction. Negative search plus a non-matching full Koiller read still does not prove priority; an equivalent general bound in Aref 1982 or O’Neil 2007 would defeat the novelty claim. **Keep this as a proved candidate, not a verified fifth first-discovery claim.** The query log is in [RESEARCH.md](../RESEARCH.md).

References:

1. H. Aref, *Point vortex motions with a center of symmetry*, Physics of Fluids 25, 2183–2187 (1982). [DOI](https://doi.org/10.1063/1.863710).
2. J. Koiller, S. Pinto de Carvalho, R. Rodrigues da Silva, L. C. Gonçalves de Oliveira, *On Aref's vortex motions with a symmetry center*, Physica D 16, 27–61 (1985), §11. [DOI](https://doi.org/10.1016/0167-2789(85)90084-3); [indexed primary text](https://citeseerx.ist.psu.edu/document?doi=623e1e94be8d0a3b647f8c68c907a0c077483f33&repid=rep1&type=pdf).
3. K. A. O'Neil, *Relative equilibrium and collapse configurations of heterogeneous vortex triple rings*, Physica D 236, 123–130 (2007). [Publisher](https://www.sciencedirect.com/science/article/abs/pii/S0167278907002588).
