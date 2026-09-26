# Referee verdict: Theorem 2 (explicit horseshoe at E = 0), research/double-pendulum

Verdict: CONFIRMED WITH CAVEATS. The shipped config verifies. The mathematics in REPORT 4.4a is sound.
Two defects are in the checker, not in the result. One is a small rigor gap that I repaired and reran. The other
is a structural weakness that lets a false claim pass on a mutated config. The shipped config is not affected by it.

Everything here was done in check2/, on copies. Nothing under /home/user/GENChase was modified.

## 1. Reruns (rigorous, CAPD interval arithmetic)

| run | result | time (4 cores) |
|---|---|---|
| `hc horseshoe_E0.cfg 4 16 4` (the shipped setting) | ALL VERIFIED. Every line except the header is identical to data/horseshoe_E0.log | 4m53 |
| `hc horseshoe_E0.cfg 4 32 4` (32 pieces per edge) | ALL VERIFIED, 24/24 covers, M21=>N midline max abs(y) 0.492 | 6m04 |
| `hc_fix` (gap A repaired, 16 pieces) | ALL VERIFIED, same midline values | about 5 min |

The bounds reproduce: r > 1.106950245016, log r > 0.101608707, Tmax <= 7.355385352 and flow entropy > 0.013814192.
Python/mpmath gives r = 1.1069502450168822616 and log r = 0.10160870693. The numerical eigenvalue of the 23x23
adjacency matrix built from the trans lines is 1.10695024501688.

## 2. Code against ZG Theorem 16 (u = 1)

- (76). ZG asks only that the midline image lies in int(S^l cup M cup S^r). The code asks for the stronger
  condition abs(y) < 1 over the whole midline. That is sound. The midline is B_u x {q0} with q0 = 0, and it is
  covered by contiguous double-exact pieces with no gaps.
- (77). M+ is {abs(x) <= 1, abs(y) = 1}. A box meets M+ exactly when its x-interval meets [-1, 1] and its
  y-interval contains +1 or -1, so the kind-3 test is the right test for box enclosures. The kind-3 pieces
  cover the whole of [-1,1]^2: the endpoints are computed by identical expressions, bisection uses a shared
  midpoint, and any unresolved piece counts as a failure.
- (78)/(79). Both edges are covered. The flags require every piece of an edge to lie strictly beyond +1 or -1,
  and `edges` requires a consistent pairing.
- Continuity. CAPD throws on a missing return or a non-transversal return, and pieces that throw are split or
  fail. P is therefore defined and continuous on each whole set.
- Mean-value form. c0 = B_Y^-1 (P(zc) + 2 pi k - c_Y) is a C^0 enclosure at a point. J = B_Y^-1 Df B_X is formed
  with interval products. Df is DP4 restricted to rows (t2, p2) times the lift tangent L = (1, 0; a, b; 0, 1),
  with a and b enclosed over the whole piece. The 4D initial set contains the lifted piece, since the p1
  remainder `rem` encloses the second-order part. `computeDP` includes the return-time correction.
  `liftable` enforces w > 0, so dt1/dt > 0 and the square root is defined. The 2 pi k shift enters only c0,
  which is correct because the field is 2 pi-periodic in t2.
- **Gap A (small rigor gap, repaired).** zc is rounded to a double. On edge pieces and midline pieces the
  degenerate coordinate of rrl is then a tiny interval that does not contain 0. The observed values were
  rrl[0] = [7.5687212e-10, 7.5687301e-10] on an M21 edge and rrl[1] = [3.18e-7, 3.18e-7] on a midline piece.
  As a result, the set on which CAPD encloses DP does not contain zc or the mean-value segment from zc. The
  discrepancy is about 1e-15 in phase space, so it is harmless in practice, but strictly the MVT hypothesis
  fails. The fix is `rrl[q] = intervalHull(rrl[q], 0)`. With the fix, all 24 relations still verify
  (runfix.log).
- Disjointness. Boxes are tested in both frames over the lifts k-1, k, k+1, and the sets are about 1e-5 in
  size. This is correct.
- Tmax. CAPD's `returnTime` is documented as a "bound for return time". It is taken over the kind-3 pieces,
  which cover each source set, and every set is a source. This is correct. It bounds the first crossing that
  CAPD detects, and the flow bound does not need that crossing to be the first return.
- **Weakness B (false claims can pass).** The transition graph and the loop length are hard-coded from the
  number of sets (`len = nM + 1`). They are not built from the relations that were verified. Deleting
  `trans M5 M6 0` still prints r^23 = r^22 + 1 and "ALL COVERING RELATIONS VERIFIED" (mut/m6.log). `ONLY=`
  likewise prints VERIFIED after checking a single source. The shipped config does list all 24 edges, and the
  24 edges form exactly the stated graph, so the theorem is unaffected. The checker should build A from the
  verified trans lines and compute its spectral radius.

## 3. Mathematics of 4.4a

- Corollary 12 applies to the lifts. The h-sets are affine parallelograms in R^2. Each relation uses its own map
  f_i = T_{2 pi k_i} o P~, and ZG explicitly allows a different map at each step. Orbits project to the cylinder.
  The bi-infinite statement needs the standard compactness (diagonal) argument, which is fine here because the
  sets are compact and P is continuous on them.
- Lambda is closed. A limit of orbits with convergent itineraries is again an orbit, and the sets are closed.
  P restricted to Lambda is a continuous bijection of a compact set, hence a homeomorphism. The itinerary is
  continuous because the sets are disjoint and clopen in their union, and it is onto by Corollary 12. A factor
  has entropy at most that of the system.
- The graph has two first-return loops at N. One has length 1 (N->N). The other has length 23: the edge N->M0,
  21 edges M0->...->M21, and the edge M21->N. So 1 = r^-1 + r^-23, which gives r^23 = r^22 + 1. By Descartes'
  rule there is exactly one positive root. Checked.
- For the flow bound, the suspension over Lambda with a continuous roof bounded by Tmax, Abramov's formula and
  the variational principle together give h_top(phi_1) >= h_top(P|Lambda)/Tmax. This is correct.

## 4. Mutations (16 pieces, depth 4)

Caught by the shipped code:
- alpha of M9 multiplied by 0.2: the edges are not separated.
- beta of M20 multiplied by 1000: N/M20, M19/M20 and M20/M21 are not disjoint.
- M12 centre moved by 1e-6: 256 pieces unresolved.
- M0=>M1 shift changed to 1: fails.
- E = 1/1000: N=>N and N=>M0 fail.
- M10 frame moved by 3 beta, so that the image misses M10: the midline check fails.
- M10 frame moved by 0.95 beta, so that the image crosses M+: the kind-3 check fails.
- The control_horseshoe_wrong config: fails.

Passing, as expected for weakened checks, and the shipped checks catch each of these:
- No midline check, with the image at y about -3: a false covering passes (m7nomid).
- Kind 3 always passing, with the image crossing M+: passes (m8k3).
- Both checks removed, on the wrong control: still fails on the edges.

False claim passing with the shipped code: the dropped trans line (weakness B above).

## 5. Independent spot check (numerical, not rigorous)

I wrote a separate Python integrator (py/pmap.py): Hamilton's equations are derived by sympy from H, the lift is
solved from H = E, DOP853 runs at rtol 1e-13, and dH is about 1e-13. The results converge to about 1e-5 in
normalized units over rtol from 1e-12 to 3e-14. py/spot.out lists them.

- M9=>M10: the left edge maps to X = -2.99991 and the right edge to X = +3.00009, with abs(Y) <= 0.1073 on the
  edges. On the midline abs(Y) <= 1e-4. The return time is 7.355385, which equals Tmax: the M9 excursion is the
  longest.
- M21=>N (shift 19): the edges map to X = -2.99993 and X = +3.00007, with Y in [0.475, 0.498]. On the midline
  Y is about 0.4886 (the enclosure gives max 0.503 at 16 pieces and 0.492 at 32). The return time is 2.9535.
- These values agree with the CAPD centre images and the logged enclosures. The M21=>N image is off-centre, at
  y about 0.49, but its margin to 1 is comfortable.
