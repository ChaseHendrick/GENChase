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
source with K_i = 138.3, `tp06_19d.Y0`). A ring prepared at rest in that state and excited by a stimulus carried by K
(author convention) has exactly this charge, so its reentry, if it settles to a travelling wave, lies on this leaf.
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
and nothing is lost by dropping it. The system

    F(u, kappa) = ( u_{i+1} - G_i(u_i, kappa) )_{i = 0..m-1} = 0                                       (4)

is square: 2 x 18 + (m - 2) x 19 equations and unknowns. Its zeros for fixed kappa are the periodic orbits on the leaf
(the phase is fixed by u_0 in Sigma_up). The period is T = sum of the durations + the two section times.

**The h/j event.** A segment of piece A is valid only if V > -40 on every step enclosure (CAPD's enclosure of all
trajectories over the step), and its last step reaches Sigma_down with W < 0 on the crossing enclosure (monotone
crossing; the image lies exactly on V = -40). Piece B likewise with V < -40 and W > 0. Then the computed F_hi or F_lo
trajectory is the model's trajectory on the whole segment, because the model uses exactly that formula there. The
derivative of a chain is the product of the segment derivatives taken between sections, so no saltation matrix is
added: a map that starts on Sigma_down is differentiated along Sigma_down, where the saltation matrix
S = I + (F_lo - F_hi) e_V^T / W acts as the identity (e_V . v = 0). This is the treatment already piloted on the ring
(`../proof/results/stage3_switch.json`: cell, ring2, ring4; the negative control without the switch misses the
reference). The smoothed switch of Erhardt's variant is not used; it is a different model.

**The GHK quotient at 15 mV.** As in `../proof/engine.hpp`: per step the quotient where the enclosure keeps V != 15 mV,
otherwise the degree-24 window polynomial with the rigorous tail bound and the Gronwall inflation (C0 and C1). In the
comoving system the window changes the rows W (through f_V, with the factor kappa) and Ca_ss; `comoving19.hpp`
`windowRows` gives both prefactors, and `wrap_pilot.cpp` applies the bound.

**Existence test.** Krawczyk (or interval Newton) on (4), on a box X around the numerical zero u-bar, for kappa in an
interval [kappa]:

    K(X) = u-bar - C F(u-bar, [kappa]) + (I - C DF(X, [kappa])) (X - u-bar),   K(X) inside int X,

with F(u-bar, [kappa]) from C0 enclosures of the segments from the points u-bar_i (kappa as a state over [kappa]) and
DF(X, [kappa]) from C1 enclosures over the boxes X_i x [kappa]. DF is cyclic block bidiagonal (identity blocks and
-DG_i), and C is a floating-point inverse of its midpoint. Success gives, for every kappa in [kappa], a unique zero in
X, hence a periodic travelling wave of (2) with period T(kappa) in an enclosure, and the ring (3) of length
L(kappa) = sqrt(D kappa) T(kappa) carries reentry with speed c = sqrt(D kappa). The minimal period is T because the
chain crosses Sigma_up exactly once (certified on every step: V > -40 throughout piece A, V < -40 throughout piece B).

**Precision.** The conditioning of (4) is governed by the exponential dichotomy of the orbit, not by exp(kappa T): with
segments over which the expansion is e^5 to e^10, the blocks are moderate, and double-interval C1 enclosures may
suffice. Whether the centre needs multiprecision (as the discrete ring did, `../proof/results/stage3_switch.json`
ring4: 32.4 s per mp0 step) is decided by the residual of the double-interval centre; section 8 measures the widths.

## 5. Interval parameter: a family of ring lengths

Cover a kappa range [kappa_a, kappa_b] by overlapping pieces [kappa_j, kappa_{j+1}], each proved by section 4 with its
own box; consecutive pieces are glued by uniqueness (the zero of the overlap lies in both boxes), as the Fourier branch
of this study does (`../../fourier/branch.py`). On each piece kappa -> (u(kappa), T(kappa)) is continuous (the
Krawczyk test makes D_u F invertible on the box, so the implicit function theorem applies), so the glued branch is a
continuous curve of travelling waves and L(kappa) = sqrt(D kappa) T(kappa) is continuous. Every L between the
enclosures at the ends of a monotone stretch is then a ring length with reentry (intermediate value theorem). The
family parameter could equally be L (with kappa an unknown and (3) an extra equation); kappa is preferred because the
branch is regular in kappa through the minimum of L (section 6).

## 6. The minimum ring length: what is well posed

Numerically (section 7) L(kappa) has an interior minimum on the branch: the fold of the dispersion relation, where the
fast branch (larger c) meets the slow branch (smaller c). In kappa the branch passes through this point regularly
(a fold in L is not a fold in kappa), so the pieces of section 5 cover it with no singularity.

* **Well posed and provable:** L*_branch = min of L(kappa) over the proved kappa range. With piece enclosures [L_j],
  L*_branch lies in [min_j inf L_j, min_j sup L_j]. If L at both ends of the range exceeds that upper bound, the minimum
  is interior: a fold of the proved branch.
* **Not provable by this method:** that no reentry exists for L < L*_branch (a global nonexistence statement about all
  solutions, on other branches or not travelling waves at all). The result must say "the shortest ring along this
  branch", not "the shortest ring that sustains reentry".
* **A different number:** the shortest ring with *stable* reentry. On the fast branch near the fold the wave is
  expected to lose stability through an oscillatory instability at some L above L*_branch (the alternans-type
  instability of reentry on rings), and the slow branch is expected to be unstable. Locating that needs the spectral
  problem (section 10). Until then the minimum-length target is the fold of the existence branch, and the text must say
  that stability there is not claimed.
* **The leaf matters:** L*_branch depends on H0 (the charge per cell). A second interval parameter H0 is possible
  (the proof is the same with H0 an interval), but the statement above is for H0 = q(y01).
