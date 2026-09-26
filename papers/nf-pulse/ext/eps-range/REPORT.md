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

All numbers in this section are numerical observations about the method, not theorems.

**Width of the subintervals.** The certified widths (from `table.py --condensed` and `data/certs/`) shrink as eps
decreases: mean width about 9e-5 on [0.080, 0.085), 1.0e-4 to 1.5e-4 on [0.085, 0.100), 2.1e-4 to 2.4e-4 on
[0.100, 0.120), with the narrowest pieces 2.3e-5 to 5e-5. The cost is about 70 to 90 s per attempt on one core
(35 s for the numerical bisection of kappa*, the rest for the chain), so the sweep of [0.08, 0.12] took about three
hours on four cores including failed attempts.

**What limits the width (measured on eps in [0.0998, 0.1002] and neighbours).** Every failure seen is at a
covering check during the back of the pulse, where U falls from about 0.6 to below 0 (s = 11 to 18), or shortly
after it. There, three things happen at once:
- the u-direction barely expands: the face images exceed the u-size by factors 1.0 to 1.5 per unit of time, against
  2 to 2.6 elsewhere;
- the vector field F and the u-direction become nearly parallel (cos(F, v) = 0.986 at s = 11), so the time-shift
  (phase) uncertainty and the u-coordinate are poorly separated;
- the phase uncertainty (the slab extent along F) and the other slab sizes scale like w^2 (ratio 4.0 when w
  doubles, measured at s = 10 for w = 1e-4, 2e-4, 4e-4), while the wrapping error of the enclosure grows faster,
  so at some w the face images no longer clear the h-set.
Cutting the sets into 2 x 2 or 4 x 4 pieces, longer or shorter segments (0.25 to 3) and smaller Taylor tolerances
did not move this front bottleneck by more than one unit of time. A time rescaling quadratic in eps (to follow the
second-order phase drift) and Poincare-type sections are the natural next steps; neither is implemented.

**Below eps = 0.08** (single attempts, `probe_limits.sh`, `data/limits.txt`): eps = 0.07 certifies with width
5e-5 (block entry at s = 89) but not 1e-4; eps = 0.06 fails at s = 18 with widths 1e-4 and 5e-5; eps = 0.05 fails at
s = 8 with widths 1e-4, 5e-5 and 2.5e-5. The approach to the rest state is slower for small eps (the weakest stable
eigenvalue is roughly proportional to eps), so the chain is longer (block entry at s = 71 to 75 near eps = 0.08
against 50 to 54 near eps = 0.12) and the isolating block has to shrink (U-range 0.03 at eps = 0.05, against 0.05
on [0.08, 0.12]). Extending the range downward is a matter of cost at eps = 0.07 and needs a better method at 0.05.

**Above eps = 0.12**: eps = 0.13, 0.14 and 0.15 certify with width 2e-4 (block entry at s = 48, 44, 42); eps = 0.15
fails with width 4e-4; eps = 0.17 fails at s = 5 with width 2e-4. **At eps of about 0.176 the method stops for a
structural reason:** along the numerical pulse branch the two weaker stable eigenvalues of the rest state meet and
become complex (the roots of p at c*(0.1775) are 0.9684, -0.3977 +- 0.0297 i, -1.1886), and the block of
`../../code/block.py` is built on a real eigenbasis. The probes at eps = 0.19, 0.20, 0.21 and 0.215 stop there.
Near eps = 0.176 the two real eigenvalues are close (at 0.175: -0.4304 and -0.3608), which makes the block
coordinates ill conditioned; this is a likely reason for the failure at 0.17. Further up, the numerical
continuation of the fast pulse loses its bracket between eps = 0.220 (c* = 0.8196, dropping steeply) and 0.225
(`data/cstar_scan.txt`), consistent with a fold where the fast and slow pulses meet; near a fold kappa*(eps) has
unbounded derivative and no window of this kind can follow it.

## Negative controls

- **Inside every proof run** (certificates written after the adversarial check): at each stage, the rigorous
  covering test is re-run with the slab of the next h-set made 2 per cent thinner and with its u-size made 2 per
  cent longer than the face images allow; both must be refused, and at the final stage the block test is re-run
  with rho divided by 100 and must be refused. A certificate is PASS only if all of them were refused
  (`negative_checks` in the JSON; `run_checks.sh` checks it for the rerun).
- **Speed window off the pulse** (`--shift 3` and `--shift -3`, eps in [0.0998, 0.1002]): the kappa window is moved
  by three half widths; both runs FAIL at s = 1, the two ends of the curve of initial points no longer separate.
- **Both ends in the same cone** (`--samecone 1` and `--samecone -1`, the analogue of the swapped brackets of the
  original): no block entry is accepted and the runs FAIL.
- **Mutation tests of the adversarial check** (below): errors in the eps-derivative of the integrator, a flipped
  face test and a slab 1 per cent too thin are refused. Two unsound changes were not detected before the fixes
  (a narrowed eps0 range, a subdivision leaving gaps); both are now guarded by rigorous assertions (`setup`,
  `split`) and by `table.py`, which recomputes the eps0 range of every certificate from its exact numbers.

## Adversarial check

An independent subagent reviewed the work adversarially on a copy of the folder (it changed nothing in the
repository and used at most two processes, while the sweep ran). **Its verdict: "sound with caveats".** It found
no error that invalidates a stored PASS certificate; it found missing safeguards, which are now fixed.

What it did:
- Reran from scratch in a copy, with the numerical cache and all certificates deleted: `chain.py 0.0998 0.1002
  1.1027477 --dk 2e-5` gives PASS (58 stages, one 2 x 2 split at s = 12, block entry at s = 58 with y1 in
  [+/- 9.07e-3] against r = 0.0291 and |y'| = 0.00345 against rho = 0.00727). It reran the stored certificate
  `eps_0.080000_0.080100.json` with the driver's arguments: PASS, identical in the exact dyadic data (q0, s1, dk,
  e_m, w), the kappa box, the eigenvalue enclosure, the entrance margins, the block matrix, the 75 stages and the
  final block record.
- Recomputed decisive numbers independently: the block conditions of the rerun certificate in mpmath interval
  arithmetic (another library; cone matrix positive definite by interval Cholesky at both ends of S', entrance
  bounds -0.05787 and -0.04673, U-range bound 0.0486589 < 0.05: certified); the initial set against the original
  `manifold.py` (15 samples of (eps0, zeta0), all enclosed); stage 0 with the original 6D integrator at sample
  points (u = +-1.32 at the two ends, max |s| <= 0.24, in agreement with the chain).
- Mutation tests: dropping the eps-derivative in the Taylor jet, flipping a face inequality, a slab 1 per cent too
  thin, or evaluating the Lohner Jacobian at the centre only all make the proof FAIL. Dropping the Lagrange
  remainder was caught only by a test; halving the eps0 range and a subdivision with gaps passed silently; removing
  the second-order remainder of Y = S(U) passed silently (the remainder is small at the sizes used).

Findings and what was done:
1. (major, safeguard) The eps0 range was never checked against E. Fixed: `setup` asserts in ball arithmetic that
   the eps0 of both ends of E lie in the range used (and in the range a 4-piece split covers); `table.py`
   recomputes it exactly from the recorded dyadic centre and half width for every certificate.
2. (major, safeguard) Nothing checked that `split` covers the set. Fixed: `split` asserts the coverage exactly.
3. (minor) After a split in the eps column the pieces covered [-(1 + delta/k), 1 + delta/k], not the full range
   [-(1 + delta), 1 + delta]. E itself stayed covered, since delta includes a padding of 2^-100 against a needed
   rounding of about 1e-36; `table.py` now checks this margin for every certificate. The code now scales the
   offsets so that the pieces cover the full range.
4. (minor) The negative controls failed for side reasons and did not exercise the rigorous tests. Fixed: in-run
   negative checks (above) and controls that require the specific failure reason.
5. (minor) The first integrator test only checked overlap. Fixed: it now requires the enclosure to contain a
   320-bit reference solution, and a new test checks that the Lohner set of an h-set contains sample points with
   Y = S(U) exactly, at the corners where the second-order remainder matters.
6. (minor) `table.py` did not exclude negative-control runs, and certificates carried no code version. Fixed: both
   (certificates written after the fix carry sha256 prefixes of the programs).
7. (minor) Centres and eps-shifts of the h-sets were stored only as decimals. Fixed: also as exact dyadics.
8. (minor) The "window width at fixed eps" column is a floating-point midpoint. Now labelled approximate; the
   brackets c1, c2 are outward rounded.
9. (minor) This report cited a log file for the original sensitivity; now it cites
   `../../data/proof_interval_final.json`, and the limit of a single long run is marked as a heuristic estimate.
10. (remark) `nfcore._EPS` is global state; the order of calls is safe. An assertion now checks it before the
    manifold and block certification.
11. (remark, original code) the comment in `../../code/manifold.py` `zbound` ("all other terms of p are >= 0") is
    false, since k (s - 1) mu and -eps k^2 are negative; the bound p(mu) >= (mu^2 - 1) mu^2 still holds for mu >= 1,
    since the difference is k mu (mu^2 - (1 - s)) + eps k^2 (mu^2 - 1) >= 0. Not changed here (outside this folder).
12. (remark) `--shift X` failing for |X| > 1 is an expectation, not a guarantee, because kappa*(eps) is curved.

One of the fixes was itself wrong at first: the coverage assertion of `split` (finding 2) compared rounded balls,
which cannot certify an equality, so from 04:45 to 05:48 UTC every attempt that needed a subdivision failed with an
`AssertionError`. That only made valid attempts FAIL (42 of them; their certificates were deleted and the attempts
repeated); it could not make anything PASS. The assertion now checks the coverage in exact rationals.

Certificates written before the fixes (they have no `negative_checks` and no `code_sha256_16`) come from code that
differs from the present one only in these safeguards and in the split offsets of finding 3. The reviewer's rerun
of one of them reproduced it exactly; __OLDRERUN__

## Reproduce

From this folder (python-flint 0.9.0, mpmath, numpy as in `../../code/requirements.txt`):

```
sh run_checks.sh                                   # about 3 minutes: tests, one subinterval proof from scratch,
                                                   # its in-run negative checks, the negative controls, the table
python3 chain.py 0.0998 0.1002 1.1027477 --dk 2e-5 --out cert.json      # one subinterval (about 1.5 minutes)
python3 run_range.py 0.08 0.12 --w0 1.5e-4 --tag X # the whole sweep (hours on four cores); resumable: attempts whose
                                                   # certificate exists in data/certs/ are not recomputed
python3 table.py --from 0.08 --to 0.12 --md data/speed_table.md          # coverage and speed table
```

`chain.py` takes the numerical kappa* from `data/pulse_numerics.json` when present; delete that file to recompute
it by bisection (about 35 s per subinterval). The certificate of every attempt, PASS or FAIL, is kept in
`data/certs/`; `table.py` uses only PASS certificates that are not negative-control runs and, for the certificates
written after the safeguards of the adversarial check were added, only those whose in-run negative checks were
all refused.
