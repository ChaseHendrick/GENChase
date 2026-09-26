# The fast pulse for a range of recovery rates

Extension of the computer-assisted proof in `papers/nf-pulse/` (fixed eps = 1/10) to an interval of eps,
keeping beta = 20, theta = 1/4, gamma = 0 and the kernel w(x) = e^(-|x|)/2. Not independently reviewed
beyond the adversarial check recorded at the end.

## Outcome

__OUTCOME__

## The theorem

__THEOREM__

## Why the original proof could not simply be run with eps as a ball

**The code.** `nfcore.py` stores eps as the rational `_EPS` and hands `arb(_EPS)` to every caller through
`params()`; `taylor()` and `vfield()` take eps as an argument. Setting `nfcore._EPS` to a ball is accepted, and
then `certify_rest.charpoly_coeffs`, `manifold.validate` (through `params()` and `zbound`) and `block.check`
(through `params()`) all give statements valid for every eps in the ball. Three places are not uniform in eps:
`block.setup()` computes the block coordinates from eps = 0.1 and `C_REF` in floating point (harmless for rigour,
since `check()` certifies whatever matrix it is given, but the block has to be recomputed near other eps);
`lohner.py` has no derivative with respect to eps, so a ball of eps would be carried only in the box part of the
Lohner set; and `prove_pulse.py` and `certify_rest.py` hard-code the speeds c1, c2 of eps = 1/10. The analytic
parts are uniform: R1 (the rest state (0, S(0), S(0), 0) does not depend on eps when gamma = 0), R2 (s = S'(0)
does not depend on eps) and R3 (i), (ii) (Descartes' rule and the imaginary-axis argument need only s < 1,
kappa > 0 and eps > 0).

**The obstruction (numerical, measured).** The original interval run needs every orbit with c in [c1, c2] to be
in the block at xi = 53. Its certificate `../../data/proof_interval_final.json` shows how strongly the orbit depends
on c: the speed interval has width 1e-25 (radius 3.0e-25), and at xi = 53 the unstable block coordinate y1 of the
enclosure is `[+/- 3.99e-4]`, a sensitivity of about 4e21 per unit of c. With the block half length r = 0.029,
the speeds whose orbit is in the block at xi = 53 form an interval of width of order 1e-23 around c*(eps).
Numerically dc*/deps is about -1.2 at eps = 0.1 (`data/cstar_scan.txt`), so a rectangle E_k x [c1, c2] can only
pass if |E_k| is of order 1e-23: the rectangle formulation of the task cannot be carried out with this block and
this time. A bracket that follows c*(eps) linearly does not rescue a single long run either: by a heuristic
estimate (not a computation), a first-order (Lohner) enclosure of a family of width w in eps carries errors of
order w^2 that the same factor then amplifies, so w^2 x 4e21 < 0.03 limits w to a few times 1e-12. Below, the
rectangle is replaced by a speed window that moves with eps, and the single long run by a chain of covering
relations that resets the enclosure every unit of time.

## The method

All programs are in this folder; they import the original modules from `../../code` and change none of them.

- **`lohner7.py`**: the C^0-Lohner integrator of `../../code/lohner.py` with eps as a seventh state (eps' = 0) and
  its derivative in the Taylor jet, so the dependence on eps is carried linearly; and an optional **time
  rescaling** z' = r(eps) F(z), r = 1 + b (eps - e_m), constant along each orbit. The rescaled flow has the same
  orbits; it lets orbits of different eps be compared at the same phase of the pulse instead of at the same time.
- **`manifold_ad.py`**: the unstable-manifold point P(1/4; eps, kappa) of `../../code/manifold.py` with its
  gradient in (eps, kappa) by forward automatic differentiation in ball arithmetic (the eigenvalue through the
  implicit function theorem), for the mean value form of the initial set.
- **`chain.py`**: the proof for one subinterval E = [e_lo, e_hi]. Write eps = e_m + w eps0 with e_m, w the
  rounded (exact dyadic) midpoint and half width, |eps0| <= 1 + delta on E (delta covers the rounding). The speed
  window is kappa = 1/c in q0 + s1 eps0 + dk [-1, 1], with q0, s1 exact dyadics taken from the numerical pulse.
  Checked in ball arithmetic, for all eps in E at once:
  - **R**: s = S'(0) < 1, kappa > 0, eps > 0 on the box, the unstable eigenvalue enclosed and simple.
  - **M**: the unstable manifold of `manifold.py` validated (order 80, tail bound) on the whole (eps, kappa) box.
  - **B**: the isolating block of `block.py` (cone condition and entrance condition) on the whole box, with
    coordinates from the eigenvectors at the centre and U-range the largest of 0.05, 0.04, ... that certifies.
  - **C**: a chain of covering relations with one unstable direction (Zgliczynski and Gidea's h-sets, in the
    form made precise below). For each eps, N_i(eps) = { c_i + eps0 d_i + M_i (u, s) : |u| <= 1, |s_j| <= 1 } in
    (U, V, Q, P, kappa), with Y = S(U). Every unit of (rescaled) time: the image of N_i(eps) lies in the slab
    |s| < 1 of N_(i+1)(eps), the face u = +1 maps to u > 1 and the face u = -1 to u < -1. The first stage starts
    from the curve of initial points P(1/4; eps, kappa), kappa in the window; the last stage maps N_m(eps) into
    the interior of the block with its two faces in the cones K+ and K- (one each).
  The sets are chosen by the program (centres and eps-shifts from the numerical pulse in `pulse_num.py`, the
  u-direction from the enclosure, the vector field kept as a slab direction, sizes from the enclosure); every
  inclusion is then verified rigorously. A segment that fails is recomputed with the set cut into 2 x 2 or 4 x 4
  pieces in (u, eps0).
- **`pulse_num.py`** (numerical only): kappa*(e_m) by bisection on the escape classification of
  `../../code/shoot_hp.py` to a bracket of about 2e-41, and a tracker of the pulse point and its tangents in eps and
  kappa. A wrong number here can only make a check fail.
- **`run_range.py`** covers an eps range by subintervals (adaptive width, four workers); **`table.py`** reads the
  certificates, checks the coverage exactly (rational endpoints) and computes the speed brackets.

### Why the checks give a pulse (the argument, for one fixed eps in E)

Let f_0 be the rescaled flow over the first segment and g(zeta) = (P(1/4; eps, kappa(zeta)), kappa(zeta)),
kappa(zeta) = q0 + s1 eps0 + dk zeta, zeta in [-1, 1]. The stage-0 check gives f_0(g(zeta)) in the slab of N_1 for
every zeta, u > 1 at zeta = 1 and u < -1 at zeta = -1. Put h_1 = f_0 o g, b_1 = min{zeta : u(h_1(zeta)) >= 1} and
a_1 = max{zeta <= b_1 : u(h_1(zeta)) <= -1}; then h_1 maps [a_1, b_1] into N_1, with u = -1 at a_1 and u = 1 at b_1.
If h_i maps [a_i, b_i] into N_i with its ends on the two u-faces, the check of stage i gives h_(i+1) = f_i o h_i in
the slab of N_(i+1) with u < -1 at a_i and u > 1 at b_i, and the same construction gives [a_(i+1), b_(i+1)] inside
[a_i, b_i]. At the last stage x(zeta) = f_m(h_m(zeta)) lies in the interior of the block B for every zeta in
[a_m, b_m], x(a_m) in one cone and x(b_m) in the other. From here the argument is the one of the original proof:
the sets A+ and A- of zeta whose orbit from x(zeta) enters K+ (respectively K-) before leaving B are open (the
cones are open, the orbits start in the interior of B, and a boundary point of B with L <= 0 is a strict entrance
point), disjoint (the cones are forward invariant inside B) and nonempty, so some zeta* in (a_m, b_m) is in
neither; its orbit never leaves B and tends to the rest state, and backward in time it tends to the rest state
along the unstable manifold. With c = 1/kappa(zeta*) this homoclinic orbit is a travelling pulse, by the reduction
of the original README (a bounded Q = w * S(U) is unique). The time rescaling does not change orbits, only the
times at which they are compared.

What this argument uses and the original does not: continuity of each segment map in zeta (it is a flow map of a
smooth field); and that the checks hold for the fixed eps, which they do because each enclosure contains every
eps in E. The block lemma itself (cone invariance, strict entrance, convergence) is the one of `../../code/block.py`,
whose written proof the original README lists as still to be done.

## What is rigorous and what is numerical

- **Proved by computer (ball arithmetic, python-flint 0.9.0 / Arb):** for every subinterval in the table, the
  statements R, M, B and C above, for all eps in the subinterval; the coverage of the union (exact rational
  endpoints, `table.py`); the speed brackets (outward rounded).
- **Numerical, used only to choose sets:** kappa*(e_m), kappa*'(e_m), the pulse centres and eps-shifts, the time
  rescaling factors, the sizes of the h-sets, `data/cstar_scan.txt` and `data/pulse_numerics.json`.
- **Not proved here:** uniqueness of the pulse for each eps, stability, anything about eps outside the table, the
  written proofs that the original README lists as missing (block lemma, shooting argument, manifold tail, reduction).

## Speed enclosures

__TABLE__

## Where and why the method stops

__LIMITS__

## Negative controls

__NEGCTRL__

## Adversarial check

__CHECK__

## Reproduce

__COMMANDS__
