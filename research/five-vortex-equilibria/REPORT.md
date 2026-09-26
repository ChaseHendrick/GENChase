# Relative equilibria of five identical point vortices: a computer-assisted classification

Status: research note, 2026-09-26. Not independently reviewed by a person. Everything called
"proved" below rests on the interval computations in `code/` together with the stated
mathematical lemmas; anything numerical is labelled as such.

## 1. Result in one paragraph

Up to translation, rotation, scaling and relabelling, five identical point vortices in the plane
have exactly five relative equilibria: the regular pentagon, the square with a vortex at its
centre, the collinear configuration at the zeros of the Hermite polynomial H_5, an isosceles
trapezoid with the fifth vortex inside it on its axis, and an isosceles triangle with two interior
vortices placed symmetrically about its axis. With labels, modulo rotation and scaling, there are
24 + 30 + 60 + 120 + 120 = 354 of them. Each is a nondegenerate critical point of the Kirchhoff
Hamiltonian on a level set of the angular impulse, modulo rotation. The Morse indices are 0, 0, 3,
1 and 2, so the Morse polynomial is 54 + 120t + 120t^2 + 60t^3. The pentagon and the centred square
are linearly stable (and, by Roberts 2013, Theorem 3.5, nonlinearly stable). The other three are linearly
unstable, with exactly 3, 1 and 2 pairs of real eigenvalues.

The proof is an interval branch-and-bound with Krawczyk existence and uniqueness, in the spirit of
Moczurad and Zgliczynski (2019), adapted to the logarithmic interaction, followed by an independent
re-verification and classification in arb ball arithmetic. The search takes about 20 seconds on 4
cores. A second, independent program recounts the same answer: it uses a different normalization,
different equations, different collision tests and a Jacobian from automatic differentiation. At the
Newtonian exponent A = 3 that second program also reproduces the five classes of Moczurad and
Zgliczynski.

What this is not: it is not the first proof that the list is complete. Faugere and Svartz (ISSAC
2012) state that their exact Groebner-basis method computes all equilibria of N <= 7 identical
vortices, but they print explicit real solutions only for N = 4 and N = 7 (section 2). What is
added here:
- the explicit, certified N = 5 list, with Morse indices and stability, by an independent method;
- the answer to Kim's stability question (arXiv:2609.15090, Remark 1.5) for five vortices;
- the same for six vortices (Theorem 2, section 8): exactly 8 classes, 3384 labelled; only the
  hexagon and the centred pentagon are stable; three classes are missing from Aref's N = 6 list;
- Hampton's Conjecture 3 (a numerical conjecture) proved at the sampled exponents A = 2, 3, 6.5, 7
  and 8, which cover all three of its regimes (section 6). It is not proved on the intervals.

## 2. Prior art

Searches were made on 2026-09-26 by a literature subagent and re-checked by the adversarial check
(section 10). Downloaded texts were read in scratch; no PDF or copyrighted text is committed.

### 2.1 Queries and sources

| Source or query | Outcome |
|---|---|
| hal.science/hal-00777791/document (Faugere, Svartz, ISSAC 2012) | full text read |
| HAL API `authFullName_s:"Jules Svartz"`; theses.hal.science/tel-01147484/document (Svartz, PhD, UPMC 2014) | full text read (the vortex chapter repeats the ISSAC paper) |
| theses.fr API `q=Svartz` | NNT 2014PA066621 |
| www-salsa.lip6.fr/~jcf/vortices/ (the data page Faugere-Svartz cite) | DNS failure |
| www-polsys.lip6.fr/~jcf/ | connection reset |
| arxiv.org/pdf/1812.07279 (Moczurad, Zgliczynski, CMDA 2019) | full text read |
| arxiv.org/abs/2601.01165 (Moczurad, Zgliczynski 2026) | read; no mention of vortices |
| arxiv.org/pdf/1810.13011 (Hampton, CMDA 2019) | full text read |
| backend.orbit.dtu.dk/ws/files/4793688/Aref.pdf (Aref, J. Math. Phys. 48 (2007) 065401) | full text read |
| arxiv.org/abs/2609.15090 (Kim, v2, 19 Sep 2026) | full text read |
| arxiv.org/pdf/1301.6194 (Roberts, SIADS 2013) | full text read |
| arxiv.org/pdf/1709.01242 (Roberts, Morse theory and relative equilibria in the planar n-vortex problem) | full text read |
| arxiv.org/pdf/2306.10870 (Cleary, Page 2023, cites Faugere-Svartz) | read |
| O'Neil, Trans. AMS 302 (1987), AMS PDF | HTTP 403, not read |
| Semantic Scholar citations of DOI 10.1145/2442829.2442856 and of arXiv:1812.07279 | loaded; no later vortex classification among the citing papers |
| Web search (snippets only): `Aref "In all likelihood this is the complete list"`; `relative equilibria five identical point vortices complete classification computer-assisted proof`; `interval arithmetic Krawczyk relative equilibria point vortices`; `five identical point vortices rigorous 2020..2026`; `vortex crystals Aref Newton Stremler N=5`; `O'Neil 1987 Stationary configurations of point vortices` | nothing that classifies N = 5 rigorously besides Faugere-Svartz |

### 2.2 What each source says (exact quotes)

- **Aref 2007**, Sect. IV, p. 065401-15: "For N = 5 we have the collinear configuration (vortices at
  the roots of H5), the centered square, and the regular pentagon. In all likelihood this is the
  complete list but a proof has not been given (so far as I am aware)." For N = 6: "We believe this
  is the complete list of relative equilibria for N = 6 but a rigorous proof is not available."
  Aref's N = 5 list is incomplete: it misses the two classes (d) and (e) of Theorem 1.
- **Faugere and Svartz 2012** (identical vortices, logarithmic potential, lambda = 1, the same
  equation (1) as here).
  - From the abstract: "when N = 5, it takes several days to compute the Groebner basis and the
    number of solutions is 2060. By contrast, applying the new algorithm to the same problem gives
    rise to a system of 17 solutions that can be solved in less than 0.1 sec. Moreover, we are able
    to compute all equilibria when N [<=] 7".
  - Sect. 1: "We are sure to find all the solutions, so we give a certificate for the previous
    numerical solutions. For N >= 5, it is completely new." And: "Since we are using only exact
    computations, our algorithms gives computational proofs of the solutions of the vortex problem."
  - Sect. 5.4 describes two ways to remove spurious solutions: a numerical check, and a lex
    elimination after which "we isolate the real roots of this polynomial Pℜ using certificated
    methods". The paper does not say which route produced its counts.
  - Explicit real solutions are printed for N = 4 (Proposition 5: three) and for N = 7 (Sect. 5.7:
    "using all the symmetries the problem admits 12 solutions"; Figure 4). The only N = 5 numbers
    are the complex solution counts 2060 and 17 quoted above. No N = 5 or N = 6 list or real count
    was found in the paper or the thesis.
  - Their data page is unreachable (see the table).
  - Their Table 1 marks the direct N = 5 Groebner computation as not finished (∞, stopped after
    five days). That does not match the abstract's "several days ... 2060", as the adversarial check
    noticed.
  - **Svartz's thesis** (tel-01147484, French summary, PDF p. 24), verified on the downloaded PDF:
    "il est possible de résoudre ces équations et d'obtenir toutes les solutions du problème des
    tourbillons jusqu'à N = 7. [...] Avant cette approche, le problème n'était résoluble que jusqu'à
    N = 5." ("these equations can be solved and all solutions of the vortex problem obtained up to
    N = 7. Before this approach, the problem was solvable only up to N = 5.") So the thesis treats
    N = 5 as already solvable before 2012, without citing an explicit N = 5 list; none was found.
  - Assessment: Faugere and Svartz claim an exact computer-algebra proof that covers N = 5 and N = 6,
    and the result proved here is consistent with it. Their N = 5 list is not in print.
- **Moczurad and Zgliczynski 2019**, Newtonian central configurations, equal masses, n = 5, 6, 7,
  interval arithmetic and Krawczyk. There is no mention of vortices. On other potentials they say
  only that "in principle we can treat also other potentials which cannot be reduced to polynomial
  equations" (Sect. 1.1).
  - For n = 5 their report reads "The number of undecided cubes: 0" and "Number of different cc = 5".
    These are classes modulo translation, scaling, rotation, reflection and permutation.
  - Their method uses the normalization lambda = 1, a priori bounds, cluster tests that exclude
    collisions, and Krawczyk on boxes below a diameter "bias" of 10^-2. The programs here follow the
    same plan; the collision tests and charts are different.
- **Hampton 2019**, convention: "U = sum m_i m_k / r^{A-2}", "Newtonian gravity is A = 3", and the
  case "A = 2 by using the logarithmic potential" as a "simplified model of fluid vortices".
  - Conjecture 3 (quoted from the text; its range "2 <= A < A5" includes the vortex case A = 2): "There are unique values A5 in (6.755, 6.756) and Ac in
    (7.5636, 7.5638) such that for 2 <= A < A5, the Morse polynomial of f on C5 is M(t) = 54 + 120t
    + 120t^2 + 60t^3 = P(t) + (1 + t)(53 + 58t + 36t^2)" and "for A5 < A < Ac: M(t) = 150 + 240t
    + 144t^2 + 60t^3" and "for Ac < A: M(t) = 120 + 240t + 174t^2 + 60t^3".
  - On the vortex case N = 7: "In the vortex case (A = 2) there appear to be exactly 12 central
    configurations", citing Faugere-Svartz.
- **Kim 2026**, arXiv:2609.15090, Remark 1.5, verbatim (the "[...]" omits two sentences citing
  Kurakin-Yudovich for the pentagon and Cabral-Schmidt for the centred square): "(Conjecture on
  five-vortex system). It is
  natural to expect that the two configurations that Mayer found on five magnets are the only
  stable configurations in the five-vortex system. [...] There may be other relative equilibria of
  the five-vortex system such as collinear configurations, but they are expected to be unstable
  saddle points."
  - Kim does not define "stable" formally. He works variationally: minimizers of the Hamiltonian at
    fixed impulse, against "saddle points". He does not cite Faugere-Svartz or Moczurad-Zgliczynski.
- **Roberts 2013** (SIADS; arXiv:1301.6194). Theorem 3.2: "If Γj > 0 ∀j, then a relative
  equilibrium z0 is linearly stable if and only if it is a nondegenerate minimum of H subject to the
  constraint I = I0." Theorem 3.5: "Suppose Γi > 0 ∀i. Then any linearly stable relative equilibrium
  is also nonlinearly stable."
- **Cleary and Page 2023**, citing Faugere-Svartz: "at N = 7, where it has been rigorously
  established that there are exactly 12 REQ".

Conclusion of the search: a complete, rigorous N = 5 list is claimed implicitly by Faugere-Svartz
(2012) but has not been published explicitly. Aref's printed list is incomplete. Hampton's
Conjecture 3, which predicts the counts at A = 2, is numerical. Kim's Remark 1.5 is open in print.

## 3. The theorem

Setting. For vortices of circulations Gamma_k = 1 the motion is
d conj(z_j)/dt = (1/(2 pi i)) sum_{k != j} 1/(z_j - z_k).
A relative equilibrium is a solution that moves rigidly: z_j(t) - c = e^{i omega t}(z_j(0) - c).
For identical positive vortices omega > 0 necessarily, so after a translation (c = 0) and a scaling
(2 pi omega = 1) a relative equilibrium is exactly a solution with distinct z_j of

    (1)  G_j(z) := sum_{k != j} 1/(z_j - z_k) - conj(z_j) = 0,   j = 1, ..., N.

- Summing (1) over j gives sum z_j = 0.
- Multiplying (1) by z_j and summing gives I := sum |z_j|^2 = N(N-1)/2.
- A translating rigid motion is impossible because the total circulation is not zero.
- Equation (1) is the same as the Faugere-Svartz and Aref normalization.

Let H = -sum_{j<k} log|z_j - z_k| (Kirchhoff, up to a constant factor). The relative equilibria are
the critical points of H on the level set {I = const}, modulo rotation. That is, they are the
critical points of H on the 6-dimensional shape space C_5 of Hampton. The Morse index below is the
index of H there.

**Theorem 1 (N = 5).** Up to translation, rotation, scaling and relabelling, there are exactly five
relative equilibria of five identical point vortices. Each is reflection symmetric, so the same five
classes are obtained whether or not reflections are allowed. With labels, the numbers of relative
equilibria modulo rotation and scaling, and the Morse indices, are as in the table.

| class | description | labelled copies | rotation symmetry | Morse index | linear stability |
|---|---|---|---|---|---|
| (a) | regular pentagon | 24 | order 5 | 0 | stable |
| (b) | square with a vortex at its centre | 30 | order 4 | 0 | stable |
| (c) | collinear, positions 0, ±sqrt((5 ± sqrt 10)/2), the zeros of H_5 | 60 | order 2 | 3 | unstable, 3 real pairs |
| (d) | isosceles trapezoid with the fifth vortex inside, on its axis | 120 | none | 1 | unstable, 1 real pair |
| (e) | isosceles triangle with two interior vortices symmetric about its axis | 120 | none | 2 | unstable, 2 real pairs |

- The total is 354.
- Every one is nondegenerate as a critical point of H on C_5.
- The Morse polynomial of H on C_5 is 54 + 120t + 120t^2 + 60t^3.
- (a) and (b) are nonlinearly (Lyapunov) stable modulo rotation, by Roberts' Theorem 3.5.
- The coordinates of (d) and (e) are given with 30 digits in `data/n5_describe.txt` and
  `data/n5_classes.json`, normalized by (1). Each coordinate is enclosed to radius below 1e-73.

**Corollary (Kim's Remark 1.5 for N = 5).** The regular pentagon and the centred square are the
only stable relative equilibria of five identical vortices, whether stability means linear
stability, nonlinear stability, or a local minimum of H at fixed impulse. Every other relative
equilibrium has a real pair of eigenvalues.

Consistency (not part of the proof): H is proper and bounded below on C_5. It tends to +infinity at
collisions, and C_5 is compact modulo collisions once scale is fixed. So the Morse inequalities give
sum (-1)^index = chi(C_5) = (1-2)(1-3)(1-4) = -6. The count is 24 + 30 - 60 - 120 + 120 = -6.

## 4. The proof

### 4.1 Chart and a priori bounds (lemma, by hand)

Relabel so that vortex 1 has the largest modulus, and rotate so that z_1 = x_1 > 0. Then:
- From sum z_j = 0 and I = 10, we get I/N <= x_1^2 <= I (N-1)/N, that is x_1 in [sqrt 2, 2 sqrt 2].
  The upper bound holds because x_1^2 = |sum_{j>=2} z_j|^2 <= (N-1)(I - x_1^2).
- |z_j| <= x_1 for every j.
- z_N = -(z_1 + ... + z_{N-1}).
- Unknowns: v = (x_1, Re z_2, Im z_2, ..., Re z_{N-1}, Im z_{N-1}), dimension 2N-3 = 7.

A second relabelling of vortices 2..N orders the real parts, Re z_2 <= ... <= Re z_N. A reflection
(z -> conj z maps solutions of (1) to solutions and preserves the chart) then gives Im z_2 >= 0.

So every relative equilibrium has a representative in the compact box region R (the "sym" chart).
The unlabelled classes are exactly the orbits of the solutions in R.

### 4.2 Exclusion tests (each is a consequence of (1))

- T0: outside the chart. Some |z_j| > x_1, or the ordering fails.
- T1: sum |z_j|^2 != N(N-1)/2.
- T2: G_j != 0 for some j whose distances to the others are bounded below. The code uses the exact
  range of 1/w over a rectangle; see `cinv_tight` in `bnb.c`.
- T3: cluster identities, for every S with 2 <= |S| <= N-1 separated from its complement:
  - P_S = sum_{j in S} sum_{k notin S} 1/(z_j - z_k) - sum_{j in S} conj(z_j) = 0;
  - |S| sum_{j in S} (z_j - c_S) G_j = |S|^2(|S|-1)/2 + sum_{j in S} w_j sum_{k notin S} 1/(z_j - z_k)
    - sum_{j<k in S} |z_j - z_k|^2 = 0, with w_j = sum_{k in S}(z_j - z_k).
  - In the second identity the singular terms inside S sum exactly to the constant. So it stays
    bounded near a collision inside S, and at a collision it equals that nonzero constant.
  - These tests remove a neighbourhood of every collision. No lower bound on the minimal distance is
    needed. This is the vortex analogue of the Moczurad-Zgliczynski cluster tests.
- T4: mean-value form E(X) in E(m) + J(X)(X - m), and Krawczyk exclusion K(X) cap X = empty.

### 4.3 Existence and uniqueness

Square system:
E = (Re G_2, Im G_2, ..., Re G_{N-1}, Im G_{N-1}), Re G_1 (7 equations, 7 unknowns).

On the chart:
- sum_j G_j = 0 and Im sum_j z_j G_j = 0 hold identically.
- If E = 0, then G_1 = -G_N and Im((x_1 - z_N) G_1) = 0, so G_1 = 0 whenever Re z_N < x_1.
- Hence E = 0 implies (1) on every box where Re z_N < x_1, and the program checks this on each
  certified box.

A box is certified when the Krawczyk image of an inflated box lies in its interior. The box then
holds exactly one zero of E, hence exactly one solution of (1), and every Jacobian in J(X) is
nonsingular.

### 4.4 Second stage in arb (`code/classify.py`)

For every certified box, in 256-bit ball arithmetic:
- repeat the Krawczyk test;
- refine the solution by Newton's method and enclose it to radius 2^-200 by a second Krawczyk test
  inside the box;
- merge boxes that hold the same solution. A tight enclosure inside another box's uniqueness box
  means the same solution; disjoint enclosures mean different solutions; anything else is an error.

Relabelling and reflection classes, and each class's rotation and reflection symmetries:
- A relabelling p, followed by a rotation, maps solution s onto solution t exactly when the image of
  s's tight enclosure lies in t's uniqueness box. It certainly does not when the enclosures are
  disjoint. Anything else is an error.
- This decides symmetries exactly. In particular the order-5 and order-4 rotation symmetries of (a)
  and (b) are exact.
- The labelled count of a class is 5!/|rotation symmetry group|.
- The exact pentagon, the exact centred square and the collinear configuration at the zeros of H_5
  are each shown to lie in a uniqueness box. The zeros of H_5 are real and satisfy (1) by
  Stieltjes' relation; they are enclosed by arb. So these three classes are exactly the classical
  configurations.

### 4.5 Morse index and stability

Let W = sum_{j<k} log|z_j - z_k| - I/2 on R^10. At a solution, the Hessian of W has:
- eigenvalue -1 on the translations;
- eigenvalue -2 on the scaling direction z;
- eigenvalue 0 on the rotation direction iz.

Its restriction to the orthogonal complement T is minus the Hessian of H on C_5. So the Morse index
of H equals the number of positive eigenvalues of Hess W.

To count them, shift the rotation zero to -1 with a rank-one term, then certify the inertia by a
congruence with a floating eigenbasis and Gershgorin discs (Sylvester's law of inertia). This works
because the discs cannot meet 0, so nondegeneracy is proved too.

Linearization in the rotating frame: L = J Hess W, with J = blockdiag([[0,1],[-1,0]]).
- Index 0: T is L-invariant and Hess W is definite on T, so the spectrum on T is purely imaginary and
  semisimple (linear stability).
- Other indices: the characteristic polynomial of L, divided by the exact factor mu^2 (mu^2 + 1), is
  a polynomial P(mu^2) of degree 3. Certified sign changes of P locate its three real roots. The
  count of positive roots is the number of real eigenvalue pairs: 3, 1 and 2 for (c), (d) and (e).
  This is Roberts' theorem ("the Morse index is equal to the number of pairs of real eigenvalues",
  arXiv:1709.01242), confirmed directly.

### 4.6 What the proof trusts

The proof trusts the following:
- IEEE 754 double arithmetic with directed rounding (x86-64 SSE, GCC with `-frounding-math`), for
  + - * / and sqrt only.
- python-flint 0.9.0 (arb/FLINT).
- The hand-derived Jacobians, which are tested against automatic differentiation.
- The lemmas above.

Checks on that trust base (section 7):
- the interval operations against exact rationals;
- both C Jacobians and equations against arb automatic differentiation at random points.

One pitfall, found and fixed:
- glibc's printf and strtod honour the current (upward) rounding mode. Decimal output of a lower
  bound was therefore rounded up by one unit in the last place.
- All box output is now exact hexadecimal (`%a`), and all hex input is parsed exactly.
- The arb stage re-proves every box anyway.

## 5. Independent recount and the Newtonian check (`code/bnbA.c`, `code/classifyA.py`)

bnbA solves the central configuration problem for U = sum r^{2-A} (Hampton's exponent; A = 2 is the
vortex case). It shares no search code with bnb.c, only the interval header.

How it differs from bnb.c:
- Chart: max modulus z_1 = 1, with rotation and scale fixed and lambda eliminated. The unknowns are
  z_2, ..., z_{N-1} in the unit disc.
- Equations: the multiplier-free H_j = I sum_k (z_j - z_k)|z_j - z_k|^{-A} - U' z_j.
- Collisions are excluded by a partition identity over disjoint clusters. It also works for A > 2,
  where cluster sums blow up.
- Jacobian: the arb stage (classifyA.py) gets it by forward-mode automatic differentiation.

Results:
- **A = 2, N = 5:** 100 certified boxes, 11 distinct chart solutions, 5 classes, 354 labelled.
  Morse indices 0, 0, 3, 1, 2; Euler sum -6. This is the same answer as bnb.c
  (`data/n5_A2_classify.log`).
- **A = 3 (Newtonian), N = 5:** 5 classes, 354 labelled, Morse polynomial 54 + 120t + 120t^2 + 60t^3.
  This agrees with Moczurad-Zgliczynski ("Number of different cc = 5") and with Hampton's polynomial
  (`data/n5_A3_classify.log`).
- **N = 3 (both programs, A = 2 and 3):** the equilateral triangle (2 labelled) and the collinear
  configuration (3 labelled), Euler sum -1.

## 6. Hampton's exponent family (Conjecture 3 at sample exponents)

bnbA and classifyA.py were run for N = 5 at A = 2, 3, 6.5, 7 and 8. These are multiples of 1/2, so
r^{-A} needs only correctly rounded square roots. Every run is a complete certified search. Each
result below is proved in the same sense as Theorem 1, for that exponent only.

| A | classes | labelled | Morse polynomial | Hampton's Conjecture 3 predicts |
|---|---|---|---|---|
| 2 (vortices) | 5 | 354 | 54 + 120t + 120t^2 + 60t^3 | 54 + 120t + 120t^2 + 60t^3 (2 <= A < A5) |
| 3 (Newton) | 5 | 354 | 54 + 120t + 120t^2 + 60t^3 | same |
| 6.5 | 5 | 354 | 54 + 120t + 120t^2 + 60t^3 | same |
| 7 | 7 | 594 | 150 + 240t + 144t^2 + 60t^3 | 150 + 240t + 144t^2 + 60t^3 (A5 < A < Ac) |
| 8 | 7 | 594 | 120 + 240t + 174t^2 + 60t^3 | 120 + 240t + 174t^2 + 60t^3 (Ac < A) |

How the configurations change with A:
- At A = 7 the regular pentagon has index 2 instead of 0. Two new classes of 120 appear, with
  indices 0 and 1, consistent with a bifurcation from the pentagon at A5.
- At A = 8 the centred square has index 2 instead of 0. One of the index-0 classes has become index 2,
  consistent with Hampton's second bifurcation at Ac.
- In every case the Euler sum is -6 (asserted).

What this does and does not prove about Conjecture 3:
- It proves the conjectured Morse polynomial at the five sampled exponents. The sample includes both
  sides of A5 and of Ac.
- It does not prove the conjecture on the intervals.
- It says nothing about the values of A5 and Ac.

**Towards the intervals (not finished).** `code/bnbP.c` treats A as an extra coordinate of every box.
- It uses rigorous interval exp and log (`code/ivelem.h`, tested against arb).
- It uses a parametric Krawczyk test: one certified box holds exactly one solution for every A in its
  A-range, and the Jacobian is nonsingular there.
- At a solution, the Jacobian of the square system H_2..H_{N-1} is an invertible linear image of the
  Hessian of the scale-invariant potential on the shape space. The linear map is complex with
  determinant N/(1 - conj z_N) != 0. So a complete joint search over [2, A*] with no undecided box
  would prove that the count and every Morse index are constant on [2, A*]. That is Conjecture 3's
  first polynomial on [2, A*] for any A* < A5 reached.
- For N = 3 the joint search certifies all of A in [2, 7] in half a second: the equilateral triangle
  and the collinear configuration only, a classical fact.
- For N = 5, a trial on A in [2, 2.25] had not finished after 30 minutes on 3 cores. Interval
  evaluation over an A-range loses too much to cancellation, even with mean-value forms in A.
- The interval version of Conjecture 3 therefore remains open here. A faster formulation is the
  obvious next step.

## 7. Negative controls and tests (`code/controls.py`, `code/tests/`)

Tests of the trust base:
- `tests/test_ival.py`: 200,000 random interval operations (+, -, *, square, reciprocal, with signs
  and magnitudes from 2^-60 to 2^60) against exact rational arithmetic. 0 failures.
- `tests/test_ivelem.py`: 20,000 interval log, exp and power evaluations against arb. 0 failures;
  the excess width is at most 2e-13 relative.
- `tests/test_jacobians.py`: at random points, the C enclosures of E and of the hand-derived
  Jacobian, for bnb.c (N = 3..6) and bnbA.c (N = 3..6, A = 2, 2.5, 3, 6.5, 7), must contain the exact
  values from arb automatic differentiation. 0 mismatches.
  - This test found the printf/strtod rounding pitfall described in 4.6.

Negative controls (results in `data/controls.log`):
- C1: a small box around the exact pentagon is certified. Boxes around non-solutions are excluded,
  with no certified and no undecided box.
- C2: each mutated exclusion test (`--mutate=1..4`: wrong inertia constant, shifted G_j, cluster
  constant 0, shifted mean-value test) excludes the true solutions. There are 0 certified boxes,
  and the classification fails because the exact pentagon is not found.
  - The controls switch off only the guard that refuses mutated runs by their metadata, so the
    failure is substantive.
- C3: `--mutate=5` drops the contraction term of the Krawczyk operator. The broken operator then
  "excludes" boxes that contain solutions, so no box is certified and the classification fails.
  A false-certification mutation (no inflation, non-strict interior test) was run by the adversarial
  check: it left 96 undecided boxes and was refused.
- C4: without the cluster identities (`--no-cluster`, minimum width 1e-5) the collision set cannot be
  excluded, and the search leaves 2612 undecided boxes.
- Reference (unmutated, same driver): 5 classes, 354, Euler check passed.
- The perturbed potential changes the count where it should (section 6): the count is 354 for
  A < A5 and 594 for A = 7 and A = 8. The Euler sum is -6 in both regimes.
- N = 4 contains a degenerate relative equilibrium: the equilateral triangle with a vortex at its
  centre. Hess W has an extra double zero there (numerical). bnb correctly fails to certify it and
  leaves undecided boxes around it. So the program does not hide degeneracy. This case is outside the
  theorem.

## 8. N = 6 (same method, same checks)

The same program bnb.c was run for N = 6 (chart dimension 9, symmetry-reduced by 5!·2). The run was
split into 256 slices (`code/run6.sh`). All slices finished in 72 minutes on 4 cores, with no
timeout and no undecided box. classify.py checked that the slices cover every initial piece of the
chart, and then ran exactly as for N = 5 (`data/n6_classify.log`, `data/n6_classes.json`,
`data/n6_describe.txt`).

Results:
- 70 certified boxes, 14 distinct chart solutions, 8 classes.

**Theorem 2 (N = 6).** Up to translation, rotation, scaling and relabelling, six identical point
vortices have exactly eight relative equilibria, all reflection symmetric:

| class | description | labelled | rotation symmetry | Morse index | stability |
|---|---|---|---|---|---|
| regular hexagon | exact (identified) | 120 | 6 | 0 | linearly stable |
| regular pentagon with a vortex at its centre | exact (identified) | 144 | 5 | 0 | linearly stable |
| collinear, zeros of H_6 | exact (identified) | 360 | 2 | 4 | unstable (4 real pairs certified) |
| two equilateral triangles on the same three spokes (Aref's "two nested equilateral triangles ... on the same three spokes") | numerical description of a certified solution | 240 | 3 | 3 | unstable |
| three nested digons: four vortices on one axis, two on the perpendicular axis (Aref's "three nested digons") | as above | 360 | 2 | 2 | unstable |
| isosceles triangle hull with three interior vortices (one on the axis, one symmetric pair) | as above | 720 | 1 | 3 | unstable |
| convex pentagon hull, mirror symmetric, with one interior vortex on the axis | as above | 720 | 1 | 1 | unstable |
| isosceles trapezoid hull with two interior vortices mirror symmetric, no vortex on the axis | as above | 720 | 1 | 2 | unstable |

- The total is 3384.
- The Morse polynomial of H on C_6 is 264 + 720t + 1080t^2 + 960t^3 + 360t^4.
- The alternating sum is 264 - 720 + 1080 - 960 + 360 = 24 = chi(C_6) = (1-2)(1-3)(1-4)(1-5)
  (asserted).
- Every relative equilibrium is nondegenerate.
- Stability: only the hexagon and the centred pentagon are stable, linearly and, by Roberts'
  Theorem 3.5, nonlinearly. This is the N = 6 analogue of Kim's Remark 1.5.
- For every other class, at least one real eigenvalue pair is certified. For the class with order-3
  symmetry only 1 of its 3 real pairs is certified directly, because the symmetry makes the roots
  multiple. Instability needs only one.
- Aref (2007) lists five configurations for N = 6 and writes "We believe this is the complete list
  of relative equilibria for N = 6 but a rigorous proof is not available". His list is the first
  five rows of the table. The last three rows, with no rotation symmetry and 720 labelled copies
  each, are missing from it.
- As for N = 5, Faugere and Svartz's claim covers N = 6 implicitly, but no N = 6 list was found in
  print.
- The last class has a distance multiset with threefold multiplicities (for example √6 six times).
  It is nevertheless certified to have no rotation symmetry about its centre of vorticity:
  classify.py's exact rotation-group test gives order 1. Informally, its moduli (2.008, 1.687 and
  0.788, each twice) rule out orders 3 and higher, and z -> -z does not map it to itself.

Caveats specific to N = 6:
- Only the first program has been run to completion here. The bnbA recount was too slow (section
  8.1).
- The adversarial check (section 9, second round) reran the classification on the committed N = 6
  data, checked every row of the table, and recounted numerically with its own solver: 8 classes
  and 3384 labelled, with the same indices (numerical).

### 8.1 Independent N = 6 recount (not done)

The second program was started on N = 6 (`code/run6A.sh`: bnbA, A = 2, 256 slices). Only 2 slices
finished in 23 minutes on 4 cores, which projects to days, so it was stopped. Its partial output is
not committed.

Theorem 2 therefore rests on one search program (bnb.c) plus the arb stage. The only independent
count is the reviewer's numerical multistart, which is consistent but not a proof. A faster second
program, or a longer run, is the obvious next step before calling N = 6 settled with the same
redundancy as N = 5.

## 9. Adversarial check (independent subagent, 2026-09-26)

An independent subagent reviewed the work adversarially. It worked from a copy, with instructions
to rerun everything, audit the mathematics, mutate the exclusion and Krawczyk steps, recount by its
own method and re-open the prior-art sources.

**Its verdict, verbatim:** "The computations reproduce and I found no mathematical error. The
argument covers the whole search region, and every exclusion test is a correct consequence of (1).
An independent numerical recount and the project's second program (bnbA) give the same answer. I
consider Theorem 1 proved as stated, subject to the trust base the report lists (IEEE directed
rounding, gcc `-frounding-math`, python-flint)."

**What it checked:**
- It reran bnb and classify.py: 100 boxes, 11 chart solutions, 5 classes, 354, Euler sum -6. The
  three tests passed.
- It reran bnbA at A = 2 (533 s on one core) and got the same answer.
- It derived P_S and Q_S itself, and the constant |S|^2(|S|-1)/2 (via Lagrange's identity for the
  conj term).
- It audited:
  - the chart and a priori bounds;
  - the reduction E = 0 => (1);
  - the Krawczyk logic (preconditioner, inflation, strict interior, contraction, recursion);
  - the candidate set of the tight 1/w range, with 2,000,000 random rectangles and 0 failures;
  - directed rounding;
  - the symmetry logic and the formula 5!/|rotation group|;
  - the Hessian eigenstructure;
  - the congruence and Gershgorin inertia;
  - the index-0 invariance argument.
  All passed.
- It ran a harness of 240,000 random boxes around true solutions. There were 0 wrongful exclusions.
- Independent recount (numerical): its own damped Gauss-Newton solver from 100,000 random starts
  gave 5 classes and exactly 354 labelled configurations. Numerical Morse indices were 3, 1, 2, 0, 0.
  Nothing appeared beyond the five classes.
- Mutations: the five built-in ones and eight of its own. All were detected, except one: excluding
  the band 1.62 < x_1 < 1.65 removes class (d) only. classify.py then exited normally with 4 classes
  and 234 labelled. The printed Euler sum (114, not -6) was the only sign of the problem.
- Prior art: it verified the Aref, Faugere-Svartz, Hampton, Moczurad-Zgliczynski, Kim and Roberts
  quotes. It found the Svartz-thesis sentence (section 2), the ∞ entry in Faugere-Svartz's Table 1,
  and that Conjecture 3's range includes A = 2. Its three fresh searches found no rigorous N = 5 list
  published after 2012.

**Weak points it named, and what was done:**
1. The arb stage re-checks the certified boxes, never the exclusions. So completeness rests on the C
   exclusion code, and a bug that deletes one non-classical class is caught only by the Euler sum.
   - Fixed: classify.py and classifyA.py now fail unless the Euler sum equals chi = -6.
   - Also, completeness is established twice, by two programs whose exclusion code is independent
     (bnb.c and bnbA.c share only the tested interval header).
2. The run-completeness check was too weak.
   - Fixed: every STAT line now records the chart (`root=chart` or `custom`), the mutation flag,
     N, nsplit and the exponent. classify.py refuses mixed runs, control-box runs, mutated runs and
     runs with an undecided box. It checks that the finished slices cover every initial piece of
     the chart.
3. The isolating intervals of the stability polynomial were not checked to be disjoint.
   - Fixed: they are now checked, and certification is withheld otherwise.
4. The arb Krawczyk could reject a valid bnb box (its Jacobian enclosure was looser).
   - Fixed: on failure, classify.py retries with the Jacobian hull over 2^7 sub-boxes, as the
     reviewer did by hand.
5. Prior-art nuances. Added to section 2.

**Second round (the fixes and N = 6).**

Verdict on Theorem 2, verbatim: "reproduced, and I believe it is proved to the same standard as
Theorem 1". Its own multistart (150,000 starts, numerical) found the same 8 classes, 3384 labelled
copies and Morse indices 4, 3, 3, 2, 2, 1, 0, 0.

On the fixes: "sound, with one real hole". A slice with worker >= nworkers searches nothing but was
counted as covering its residue. The reviewer demonstrated this on N = 5; only the Euler assertion
caught it.
- Fixed: bnb, bnbA and bnbP refuse such a worker index, and check_complete asserts
  0 <= worker < nworkers.

Smaller points:
- The exploratory skip of the completeness check was silent.
  - Fixed: every classification now prints "completeness check passed" or a warning, and the
    committed logs show the former.
- An undecided stability was not asserted.
  - Fixed: it is now asserted.
- The class-7 sentence of section 8 was incomplete.
  - Fixed.

## 10. Reproduce

Requirements: gcc on x86-64, Python 3 with python-flint (0.9.0 used), numpy and mpmath. From
`code/`:

```
sh run_all.sh quick     # build, tests, N = 3 and the N = 5 proof (about 2 minutes on 4 cores)
sh run_all.sh           # also bnbA at A = 2, 3, 6.5, 7, 8 and the negative controls (about 1.5 h)
```

The individual steps:
```
gcc -O2 -frounding-math -fno-fast-math -fno-math-errno -std=gnu11 -o bnb bnb.c -lm
for w in 0 1 2 3; do ./bnb 5 4096 $w 4 1e-11 --sym > ../data/run5sym/w$w.txt & done; wait
python3 classify.py 5 ../data/run5sym/w*.txt --json=../data/n5_classes.json
python3 describe.py ../data/n5_classes.json
gcc ... -o bnbA bnbA.c -lm
for w in 0 1 2 3; do ./bnbA 5 2 1024 $w 4 1e-11 --sym > ../data/runA2/w$w.txt & done; wait
python3 classifyA.py 5 2 ../data/runA2/w*.txt
python3 controls.py
```

The committed data (`data/`) are the outputs of `sh run_all.sh` on 2026-09-26. `run_all.log` is the
full log.

## 11. Limitations

- The proof is computer-assisted. It is correct only if the following are correct:
  - IEEE 754 arithmetic with directed rounding as compiled by GCC with `-frounding-math`, for
    + - * / and sqrt; frexp and ldexp are also used by the exp/log code, which only bnbP needs;
  - python-flint;
  - the lemmas of section 4.
  Mitigations: the tests of section 7 and two independent searches.
- Nothing here has been checked by a person.
- The N = 5 list is not new as a claim. Faugere and Svartz (2012) state that their exact method covers
  N <= 7. What is new is the explicit certified list with indices and stability, by a second method,
  and the resulting answer to Kim's Remark 1.5 for N = 5.
- Theorem 2 (N = 6) has one search program behind it, not two (section 8.1).
- Hampton's Conjecture 3 is verified only at the five sampled exponents, not on intervals, and
  nothing is proved about A5 and Ac.
- The descriptions "isosceles trapezoid" and "isosceles triangle" rest on the exact reflection
  symmetry proved by classify.py (one vortex on the axis, two swapped pairs) and on the convex hull
  of the certified enclosures (describe.py; floating point at 40 digits on enclosures of radius
  < 1e-73).
- The per-tab ledger RESEARCH.md was not edited, because the task restricts changes to this folder.
  Its "open problems in point-vortex dynamics" entry should point here when this is merged.
