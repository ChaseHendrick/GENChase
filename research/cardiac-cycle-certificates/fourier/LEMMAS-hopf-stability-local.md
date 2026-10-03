# Quantitative stability near the Hopf endpoint

Status: new reduction and conditional exact bound closure. No explicit TP06
stability interval has yet passed the required analytic producer gates below.
The released Hopf and existence records are inputs, not new stability receipts.

## 1. Coordinates and the analytic family that must be certified

Use the fixed scaled coordinates of `hopf.py`. Write the accepted normalized
profile as `phi_e = c(e) + e w(e)`, with `w_{V,+1}=w_{V,-1}=1/2`, and its
frequency as `omega(e)>0`. The parameter `e` is unrelated to `1/N^2`.
Physical voltage has Fourier coefficient `|Vhat_1|=e/8` mV.

A local producer must prove a holomorphic extension of the **same** blown-up
zero to an open neighborhood of the closed complex disk `|e|<=R`. It must
certify holomorphy of the entire model expression on all state/parameter
sets used, a uniformly injective proposed inverse, contraction/self-map
inequalities in the full infinite weighted Fourier space, and `omega(e)!=0`.
The existing real-interval existence radius does not by itself prove these
complex-disk assertions. The zero at `e=0` must be identified with the accepted
Hopf equilibrium/eigenvector using the existing zero-identity gate. The new
extension and the accepted real branch must meet in a common uniqueness ball.

For fixed `e`, let `M(e)` be the monodromy of

    dY/dtheta = Df(phi_e(theta);g(e)) Y / omega(e), Y(0)=I,

from `theta=0` to `2*pi`. This definition also makes sense for complex `e`.
The coefficient is holomorphic in `e` and continuous in real `theta`, so its
Picard series converges uniformly on the disk and `M` is holomorphic there.
Every producer enclosure must include the Fourier tail of the true profile,
not merely the finite center polynomial.

## 2. Isolate two multipliers, keeping the phase direction exact

Choose `0<rho_s<1` and `0<r_c<1-rho_s`. At the Hopf endpoint, `M(0)` has
two semisimple multipliers equal to 1, arising from the simple pair
`+-i omega_H`; its remaining 16 multipliers must lie strictly inside
`|z|<rho_s`. For every `|e|<=R` and every `t in [0,1]`, certify invertibility
of `zI-M(0)-t(M(e)-M(0))` on both contours

    |z|=rho_s,             |z-1|=r_c.

For example a complete contour cover may prove
`||(zI-M(0))^-1 (M(e)-M(0))||<1`. Every inverse, residual, full parameter
disk, contour segment and monodromy propagation error must be enclosed.
The two contours are disjoint. Riesz-rank homotopy gives 16 multipliers in
the stable disk and two in the critical disk, counted algebraically; these
counts exhaust the 18-dimensional monodromy.

Let `P(e)` be the rank-two Riesz projection around 1. Define

    s(e) = tr(M(e) P(e)) - 2.

Differentiating the profile equation gives an exact variational solution
`w'(theta;e)`. It cannot have zero initial vector: uniqueness of the linear
ODE would make it identically zero, contradicting the fixed nonzero first
harmonic. Thus 1 is an exact multiplier for every complex `e`, including
`e=0`. The other critical multiplier is therefore `1+s(e)`, with
algebraic multiplicities; no subtraction of two numerically approximated
phase eigenvalues is allowed.

The signed normalization has the involution

    e -> -e, c -> c, g -> g, omega -> omega,
    w(theta) -> -w(theta+pi).

At zero, `w_H` has only modes `+-1` by the accepted critical/stable spectral
separation. The involution fixes the zero there. Local analytic uniqueness
identifies the two signed families near zero, and the identity theorem
extends the identity over their connected disk. Phase shifts conjugate the
monodromy matrices, so `s(-e)=s(e)`. This argument requires the analytic
extension and its zero identity; it does not follow from sample values.

## 3. The exact quadratic coefficient

Let `q` be the right Hopf eigenvector in scaled coordinates, normalized by
`sum_j |q_j|^2=1`. Require `|q_V|>0`, and let `l1` be Kuznetsov's first
Lyapunov coefficient in that same normalization, as evaluated by
`hopf.lyap1`. Its cubic coefficient in **physical time** is `omega_H*l1`:
in the local complex coordinate `z`,

    zdot = (mu+i omega_H) z + (G21/2) z |z|^2 + higher terms,
    Re(G21)/2 = omega_H*l1.

The first voltage Fourier coefficient is `q_V z` to leading order, so
`|z|=e/(2|q_V|)+O(e^2)`. The radial exponent of the periodic orbit is
`2 omega_H*l1 |z|^2+o(e^2)`. Since `T_H=2*pi/omega_H`,

    s(e) = b e^2 + O(e^4),
    b = pi*l1/|q_V|^2,
    lambda_rad(e) = omega_H*l1 e^2/(2|q_V|^2) + O(e^4).

The even holomorphic scalar from Section 2 upgrades the ordinary remainder
to the displayed even Taylor expansion. The normal-form calculation here
determines only the Taylor coefficient. It supplies no explicit radius or
remainder bound. The factor of 2 and the eigenvector normalization are
essential. The planar test in `test_hopf_stability_local.py` checks them
against the exact radial equation. `leading_coefficient` re-evaluates the
central equilibrium/eigenpair and cubic coefficient in guarded Arb
arithmetic, without rerunning the entire 516-interval Hopf cover.

## 4. A Cauchy remainder that yields an explicit interval

Suppose a producer has additionally proved `|s(e)|<=M` for all `|e|=R`,
with exact `M>=0`, and `b in [b_lo,b_hi]` with `b_hi<0`. Cauchy's estimate
gives `|s_{2k}|<=M/R^(2k)`. For real `0<=e<=e0<R`,

    |s(e)-b e^2| <= M e^4 / (R^4 (1-(e/R)^2)),
    E = M e0^2 / (R^4 (1-(e0/R)^2)),
    c = -b_hi-E,       u = -b_lo+E.

If `c>0` and `u e0^2<1`, then for every `0<e<=e0`,

    0 < 1-u e^2 <= 1+s(e) <= 1-c e^2 < 1.

The radial multiplier is real because the monodromy is real at real `e`
and its only other critical multiplier is the exact real phase multiplier.
It is distinct from 1, so the phase multiplier is algebraically simple.
All 17 nontrivial multipliers have modulus at most
`max(rho_s,1-c e^2)<1`. If `T(e)<=T_hi`, their real Floquet exponents are
at most minus

    delta(e) = min(1-rho_s, c e^2)/T_hi > 0,

using `log(1-x)<=-x`. Smooth finite-dimensional ODE theory then gives
local exponential orbital attraction and asymptotic phase for each fixed
positive amplitude. This does not compute a uniform nonlinear attraction
radius or transient constant. At `e=0` the periodic orbit has collapsed;
no positive decay bound, simple phase multiplier, or periodic-orbit
attraction assertion is made there.

`close_local_bound` checks these rational inequalities exactly. Its output
is deliberately a **conditional bound closure**, not a TP06 certificate.
It will not promote a source hash, a caller-supplied success flag, a negative
cubic coefficient, or a numerical monodromy into the analytic hypotheses.
No `e0` is selected from the current TP06 evidence until those hypotheses
have been produced and independently reviewed.

The critical-circle gate itself gives `|s(e)|<r_c`, since its second
multiplier is `1+s(e)` and belongs to `|z-1|<r_c`. Thus `M=r_c` is an
available Cauchy bound with no separate trace quadrature. A tighter bound
on the trace is optional, not a necessary additional producer.

## 4a. Fresh complex-disk branch producer

`complex_branch_pilot` starts from the accepted first piece's exact base
and tangent at its real midpoint `e_c`. The unknown space is the existing
complex Banach space: the positive and negative Fourier coefficients are
independent complex unknowns. Its two normalization equations set both
voltage coefficients to `1/2`. There is no real/imaginary packing or
coefficient-conjugacy constraint on complex members. Only the fixed base
and tangent have the real symmetry; conjugation gives reality of zeros at
real parameters by uniqueness, as in the original proof.

For a requested disk radius `R`, the producer encloses the larger square
`Xi=[-R,R]+i[-R,R]`. Put

    A_e >= sqrt(2) R,         D_e >= A_e+|e_c|.

Then `|e|<=A_e` and `|e-e_c|<=D_e` throughout the square. A new full-strip
model-domain/Hessian cover includes both real and imaginary center-line
drifts `D_e |t_c|`, the parameter drift `D_e |t_g|`, and coefficient
majorants `|w_m|+D_e |t_w,m|`. Its additional radii `R_j,G_R` are reserved
for unknown perturbations and are not spent on the line drift. The
nonzero-mode boxes enclose `sigma w` for complex `|sigma|<=T>A_e`.

The frozen `hopf.piece_blocks` finite/tail algebra is reused in a separate
function namespace after four explicit AST assignment substitutions:

1. `delta=D_e` for every center-line residual/derivative norm;
2. `ehiB=A_e` for every absolute-amplitude norm and `T-A_e` Cauchy margin;
3. the nodal `subs_xi` become a complete two-dimensional square grid;
4. the full-strip `XiB` becomes the entire complex square.

The last two substitutions cover both `Y2` and `Zc`, hence six affected
proof domains. The point data, point inverse, Fourier coefficient and
aliasing bounds, both signs of the tail, residual-component weighting and
injectivity checks are retained. The adapter refuses a different frozen
Hopf source hash or assignment shape. It never changes the old module's
namespace or source. Parameter-dependent expressions are evaluated with
complex Arb balls; `.real`/`.imag` are not used to define the family.
Taking moduli for enclosure majorants does not change the holomorphic map.

The original Taylor integral arguments remain valid along each complex
segment from `e_c` to `e`: `Xi` is convex, and the displacement has modulus
at most `D_e`. All scalar powers and coefficient products are holomorphic.
The same Banach-algebra/Cauchy unknown-ball bounds hold with `|e|<=A_e`;
the cover was enlarged in exactly those directions. Fresh `assemble`
therefore proves the full complex contraction if its exact radii
inequalities pass. Its strict inequalities and guarded compact domains
give a holomorphic zero on a neighborhood of the parameter disk.

On the overlap with the accepted real first piece the affine center and
weights are identical. Either its old existence radius is at most the
new uniqueness radius or the new existence radius is at most the old
uniqueness radius. This exact ball inclusion identifies the two zeros,
including zero amplitude. An additional disk bound
`omega_c>D_e |t_omega|+eta_omega r_ex` proves `omega!=0` on the complex
square. Real frequency/period display intervals in the reused assembly
are not interpreted as ordering complex frequencies.

This producer certifies only an analytic branch when it passes. It does
not evaluate a monodromy, establish either spectral contour, or certify
stability of the branch. Failed complex attempts are preserved as failed
proof attempts with their actual diagnostics.

### 4b. Direct analytic radial quotient producer

The new alternative producer avoids propagation of the full monodromy.
Write `L_e=omega(e) d/dtheta-Df(phi_e;g(e))`. Differentiation in phase,
followed by analytic cancellation of `e`, proves `L_e w'_e=0`, also at
zero amplitude. The first voltage coefficients of this exact phase
vector are `+i/2` and `-i/2`, so the vector never vanishes.

Solve the augmented equations

    L_e v + lambda v - alpha w'_e = 0,
    v[V,+1]=v[V,-1]=1/2.

All unknowns are independent complex variables. At zero the two gauges
fix the radial scale and remove the phase direction; the two scalar
columns fix the double critical degeneracy. At nonzero `lambda`,
`u=v-(alpha/lambda)w'_e` satisfies `L_e u=-lambda u`, and `u` cannot vanish
because `v` cannot be a scalar multiple of the phase vector under these
two gauges. The physical Hill operator is
`H_e=Df-omega d/dtheta=-L_e`, so `H_e u=lambda u`. Thus `lambda` is the
physical-time radial Floquet exponent.
A successful uniform contraction, its identification at zero, and local
analytic uniqueness provide a holomorphic quotient eigenpair. The signed
amplitude/phase-shift involution acts as
`v_m(-e)=(-1)^(m+1)v_m(e)`: the additional minus sign after the bare
half-period shift restores both fixed voltage gauges. The phase column
obeys the same transformation, and `lambda` and `alpha` are unchanged.
Both quotient families coincide at the identified zero; strict ball
inclusion gives local uniqueness and analytic identity extends equality
throughout the disk. This gives evenness of `lambda`; the
quadratic coefficient is the physical-time coefficient in Section 3.

The implemented producer freshly replays the complex branch contraction,
encloses all Jacobian coefficients through `K'=64`, and keeps both the
Jacobian strip tail and the true profile-tube coefficient errors. It uses
a strictly smaller eigenvector strip `1/16` than the existence strip
`1/8`, so the phase derivative of the unknown branch tail is bounded.
For `q=exp(-(rho_exist-rho_eigenvector))<1`, the explicit upper bound

    sum_{m>K} m q^m = q^(K+1)((K+1)-Kq)/(1-q)^2

also dominates the supremum required for differentiation of a weighted
coefficient ball. The factor for rectangular complex enclosure radii is
retained. The voltage phase coefficients are exact by normalization.

The finite preconditioner is a proposed floating inverse whose injectivity
is checked by an Arb Neumann residual. The derivative bound includes the
complete finite window, finite rows against both signed tail columns,
and all tail rows through the existing exact tail resolvents. Unknown
frequency variation is included in every entry of the tail derivative
bound. Far coefficient bounds use both Jacobian-strip and profile-error
exponents. The only unknown nonlinearity is the bilinear term `lambda v`;
its full finite/tail Hessian bound is retained in `Z2`. Exact radii
inequalities and contraction decide acceptance. No printed float can
replace a proof bound.

Optional weight search proposes only exact powers-of-two rescalings of
the logged positive dyadic weights. The component residual, derivative,
and bilinear Hessian bounds are reassembled in Arb for each candidate;
the same strict radii polynomial and contraction checks decide whether
it works. The eigenpair validity radius can be larger than the profile
existence radius: its unknowns enter only the entire bilinear term
`lambda v`, not a nonlinear model evaluation. The verified model-domain
and profile-tube reservations remain those of the external branch.
This changes a norm proposal, not an acceptance inequality.

For the shrunken family, the fresh normalized central eigenpair gives
the exact Hopf radial vector with `lambda=alpha=0`. Its weighted distance
from the quotient center must fit the newly computed uniqueness radius.
This separate strict inclusion identifies the analytic quotient at zero.
The physical Hill definition and an exact planar periodic-cycle control
with known radial rate `-2a^2` fix the exponent sign convention.

Coefficient boxes in this first implementation discard amplitude
correlations and may be too broad to yield a useful quotient bound.
Failures are preserved. Passing this quotient contraction would still
require an independent zero-identity/normalization review and a checked
exclusion of the other16 Floquet exponents before any TP06 attraction
claim. A Cauchy remainder bound can then be applied to `lambda` directly,
with its actual disk supremum and physical-time leading coefficient.

The refinement `--shrink` uses the admitted complex branch itself before
building coefficient boxes. On the complete parent circle of radius `R`,
the affine center and the newly proved branch radius give componentwise
Banach-norm bounds on `c(e)-c(0)`, `g(e)-g(0)`, `omega(e)-omega(0)`, and
on each parity projection of `w(e)-w(0)`. The fresh central equilibrium
and eigenpair enclosures bound these exact zero values, identified by the
accepted zero-containment proof and the new branch ball inclusion.

For an inner square with absolute amplitude upper bound `a<R`, the even
differences are bounded by their parent-circle suprema times
`(a/R)^2/(1-(a/R)^2)`, and the odd differences by their parent-circle
suprema times `(a/R)/(1-(a/R)^2)`. Here odd Fourier modes of `w` are even
in amplitude, and even Fourier modes are odd in amplitude. Projection
onto either set of Fourier modes is bounded in the weighted l1 norm.
Each projection may spend the full unknown branch radius, which is
conservative and does not assume that its errors occupy a single mode.

The center for the inner Jacobian cover is the fixed zero equilibrium
plus `e w(0)`. The resulting profile/g errors include the uncertainty of
the central equilibrium and normalized eigenvector. A separate exact
distance bound from this new center to the original affine center,
plus the new error tube, must fit the original Hessian reservations.
This verifies the entire segment used for the Hessian variation bound.
No analyticity is inferred from mere real pieces or from a floated
zero-amplitude extrapolation. The shrunken coefficients and quotient
contraction are freshly computed; the refinement is not an accepted
radial-sign or attraction certificate on its own.

The Jacobian refinement retains `J_H` in Fourier mode zero and
`e D²f_H[w(0),.]` in modes `+1,-1`. Its first derivative has no other
Fourier support, since `c'(0)=g'(0)=0`. A parent-circle bound for
`J(e)-J(0)` follows from the original full-strip Hessian cover and the
actual parent profile/g differences from zero. The model boxes are
convex and contain both endpoints of these differences. Parameter
Cauchy estimates bound the remaining Taylor terms by that sup times
`(a/R)^2/(1-a/R)`; Fourier contour bounds add
`exp(-rho_exist*|m|)` for each coefficient. This bound includes all
Jacobian harmonics and the actual branch profile tail. It avoids
creating a spurious first-order mean Jacobian through interval DFT
dependency loss. The exact finite linear terms and the full quadratic
remainder remain in both the residual and derivative checks.

## 5. Required numerical producer gates and the remaining work

The full local record needs, bound to current source and immutable input
snapshots: (i) complex-disk blown-up contraction and all model domain guards;
(ii) exact zero and real-branch identity; (iii) verified monodromy over the
complete disk, including propagation and profile-tail errors; (iv) both
complete resolvent contours and ranks 16/2; (v) a bound on the critical
trace on the complete amplitude circle, with quadrature error if contour
quadrature is used; (vi) the checked central cubic coefficient in the fixed
normalization and a positive period upper bound; (vii) the exact closure
above and overlap with the first away-from-zero stability interval.

The released existence pieces, endpoint Hopf sign, and historical point
stability successes do not supply (i), (iii), (iv), or (v). These are actual
missing numerical proof obligations. A useful bound on `s` needs a
critical-subspace calculation; a generic norm bound on the full monodromy
may give an impractically small `e0`. A second-order analytic Schur
reduction or a validated Floquet transformation can improve that bound
without changing this implication or discarding the stable 16 modes.

Method credit: the amplitude desingularization and validated cycle
continuation follow van den Berg, Lessard and Queirolo, SIAM J. Appl. Dyn.
Syst. 20 (2021), 573--607, doi:10.1137/20M1343464. The cubic coefficient
convention is Kuznetsov's Andronov-Hopf statement, Scholarpedia 1(10):1858,
revision 90964, already used by the released manuscript. Riesz homotopy and
Cauchy bounds are classical ingredients. No historical-priority claim is
made for this reduction or its potential TP06 application.
