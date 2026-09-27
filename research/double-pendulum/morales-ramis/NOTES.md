# Meromorphic non-integrability: Salnikov's monodromy computation re-examined

Status: computation run in this folder on 2026-09-26. Not reviewed by a human. Nothing here is published.
Every claim carries a label:

- **[rigorous]**: proved by ball arithmetic (python-flint / Arb) together with the stated written argument;
- **[numerical]**: floating-point or multiprecision computation without an error bound (convergence checked by
  varying order and step, but not proved);
- **[reading]**: an interpretation of Salnikov's paper that the paper does not state explicitly.

## 1. Result in one paragraph

Salnikov (arXiv:1303.4904 v2, 3 pages, read in full from the TeX source) states that loops around
t = 0.5 +- 0.9i, each taken three times, give two non-commuting monodromy matrices M1, M2 of the variational
equation (VE), with entries of size 20 to 30. We could not reproduce this. With g = 1, the only gravity among
those tried for which his loops close at all, the singular point inside his upper loop is at
t* = 0.71083085844270 + 0.64647678336182i [numerical]. It is an algebraic branch point of order 3
where the mass matrix degenerates (cos^2(a1 - a2) = 2). The velocities blow up like (t - t*)^(-1/3), there is no
logarithm, and the three-turn transport is the identity near x0 [numerical]. So the three-fold loop has
monodromy exactly I. Our high-precision value is max|M - I| = 3e-38 [numerical]. A validated enclosure
(Section 5) proves that the fundamental matrix at the end of each of his three-fold loops is within
4e-9 of I, entrywise [rigorous], while his printed entries are of size 20 to 30. His printed matrices also fail two
necessary conditions for any monodromy along a loop that is closed on the phase curve: they do not fix the
orbit tangent f(x0) and they do not preserve dE(x0), by margins of 10 and 15 against rounding errors of order
0.01 [rigorous, for the reading g = 1 with velocities]. They fail the same conditions in all 96 other readings we
tried [numerical]. Conclusion: Salnikov's computation does not establish meromorphic non-integrability, and the
loops he chose cannot establish it, because their monodromy is trivial. Meromorphic non-integrability of the
double pendulum remains open here. It is not proved in this folder.

## 2. Setting

Salnikov's Lagrangian (his Eq. 1), with m = l = 1 and gravity g:

    L = a1'^2 + a1' a2' cos(a1 - a2) + a2'^2/2 + 2 g cos a1 + g cos a2,

with state x = (a1, a2, a1', a2'), vector field x' = F(x), VE Xi' = DF(x(t)) Xi, and Xi(0) = I. At g = 1 this is
the Lagrangian behind the Hamiltonian of `../REPORT.md` (p = M(q) q', M = [[2, c], [c, 1]], D = det M = 2 - c^2).
`field.py` derives F and DF with sympy and checks F against the Euler-Lagrange equations of L symbolically
[rigorous, exact symbolic identity]. His initial point is x0 = (0.1, -0.3, 0.2, 0.4) at t = 0. At g = 1 the energy
is E = v1^2 + v1 v2 c + v2^2/2 - 2 cos a1 - cos a2 = -2.75165994016142...

**Salnikov's loops [reading].** The paper does not describe the paths. We read them from its figure
(`loops.eps` in the arXiv source, parsed by [loops_from_eps.py](loops_from_eps.py), output in
[loops_from_eps.out](loops_from_eps.out)). Both
loops start at t0 = 0, run along the real axis to 0.5, go up (down) to 0.5 +- 0.4i, go once counterclockwise
around the diamond with vertices 0.5 +- 0.4i, 1 +- 0.9i, 0.5 +- 1.4i, 0 +- 0.9i, and come back to 0. This is
repeated three times. The paper does not state g. It speaks of "controlled precision" but gives no error bounds.

## 3. Reproduction (task 1)

### 3.1 Which g, which variables [numerical]

`fast_variants.py` (double precision, DOP853 in complex time, rtol 1e-13) follows the loop 1 to 6 times.

| g | (0.1,-0.3,0.2,0.4) read as | closure max\|x - x0\| after turns 1..6, gamma1 |
|---|---|---|
| 1 | angles, velocities | 1.5, 1.1, **1e-14**, 1.5, 1.1, **1e-14** |
| 1 | angles, momenta | 1.2, 1.1, **6e-15**, 1.2, 1.1, **1e-14** |
| 9.8, 9.81, 10 | either | O(1) to O(10) at every turn: never closes |

gamma2 behaves the same way ([fast_variants.out](fast_variants.out)). Only g = 1 matches his remark that the
loops close after three turns, so everything below uses g = 1 and velocities, the variables he names.

### 3.2 The singular point and its local nature [numerical]

- **Location.** A Domb-Sykes fit of the Taylor coefficients ([locate.py](locate.py)) gives a singularity near
  0.7108 + 0.6465i. It is inside the diamond, 0.025 from its lower-right edge, and it is not at 0.5 + 0.9i. Its
  distance from t = 0 is 0.961. The survey of Section 3.5 found no singularity closer to 0. By the reality of the solution, its mirror
  image 0.7108 - 0.6465i lies inside gamma2.
- **Local expansion.** [puiseux.py](puiseux.py) samples x on circles |t - t*| = rho over three turns, takes the
  FFT in the angle, and refines t* by removing the (t - t*)^(-4/3) term that a wrong centre produces. The result is
  t* = 0.71083085844270 + 0.64647678336182i. The coefficients c_m of (t - t*)^(m/3) agree to all printed digits
  at rho = 0.03 and rho = 0.015 ([puiseux.out](puiseux.out)). For the velocities, c_(-1) is not zero
  (0.4065 and 0.5749, ratio sqrt 2, the null vector (1, -sqrt 2) of M), and c_m < 1e-15 for m <= -2. For the
  angles, c_1 = 0 and c_2 is not zero. At t*, cos^2(a1 - a2) = 2 to 16 digits, which means D = 0. So the
  singularity is an algebraic branch point of order 3 on the set where the mass matrix degenerates: the kinetic
  energy stays finite while v grows like (t - t*)^(-1/3). There is no logarithmic term.
- **Nearby solutions.** [fdcheck.py](fdcheck.py) perturbs x0 by up to 0.02 in 16 directions. The three-turn map
  returns every perturbed start to itself to 2e-13 ([fdcheck.out](fdcheck.out)). So the three-turn transport T
  is the identity on an open set, and its derivative, the monodromy, must be I. This explains the result
  structurally; it is not a coincidence of this x0.

### 3.3 Monodromy [numerical, multiprecision]

[reproduce.py](reproduce.py) uses complex-time Taylor integration of the orbit and the VE with Arb power series
(order 60, 256 bits). The step is 0.2 times the estimated radius of convergence, at most 0.1, and the time is
tracked exactly.

| loop | closure \|x - x0\| after 3 turns | max\|M - I\| | energy drift |
|---|---|---|---|
| gamma1^3 | 4.9e-41 | 3.1e-38 | 1.9e-41 |
| gamma2^3 | 3.4e-41 | 4.3e-38 | 1.1e-41 |
| gamma1^3, momenta reading, order 50 | 2.5e-34 | 2.3e-32 | 1.1e-34 |
| gamma2^3, momenta reading, order 50 | 2.4e-34 | 1.1e-31 | 9.8e-35 |

Closure converges with order: at order 40 the gap is 2.7e-20, at order 60 it is 4.9e-41, and at order 80 it is
4.2e-55. The one-turn and two-turn transports are not monodromies, because x does not return
(|x - x0| = 1.5 and 1.1). So M1 = M2 = I: all eigenvalues are 1, the matrices commute, and the monodromy of the
normal variational equation is also I (2x2). The reduction by the orbit tangent and the energy leaves nothing
non-trivial.

### 3.4 Salnikov's printed matrices

- **Structure** [numerical, from the 2-decimal data, [salnikov_printed.out](salnikov_printed.out)].
  M - I has one singular value 72.3, and the other three are at most 0.008, which is rounding level. The trace
  is 4.00. So each printed matrix is a transvection I + u v^T with v.u = 0, which is unipotent. The eigenvalues
  of the rounded matrices scatter to 1 +- 0.4 only because a nilpotent part of size 72 amplifies rounding of
  0.005 by about sqrt(72 x 0.005). His symmetry M1 = I + A + iB, M2 = I - A + iB says that
  M2 = I - conj(M1 - I), which holds to 0.004. For a transvection that is conj(M1)^(-1), and that is exactly what
  the reality of the solution predicts for the mirrored loop. So the printed data are internally consistent. This is the shape of a logarithmic
  (resonant) branching.
- **Necessary conditions.** Suppose a loop is closed on the phase curve through x0. Then its VE monodromy M
  satisfies M f(x0) = f(x0), because the tangent is transported to itself. It also satisfies
  dE(x0) M = dE(x0), because E is a first integral. [consistency_rig.py](consistency_rig.py) encloses every
  matrix that rounds to the printed ones: each real and imaginary part lies within 0.005 of the printed value,
  or within half a unit of the last printed digit for the entries printed with more digits. For every such
  matrix, max|M f - f| >= 10.26 and max|dE M - dE| >= 15.31, while |f|, |dE| <= 0.77
  [rigorous, reading g = 1 with velocities]. [consistency.py](consistency.py) repeats the test for every
  ordering of the four coordinates, g in {1, 9.81}, and velocities or momenta (96 readings). The best reading
  still violates the conditions by 0.03 to 0.27 of |f|, against a rounding tolerance of about 1e-3
  [numerical]. So the printed matrices are not monodromy matrices of the VE along a loop closed on the phase
  curve in any of these readings. Possibly his integration did not close, or it crossed the branch point, which
  lies 0.025 from his path. We cannot tell which.

### 3.5 Other singularities of the same solution [numerical, preliminary]

[survey.py](survey.py) looks for singularities from a grid in 0 < Im t <= 2.5 on the principal sheet (vertical
paths from the real axis) and loops around each one ([survey_g1.out](survey_g1.out)). Three singularities at
-1.030 + 0.744i, 0.7107 + 0.6464i and 0.071 + 2.565i are of the same kind: they close after 3 turns, and
max|M - I| is about 1e-12 in double precision. Five singularities near Im t = 2 to 2.4 do not close within 8
turns of a circle of radius 0.05. The angles shift by non-integer multiples of 2 pi, and the transport depends on
the radius ([probe.py](probe.py), [probe.out](probe.out)). They are probably clusters or branch points of
another type. We did not resolve them. None of the loops we found gives a non-trivial monodromy element.

## 4. The logic of the criterion (task 2)

- **Morales-Ramis** (Morales-Ruiz and Ramis, Meth. Appl. Anal. 8 (2001); Morales-Ruiz's book, Thm 4.1). Suppose
  the Hamiltonian system has n meromorphic first integrals in involution, independent in a neighbourhood of the
  phase curve Gamma (not necessarily on it). Then the identity component G^0 of the differential Galois group of
  the VE (equivalently the NVE) along Gamma, over the field of meromorphic functions on Gamma, is abelian.
  Analytic continuation along a loop that is **closed on Gamma** is a differential automorphism, so the
  monodromy group of the VE along Gamma is contained in G.
- **Unipotent elements.** If g is unipotent and g != I, the Zariski closure of {g^n} is a one-parameter group
  {exp(s log g)}, isomorphic to G_a and connected, so g lies in G^0. Hence **two non-commuting unipotent
  monodromy elements imply that G^0 is not abelian, which implies meromorphic non-integrability.** This is the
  criterion Salnikov's matrices would satisfy if they were genuine, since both are transvections. His paper
  cites Ziglin and Morales-Ramis, but it states no criterion beyond "these matrices do not commute".
- **Ziglin** (1982) needs a **non-resonant** element: no product of eigenvalue powers equals 1 except the
  trivial one. Unipotent matrices, with all eigenvalues 1, are maximally resonant, so Ziglin's theorem as
  stated does not apply to Salnikov's matrices. For two degrees of freedom the NVE is 2x2 symplectic, and the
  usable form is this: if g has |tr g| > 2 (hyperbolic, hence non-resonant) and some h in the monodromy group
  neither preserves nor swaps the two eigenlines of g, then G^0 is not abelian. The reason is that g^k lies in
  G^0 for some k, so G^0 would be a torus that h must normalise. Both conditions are open conditions, so they
  can be certified from enclosures.
- **What the computed matrices satisfy.** Ours satisfy neither criterion: M = I. Salnikov's would satisfy the
  unipotent criterion, but they are not reproducible (Section 3). Even if they were, three further points would
  be needed for a proof. (a) Exact closure of each loop on Gamma: an enclosure containing x0 is not enough.
  (b) Exact unipotence, which no enclosure can certify, since unipotence is a closed condition. It would have to
  come from a proved local structure, such as a logarithmic term in a certified local expansion. (c) A certified
  non-zero commutator.

## 5. Rigorous computation (task 3)

**What is proved** [rigorous]. Take g = 1 (exact), x0 the exact decimals (0.1, -0.3, 0.2, 0.4), Xi(0) = I, and
the three-fold diamond paths of Section 2 with exact decimal vertices. The analytic continuation of the solution
and of its fundamental matrix exists along the whole path. The fundamental matrix at the end satisfies:

| path | max_ij \|Xi_end - I\|_ij | \|x_end - x0\| (enclosure contains 0, radius) | steps |
|---|---|---|---|
| gamma1^3 | <= 3.47e-9 | <= 4.6e-13 per real or imaginary part | 7323 |
| gamma2^3 | <= 3.99e-9 | <= 5.5e-13 per real or imaginary part | 7323 |

(outputs [rig_gamma1.out](rig_gamma1.out), [rig_gamma2.out](rig_gamma2.out), [rig_gamma1.json](rig_gamma1.json),
[rig_gamma2.json](rig_gamma2.json); the certified distance from Salnikov's (1,1) entry is >= 26.11 in both cases.)

This contradicts Salnikov's printed M1 and M2, whose (1,1) entries are 20.72 - 17.12i and -18.72 - 17.12i, for
this reading of his setting. The contradiction does not depend on whether the loop closes. It shows that the
printed numbers are not the VE fundamental matrix along the path of his figure at g = 1.

**Method** ([rigorous.py](rigorous.py), class `RigDisk`; driver [rig_run.py](rig_run.py)). Each step does three
things.

1. **A priori enclosure.** Find a box B and a radius rho with rho sup_B |F_i| < beta_i, by ball evaluation of F
   on B. A ray argument then shows that every solution starting in the current ball exists on the disk
   |tau| <= rho and stays in B. The same evaluation bounds alpha >= max row sum of |DF| on B, and Gronwall bounds
   the fundamental matrix of the step.
2. **Taylor coefficients.** Compute the Taylor coefficients of order < N with Arb power series, using a
   truncated Picard iteration, which is exact coefficient by coefficient.
3. **Cauchy remainder.** Bound the remainder by the Cauchy estimate on that disk. For the state it is
   rho K q^N / (1 - q), and for the step Jacobian (e^(alpha rho) - 1) q^N / (1 - q), with q = |dt| / rho <= 0.2.

The state is carried in mean-value form, x in xh + disk(s). The step Jacobian J is enclosed over the whole box,
x_new lies in phi(xh) + J s, and Xi_new = J Xi. Errors are kept as disk radii (absolute values rounded up), not as
complex rectangles. A first version that pushed balls through the Taylor recursion lost all accuracy near the
branch point, and so did a version that kept complex rectangles, which grow by up to sqrt 2 per complex product.
Both were removed. The parameters were N = 40, q = 0.2 and 256 bits. The step count was 7323 per loop, and the largest
Cauchy tail was 1.6e-29 per step. The runtime was about 51 minutes per loop on one core. (The two runs were made before the unused
first and second variants were deleted from `rigorous.py`. The class `RigDisk` and everything it calls are
unchanged.)

**What is not proved.**
- That the loop is closed on Gamma. The enclosure of x_end - x0 contains 0 and has radius at most 5.5e-13, but an enclosure
  cannot prove equality. It does not matter here, because the monodromy is trivial anyway. A proof would go
  through the local structure at t*: a validated Puiseux expansion in (t - t*)^(1/3) with a proved remainder, or a
  regularising change of time in which the branch point becomes a regular point.
- That M = I exactly. This follows [numerical] from Section 3.2: the three-turn map is the identity on an open
  set. A proof again needs the certified local structure.
- The location and type of the singular point (Section 3.2) are numerical.

**Certifying closure in general (assessment).** Of the three routes the task suggests:
1. A loop k times around an algebraic branch point of certified order k can be certified. Its monodromy is then
   provably trivial whenever the general solution nearby has the same Puiseux form, so for these D = 0 points the
   route gives nothing.
2. A validated Laurent or Puiseux expansion is only useful at a singularity whose expansion contains a
   logarithm. None was found among the closed loops here.
3. The real periodic orbit of `../REPORT.md` gives a rigorous non-resonant element: tr = -3.8087 +- 8e-10, so
   |tr| > 2 for the NVE, with multiplier -3.525. The missing piece is a second element h: a loop in complex time,
   closed on the complex phase curve of that periodic orbit, whose NVE monodromy neither preserves nor swaps the
   eigenlines of g. If the singularities near that orbit are also D = 0 branch points of order 3, the natural
   candidates are trivial, and h would have to come from a singularity of another type (for example the
   unresolved ones of Section 3.5). We did not attempt this.

## 6. The gap to a proof of meromorphic non-integrability

1. Find a particular solution and a loop, closed on its phase curve, whose VE monodromy is non-trivial. The
   branch points of order 3 on D = 0 never give one (Section 3.2). Candidates are logarithmic singularities or
   the real period of a periodic orbit.
2. Certify closure exactly, through a proved local expansion or a proved period.
3. Enclose the monodromy matrices (the method of Section 5 is ready for that) and certify one of the criteria of
   Section 4: two elements with non-zero commutator that are unipotent by proof, or |tr g| > 2 together with h
   neither preserving nor swapping the eigenlines of g.

An alternative that avoids numerics altogether is the classical route: a particular solution with an explicit
(algebraic or elliptic) form, such as the invariant planes of special parameter values used by Stachowiak and
Szuminski. As far as `../PRIOR-ART.md` records, no such solution is known at the equal-mass, equal-length
parameters.

## 7. Files and commands

All scripts run from this folder with python3 and need python-flint (0.9.0 was used), mpmath, sympy, numpy and
scipy. Times are for one core.

| command | what it does | time |
|---|---|---|
| `python3 field.py` | symbolic check of F against the Euler-Lagrange equations | 5 s |
| `python3 salnikov_printed.py` | structure of the printed matrices | 1 s |
| `python3 consistency.py` | necessary conditions, 96 readings [numerical] | 20 s |
| `python3 consistency_rig.py` | the same, certified, reading g = 1 with velocities [rigorous] | 1 s |
| `python3 fast_variants.py` | closure for g in {1, 9.8, 9.81, 10}, velocities or momenta | 2 min |
| `python3 loops_from_eps.py loops.eps` | the path of Salnikov's figure (needs the arXiv source) | 1 s |
| `python3 locate.py` | Domb-Sykes location of the branch point | 30 s |
| `python3 puiseux.py` | Puiseux coefficients at t* at two radii | 1 min |
| `python3 fdcheck.py` | three-turn map is the identity near x0 | 20 s |
| `python3 reproduce.py 60 0.2 vel` | multiprecision monodromy along both loops | 5 min |
| `python3 reproduce.py 50 0.2 mom` | the same, momenta reading | 4 min |
| `python3 survey.py 1.0` | singularity survey in the upper half plane | 10 min |
| `python3 probe.py` | the non-closing singularities near Im t = 2 | 1 min |
| `python3 rig_run.py gamma1 40 0.2 3 256` | validated enclosure along gamma1^3 (writes rig_gamma1.json) | 51 min |
| `python3 rig_run.py gamma2 40 0.2 3 256` | the same for gamma2^3 | 51 min |

Library modules: `field.py` (equations), `taylor.py` (Arb power-series Taylor integrator, numerical),
`fast.py` (double-precision explorer), `rigorous.py` (validated integrator). The `.out` and `.json` files are
the outputs quoted above.
