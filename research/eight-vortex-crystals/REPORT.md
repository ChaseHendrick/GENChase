# Relative equilibria of eight identical point vortices: computer-assisted results

Status: research notes, 2026-09-26. Not a manuscript.
Every statement below is labelled **proved** (established by a rigorous ball-arithmetic computation plus
the argument written next to it), **numerical** (floating point, no error control), or **not proved**.

## 1. Summary

| Question | Outcome |
|---|---|
| Asymmetric (chiral) pair exists | **Proved.** Krawczyk test in Arb ball arithmetic, radius 1e-40. |
| It has no reflection symmetry (and no rotation symmetry), so it and its mirror image are two distinct relative equilibria | **Proved** (a reflection-odd invariant Q = 29270.34 is certified nonzero). |
| Its Morse index is 4 | **Proved** (certified inertia (4, 11) of the reduced Hessian). |
| All 19 numerically known classes exist, are nondegenerate, have the numerical indices, and have pairwise different energies | **Proved** for these 19. That no 20th class exists is **not proved**. |
| The 18 classes other than the centred heptagon are linearly unstable | **Proved** (a real eigenvalue > 0 is enclosed for each). |
| The centred heptagon (1 + 7) is a nondegenerate local minimum, and the unique critical point within Euclidean distance 0.1637 of its orbit | **Proved.** The local-minimum part was already known analytically (Cabral and Schmidt, via Roberts, Sect. 6). |
| The centred heptagon is the global minimizer (ground state) | **Not proved.** A box branch-and-bound was built and measured; it cannot close the neighbourhood of the minimizer in 13 dimensions (Sect. 5). |
| Complete classification (exactly 19 classes) | **Not proved.** It is at least as hard as the ground state (Sect. 5). |

What is new, as far as the search in Sect. 7 reaches: for the vortex (logarithmic) potential no rigorous
existence proof of an asymmetric relative equilibrium had been found; Moczurad and Zgliczynski proved the
analogous statement for the Newtonian potential with the same method (Sect. 7). The existence of each of
the other 18 classes, their indices and instability are also rigorous here for the first time as far as
found, but they are routine applications of the same method.

## 2. Setting and normalization

Eight vortices of equal circulation at z = (z_0, ..., z_7) in C^8. A relative equilibrium (rigid rotation
about the centre of vorticity) is, after scaling, a solution of

    sum_{j != k} 1/(z_k - z_j) = conj(z_k),   k = 0..7,

which is exactly the set of critical points of

    f(z) = - sum_{i<j} log|z_i - z_j| + (1/2) sum_k |z_k|^2 .

Every critical point has sum z_k = 0 and sum |z_k|^2 = 28 (multiply the equation by 1 and by z_k and sum).
f is the Hamiltonian H (up to the factor 2 pi and sign conventions) plus a Lagrange multiplier times the
angular impulse I = sum |z_k|^2; at fixed I the critical points of H are the same configurations. The
equivalent scale-invariant function is F(z) = sum_{i<j} log|z_i - z_j| - 14 log(sum_{i<j} |z_i - z_j|^2),
and minimizing f is the same as maximizing F. **Which function "ground state" refers to here: the minimum
of f, equivalently of H at fixed I and fixed centre of vorticity, equivalently the maximum of F.**

Morse index: the Hessian of f on R^16 has a zero eigenvalue along the rotation orbit, eigenvalue 1 on the
two translations, and positive curvature along scaling; the index of f is therefore the index of -F on the
12-dimensional shape space. The certificates compute it on the gauge slice y_p = 0 (the Hessian with one
row and column removed), which is a complement of the rotation direction because x_p != 0 is certified;
a quadratic form with one-dimensional kernel has the same inertia on any complement of the kernel.

Exact identities used below (proved in `code/apriori.py`):

- centred heptagon: ring radius 2, f* = 14 - 28 log 2 - (7/2) log 7 = -12.21880657737206523155...;
- on {sum z = 0, sum |z|^2 = 28}, with t_ij = |z_i - z_j|^2 / 8 and phi(t) = t - 1 - log t >= 0,
  f = 14 - 14 log 8 + (1/2) sum_{i<j} phi(t_ij)   (exactly, because sum_{i<j} |z_i - z_j|^2 = 224),
  so f <= f* if and only if Phi = sum phi(t_ij) <= Phi* = 7 log(16/7) = 5.78675...;
- at a critical point, f <= f* if and only if prod_{i<j} |z_i - z_j|^2 >= 2^56 7^7.

## 3. Proved results

### Theorem 1 (the chiral pair)

There is a relative equilibrium z^c of eight identical point vortices with the following properties.

1. In the normalization above and after a rotation that puts vortex 0 on the positive real axis, z^c lies
   in the box of radius 1e-40 (every coordinate) about the centre stored with 70 significant digits in
   `data/certificates-N8.json` (class 14, `z_mid`), and it is the only critical point of f in that box with
   y_0 = 0. The 20-digit table below is that centre rounded, so z^c is within 1e-19 of it.
2. It is nondegenerate modulo rotation, and its Morse index is 4 (11 positive directions on the gauge slice).
3. f(z^c) = -10.89223339198939119358574... (enclosure radius below 1e-23).
4. The invariant Q = Im(m_3^2 conj(m_2)^3), m_q = sum (z_k - c)^q with c the centroid, satisfies
   Q = 29270.3386447 +- 1.3e-8, so Q != 0. Q is invariant under translations, rotations and relabelling
   and changes sign under every reflection; hence z^c has no reflection symmetry. Q != 0 also forces
   m_2 != 0 and m_3 != 0, which excludes every rotation symmetry of order n >= 2 (a C_n-symmetric set
   centred at c has m_q = 0 unless n divides q). The symmetry group of z^c is trivial, and z^c and its mirror
   image conj(z^c) are two relative equilibria that are not related by any rotation, scaling, translation or
   relabelling. Its orbit under relabelling and reflection has 2 x 8! = 80640 labelled members.
5. It is linearly unstable: the linearization about it has a real eigenvalue in a ball of radius below
   1e-30 about 2.26628380450964... (Theorem 2, item 4).

Centre of the box, rounded to 20 digits:

| k | x_k | y_k |
|---|---|---|
| 0 | 2.51924723447815570578 | 0 |
| 1 | -1.1210097762613857170 | 2.25367844024764227448 |
| 2 | -1.9895103205788181920 | -1.3281690532722479810 |
| 3 | 0.52417622330968074229 | -1.9944122563927489675 |
| 4 | 1.38554391884786323414 | 0.07664453725113468749 |
| 5 | -0.5751393246358561863 | 1.25328261705678026343 |
| 6 | -1.0032538647522555574 | -0.5820499044095311361 |
| 7 | 0.25994590959261597062 | 0.32102561951897085926 |

Method (`code/ball.py`, `code/certify_classes.py`): the 15 equations grad f = 0 without df/dy_0, in the
15 unknowns (x_0..x_7, y_1..y_7), with y_0 = 0. The rotation identity sum_k (x_k df/dy_k - y_k df/dx_k) = 0
gives df/dy_0 = 0 as soon as the other 15 vanish and x_0 != 0 (certified: x_0 in the box is about 2.52).
Krawczyk operator K(X) = u - Y G(u) + (I - Y DG(X))(X - u) with DG(X) the Hessian enclosure over the box, all
in Arb ball arithmetic at 256 bits; K(X) inside the interior of X gives existence, uniqueness in X, and
nonsingularity of every matrix in DG(X). Inertia: A = Q^T DG(X) Q with Q exact numbers from a floating
eigenvector matrix; every Gershgorin disc of A avoids 0, so by Gershgorin (unions of discs on each side of
0 are disjoint) and Sylvester's law of inertia the count of discs left of 0 is the index for every matrix
in the enclosure (Q is nonsingular automatically, or A would have the eigenvalue 0).

### Theorem 2 (the 19 classes)

The 19 configurations found numerically (Sect. 4) are exact relative equilibria. For each, the same
certificate proves existence, local uniqueness in the gauge, nondegeneracy, and the Morse index; the
enclosures of f are pairwise disjoint, so the 19 are pairwise not congruent.

| class | f (proved, 20 digits) | index (proved) | symmetry order, reflections (numerical) | unstable eigenvalue (proved) |
|---|---|---|---|---|
| 1 centred heptagon | -12.218806577372065231 | 0 | 14, 7 | none (spectrum imaginary, numerical); Lyapunov stable by Cabral and Schmidt (Sect. 7), a strict local minimum by Thm 3 |
| 2 | -12.075050128258430508 | 1 | 4, 2 | 0.34669 |
| 3 | -12.058639971997692589 | 1 | 4, 2 | 0.59929 |
| 4 | -11.929749954681072870 | 2 | 2, 1 | 0.87867 |
| 5 | -11.928121256670811232 | 3 | 8, 4 | 0.79279 |
| 6 | -11.924956223923409521 | 2 | 2, 1 | 0.95745 |
| 7 regular octagon | -11.856447725654495652 | 3 | 16, 8 | 0.80812 |
| 8 | -11.750395902212294856 | 2 | 2, 1 | 1.70977 |
| 9 | -11.703060198592690870 | 3 | 2, 1 | 1.36780 |
| 10 | -11.594320713918779571 | 3 | 2, 1 | 1.36399 |
| 11 | -11.457684382814900478 | 3 | 2, 1 | 1.98785 |
| 12 | -11.263978112847994710 | 4 | 8, 4 | 1.56492 |
| 13 | -11.198969278978613875 | 3 | 2, 1 | 2.56969 |
| 14 chiral pair | -10.892233391989391193 | 4 | 1, 0 (trivial group proved) | 2.26628 |
| 15 | -10.362289076296450133 | 4 | 4, 2 | 3.32809 |
| 16 | -10.153092922857910432 | 4 | 2, 1 | 3.65933 |
| 17 | -9.6383977964005909164 | 5 | 2, 1 | 3.38369 |
| 18 | -8.4735616979300488825 | 5 | 2, 1 | 5.06599 |
| 19 | -5.9369186851450129721 | 6 | 4, 2 | 6.92820 |

4. Instability (`code/certify_stability.py`). In the rotating frame the linearized vortex equations are
   c J H with c > 0, J the standard symplectic matrix and H the Hessian of f. For each of classes 2 to 19 a
   Krawczyk test in complex ball arithmetic on (JH - lambda) v = 0, v_j0 = 1, valid for every H in the
   Hessian enclosure, encloses an eigenvalue lambda with Re lambda > 0 (column above). It is real: every
   entry of JH is real, so (conj(lambda), conj(v)) is an eigenpair with the same normalization; the program
   checks that the conjugate of the Krawczyk image lies in the box, so uniqueness in the box forces
   lambda = conj(lambda). This is consistent with Roberts
   (2018), who states that for same-signed circulations a relative equilibrium is linearly stable if and
   only if it is a nondegenerate minimum of H at fixed I (quoted in Sect. 7); here it is checked directly.

Consistency check (numerical, not a proof of completeness): with the numerical symmetry orders |G|, the
alternating sum over classes of (-1)^index x 2 x 8!/|G| equals 720 = 6!, the Euler characteristic of the
shape space (C^7 minus the diagonals, modulo C*, whose Poincare polynomial is prod_{k=2}^{7}(1 + kt)).
That a Morse function's alternating count equals this Euler characteristic on the non-compact shape
space uses the behaviour of -F at collisions (it tends to +infinity, and the shape space has no other
end); this is the Morse-theoretic setting of Palmore (1982) and Roberts (2018), which we cite for it
without re-deriving it here. Classes missing from the list would have to contribute a total of zero. The same check passes for N = 5 and 6
(-6 and 24) and fails, as it should, for N = 4 and N = 7, where a class is degenerate
(`data/survey-N7-degenerate-control.txt`: the regular heptagon's Hessian has extra zero eigenvalues).

### Theorem 3 (the centred heptagon: a certified basin)

Let x* be the centred heptagon (vortex at 0, the others at 2 exp(2 pi i k/7)). Let S be the orthogonal
complement in R^16 of the rotation direction J x*. For every v in S with 0 < |v| <= 0.1637,

    <grad f(x* + v), v> > 0 .

Consequences: f is strictly increasing along each ray from x* in S up to that radius, so x* is the unique
critical point and the strict unique minimizer of f on {x* + v : v in S, |v| <= 0.1637}; and any critical
point of f whose Euclidean distance to the orbit of x* under rotations and relabellings is at most 0.1637 lies
on that orbit (the rotation that minimizes the distance makes the difference orthogonal to J x*).

Proof (`code/certify_basin.py`): <grad f(x*+v), v> = |v|^2 + sum_{i<j} g(u_ij), u_ij = v_i - v_j,
g(u) = u.(grad psi(d + u) - grad psi(d)), psi = -log|.|. Because psi = -Re log, ||D^3 psi(d)|| = 2/|d|^3,
hence |g(u) - u^T D^2psi(d) u| <= |u|^3/(|d| - |u|)^3 <= gamma |u|^2 for |u| <= s = sqrt(2) rho, with
gamma_ij = s/(D_ij - s)^3; and |u_ij| <= sqrt(2) |v|. So the quantity is at least v^T (H* - L_gamma) v with
L_gamma the gamma-weighted graph Laplacian (tensor I_2). Positive definiteness of H* - L_gamma on S is
certified at rho = 0.1637 with a basis of S enclosed in balls and the inertia routine; the certificate
fails at 0.1654 (negative control). A floating-point audit (not part of the proof) rebuilds the quadratic
form from its definition, checks the pair remainder inequality in 720 directions per pair and samples
Psi(v) >= v^T (H* - L_gamma) v; it guards the constants against coding errors (Sect. 6). The estimate is dimension-free but pessimistic: numerically the Hessian stays positive
definite on S along every one of 400 sampled rays out to at least 0.415 (numerical, not proved;
`code/convex_radius_numerical.py`).

That x* is a nondegenerate local minimum, and Lyapunov stable, was known: Barry, Hall and Wayne restate
the Cabral-Schmidt interval for the 1 + N configuration, which contains the equal-circulation case for
N = 7, and Roberts' corollary turns stability into a nondegenerate minimum (Sect. 7). Theorem 3 adds an
explicit radius.

### Proposition 4 (a priori bounds; `code/apriori.py`)

Any configuration with centroid 0, sum |z|^2 = 28 and f <= f* (in particular any ground state, which may be
assumed centred and at that scale because f(z) >= f(z - mean) and the optimal scale gives sum |z|^2 = 28)
has every mutual distance in (0.09507, 8.4768) and every |z_k| < 4.0876. At every critical point the vortex
of largest modulus has |z| >= sqrt(7/2), because each Re(z_k/(z_k - z_j)) >= 1/2 when |z_j| <= |z_k|.

## 4. Numerical survey (not rigorous)

`code/survey.py 8 4000 1`: 4000 random starts (Gaussian, uniform square, uniform disc), damped Newton on
grad f, deduplication by the sorted list of mutual distances. 19 classes, hit between 10 (heptagon) and
668 (chiral pair) times each. The same 19 match the scratch search the task cites and Dirksen's numerical
census (19 figures for N = 8, Sect. 7). The Hessian of f at the heptagon has the spectrum
{0, 1 - 1/sqrt 2 (x2), 1/2 (x2), 3/4 (x2), 1 (x2), 5/4 (x2), 3/2 (x2), 1 + 1/sqrt 2 (x2), 2} (numerical; the
closed forms are read off, not derived). The lowest saddle (class 2) lies 0.1438 above f*.

## 5. The ground state: what was tried, what it costs, how far it got

Goal: show that no critical point of f other than the heptagon orbit has f <= f*. Since the minimum of f
exists (f is bounded below and proper modulo translations, rotations and scale) and is a critical point,
that proves the ground state.

**Prototype** (`code/bnb/`, C, exploratory, not a proof): interval arithmetic in double precision with
outward rounding by one ulp; 15 unknowns in the gauge "vortex 0 has the largest modulus and lies on the
positive real axis", relabelling fixed by y_1 <= ... <= y_7 and reflection by y_1 + y_7 <= 0; contraction
by sum z = 0 and sum |z|^2 = 28; exclusion of a box if the pair-convex bound gives Phi > Phi*, if
prod |z_i - z_j|^2 < 2^56 7^7 (no logarithm needed), if a component of the gradient (with exact per-pair
ranges of (x, y)/(x^2 + y^2)) excludes 0, or if the Krawczyk operator excludes the box.

**Measurements** (`data/bnb-knuth.txt`, `data/bnb-near-min.txt`):

- Knuth's unbiased tree-size estimator over the whole domain: 5e9 to 1.2e11 nodes across seeds (heavy
  tailed; standard errors as large as the estimates), about 13 microseconds per node. Deep probes end with
  boxes still about 1 wide: nothing prunes until boxes are about 0.3 wide in all 15 coordinates.
- Near the minimizer the box method does not converge at any affordable cost. The Krawczyk test succeeds
  on a cube about x* only up to half-width 0.0025. With the certified basin of Theorem 3 removed, the cube
  of half-width 0.03 about x* took 912,877 boxes, and half-width 0.04 did not finish in 100 s (the
  0.045 to 0.055 runs are in the data file). The cost multiplies by more than ten per 0.01 of radius.
- Reason: at distance rho from x*, f - f* is only about 0.146 rho^2 in the softest direction, while every
  box enclosure loses a term linear in the box width summed over 15 coordinates. Covering the shell between
  the certified radius (0.16) and the radius where coarse boxes start to prune (about 0.5, where
  f - f* is about 0.04) at the width these bounds need (0.05 or less) is of order 1e12 to 1e13 boxes.
  Moczurad and Zgliczynski met the same dimension barrier for n = 8 Newtonian central configurations
  (quoted in Sect. 7).

**Dead ends recorded** (numerical checks, `REPORT.md` only):

- Hadamard's inequality on the Vandermonde of the seven outer vortices, centred at the inner one, gives
  a lower bound for f that is exact at the heptagon and depends on seven distances only. But its minimum
  over the distances is -21.10, far below f*, and the heptagon is a saddle of it (Hessian eigenvalues -4.5
  six times and 2). Fischer's inequality with the {0, 7} block is exact at the heptagon only through the
  angular term sum z_k^7, and dropping it loses a factor 8.
- The Kryvonos-Liehr-Taylor route (three-point semidefinite bounds) needs the harmonic analysis of the
  sphere; there is no analogue here found for a confined planar gas.

**Honest estimate.** A proof by boxes alone is out of reach, not a matter of weeks of CPU. What would make
it feasible is a local certificate reaching f - f* of order 0.04 (radius about 0.5 in the soft directions,
three times Theorem 3), for example a monotonicity or convexity argument in symmetry-adapted coordinates
(the Hessian at x* block-diagonalizes by the D_7 Fourier modes), combined with a far-field search that
excludes everything with Phi > Phi* + 0.08. The far-field search is estimated from the Knuth runs at
1e10 to 1e11 boxes (days on four cores) and would need a better splitting rule to be comfortable. Neither
was reached in this session.

## 6. Negative controls (`code/controls_classes.py`, all pass)

1. A centre displaced by 1e-6 fails the Krawczyk test at radius 1e-40.
2. A random configuration fails the Krawczyk test.
3. The mirror image certifies with the same index, and Q changes sign (-29270.34).
4. A relabelled copy gives the same Q and f.
5. No symmetric class is certified chiral (their Q enclosures contain 0).
6. A mutated gradient (confinement term removed) fails the Krawczyk test.
7. The inertia routine returns (11, 4) for -H and (4, 11) for H.
8. A Hessian enclosure inflated by radius 10 returns no inertia.
9. The heptagon receives no instability certificate (`certify_stability.py`).
10. The basin certificate fails just above its radius (`certify_basin.py`).
11. The Euler check fails for N = 4 and 7, where a class is degenerate.
12. A Gershgorin disc straddling 0 gives no inertia; separated discs give the right one.
13. Touching the boundary is rejected as Krawczyk containment; strict interior containment is accepted.
14. The Jacobian DG agrees with central differences of G at all 19 classes (error 4e-10).
15. The heptagon's f enclosure contains the closed form f*.
16. Mutation tests (`code/mutation_tests.py`): ten deliberate bugs (Hessian sign, gauge, Gershgorin
    comparison, chirality formula, three basin constants, containment test, linearization sign, sign of
    the logarithm in f) are each applied to a copy, and each makes `run_all.sh` exit with an error.
    Every script exits nonzero on any failed check, so `run_all.sh` fails if any control fails.

## 7. Prior art (searched 2026-09-26)

Verdicts: no rigorous result for N = 8 identical vortices was found on (a) existence of an asymmetric
relative equilibrium, (b) the global minimizer, or (c) a complete count.

Quotes checked against the texts (extracted in the scratchpad, not committed):

- Aref, J. Math. Phys. 48 (2007) 065401, Fig. 4 caption, p. 065401-16: "Asymmetric relative equilibria of N
  identical point vortices, N = 9 , 10, 11, determined by the method of "ghost" vortices, Eqs. (49). From an
  analytical point of view these configurations remain a mystery." Running text, same page: "Remarkably,
  this method also produced relative equilibria without any apparent symmetry whatsoever (and certainly
  without an axis of symmetry). These equilibria appeared for N [>=] 8". p. 065401-15: "We believe this is
  the complete list of relative equilibria for N = 6 but a rigorous proof is not available. For N [>=] 7 all
  our knowledge is based on numerical explorations." (The comparison sign is garbled in the PDF text layer.)
- Faugere and Svartz, ISSAC 2012, 170-178 (HAL hal-00777791), abstract: "Moreover, we are able to compute all
  equilibria when N <= 7." Sect. 5: "For N = 8 the computation is still running but the most difficult part
  is already done (it takes 12 days to compute the first Gröbner basis)." Their system is conj(z_i) =
  sum_{j != i} 1/(z_i - z_j), the same relative equilibria. No N = 8 result was found in Svartz's 2014 thesis
  (tel-01147484) either (checked by the search agent; I did not re-read the thesis).
- Moczurad and Zgliczynski, Celest. Mech. Dyn. Astron. 131 (2019) 37, arXiv:1812.07279 (Newtonian potential,
  not vortices), Sect. 1.2: "For this reason we were not able to obtain a rigorous listing of CCs for n = 8.
  Note that for n = 5 the computations were done in 24 seconds, for n = 6 it took about one hour to get the
  result, while for n = 7 we needed almost a hundred hours". Introduction (before Sect. 1.1): "For n = 8, 9,
  10 we establish the existence of some non-symmetric CCs previously found numerically". Theorem 1 here is the vortex analogue of that
  existence result, by the same method.
- Kim, arXiv:2609.15090, "Classification of Stationary Configurations of Four Identical Point Vortices"
  (N = 4 only), Sect. 1.2: "Characterizing all stationary configurations yields important information about
  the structure of its high-dimensional energy landscape. In particular, identifying the global minimizer is
  of special interest, as global optimization in such a high-dimensional nonlinear setting is generally a
  challenging problem." Kim's ground state for N = 4 follows from a complete classification plus an energy
  comparison (Prop. 6.1); the same route for N = 8 needs the classification that is open.
- Roberts, Arch. Ration. Mech. Anal. 228 (2018) 209-236, arXiv:1709.01242, introduction: "for same-signed
  circulations, a relative equilibrium z is linearly stable if and only if z is a nondegenerate minimum of H
  restricted to I = I0."
- Dirksen, MSc thesis (DTU / Virginia Tech, 2012), p. 17: "Exhaustive investigations have been done for
  N = 3, . . . , 10, and it is believed that all solutions have been found." Appendix A has 19 configurations
  for N = 8, numerical (tolerance 1e-12). This is the prior numerical census; our 19 agree in number.
- Kryvonos, Liehr and Taylor, arXiv:2609.22077 (8 points on the sphere): "We follow Cohn and Woo's
  three-point semidefinite framework for the spherical energy". Not a box branch-and-bound.
- Barry, Hall and Wayne, J. Nonlinear Sci. (2012), arXiv:1012.1002, restating Cabral and Schmidt,
  SIAM J. Math. Anal. 31 (1999/2000) 231-250: the 1 + N configuration is Lyapunov stable if and only if the
  central circulation ratio p satisfies "(N^2 - 8N + 7)/16 < p < (N-1)^2/4" for N odd (search agent's quote,
  not re-read by me); for N = 7 this is 0 < p < 9, which contains p = 1.

Not opened (paywalled or blocked): Aref and Vainchtein, Nature 392 (1998) 769 ("Point vortices exhibit
asymmetric equilibria"); Aref, Newton, Stremler, Tokieda and Vainchtein, Vortex crystals, Adv. Appl. Mech. 39
(2003) 1-79 (the IDEALS copy returned 403 to the agent; an earlier ledger entry of this repository,
2026-09-25, read its Sects. II, VIII and IX for another question); Campbell and Ziff, Phys. Rev. B 20 (1979)
1886. All three are numerical according to every secondary source read. Residual risk: small.

Queries (search agent, 2026-09-26): arXiv abstracts 2609.15090, 2609.22077, 1812.07279; "Aref Vainchtein
asymmetric equilibrium patterns point vortices Nature 1998"; "Faugere Svartz ISSAC 2012 equilibria N vortices";
"Aref 2007 point vortex dynamics classical mathematics playground"; "Vortex crystals TAM report"; "relative
equilibria N=8 identical vortices classification Groebner computer-assisted interval"; "Svartz thesis vortices
N=8"; Semantic Scholar citations of doi:10.1038/33827 (about 75) and doi:10.1145/2442829.2442856 (24); arXiv
2306.10870, 1810.13011, 1810.11529, 1806.08121, 2009.00847, 2601.01165, 2103.11975, 1905.05297, 2309.04320;
"Dirksen Aref close pairs"; "eight identical vortices asymmetric chiral Morse index"; "Newton Chamoun Brownian
ratchets vortices"; "Cabral Schmidt stability 1+N vortex"; "Kurakin heptagon"; "2D one-component plasma ground
state small N rigorous"; "weighted Fekete points Gaussian weight plane small N"; "Campbell Ziff 1979 vortex
patterns"; "computer-assisted interval Krawczyk point vortices"; "O'Neil stationary configurations point vortices
1987"; "Moczurad Zgliczynski vortex logarithmic"; "six identical vortices complete list rigorous"; "Palmore 1982
vortices"; "Glass 2000 asymmetric vortex"; "Beltritti Mazzoleni"; "Lewis Ratiu rotating vortices";
"Hampton Moeckel finiteness vortex", "Albouy Kaloshin", "Yu vortex finiteness". OpenAlex was rate limited.

Proposed ledger line for RESEARCH.md (not added: this task changes only this folder): "2026-09-26 eight
identical vortices: no rigorous N = 8 result for vortices (Faugere-Svartz stop at N <= 7; Dirksen 2012 numerical
census of 19; Moczurad-Zgliczynski Newtonian only). Re-search: no, unless a month passes."

## 8. Adversarial check

An independent subagent worked on a copy of this folder (2026-09-26): it reran everything, applied nine
mutations, recomputed the chiral point with its own 50-digit mpmath code, re-derived the arguments and
re-opened four sources. Its verdict, condensed:

- **Reproduction:** all numbers in the report reproduced exactly.
- **Independent recomputation:** gradient 7e-40 at the stored centre (5e-51 after Newton); Hessian
  eigenvalues -1.4771, -1.2644, -0.6723, -0.3820, one 0, eleven positive (index 4); f and Q agree
  (Q = 29270.3386447129); unstable eigenvalue 2.26628380450964; the heptagon spectrum and the identity
  f = 14 - 14 log 8 + Phi/2 confirmed to 1e-49; 200,000 samples found no violation of the Theorem 3 bound.
- **Mathematics:** the gauge argument, the chirality argument and the Theorem 3 proof were judged correct.
- **Must-fix, both fixed:** (1) `run_all.sh` returned success when a control failed. Every script now
  exits nonzero on a failed check. (2) The stored centre (40 significant digits) did not lie within 1e-40
  of the true zero. It is now stored with 70 digits, and Theorem 1 states the box about that centre.
- **Should-fix, all fixed:**
  - Five of nine mutations survived: the Gershgorin comparison, strict containment, and three basin
    constants. Controls 12 to 16 and the basin audit were added. All ten mutations in
    `code/mutation_tests.py` are now caught.
  - The Euler-characteristic identity on a non-compact space needed a source. Palmore and Roberts are
    now cited.
  - "Real eigenvalue" was not argued. It is now certified by the conjugation check.
  - The Sect. 5 cost figures did not match the committed data. They were remeasured and the data files
    replaced.
  - The heptagon's table entry cited Theorem 3 for stability. It now cites Cabral and Schmidt.
  - Quote locations and spellings were corrected.
- **Prior art:** the quotes were verified verbatim. Fresh searches found no rigorous planar N = 8 result.
- **Overall (the agent's words):** "The mathematics of Theorems 1 to 3 and Proposition 4 holds up ... The
  problems are in the verification harness and in precision of wording, not in the theorems."

The fixes were made after that reading and have not been re-read by a second independent agent.

## 9. Rerun

```
pip install python-flint==0.9.0 numpy scipy      # Python 3.11
sh research/eight-vortex-crystals/run_all.sh     # all rigorous results and controls, about 2 s; exits 1 on any failure
python3 research/eight-vortex-crystals/code/mutation_tests.py   # ten mutations, each must be caught, about 30 s
python3 research/eight-vortex-crystals/code/survey.py 8 4000 1   # the numerical survey, about 35 s
cd research/eight-vortex-crystals/code/bnb && gcc -O2 -frounding-math -o bnb bnb.c -lm
./bnb knuth 200000 101                            # tree-size estimate (prototype, not a proof)
sh near_runs.sh                                   # cost near the minimizer, up to 2 hours
```

Rigor rests on FLINT/Arb (python-flint 0.9.0) ball arithmetic for every statement labelled proved. The C
prototype uses libm log in one bound and is not used for any claim.
