# Draft quantitative stability along the positive-amplitude Hopf bridge

This document specifies the interface of `hopf_stability.py`. It is a draft,
not a complete quantitative bridge theorem. The current preprint's qualitative
Hopf conclusion and its separate fixed-conductance stability theorem remain
unchanged. No conclusion about ring or cable stability follows here.

## 1. Accepted branch premise and fresh localization

The existing, current-source Hopf record supplies a real periodic branch on each
closed amplitude piece. Write its exact affine centre as

\[
 (\bar\omega(d),\bar g(d),\bar c(d),\bar w(d))
 = (\omega_c,g_c,c_c,w_c)+d(\omega_1,g_1,c_1,w_1),
 \qquad d=\varepsilon-\varepsilon_c.
\]

The physical orbit is \(\phi=c+\varepsilon w\). Its voltage first harmonic is
fixed by the blown-up branch normalization. For positive amplitude, this ensures
that the orbit is nonconstant and that its phase derivative is a nonzero kernel
vector of the variational operator.

The draft producer restricts to a symmetric, positive-amplitude subinterval
about the original piece midpoint. It recomputes the full radii polynomial with
an exact centre, tangent and component weights. An optional higher-order floating
Galerkin solve proposes a new centre; that solve supplies no proof. The fresh
analytic family cover and radii polynomial must validate the new proposal.
The producer accepts only a fresh strict contraction certificate whose existence
ball is strictly inside the admitted parent uniqueness ball at every parameter.
The weighted distance between the two affine centres is convex in amplitude,
so the larger of its exact endpoint bounds bounds the entire subinterval.
Adding that distance to the new radius times the weight ratio must give a strict
bound below the parent uniqueness radius. Parent bounds are read only after the
native current-source reproof admission checks pass.

This identification is essential: a separately proved nearby periodic orbit
without inclusion in the parent uniqueness ball would not establish stability
of the published branch.

## 2. The actual Jacobian family

Let \(r\) be the fresh existence radius and \(\eta\) its component weights,
ordered as frequency, conductance, constant state and blown-up Fourier state.
On the existence strip \(\rho_0\), for every real parameter in the subinterval,

\[
 |\phi_k-\bar\phi_k|
 \le t_k=(\eta_{c,k}+\varepsilon_{\max}\eta_{w,k})r,
 \qquad |g-\bar g|\le t_g=\eta_g r.
\]

The analytic family cover must contain the full centre curve and these state
and conductance error tubes. In particular, the program checks strictly that
\(t_k<R_k\) and \(t_g<G_R\). The existing cover supplies bounds for the state
Hessian and \(D_z f_1\), where the model is affine in conductance,
\(f(z;g)=f_0(z)+g f_1(z)\). Integrating the Jacobian derivative along the
segment from the centre to the true orbit gives

\[
 |D_j f_k(\phi;g)-D_j f_k(\bar\phi;\bar g)|
 \le E_{kj}=\sum_l M_{H,kjl}t_l+M_{G,kj}t_g.
\]

Both the orbit and the model remain holomorphic on the smaller strip
\(\rho_e=\min(\rho_0,\rho_2)\). Thus the Fourier coefficient of this error is
bounded by \(E_{kj}e^{-\rho_e|n|}\). This term includes the conductance error;
omitting it would be invalid.

At the centre parameter, full-strip bounds and an aliasing-corrected DFT enclose
\(J_{0,n}\), the Jacobian coefficients along
\(\bar\phi=c_c+\varepsilon_c w_c\). Along the full parameter interval, the same
procedure encloses the derivative of
\(D f(\bar c(d)+(\varepsilon_c+d)\bar w(d);\bar g(d))\).
The path is quadratic in amplitude, despite its affine blown-up coordinates.
The native curve derivative includes that quadratic dependence and the
conductance tangent. For each coefficient write its uniform derivative ball as
an exact centre \(J_{1c,n}\) with complex disk radius \(r_{1,n}\).

The real mean-value integral, coefficient by coefficient, now proves

\[
 A_n(\varepsilon)\in J_{0,n}+d J_{1c,n}
  +\mathbb D\!\left(h r_{1,n}+E e^{-\rho_e|n|}\right),
\]

where \(|d|\le h\). The full-strip coefficient majorant is

\[
 |A_n(\varepsilon)|\le
 (S_{J0}+hS_{J1})e^{-\rho|n|}+Ee^{-\rho_e|n|}.
\]

All entries use componentwise inequalities. The frequency enclosure is
\(\omega_c+d\omega_1+\mathbb D(\eta_\omega r)\).

## 3. Spectral conclusion on one accepted subinterval

These data have the same mathematical interface as the frozen uniform Hill
certificate in `branch_stability.py`. Its parameter variable represents
amplitude here. Its finite comparison matrix, tail resolvent, coupling bounds,
eigenvalue count and every small-gain column must pass with strict inequalities
for the entire subinterval. No single-point floating eigenvalue calculation
supplies this conclusion.

An accepted count of exactly one exponent in the nondecaying region, together
with the exact nonzero phase kernel, leaves every other exponent strictly to
the left of the requested decay boundary. This is a conditional linear
Floquet-stability result for the admitted single-cell periodic orbit. It does
not prove a nonlinear basin, uniform attraction down to amplitude zero, or
stability of a spatial discretization.

## 4. Full bridge admission remains outstanding

A complete quantitative bridge additionally requires all positive-amplitude
subintervals to cover the recorded endpoint \(0.12854\), with exact overlaps
and branch identification, and an independently proved local interval adjacent
to zero. The latter must use an amplitude-dependent radial margin: the radial
decay approaches zero at Hopf. `LEMMAS-hopf-stability-local.md` specifies a
separate draft route. Neither a successful pilot subinterval nor its overlap
with a proposed local interval satisfies this final coverage requirement.

## 5. Trusted computation and replay scope

The draft producer trusts the existing TP06 model translation, Arb arithmetic,
full-strip and aliasing algorithms, accepted Hopf branch premise and frozen Hill
lemmas. It preserves the bytes of all published programs and records. New
outputs bind both imported source sets, the parent input line, its analytic
cover, exact settings and the draft producer source. Independent spectral
replay is a separate layer; it must explicitly retain any orbit, model-enclosure
or phase premises that it does not itself reconstruct.
