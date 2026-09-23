// Presentable research note for external checkers / journal editors.
// Campaign-authored text only. No copyrighted extracts.
#set page(paper: "us-letter", margin: (x: 1in, y: 1in), numbering: "1")
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.")
#show link: underline
#show table: set par(justify: false)
#show table: set align(left)

#align(center)[
  #text(size: 14pt, weight: "bold")[
    Unequal-μ product floors and the n=5 polygon floor
  ]
  #v(0.6em)
  #text(size: 11pt)[Chase Hendrick]
  #v(0.3em)
  #text(size: 9.5pt)[
    Found / derived in the SharpMeow/GENChase validation campaign (2026). \
    Cite the author by name. Do not attribute to the GitHub handle SharpMeow. \
    Do not treat this note as a personal theorem stamp (no “Hendrick’s Identity / Law”).
  ]
  #v(0.4em)
  #text(size: 9pt)[Version 2, revised 2026-09-23 (America/New_York). Companion markdown and the validation script are in-repo under `research/`.]
]

#v(0.8em)

#align(center)[*Abstract*]
#v(0.3em)

We record exact closed forms for classical point-vortex collapse floors, where the floor is the minimum of the spin–collapse product $omega_0 t_c$ (initial rotation rate times collapse time) over a self-similar collapsing family. (i) For $Gamma = (1, 1\/2, -1\/3)$ the angular-impulse-zero ($L = 0$) family has *two* collapsing branches, one for each orientation of the triangle. Their floors are the two positive real roots of one irreducible sextic: $P_"min" approx 1.064706$ (the global floor) and $P_star approx 2.203855$ (the floor on the branch covered by Gotoda’s $L=0$ arc, which version 1 of this note reported as the μ = 1/2 floor). (ii) The $n=5$ specialization $F_5 = sqrt(31682)\/80$ of the two-ring polygon floor $F_n$. Both results were re-derived from raw Biot–Savart velocities, independently of the formulas they replace, and the algebra was checked in exact arithmetic. They are *proved candidates*; *priority is unconfirmed*.

#block(fill: luma(240), inset: 8pt, radius: 3pt, width: 100%)[
  *Correction to version 1.* Version 1 called $P_star approx 2.2039$ “the μ = 1/2 product floor”. $P_star$ is the minimum on Gotoda’s arc $0 < theta < theta_0$ only. The opposite orientation, $pi < theta < 2 pi - theta_0$ in the same parametrization, also collapses, and its minimum $P_"min" approx 1.0647$ is lower. The original derivation found this critical point ($cos theta approx -0.9244$) and set it aside as “on the expanding side”; that is true for $sin theta > 0$, but with $sin theta < 0$ the configuration collapses. Every algebraic statement about $P_star$ in version 1 remains correct.
]

= Statements

== μ = 1/2: two collapsing branches, two floors

Place the vortices $Gamma = (1, 1\/2, -1\/3)$ on Gotoda’s $L=0$ circle construction with parameter $theta$ and the $2 pi$ Biot–Savart kernel. The product is

$ P(theta) = omega_0 t_c = (14 sin^2 theta + 6 sqrt(7) cos theta + 21) / (2 (14 cos theta + sqrt(7)) sin theta) . $

With $cos theta_0 = -sqrt(7)\/14$, the configuration collapses exactly on two open arcs:

- *Branch B* (Gotoda’s arc): $0 < theta < theta_0 approx 100.89 degree$.
- *Branch A* (opposite orientation): $pi < theta < 2 pi - theta_0 approx 259.11 degree$.

On each arc $P > 0$, $P -> +infinity$ at both ends, and $P$ has exactly one critical point. With

$ X = (245351 sqrt(5201)) / 5201^2 , quad R = (7 sqrt(5201)) / 162 , $

the two floors are

$ P_"min" = sqrt(605/324 + R cos(1/3 arccos X - (2 pi)/3)) approx 1.064705976271204 , $

$ P_star = sqrt(605/324 + R cos(1/3 arccos X)) approx 2.203855016036133 . $

$P_"min"$ is the minimum on branch A and is the global floor; $P_star$ is the minimum on branch B.

Both are roots of the irreducible sextic

$ 8748 x^6 - 49005 x^4 + 27794 x^2 + 18723 = 0 , $

whose real roots are exactly $plus.minus P_"min"$ and $plus.minus P_star$. Equivalently $P_"min"^2 approx 1.133599$ and $P_star^2 approx 4.856977$ are the two positive roots of the irreducible cubic $8748 q^3 - 49005 q^2 + 27794 q + 18723 = 0$, whose third root is negative. The two floors are Galois conjugates. The critical cosines are the roots of $196 c^3 + 224 sqrt(7) c^2 + 14 c - 128 sqrt(7) = 0$ with $c approx 0.673984$ (branch B) and $c approx -0.924389$ (branch A). As $mu -> 1$ the two branch minima merge into the classical equal-strength floor $sqrt(2)$.

*Disclaimer.* This is the classical Gotoda / Aref unequal-circulation family: closed forms for its floors, not a new interaction law. The formula uses the corrected product (Gotoda Prop. 2.1), not the Gotoda (3.3)–$B$ specialization, which disagrees with direct Biot–Savart when $Gamma_1 != Gamma_2$ and gives a spurious $approx 1.741$.

=== Proof sketch

+ *Critical points.* Setting $d P \/ d theta = 0$ and writing $c = cos theta$ gives the cubic above (checked symbolically). The substitution $c = sqrt(7) u$ makes it rational: $1372 u^3 + 1568 u^2 + 14 u - 128 = 0$, with exact real roots $u approx -1.0482, -0.3494, 0.2547$.
+ *One critical point per arc.* Exact real-root isolation over $QQ$ puts exactly one root in each arc’s cosine range: $u in (-1\/14, 1\/sqrt(7))$ for branch B and $u in (-1\/sqrt(7), -1\/14)$ for branch A. The third root has $|c| > 1$.
+ *Blow-up at the ends.* The numerator is positive at every arc end ($6 sqrt(7) + 21$ at $theta -> 0^+$, $63\/2$ at $cos theta = -sqrt(7)\/14$, and $21 - 6 sqrt(7) > 0$ at $theta -> pi^+$) while the denominator tends to $0$ with the sign that makes $P -> +infinity$. With one critical point, each branch has a unique global minimum.
+ *Minimal polynomial.* An independent resultant elimination of $c$ and $sqrt(7)$ gives exactly $(8748 P^6 - 49005 P^4 + 27794 P^2 + 18723)^2$. The sextic is irreducible over $QQ$ and over $QQ(sqrt(7))$, and the cubic in $q = P^2$ has positive discriminant (casus irreducibilis), so the trigonometric Cardano forms cannot be reduced to real radicals. The branches $k = 0$ and $k = 1$ of $cos(1\/3 arccos(X) - 2 pi k \/ 3)$ give $P_star^2$ and $P_"min"^2$.

== n = 5 polygon-collapse floor

Specialize the classical two-ring polygon collapse family (Koiller et al. 1985 §11) at $n=5$: five vortices of strength $2$ on the unit regular pentagon and five of strength $-1$ at radius $sqrt(2)$, relative rotation $theta$. With the $2 pi$ kernel the configuration collapses self-similarly for every $0 < theta < pi\/5$, and

$ omega_0 t_c = (127 sqrt(2) - 24 cos(5 theta)) / (80 sin(5 theta)) >= sqrt(31682)\/80 , $

with equality exactly when $cos(5 theta_*) = 12 sqrt(2) \/ 127$. So

$ F_5 = sqrt(31682)\/80 = 2.224929774172659 dots , $

the $n=5$ case of

$ F_n = sqrt(K_n^2 - (2n-1)) / (2n) , quad K_n = (n-1) sinh( (n+2)/2 op("arcosh") n/(n-1) ) , $

alongside $F_2 = 3 sqrt(5)\/4$, $F_3 = sqrt(29)\/3$ and $F_4 = sqrt(322)\/9$. This is not a new dynamical family.

=== Proof sketch

+ The inner strength is $x_5 = e^(op("arcosh")(5\/4)) = 2$, so $K_5 = 2 (2^(7\/2) - 2^(-7\/2)) = 127 sqrt(2)\/8$ exactly.
+ The product $omega_0 t_c = (K_5 - 3 cos(5 theta)) \/ (10 sin(5 theta))$ clears to the quotient above.
+ The elementary bound $(a - b cos alpha)\/sin alpha >= sqrt(a^2 - b^2)$ on $0 < alpha < pi$, with $a = 127 sqrt(2)$ and $b = 24$, has equality at $cos alpha = b\/a$ and gives $sqrt(31682)\/80$. Consistently, $F_5 = (sqrt(K_5^2 - 9)) / 10$.

= Independent validation (version 2)

Script: `research/verify_floors_independent.py` (Python, mpmath and sympy, about 25 s). Results: `research/artifacts/verify-floors-independent-2026-09-23.json`. The check does not reuse Gotoda’s rates, the repo’s JavaScript verifiers or the formulas above. It computes each vortex velocity from the $2 pi$ Biot–Savart law. A configuration collapses self-similarly exactly when every velocity is $kappa (z_j - z_c)$ for one complex $kappa$ about the centre of vorticity. Then $|z|^2$ shrinks linearly and $omega_0 t_c = |op("Im") kappa| \/ (-2 op("Re") kappa)$.

#table(
  columns: (2.2fr, 1.8fr),
  stroke: 0.4pt,
  inset: 5pt,
  [*Check (60-digit arithmetic unless stated)*], [*Result*],
  [Every $L=0$ triangle for $Gamma=(1,1\/2,-1\/3)$ (a circle of shapes, 4000 samples): self-similarity residual], [$<= 9 times 10^(-61)$ relative; exactly half the circle collapses],
  [Minima of $omega_0 t_c$ over the collapsing part], [two branches: $1.0647059762712043373549 dots$ (counter-clockwise $1 -> 2 -> 3$) and $2.2038550160361327939941 dots$ (clockwise)],
  [Closed forms above versus those minima], [agree to all 40 digits printed],
  [$P(theta)$ versus raw Biot–Savart at Gotoda’s own positions, 399 points on each arc], [$<= 10^(-59)$ relative on both; every branch-A point collapses],
  [Both branch minima as $mu -> 1$ ($mu = 0.9, 0.99, 0.999, 1$)], [$(1.3399, 1.4983)$, $(1.4067, 1.4218)$, $(1.41346, 1.41496)$, then both $sqrt(2)$; $mu$ and $1\/mu$ give identical values],
  [Time integration of the three-vortex ODE (Taylor method, 30 digits) at the $P_"min"$ configuration], [size² follows the self-similar line to $<= 5 times 10^(-31)$ relative up to $0.9 t_c$],
  [Exact algebra (sympy): critical cubic, one root per arc, resultant, irreducibility over $QQ$ and $QQ(sqrt(7))$, positive discriminant], [all confirmed],
  [Two-ring family, $n = 2, dots, 8$: self-similar for every $theta$; minimum over $theta$ versus the $F_n$ formula], [residual $<= 10^(-60)$; minima match $F_n$ to $<= 2 times 10^(-60)$],
  [$n=5$ curve versus $(127 sqrt(2) - 24 cos 5 theta)\/(80 sin 5 theta)$; $F_2, dots, F_5$ radicals], [$<= 10^(-58)$ relative; radicals match to $<= 10^(-34)$],
  [$K_5 = 127 sqrt(2)\/8$, $F_5 = sqrt(31682)\/80$, $cos 5 theta_* = 12 sqrt(2)\/127$ (exact)], [confirmed symbolically],
)

The check covers the stated families only. It does not show that no other configuration class for these circulations collapses more slowly per turn.

= Literature (floor-kill and priority)

#table(
  columns: (1.4fr, 1fr, 1.6fr),
  stroke: 0.4pt,
  inset: 5pt,
  [*Source*], [*Access*], [*Verdict*],
  [Koiller et al. (1985)], [Full text read], [*DOES NOT KILL* optimized product floors],
  [Aref, Phys. Fluids 25 (1982)], [AIP PPV + OCR], [*DOES NOT KILL*: center-of-symmetry / Havelock; no floor literals],
  [O’Neil, Physica D 236 (2007)], [ScienceDirect PPV], [*DOES NOT KILL*: triple-ring RE/collapse; no optimized floors],
  [Outside-family pass (web, OA, arXiv needles; GENChase PR \#128)], [Open web], [*STILL OPEN* for $P_star$ and $F_5$],
  [LITERATURE_V2_ROWS], [], [],
)

*Limits.* Negative searches are not a novelty certificate. Priority remains unconfirmed.

Copyrighted PDFs are not redistributed with this note.

= What would still kill priority

Any prior publication of the closed or minimal-polynomial form of $P_"min"$ or $P_star$, or their decimals as product floors, of the two-branch structure of the μ = 1/2 floor, of $F_5 = sqrt(31682)\/80$ or an equivalent, of the same Gotoda μ = 1/2 minimization, or of the same $K_5$ clearance into $sqrt(a^2-b^2)$, would kill or demote priority while leaving the algebraic checks intact.

= Suggested citation

Closed forms for the two μ = 1/2 three-vortex product floors $P_"min" approx 1.064706$ (global) and $P_star approx 2.203855$ (Gotoda’s $L=0$ branch), and for the $n=5$ polygon floor $F_5 = sqrt(31682)\/80$, were derived by Chase Hendrick (2026) in the SharpMeow/GENChase validation campaign. Status: proved candidates, priority unconfirmed. Classical families only.

= Anti-claims

- No novelty claim beyond “closed form / explicit radical written down and checked in this campaign.”
- No personal named theorem.
- No `IDENTITIES.md` edit from this file.
- Literature verdicts are floor-kill only.

= References

LITERATURE_V2_REFS
