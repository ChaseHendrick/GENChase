# Plan: reentry as a periodic travelling wave of the continuum TP06 cable on a ring

Status (2026-10-02): plan, numerical results and a CAPD measurement pilot. **No theorem.** Every number in sections 7
to 9 is floating point (collocation, simulation) or a measurement of the cost and width of rigorous enclosures over one
segment; none of them is a certificate. Programs and results are in this folder; the log is `LOG.md`.

This plan answers the owner's request of 2026-10-02 (`../../STATUS-2026-10-02.md`): replace the discrete 16-cell ring
near propagation failure (caveat a), the single parameter point (caveat b) and a proof that might not close (caveat c)
by a statement about the continuum cable, for a family of ring lengths, proved by CAPD multiple shooting.

## 1. The model

The cable on a ring of length L (x in R/LZ, t in ms, V in mV):

    V_t = D V_xx + f_V(y),     w_t = f_w(y),     y = (V, w) in R^19,                                   (1)

with f = (f_V, f_w) the baseline 19-state ten Tusscher-Panfilov 2006 endocardial cell of this study
(`../tp06_19d.py`, author convention, the same text as the discrete ring: Cm = 1, flux capacitance 0.185, no
stimulus). The h/j rates switch at V = -40 mV exactly as in TP06_endo.m (lines 84-91): the first formulas for V < -40,
the second for V >= -40. The L-type GHK factor is the analytic extension z/(e^z - 1). The axial current D V_xx is
not carried by any ion species (standard monodomain), as in the discrete ring.

**Diffusion constant.** D = 0.154 mm^2/ms, the value this study has used since `../SCOPING.md` section 3.1, where it is
quoted as the published TP06 tissue value (0.00154 cm^2/ms; that source sentence was not re-read in this session).
The choice of D is a choice of length unit and changes no statement below: the comoving system (2) depends on c and
D only through kappa = c^2/D, so a wave for one D gives one for every D with c proportional to sqrt(D), L proportional
to sqrt(D) and the period T unchanged. Results are therefore also reported as L / sqrt(D) (in ms^(1/2)).

**Reflection.** (1) is invariant under x -> -x, so every wave moving towards +x has a mirror image moving towards -x.
We take c > 0 (motion towards +x).

## 2. The comoving frame

A travelling wave is u(x, t) = phi(t - x/c). Put s = t - x/c (the time at which the wave passes the point x). Then
u_t = phi', u_x = -phi'/c, u_xx = phi''/c^2, and (1) becomes, with W = phi_V' and kappa = c^2/D (units 1/ms),

    V' = W,
    W' = kappa (W - f_V(y)),                                                                          (2)
    w' = f_w(y),

an ODE in **20 dimensions** (the 19 cell states and W). The gates and concentrations obey the cell's own equations; only
V gains a second derivative. For the proof kappa is also a state with kappa' = 0 (21 dimensions), so that the C1
enclosures carry derivatives with respect to kappa.

**Ring condition.** u is L-periodic in x iff phi(s - L/c) = phi(s) for all s, i.e. iff L/c is a multiple of the
minimal period T of phi. Reentry with one wave on the ring is the case

    L = c T = sqrt(D kappa) T.                                                                         (3)

The rotation period of the reentry (the time between two activations of one point) is T. Waves with n > 1 crests on
the ring (L = n c T) are not considered.

**Regularity.** Along a solution of (2), W is continuous and W' = kappa (W - f_V) is continuous (f_V depends on h and j,
not on their rates), so phi_V is C^2 and the V equation of (1) holds classically. The h and j components are
Lipschitz and piecewise C^1: their derivatives jump at the instants where V = -40. At every fixed x they solve
their equations in the Caratheodory sense, which is the same solution notion as for the single cell and the discrete
ring of this study, whose right-hand side has the same jump.

**First integral.** Let q(y) be the per-cell charge of `tp06_19d.charge` and k = Cm Cm_flux/(F V_c) = 1.1689e-4 mM/mV.
For the isolated cell, grad q . f = 0 identically, for either set of h/j formulas (q does not depend on h or j).
Since dq/dV = -k, along (2)

    dq/ds = grad q . (W, f_w) = grad q . f + (dq/dV)(W - f_V) = -k W'/kappa,

so **H = q + (k/kappa) W is a first integral of (2), for each branch field separately** (`tw_model.py` checks the
cancellation at random states: relative residual 2.2e-16). On the ring, the conserved total charge is
integral_0^L q dx = c integral_0^T q ds = L H - (k c/kappa)(V(T) - V(0)) = L H, so H is the charge per cell of the
ring. Periodic orbits of (2) therefore come in one-parameter families indexed by H, and each ring problem lives on one
leaf {H = H0}.

**The leaf.** H0 = q(y01) = 150.44266158133294 mM, the charge per cell of the standard TP06 initial state (y01 of the
source with K_i = 138.3, `tp06_19d.Y0`). y01 is the standard initial state, not an equilibrium of the cell
(f_V(y01) = 0.26 mV/ms); but q is conserved by the cell flow, so a ring started uniformly in y01 and excited by a
stimulus carried by K (author convention) has exactly this charge per cell, and its reentry, if it settles to a
travelling wave, lies on this leaf.
H is an explicit graph in K_i (dH/dK_i = 1), so the leaf needs no implicit function: K_i = H0 - (H - K_i).

## 3. Structure of the orbit

Per period the orbit crosses V = -40 twice: upwards at the upstroke (W > 0) and downwards during repolarization
(W < 0). Both crossings are transversal, because d(V + 40)/ds = W, and W is a state variable that is continuous
across the switch (only h' and j' jump). The numbers of crossings of V = 15 mV (the GHK window) and the size of W at
the crossings are in section 7.

**The expanding direction.** The W equation has self-rate +kappa. Near rest, the (V, W) block of the linearization is
[[0, 1], [kappa g, kappa]] with g the cell's slope conductance, with eigenvalues (kappa +- sqrt(kappa^2 + 4 kappa g))/2:
one of order kappa + g > 0, one negative. This is the electrotonic foot of the wave seen from the comoving frame.
Integrated over a period it gives one Floquet multiplier of order exp(kappa T), for kappa near 2 per ms and T near
300 ms about e^600. Every other direction is slaved or contracting (the m gate at about -940 per ms, as in the
discrete study), except the neutral directions (phase, and the first integral, which the leaf removes) and the slow
ionic directions. Single shooting is therefore impossible in any precision that can be afforded, and the shooting
segments must be short enough that the expansion over one segment stays moderate (section 8 measures it).

## 4. Multiple-shooting formulation (the proof to be run)

**Sections.** Sigma_up = {V = -40} crossed with W > 0, Sigma_down = {V = -40} crossed with W < 0.

**Pieces.** Piece A runs from Sigma_up to Sigma_down with the field F_hi (the V >= -40 formulas); piece B runs from
Sigma_down to Sigma_up with F_lo (the V < -40 formulas). Each piece is cut into segments: all but its last are time
maps of fixed duration Delta_i (from the numerical orbit), and its last segment ends on the section (a Poincare map,
CAPD's PoincareMap with the project's patch).

**Unknowns.** Node u_0 on Sigma_up and node u_{m_A} on Sigma_down have 18 coordinates (V = -40 fixed; K_i fixed by
H0); every other node has 19 (K_i fixed by H0). Each map G_i takes node i to node i+1 (indices mod m = m_A + m_B):
first insert K_i from H0 (and V = -40 on a section), map, then drop the coordinates that the target node does not
carry. The maps preserve H exactly (both branch fields do), so the dropped K_i of an image is the one H0 prescribes,
and nothing is lost by dropping it. The insertion K_i = H0 - (q - K_i) - (k/kappa) W depends on kappa
(dK_i/dkappa = (k/kappa^2) W), so the kappa column of each DG_i must include it; and evaluated on an independent box of
the other coordinates the inserted K_i loses their correlation, so the insertion is carried as an affine map in the
Lohner set (exact to first order, since dH/dK_i = 1), not as an interval function (review finding 8). The system

    F(u, kappa) = ( u_{i+1} - G_i(u_i, kappa) )_{i = 0..m-1} = 0                                       (4)

is square: 2 x 18 + (m - 2) x 19 equations and unknowns. Its zeros for fixed kappa are the periodic orbits on the leaf
(the phase is fixed by u_0 in Sigma_up). The period is T = sum of the durations + the two section times.

**The h/j event.** Inside piece A every step enclosure (CAPD's enclosure of all trajectories over the step, widened
by dstar) must have V > -40; inside piece B, V < -40. At the two ends of a piece this strict test cannot hold, because
V = -40 there (review finding 3), and the rule is the monotone one: a segment starting on Sigma_up has V = -40 exactly
at s = 0, and a step whose enclosure meets V = -40 is accepted if W > 0 on the whole step enclosure, so that V is
strictly increasing on that step and V > -40 on (0, h]; by induction over the steps V > -40 on the open segment. Piece B
from Sigma_down likewise with W < 0. The last step of a piece reaches the next section through the patched PoincareMap
with a validation re-run (as `../proof/engine.hpp` does for the ring), with W < 0 (end of A) or W > 0 (end of B) on the
crossing enclosure (monotone crossing; the image lies exactly on V = -40). At the single instants with V = -40 the
model uses the V >= -40 formulas; a set of measure zero does not change a Caratheodory solution. Then the computed
F_hi or F_lo trajectory is the model's trajectory on the whole segment, because the model uses exactly that formula
there. The monotone start rule is implemented in `wrap_pilot.cpp` (argument `monotone`) and piloted from both sections
(section 8); the section end for the comoving field is not yet implemented (the ring engine has it). The
derivative of a chain is the product of the segment derivatives taken between sections, so no saltation matrix is
added: a map that starts on Sigma_down is differentiated along Sigma_down, where the saltation matrix
S = I + (F_lo - F_hi) e_V^T / W acts as the identity (e_V . v = 0). This is the treatment already piloted on the ring
(`../proof/results/stage3_switch.json`: cell, ring2, ring4; the negative control without the switch misses the
reference). The smoothed switch of Erhardt's variant is not used; it is a different model.

**The GHK quotient at 15 mV.** As in `../proof/engine.hpp`: per step the quotient where the enclosure keeps V != 15 mV,
otherwise the degree-24 window polynomial with the rigorous tail bound and the Gronwall inflation (C0 and C1). In the
comoving system the window changes the rows W (through f_V, with the factor kappa) and Ca_ss; `comoving19.hpp`
`windowRows` gives both prefactors, and `wrap_pilot.cpp` applies the bound.

**Existence test.** Krawczyk (or interval Newton) on (4). At a point kappa: a box X around the numerical zero u-bar,

    K(X) = u-bar - C F(u-bar, kappa) + (I - C DF(X, kappa)) (X - u-bar),   K(X) inside int X,

with F(u-bar, kappa) from C0 enclosures of the segments from the points u-bar_i and DF(X, kappa) from C1 enclosures over
the boxes X_i. DF is cyclic block bidiagonal (identity blocks and -DG_i), and C is a floating-point inverse of its
midpoint. **For kappa in an interval [kappa] = kbar + [-delta, delta]** the naive form, with F(u-bar, [kappa]) as an
interval vector and one box X for the whole piece, does not scale (review finding 1): the width of F(u-bar, [kappa]) is
about |d_kappa F| delta in the expanding rows, the product C (box) loses the cancellation that makes the true Newton
correction C d_kappa F delta = -(du/dkappa) delta moderate, and X would have to contain the whole zero curve. The piece
test is therefore written (i) on the tangent predictor u-bar(kappa) = u-bar(kbar) + u'(kbar) (kappa - kbar), u' the
floating-point branch tangent, so that X only holds the second-order deviation, and (ii) with the kappa dependence in
centred (mean-value) form, F(u-bar(kappa), kappa) = F(u-bar(kbar), kbar) + M (kappa - kbar), where the column M encloses
the total kappa-derivative d/dkappa F(u-bar(kappa), kappa) over the piece (from the C1 data with kappa as a state and
the derivative of the predictor) and C is applied to it as a matrix-vector product. The first-order term then nearly
cancels and what remains is of order delta^2 |u''| plus enclosure widths. Success gives, for every kappa in [kappa], a unique zero in
X, hence a periodic travelling wave of (2) with period T(kappa) in an enclosure, and the ring (3) of length
L(kappa) = sqrt(D kappa) T(kappa) carries reentry with speed c = sqrt(D kappa). The minimal period is T because the
chain crosses Sigma_up exactly once (certified on every step: V > -40 throughout piece A, V < -40 throughout piece B).

**Precision.** The conditioning of (4) is governed by the exponential dichotomy of the orbit, not by exp(kappa T): with
segments over which the expansion is e^2 to e^10, the blocks are moderate, and double-interval C1 enclosures may
suffice; the segment length is adaptive (shorter in the upstroke, where the expansion rate is largest). Whether the centre needs multiprecision (as the discrete ring did, `../proof/results/stage3_switch.json`
ring4: 32.4 s per mp0 step) is decided by the residual of the double-interval centre; section 8 measures the widths.

## 5. Interval parameter: a family of ring lengths

Cover a kappa range [kappa_a, kappa_b] by overlapping pieces [kappa_j, kappa_{j+1}], each proved by section 4 (piece
form) with its own box. On each piece kappa -> (u(kappa), T(kappa)) is continuous (the Krawczyk test makes D_u F
invertible on the box, so the implicit function theorem applies).

**Gluing (review finding 2).** Neighbouring pieces must use one node layout (the same durations Delta_i and the same
m_A, m_B), so that their boxes live in the same space; otherwise compare them at the Sigma_up node u_0 (18
coordinates) and push that box through the other layout. With a common layout: let z_j(kappa) and z_{j+1}(kappa) be the
zeros of pieces j and j+1, unique in X_j and X_{j+1}, on the overlap O. If z_j(k*) lies in int X_{j+1} for one k* in O,
then it is a zero in X_{j+1}, so z_j(k*) = z_{j+1}(k*) by uniqueness. The set of kappa in O where z_j = z_{j+1} is closed
(both curves are continuous) and open (where they agree the common point is interior to X_{j+1}, and by continuity
z_j stays in int X_{j+1} nearby, where uniqueness applies again); O is connected, so the curves agree on O. The glued
branch is a continuous curve of travelling waves and L(kappa) = sqrt(D kappa) T(kappa) is continuous.

**Ring lengths.** Every L between the values L(kappa_1), L(kappa_2) at two points of the proved range is a ring length
carrying a wave of the branch (intermediate value theorem; continuity is enough, no monotonicity is needed for
existence). Monotonicity, or a bound on dL/dkappa, is needed only to count the waves for a given L. The family parameter
could equally be L (with kappa an unknown and (3) an extra equation); kappa is preferred because the branch is regular
in kappa through the minimum of L (section 6).

## 6. The minimum ring length: what is well posed

**Two different extrema (corrected 2026-10-02).** The first version of this section put the minimum of L at the fold
of the dispersion relation, where the fast branch meets the slow branch. That is wrong in general. Along the branch,
parameterized by kappa (equivalently by c = sqrt(D kappa)),

    dL/dkappa = L (1/(2 kappa) + T'(kappa)/T),

so at the nose of the dispersion relation, where T is minimal (T' = 0), dL/dkappa = L/(2 kappa) > 0: L is still
decreasing as kappa decreases, and it can be stationary only where T'/T = -1/(2 kappa) < 0, that is, on the slow
branch, past the nose. The numerical branch of section 7 shows exactly this: T has its minimum (about 215.83 ms) near
kappa = 0.537, and L keeps decreasing through it and along the slow branch, at least down to kappa = 0.199
(L = 40.40 mm). Both points are regular points of the branch in kappa (a fold of T or of L is not a fold in kappa).
Numerically, the smallest singular value of the scaled collocation Jacobian does not decrease along the sampled points
(3e-7 to 4e-7 at kappa = 2.17, 0.525, 0.294; its absolute size reflects the scaling of a system with 72,000 unknowns,
not regularity), and the tangent component dT/dkappa varies smoothly (from +90 at kappa = 2.17 through 0 at the nose to
-143 at kappa = 0.199); a fold in kappa would make the tangent turn. The rigorous statement is the Krawczyk test.

What the minimum of L means, where it exists: it is a fold of the ring problem at fixed L. Rings slightly longer
carry two waves of different speeds on this branch near it, rings slightly shorter none (locally). At such a fold one
real eigenvalue of the ring linearization on the leaf generically passes through 0 (a saddle-node of rotating waves),
so the two waves near the fold differ in stability by one real eigenvalue. Which side is stable, if either, is a
spectral question (section 10) and is not claimed.

* **Well posed and provable:** L*_branch = the minimum of L(kappa) over a proved kappa range [kappa_a, kappa_b]. With
  piece enclosures [L_j], L*_branch lies in [min_j inf L_j, min_j sup L_j]. It is an interior minimum (a fold of the
  proved branch) only if L at both ends of the range exceeds that upper bound. If L is monotone on the proved range,
  the statement is only that every L between the end values carries a wave; no minimum is located.
* **L does not tend to 0 along a branch of non-vanishing amplitude (review finding 5).** The first version of this
  bullet allowed "T bounded as c -> 0, so L -> 0"; that case is impossible. From W' = kappa (W - f_V) the only bounded
  (hence the periodic) solution is W(s) = kappa integral_0^infinity e^{-kappa r} f_V(s + r) dr, so (a) |W| <= M := max |f_V|
  over the orbit, (b) the integral of f_V over a period vanishes (V(T) = V(0)), and (c) subtracting the mean
  a = (1 - e^{-kappa T})/(kappa T) of e^{-kappa r} over a period, |W| <= M psi(kappa T) with
  psi(x) = (x/(1 - e^{-x})) integral_0^1 |e^{-x u} - a| du, which is x/4 + O(x^2) for small x. The rising or the falling
  part of V takes at most T/2, so the excursion Delta = Vmax - Vmin <= (T/2) M min(psi(kappa T), 1), and with x = kappa T,
  L = sqrt(D kappa) T = sqrt(D x T) >= sqrt(2 D Delta / M) sqrt(x / min(psi(x), 1)). Numerically
  inf_x x / min(psi(x), 1) = 4 (approached as x -> 0; psi evaluated by quadrature on 600 points of x in [1e-4, 20], not a
  proved inequality), so L >= sqrt(8 D Delta / M). On the slow branch Delta is about 86 mV and M about 20.4 mV/ms (at
  kappa = 0.199), which gives L >= about 2.3 mm: a weak bound, but it excludes L -> 0. The identity (a)-(b) was checked
  numerically on the kappa = 0.199 profile by the reviewer (W from the formula against the profile: 0.6910 against
  0.6884 at s = 5 ms, the difference being the interpolation grid). This derivation is the review's; it has not been
  checked against a paper. What remains open is whether L(kappa) turns up before the branch ends (an interior
  minimum) or decreases towards a positive infimum at the end of the branch (kappa -> 0, or a turning point in kappa, or
  a termination of the branch); only the continuation (section 7) can say, and a proof can only enclose the minimum over
  a proved range.
* **Not provable by this method:** that no reentry exists for L < L*_branch (a global nonexistence statement about all
  solutions, on other branches or not travelling waves at all). The result must say "the shortest ring along this
  branch", not "the shortest ring that sustains reentry".
* **A different number, and the one of physiological interest:** the shortest ring with *stable* reentry. The fast
  branch is expected to lose stability at some L above L*_branch (an oscillatory, alternans-type instability of
  reentry on rings is the classical scenario), and the slow branch is expected to be unstable. The cable simulations
  of `../SCOPING.md` section 3.1 (first-order, h = 0.25 mm) died at L = 100 mm and circulated at 150 mm, while
  travelling waves exist on the branch far below 100 mm: consistent with instability of the short-ring waves, but
  those runs are on a grid and not converged. Locating the stability boundary needs section 10. Until then the text
  must say that stability at the minimum is not claimed.
* **The leaf matters:** L(kappa) and L*_branch depend on H0 (the charge per cell). A second interval parameter H0 is
  possible (the proof is the same with H0 an interval), but the statements above are for H0 = q(y01).

## 7. Numerical travelling waves (floating point; not a proof)

Method: `pde_guess.py` (cable on a grid, first-order Rush-Larsen, h = 0.25 mm, from the N = 16 orbit waveform) gives a
profile; `tw_bvp.py` solves the periodic boundary-value problem of (2) on the leaf H = H0 by Radau IIA collocation
(order 5, two pieces split at the two -40 mV crossings, so no collocation interval contains the h/j switch; an
unfolding parameter mu on K_i' that must come out 0) and continues it in kappa; `tw_branch.py` summarizes. All of it is
floating point; nothing here is a proof. Records: `results/tw_branch.json` (every computed row), `results/tw_profiles.json`
(three profiles), `results/tw_mesh_k2.19136.json` (mesh study), and the solution at kappa = 2.19,
`results/sol_k2.19.npz` (the start of the CAPD pilot).

**Accuracy.** Mesh study at kappa = 2.19136 (M intervals per piece): T = 299.0667 (200), 298.9251 (300), 298.9777 (400),
298.97385 (600), 298.97379 ms (900). The rows below use M = 600 (T to about 1e-4 ms). Newton residuals are 1e-15 to
3e-14 (scaled max norm); |mu| <= 4e-9 (it should vanish; it measures the discretization); H varies by at most 2e-6 mM
along a computed profile.

**The branch** (H0 = 150.44266158 mM, D = 0.154 mm^2/ms):

BRANCH_TABLE

* **Fast branch.** T and L increase with c. At kappa = 2.19 (c = 0.5807 mm/ms) the wave has T = 298.849 ms,
  L = 173.554 mm, Vmax 15.94 mV, maximal dV/ds 98.4 mV/ms (upstroke), and the -40 mV crossings have W = +93.1 mV/ms
  (up) and -1.39 mV/ms (down). V crosses 15 mV twice per period (at s = 4.56 ms with W = +0.91 and at s = 24.82 ms with
  W = -0.019 mV/ms) and stays within 1 mV of 15 mV for 44.3 ms per period (within 8 mV for 104.3 ms): the GHK window
  is a sustained regime, as in the discrete ring.
* **The nose (minimum of T).** T_min = 215.834 ms near kappa = 0.537 (c = 0.2876 mm/ms), quadratic fit through the
  rows at kappa = 0.474, 0.525, 0.576; there L is about 62 mm. Vmax there is 6.9 mV: V never comes within 8 mV of
  15 mV, so the GHK window is not needed near the nose or on the slow branch.
* **Slow branch.** Past the nose T increases again while c keeps decreasing, and L = c T keeps decreasing: 40.40 mm
  at kappa = 0.19907 (c = 0.1751 mm/ms, T = 230.71 ms), the last computed row. Vmax tends to about 6.57 mV, the
  upstroke slows (maximal W 8.1 mV/ms), Na_i rises to 15.8 mM (the leaf fixes the total charge, so the ion balance
  shifts with the rate).
* **Expansion.** The largest real eigenvalue of the 20 x 20 Jacobian along the profile (frozen coefficients, 400
  samples) averages 2.30 per ms at kappa = 2.19 (range 1.15 to 4.57), 0.59 at kappa = 0.525 and 0.26 at kappa = 0.199;
  integrated over a period this crude estimate gives log-expansions of about 683, 128 and 59. Single shooting is
  impossible on the fast branch; the slow branch is far milder.
* **Stiffness.** The most negative eigenvalue reaches -708 per ms at kappa = 2.19 (rest, the m gate), -426 at 0.525
  and -330 at 0.199 (the rest potential rises with Na_i).
* **Grid against continuum.** The h = 0.25 mm grid of `../SCOPING.md` section 3.1 gives T = 344 ms at c = 0.581 mm/ms,
  against 298.98 ms for the continuum wave at the same speed: the grid slows conduction, so the grid runs are not
  quantitative for the continuum.

**Numerical minimum ring length.** MINLEN_PENDING

## 8. The wrapping pilot (CAPD measurements; not a proof)

Program: `wrap_pilot.cpp` (CAPD 6.1.0 with the project patch, C1Rect2Set and C0Rect2Set, order 20, double intervals;
h/j branch certified on every step enclosure; GHK quotient or degree-24 window with the Gronwall inflation, window
switched on within theta = 1 mV of 15 mV), driven by `wrap_run.py`, which also integrates the box centre in floating
point (Radau, rtol 1e-12) and checks that this reference lies in the end enclosure. Wave: kappa = 2.19 exactly
(T = 298.84894 ms, L = 173.5538 mm; section 7). Start boxes: a collocation point of the wave, relative radius r0 per
component, K_i included (the boxes are not on the leaf; a proof inserts K_i from H0 as an affine map, section 4, and
the widths should be re-measured that way once). "|D|" is the infinity norm of the midpoint of the derivative enclosure (an approximation of the expansion of the flow);
"wrapping ratio" is (C0 radius)/(r0 |D|), which stays constant if the enclosure grows only as the flow does. One core,
nice 10. Records: `results/wrap_pilot_2026-10-02.json`.

| run | phase, branch | duration | steps | s per step | mean step | end |D| | wrapping ratio | rel. width of D (big entries) | float reference inside |
|---|---|---|---|---|---|---|---|---|---|
| P1, C1, r0 1e-12 | upstroke from V = -38 mV, piece A | 6.26 ms of 30 requested | 312 (20 window) | 0.095 | 0.020 ms | 2.8e7 | 0.53 at every mark | 1e-9 at 0.6 ms, 1.8e-6 at 3.1 ms, 7.9e-4 at 5.1 ms | yes |
| P2, C1, r0 1e-12 | foot, s = T - 5.5 to T - 0.5 (V from rest to -69.4 mV), piece B | 5 ms | 1,380 | 0.088 | 0.0036 ms | 1.9e5 | 0.13 to 0.14 | 5.4e-6 | yes |
| P3, C1, r0 1e-10 | plateau and repolarization, s = 50, 100, 150 | 2 ms each | 18, 19, 21 | 0.094 to 0.108 | 0.10 to 0.11 ms | | | | yes |
| P3, C1, r0 1e-10 | piece B, V = -49, -82, -83 mV (s = T - 100, T - 60, T - 25) | 2 ms each | 13, 456, 530 | 0.088 to 0.12 | 0.16, 0.0044, 0.0038 ms | 164 (T - 25) | 0.13 | 2.5e-6 | yes |
| P4, C1, dim 21, kappa radius 1e-9 relative | upstroke, as P1 | 4 ms | 203 | 0.108 | 0.020 ms | 1.4e4 at 3 ms | (dominated by the kappa radius) | 1.2e-4 at 3 ms | yes |
| P5, C0, r0 1e-12 | upstroke, as P1 | 4 ms | 209 | 0.034 | 0.019 ms | | | | yes |

Findings (measurements, not a proof):

* **No wrapping.** Through the upstroke the derivative grows by a factor 2.8e7 in 6.26 ms (about e^17) and the C0
  enclosure grows exactly with it: the ratio radius/(r0 |D|) stays at 0.53 from 0.6 ms to the end. In the foot it
  stays at 0.13 to 0.14 while |D| grows to 1.9e5. CAPD's Lohner (doubleton) representation follows the expanding
  direction; the enclosures are as wide as the flow forces them to be and no wider.
* **The derivative enclosure widens like r0 |D|^2.** Its relative width (entries above 1e-3 of the largest) grows
  from 1.6e-9 to 7.9e-4 in P1 while |D| grows from 39 to 2.1e6: relative width = c r0 |D| with c from about 27 to 260
  (P1, r0 = 1.5e-12 in scaled units) and about 22 in the foot (P2). This is the true variation of the derivative over
  the box (second derivative times the image radius r0 |D|), not a loss of accuracy of the representation. With
  |D| = e^{lambda Delta} it ties the segment length to the box radius: relative width of DG_i about c r0 e^{lambda Delta}.
* **The window length is limited by the dynamics, not by the enclosure.** P1 stopped at 6.26 ms because the
  trajectory from the box centre (a collocation point, accurate to the collocation error) left the wave along the
  expanding direction and repolarized early (V fell from 14 mV back to -40 mV); the floating-point trajectory from the
  same point did the same and lies inside the enclosure. The expanding rate on this wave is about 2.3 per ms on
  average (between 1.1 and 4.6 per ms, frozen-coefficient eigenvalues; section 7; P1 measured about 2.7 per ms through
  the upstroke), so a segment of Delta ms multiplies errors by roughly e^{2.3 Delta}. Estimate (not a measurement):
  segments of 2 to 4 ms (factors 1e2 to 1e4; more in the upstroke) give about 75 to 150 segments per period at
  kappa = 2.19; segment lengths should be adaptive. The centres u-bar_i of the proof must come from a Newton iteration
  on the shooting system (4) itself, not from the collocation profile. On the slow branch the expansion per period is
  much smaller (section 7), so fewer segments are needed there.
* **Step size is set by the stiffness of the resting m gate**, as in the discrete ring: 0.0036 to 0.0044 ms near rest
  (V below about -80 mV), 0.02 ms through the upstroke, 0.1 to 0.16 ms on the plateau and in repolarization. The cost
  of a C1 step in 20 dimensions is 0.09 to 0.11 s, a dimension-21 step (kappa as a state) about 14 per cent more, and a
  C0 step about 36 per cent of a C1 step.
* **The GHK window** (20 window steps in P1) adds Gronwall inflations of at most 2.2e-52 (C0) and 2.2e-43 (C1): negligible.
* **kappa as an interval** (P4): a kappa radius of 1e-9 relative (2.2e-9 absolute) dominates the image radius over a
  4 ms upstroke segment: radius/(r0 |D|) is 45 to 52 instead of 0.53 with a point kappa (P1), and the image relative
  width at 4 ms is 1.4e-3 against 1.6e-5 for the point-kappa C0 run P5 from the same box. The kappa pieces must therefore be narrow, or the segments
  shorter, where the sensitivity to kappa is large (section 9).

SWEEP_PENDING

## 9. Cost of the full continuum proof (extrapolated from section 8)

SECTION9_PENDING

## 10. Stability: the spectral problem (plan; nothing computed rigorously)

**The operator.** In the frame moving with the wave, xi = x - c t on R/LZ, U(xi, t) = u(xi + c t, t) solves
U_t = D e_V e_V^T U_xixi + c U_xi + f(U). The wave is the steady state Phi(xi) = phi(-xi/c). Its linearization

    lambda v = D e_V e_V^T v_xixi + c v_xi + Df(Phi) v + (jump terms at the two switch points),             (5)

with v L-periodic in xi. Only V diffuses; the 18 gate and concentration rows are transport equations. The jump terms
are not optional: f_h and f_j are discontinuous in V at -40 mV, so d f / dV contains (F_hi - F_lo) delta(V + 40), which
along the wave is a point mass at the two crossings. Written in the wave time s (d/dxi = -(1/c) d/ds) problem (5) is
the linear 20-dimensional periodic ODE

    v' = J(s) v + lambda B v,   B = -I on the 18 gate and concentration rows, B[W, V] = kappa, B[V, .] = 0,        (6)

on [0, T] with v(T) = v(0), where J is the Jacobian of the comoving field (2) on each piece and the solution jumps by
the saltation matrix S = I + (F_+ - F_-) e_V^T / W at the two sections (the same matrix as for the time-T variational
equation, independent of lambda). lambda is an eigenvalue iff the monodromy M(lambda) of (6) (with the two jumps) has
eigenvalue 1. lambda = 0 is an eigenvalue with eigenfunction phi' (translation), and the charge invariant adds a second
neutral direction (across leaves), so 0 has algebraic multiplicity at least 2; on the leaf, at least 1.

**Structure of the spectrum (expected; to be verified).** On the ring the operator in (5) (second order in V, first
order in the other 18 components, periodic) has compact resolvent, so its spectrum consists of isolated eigenvalues of
finite multiplicity; there is no essential spectrum in the usual sense. For |Im lambda| large the gate and
concentration rows dominate (6), and the eigenvalues lie asymptotically along vertical lines
Re lambda = (1/T) log |m_j|, where m_j are the
multipliers over one period of the 18 transport rows alone with V frozen along the wave (each gate relaxes, so
|m_j| < 1 is expected; the concentrations relax slowly, so some of these lines lie very close to the imaginary axis: a
rough hand estimate for K_i, through E_K in i_K1 alone, gives a relaxation rate of about 1e-4 per ms; not computed).
If some |m_j| >= 1 the wave is unstable at arbitrarily high wavenumbers, and m_j = -1 (an alternans-type onset of the
driven cell) would put a whole line of eigenvalues on the imaginary axis at once. The leaf removes only the global
charge: the local charge q(x) is not conserved (dq/dt = -k D V_xx), so the slow ionic modes give eigenvalues close to
the axis at every wavenumber, and a numerical "all eigenvalues in Re lambda < 0" must be reported with its margin.
The eigenvalues are not confined to a sector; the linearization does not generate an analytic or eventually compact
semigroup (the transport rows generate a group), so the growth bound of the semigroup can exceed the spectral bound,
and the spectral mapping property must be shown separately (for example by splitting off the transport rows, whose own
growth bound is computable, from a part that is compact for t > 0).

**What "spectral stability" can mean here, and what it cannot.** Spectral stability on the leaf: every eigenvalue
other than the translation eigenvalue 0 has Re lambda < 0, with a margin that bounds the asymptotic lines away from the
axis. It does not by itself give nonlinear orbital stability: (a) the semigroup is not analytic or eventually compact
(see above); (b) because of the h/j switch the time-T map of the PDE is not C^1 in the usual sense near the crossing
curves (a perturbation can make a crossing non-transversal). A nonlinear statement needs a separate argument
(for example a Lipschitz contraction estimate in L^infinity for the time-T map). The owner's plan asks for existence plus
spectral stability first; the statement must stop there.

**Numerical route (next step).** Discretize (6) with the same collocation as the wave (`tw_bvp.py`), giving a sparse
generalized eigenproblem (A0 + lambda A1) x = 0 with the two saltation jumps in the continuity rows; compute the
eigenvalues nearest a few shifts by sparse shift-and-invert. Along the branch this locates the first crossing of the
imaginary axis (the numerical shortest stable ring) and checks the expected real crossing at the fold of L.

**Rigorous route (later).** (i) A priori exclusion of |lambda| > R in the closed right half plane from the structure
of (6) (the transport rows contract; the diffusion row is a regular perturbation for large |lambda|). (ii) In the
compact region left, count zeros of a characteristic function by the argument principle, with M(lambda) computed by
interval multiple shooting along the same segments as section 4. The expanding direction (multiplier of order
e^{kappa T}) makes det(M(lambda) - I) unusable directly; a multiple-shooting determinant (the cyclic block matrix of (4)
with lambda) or exterior-power (compound matrix) formulation is needed. Not started.

## 11. Files

| file | role |
|---|---|
| `tw_model.py` | comoving field (2), first integral H, finite-difference Jacobian (floating point) |
| `pde_guess.py` | initial profile from a cable simulation on a grid (`../ring_rl.c`) |
| `tw_bvp.py` | collocation of the periodic wave on the leaf, continuation in kappa, mesh study |
| `tw_branch.py` | profile summaries (crossings, window time, stiffness, expansion) and the branch table with the minima of T and L |
| `tw_shooting.py` | the multiple-shooting system (4) at a numerical wave in floating point: residual, segment expansion, conditioning of DF |
| `tw_spectrum.py` | eigenvalues of the discretized linearization (6) near given shifts (floating point) |
| `comoving19.hpp` | CAPD field of (2) (dimension 20, or 21 with kappa as a state), the window rows, H |
| `comoving_field.cpp`, `check_comoving_field.py` | CAPD field against `tw_model.py` at 300 points, with a negative control |
| `wrap_pilot.cpp`, `wrap_run.py` | CAPD segment enclosures (C0, C1, multiprecision C0) with the branch and window certification and the Gronwall inflation; measurement driver with a floating-point reference |
| `results/` | the records quoted in sections 7 to 9 |

Build (CAPD as in `../RUNBOOK.md` section 3.1):

```
g++ -O2 -std=c++17 wrap_pilot.cpp -o $HOME/bin/wrap_pilot $($HOME/capd-install/bin/capd-config --cflags --libs)
g++ -O2 -std=c++17 comoving_field.cpp -o $HOME/bin/comoving_field $($HOME/capd-install/bin/capd-config --cflags --libs)
```
