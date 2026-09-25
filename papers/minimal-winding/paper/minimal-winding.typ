#set document(title: "Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons", author: "Chase Hendrick")
#set page(paper: "us-letter", margin: (x: 1in, y: 1in), numbering: "1")
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.")
#set math.equation(numbering: none)
#show math.equation.where(block: false): box
#show math.equation.where(block: true): it => {
  if it.has("label") and it.numbering == none { math.equation(block: true, numbering: "(1)", it) } else { it }
}
#show ref: it => {
  let el = it.element
  if el != none and el.func() == math.equation {
    link(el.location(), numbering("(1)", ..counter(math.equation).at(el.location()).map(n => n + 1)))
  } else {
    it
  }
}
#show table: set par(justify: false)
#show figure.caption: set text(size: 9.5pt)

#align(center)[
  #text(size: 14pt, weight: "bold")[
    Minimal winding in the self-similar collapse of \
    three point vortices and of two concentric vortex polygons
  ]
  #v(0.7em)
  #text(size: 11pt)[Chase Hendrick]
  #v(0.2em)
  #text(size: 9.5pt)[Independent Researcher]
  #v(0.1em)
  #text(size: 9.5pt)[#link("mailto:chasewhendrick@gmail.com")[`chasewhendrick@gmail.com`]]
  #v(0.1em)
  #text(size: 9.5pt)[ORCID #link("https://orcid.org/0009-0002-9754-6087")[0009-0002-9754-6087]]
]

#v(1em)

#pad(x: 2.2em)[
  #text(size: 10pt)[
    *Abstract.* In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the dimensionless number $P = |omega_0| t_c$, the initial angular velocity times the collapse time, measures how tightly the spiral winds. We minimize $P$ over two classical collapsing families. Every self-similar collapse of three point vortices can be normalized to circulations $(1, mu, -mu\/(1 + mu))$ with $0 < mu <= 1$ and zero angular impulse. For each $mu$ the collapsing configurations form two arcs, one for each orientation of the vortex triangle, and $P$ has exactly one critical point, a minimum, on each. The squares of the two minima are roots of an explicit cubic whose coefficients are polynomials in $mu$, and for $mu < 1$ the two minima differ. The smaller one increases strictly from $sqrt(3)\/2$, approached as $mu -> 0$, to $sqrt(2)$ at $mu = 1$. Hence $P > sqrt(3)\/2$ for every self-similar collapse of three point vortices, and the constant is sharp; equivalently, every vortex travels more than twice its initial distance from the collision point. For $mu = 1\/2$ the two minima are $1.0647059762 dots$ and $2.2038550160 dots$, the positive roots of $8748 xi^6 - 49005 xi^4 + 27794 xi^2 + 18723$, and they are not expressible by real radicals. For two concentric regular $n$-gons with circulations $x_n$ and $-1$, $P = (K_n - sqrt(2n - 1) cos n theta) \/ (2n sin n theta)$ in terms of the relative rotation $theta$, with an explicit constant $K_n$, and the minimum over $theta$ is $sqrt(K_n^2 - 2n + 1) \/ (2n)$; for pentagons it is $sqrt(31682)\/80$. All formulas are also checked against the Biot–Savart velocities in high-precision arithmetic.

    #v(0.4em)
    *Keywords:* point vortices; vortex collapse; self-similar motion; logarithmic spiral. \
    *MSC 2020:* 76B47, 37N10.
  ]
]

= Introduction

Three point vortices collapse self-similarly only if $1\/Gamma_1 + 1\/Gamma_2 + 1\/Gamma_3 = 0$ and their angular impulse about the center of vorticity vanishes (Lemma 2 below). Under these conditions every configuration moves self-similarly: the triangle keeps its shape and rotates while it shrinks to a point in finite time, expands, or rotates rigidly [9, Sect. 4.5.2], [18]. Such collapse was found by Gröbli [11] and found again by Aref [1] and by Novikov and Sedov [22], who also constructed collapsing configurations of four and five vortices; see [4, p. 17, Fig. 3] for the history and [21] for the general theory. Synge [25, Sect. 4, Theorem 8] identified $Gamma_1 Gamma_2 + Gamma_2 Gamma_3 + Gamma_3 Gamma_1 = 0$ as an exceptional case: the configurations whose shape lies on a certain conic in his trilinear coordinates then come in one-parameter families of similar triangles, so that the shape does not determine the size. Conte and de Seze [6] solved the motion of three vortices of arbitrary circulations exactly and showed that when $sum_(j < k) Gamma_j Gamma_k = 0$ and the angular impulse vanishes, each vortex runs a logarithmic spiral about the center of vorticity while the triangle keeps its shape, and the configuration either collapses in finite time or expands [6, Sect. 4]. Kimura [16] studied similarity solutions of point-vortex systems, Aref [3] derived formulas for the rate of collapse or expansion and the angular frequency of rotation, and Gotoda [10] gave explicit formulas for the self-similar motions of three vortices. Borisov and Lebedev [5] obtained conditions for the collapse and the scattering of three vortices within the Lie–Poisson formulation of the problem, and Krishnamurthy, Aref and Stremler [18] recast the motion of three vortices in terms of the circumcircle and the interior angles of the vortex triangle and derived equations of motion for these quantities. Collapse also occurs in configurations of higher symmetry. Aref [2] reduced the motion of two concentric regular $n$-gons of vortices to an integrable Hamiltonian system with two degrees of freedom, and Koiller et al. [17] found collapsing configurations of two such rings, whose vortices move on logarithmic spirals. Demina and Kudryashov [7, Sect. 3] gave explicitly a family of such configurations that collapse or scatter, with an additional vortex, possibly of zero circulation, at the center, together with the complex constant that determines their rates of collapse and rotation.

In a self-similar collapse at time $t_c$ the configuration has rotated by time $t$ through the angle $-omega_0 t_c ln(1 - t\/t_c)$, where $omega_0$ is the initial angular velocity. The angular velocity at time $t$ is $omega_0 t_c \/ (t_c - t)$, so the product of the angular velocity and the remaining time does not depend on which instant is taken as initial. Each vortex moves on a logarithmic spiral about the collision point, whose exponent is fixed by this product [22, p. 298], [6, Sect. 4], [3, Eq. (29c)], and the dimensionless number $P = |omega_0| t_c$, which is invariant under rescaling of lengths, times and circulations, is the angle through which the configuration turns while the square of its size decreases by the factor $e$. Equivalently, the path of each vortex makes the constant angle $arctan 2P$ with the direction to the collision point, and a vortex that starts at distance $r_0$ from that point travels the distance $r_0 sqrt(1 + 4P^2)$ before the collapse. Within a collapsing family it is natural to ask which configuration winds least.

For three vortices we answer this question for every ratio of the circulations (Section 3). After normalization the circulations are $(1, mu, -mu\/(1 + mu))$ with $0 < mu <= 1$. The collapsing configurations form two arcs, one for each orientation of the triangle, and $P$ has a unique minimum on each (Theorem 1). For $mu < 1$ the two minima differ, and the smaller one increases strictly with $mu$, from $sqrt(3)\/2$ as $mu -> 0$ to $sqrt(2)$ at $mu = 1$, the value for two equal circulations. Thus $P > sqrt(3)\/2$ for every self-similar collapse of three vortices, and the bound is sharp (Corollary 1); the bound also has a short direct proof from Lemma 3 and an elementary inequality. For $mu = 1\/2$ the two minima are conjugate algebraic numbers of degree six, given explicitly in Proposition 1. In Section 4 we treat two concentric regular $n$-gons, for which the minimization reduces to an elementary inequality once $P$ is written in a suitable form. Section 5 describes an independent numerical check.

= Self-similar collapse

The positions $z_j in CC$ of point vortices with circulations $Gamma_j$ evolve according to

$ overline(dot(z)_j) = 1/(2 pi i) sum_(k != j) Gamma_k / (z_j - z_k) . $ <eq:bs>

Suppose $sum_j Gamma_j != 0$, let $z_c = sum_j Gamma_j z_j \/ sum_j Gamma_j$ be the center of vorticity, which is conserved, and suppose that at $t = 0$ there is $kappa in CC$ with $dot(z)_j = kappa (z_j - z_c)$ for all $j$. The right-hand side of @eq:bs is homogeneous of degree $-1$ in the relative positions and equivariant under rotations, so the solution is $z_j (t) = z_c + lambda(t) e^(i phi(t)) (z_j (0) - z_c)$ with $lambda dot(lambda) = op("Re") kappa$ and $lambda^2 dot(phi) = op("Im") kappa$. Hence $lambda^2 = 1 + 2 t op("Re") kappa$. If $op("Re") kappa < 0$ the vortices collide at $z_c$ at the time $t_c = -1\/(2 op("Re") kappa)$, and $omega_0 = op("Im") kappa$, so that

$ P = |omega_0| t_c = (|op("Im") kappa|) / (-2 op("Re") kappa) . $ <eq:P>

Integrating $dot(phi) = omega_0 \/ lambda^2$ gives $phi = -P ln lambda^2$ when $omega_0 > 0$, which is the description of the spiral given in the introduction. This is Kimura's similarity solution [16, Sect. 3.1]: up to the factor $2 pi$ in his normalization of the circulations, $kappa$ is his constant $A + i B$, @eq:P reads $P = |B| \/ (-2A)$, and the spirals and the collision time $t_c = -1\/(2A)$ are his Eqs. (3.7) and (3.9). Earlier, Conte and de Seze [6, Sect. 4, pp. 24–25] wrote this motion as $z_j = z_(j,0) (1 - t\/t_c)^(1\/2 - i omega t_c)$ and gave $-2 omega + i\/t_c$ in closed form in their shape variable; there $omega$ is the initial angular velocity, so $|omega t_c| = P$. Demina and Kudryashov [7, Eqs. (7)–(12)] derive the same solution, like Kimura for any number of vortices but with the normalization of @eq:bs, so that their complex constant $c_1$ equals $kappa$; they give the collapse time $1\/(2 |op("Re") c_1|)$ [7, Eq. (12)] and the rotation angle $(op("Im") c_1 \/ (2 op("Re") c_1)) ln(1 + 2 t op("Re") c_1)$ [7, Eq. (10)], whose coefficient has absolute value $P$. Gallay and Šverák [9, Prop. 5.2, Eqs. (5.5), (5.11)] write the collapsing solution as $z_j (t) = (1 - t\/T)^(1\/2 + i s) a_j$ with $z_c = 0$; comparing the two descriptions gives $T = t_c$ and $s = -omega_0 t_c$, so $|s| = P$. The angular impulse about the center of vorticity satisfies

$ sum_j Gamma_j |z_j - z_c|^2 = 1/(sum_j Gamma_j) sum_(j < k) Gamma_j Gamma_k |z_j - z_k|^2 . $ <eq:L>

It is conserved and, in a self-similar motion, proportional to $lambda^2$, so it must vanish for a collapse. Two of the minimizations below (Remark 2 and Proposition 2) and the direct proof of Corollary 1 reduce to the following elementary inequality.

*Lemma 1.* _Let $a > |b|$. For $0 < alpha < pi$, $(a - b cos alpha) \/ sin alpha >= sqrt(a^2 - b^2)$, with equality if and only if $cos alpha = b\/a$._

_Proof._ The numerator is positive, and $(a - b cos alpha)^2 - (a^2 - b^2) sin^2 alpha = (a cos alpha - b)^2$. #h(0.6em) #h(1fr) $square$

= Three vortices

== Normalization and the collapsing configurations

The Hamiltonian $H = -(4 pi)^(-1) sum_(j < k) Gamma_j Gamma_k ln |z_j - z_k|^2$ of @eq:bs is conserved. We call a collapse self-similar if all mutual distances are $lambda(t)$ times their initial values, with $lambda(t) -> 0$ in finite time.

*Lemma 2.* _In a self-similar collapse of three point vortices all circulations are nonzero, $1\/Gamma_1 + 1\/Gamma_2 + 1\/Gamma_3 = 0$, $sum_j Gamma_j != 0$, and the angular impulse about the center of vorticity vanishes._

_Proof._ The harmonic condition and the vanishing of the angular impulse are the classical necessary conditions [3, Sect. II B] (see also [16, Eqs. (3.20)–(3.21), (3.33)], [5, Sect. 3] and, for both conditions and any number of vortices, [7, Eqs. (26)–(28)]); we include the short argument. Along the motion

$ H = H(0) - 1/(4 pi) (sum_(j < k) Gamma_j Gamma_k) ln lambda^2 , $

and $ln lambda^2 -> -infinity$, so $sum_(j < k) Gamma_j Gamma_k = 0$. If one circulation vanished, this would force a second one to vanish; the remaining vortex would then be at rest and the other two would move on circles about it, so no collapse would occur. Hence all $Gamma_j != 0$, and $sum_(j < k) Gamma_j Gamma_k = Gamma_1 Gamma_2 Gamma_3 sum_j 1\/Gamma_j$ gives the harmonic condition. Moreover $(sum_j Gamma_j)^2 = sum_j Gamma_j^2 > 0$. Finally, the angular impulse @eq:L is conserved and proportional to $lambda^2$, so it vanishes. #h(0.6em) #h(1fr) $square$

By Lemma 2 two of the three circulations of a self-similarly collapsing configuration have the same sign. Multiplying all circulations by a positive constant rescales time and leaves $P$ unchanged. Multiplying them by $-1$ reverses time, and so does complex conjugation of the positions; the composition of the two maps solutions of @eq:bs to solutions, and collapsing solutions to collapsing solutions with the same $P$. After relabeling we may therefore assume, as Gotoda does [10, Sect. 3],

$ Gamma = (1, mu, -mu/(1 + mu)) , quad 0 < mu <= 1 . $ <eq:norm>

Then $sum_j Gamma_j = R\/(1 + mu) > 0$, where $R = 1 + mu + mu^2$. For $w = (z_3 - z_1)\/(z_2 - z_1)$ the sum $sum_(j < k) Gamma_j Gamma_k |z_j - z_k|^2$ in @eq:L equals $mu (1 + mu)^(-1) |z_2 - z_1|^2 (1 + 2 mu op("Re") w - (1 + mu)|w|^2)$, which vanishes exactly on the circle $|w - mu\/(1 + mu)| = sqrt(R)\/(1 + mu)$. This circle appears in Kimura [16, Eqs. (3.34)–(3.35)], who notes that it splits into two arcs of collapse and two of expansion, and in Aref [3, Eq. (20a)]; we use the parametrization of it given by Gotoda [10, Sect. 3]:

$ z_1 = (mu (1 + sqrt(R) e^(-i theta))) / (1 + mu)^2 , quad z_2 = (mu - sqrt(R) e^(-i theta)) / (1 + mu)^2 , quad z_3 = 1 , quad theta in [0, 2 pi) . $ <eq:pos>

Here $sum_j Gamma_j z_j = 0$, so $z_c = 0$, and

$ z_1 - z_2 = (sqrt(R) e^(-i theta)) / (1 + mu) , quad z_3 - z_1 = (sqrt(R) (sqrt(R) - mu e^(-i theta))) / (1 + mu)^2 , quad z_3 - z_2 = (sqrt(R) (sqrt(R) + e^(-i theta))) / (1 + mu)^2 . $ <eq:diff>

The shape ratio is $w = mu\/(1 + mu) - (sqrt(R)\/(1 + mu)) e^(i theta)$, which traverses the zero-impulse circle exactly once, so every zero-impulse configuration is obtained, up to translation, rotation and dilation, for exactly one $theta$. Since $op("Im") w = -(sqrt(R)\/(1 + mu)) sin theta$, the triangle $z_1 z_2 z_3$ is negatively oriented for $sin theta > 0$ and positively oriented for $sin theta < 0$. Put $C = sqrt(R) cos theta$ and

$ N(C) = 2 (1 + mu^2) R + (1 - mu)(2 + mu + 2 mu^2) C - 2 mu C^2 , quad M(C) = 1 - mu + 2 C . $

*Lemma 3.* _For every $theta$ the three quotients $dot(z)_j \/ (z_j - z_c)$ are equal to_

$ kappa = (i (1 + mu)^3) / (2 pi sqrt(R)) dot (sqrt(R) + (1 - mu) e^(i theta)) / ((sqrt(R) - mu e^(i theta)) (sqrt(R) + e^(i theta))) , $

_and, with $D = (R + mu^2 - 2 mu C)(R + 1 + 2 C) > 0$,_

$ op("Re") kappa = - ((1 + mu)^3 mu M(C) sin theta) / (2 pi sqrt(R) D) , quad op("Im") kappa = ((1 + mu)^3 N(C)) / (2 pi R D) . $

_Moreover $N(C) > 0$ for every $theta$._

_Proof._ Since $z_c = 0$ and $z_3 = 1$, $kappa = dot(z)_3$, and by @eq:bs, $overline(dot(z)_3) = (2 pi i)^(-1) ((z_3 - z_1)^(-1) + mu (z_3 - z_2)^(-1))$. Inserting @eq:diff gives the stated $kappa$. The same computation for $j = 1$ and $j = 2$ gives the same value, so all three vortices move with the same $kappa$, in agreement with [16], [19, Sect. 3.1]. The real and imaginary parts follow on multiplying numerator and denominator by the complex conjugate of the denominator, since $|sqrt(R) - mu e^(i theta)|^2 thin |sqrt(R) + e^(i theta)|^2 = D$. The two factors of $D$ are at least $(sqrt(R) - mu)^2$ and $(sqrt(R) - 1)^2$, which are positive because $R > mu^2$ and $R > 1$. Finally, $N$ is concave in $C$, and $N(sqrt(R)) N(-sqrt(R)) = 3 mu^2 (1 + mu)^2 R$ and $N(sqrt(R)) + N(-sqrt(R)) = 4 R (1 - mu + mu^2)$ are positive, so $N > 0$ on $|C| <= sqrt(R)$. #h(0.6em) #h(1fr) $square$

Gotoda [10, Sect. 3] gives the rates in this parametrization. In arXiv:2002.09624v1 the imaginary part in his Eq. (3.3) differs from Lemma 3 when $mu != 1$; replacing $(Gamma_1^2 + Gamma_2^2)(Gamma_2 lambda_1 + Gamma_1 lambda_2)$ there by $(Gamma_1 + Gamma_2)(Gamma_1^2 lambda_1 + Gamma_2^2 lambda_2)$, in his notation, removes the difference, so we take it to be a misprint.

By Lemma 3 every zero-impulse configuration rotates in the positive sense, and it collapses exactly when $M(C) sin theta > 0$. Let $theta_0 in (0, pi)$ be defined by $cos theta_0 = (mu - 1)\/(2 sqrt(R))$. The configurations with $theta = 0$ and $theta = pi$ are collinear, and those with $theta = plus.minus theta_0$ are equilateral triangles; these four are relative equilibria. The collapsing configurations form the two arcs

$ cal(A)_+ = (0, theta_0) , quad cal(A)_- = (pi, 2 pi - theta_0) , $

the triangle being negatively oriented on $cal(A)_+$ and positively oriented on $cal(A)_-$, and on them @eq:P gives

$ P(theta) = N(C) / (2 mu sqrt(R) M(C) sin theta) , quad C = sqrt(R) cos theta . $ <eq:Ptheta>

Since $z_j (-theta) = overline(z_j (theta))$, the reflection $theta -> -theta$ maps $cal(A)_+$ and $cal(A)_-$ onto the expanding arcs $(2 pi - theta_0, 2 pi)$ and $(theta_0, pi)$.

== The minimal winding

Let $u = mu + 1 + 1\/mu >= 3$ and $Q(mu, y) = mu^6 tilde(Q)(u, y)$, where

$ tilde(Q)(u, y) = & 1728 (u + 1)^2 y^3 - 144 (u + 1)(8 u^3 - 9 u - 9) y^2 \
  & zws - 4 (16 u^6 - 288 u^4 - 288 u^3 - 81 u^2 - 162 u - 81) y + 3 (4 u^3 - 3 u - 3)^2 . $ <eq:Q>

Then $Q$ is a polynomial in $mu$ and $y$ with integer coefficients, irreducible over $QQ$. Its discriminant with respect to $y$ is

$ 28311552 thin mu^4 (mu - 1)^2 (mu + 1)^4 (mu + 2)^2 (2 mu + 1)^2 R^6 Delta_1^3 , $

where $Delta_1 = 4 mu^6 + 12 mu^5 + 51 mu^4 + 82 mu^3 + 51 mu^2 + 12 mu + 4$; the sum of the roots of $Q(mu, dot)$ is $(8 u^3 - 9 u - 9) \/ (12 (u + 1)) > 0$, and their product is $-((4 u^3 - 3 u - 3) \/ (24 (u + 1)))^2 < 0$. Hence for $0 < mu < 1$ the cubic $Q(mu, dot)$ has three distinct real roots, one negative and two positive, which we denote $y_1 (mu) < y_2 (mu)$.

#v(0.3em)
*Theorem 1.* _Let $0 < mu <= 1$._

_(a) On each of $cal(A)_+$ and $cal(A)_-$ the function $P$ has exactly one critical point, and it is the minimum of $P$ on that arc. Denote the two minima by $P_+ (mu)$ and $P_- (mu)$._

_(b) $P_+ (mu)^2$ and $P_- (mu)^2$ are roots of $Q(mu, dot)$. For $mu < 1$, $P_- (mu)^2 = y_1 (mu)$ and $P_+ (mu)^2 = y_2 (mu)$, so $P_- (mu) < P_+ (mu)$; for $mu = 1$, $P_+ = P_- = sqrt(2)$._

_(c) The least value of $P$ over the collapsing configurations, $P_- (mu)$, is strictly increasing on $(0, 1]$, and $P_- (mu) -> sqrt(3)\/2$ as $mu -> 0^+$._

#v(0.3em)
_Proof._ (a) A direct computation from @eq:Ptheta gives

$ (d P) / (d theta) = - G(C) / (2 mu M(C)^2 sin^2 theta) , $

where

$ G(C) = 4 (1 - mu) C^3 + 4 (2 mu^2 - mu + 2) C^2 + 2 (1 - mu)^3 C - (2 mu^4 + 7 mu^3 + 6 mu^2 + 7 mu + 2) . $ <eq:K>

As $theta$ runs over $cal(A)_+$, $C$ decreases monotonically from $sqrt(R)$ to $C_0 = (mu - 1)\/2$; over $cal(A)_-$ it increases from $-sqrt(R)$ to $C_0$. The critical points on the two arcs therefore correspond to the roots of $G$ in $(C_0, sqrt(R))$ and in $(-sqrt(R), C_0)$. Now $G(plus.minus sqrt(R)) = plus.minus sqrt(R) N(plus.minus sqrt(R)) M(plus.minus sqrt(R)) \/ R$, which is positive because $M(sqrt(R)) > 0 > M(-sqrt(R))$, and $G(C_0) = -3 (1 + mu)^4 \/ 2 < 0$. So $G$ has a root in each interval. For $mu < 1$, $G$ is a cubic with positive leading coefficient, so it also has a root below $-sqrt(R)$, and each interval contains exactly one root. For $mu = 1$, $G = 12 C^2 - 24$, with one root in each of $(-sqrt(3), 0)$ and $(0, sqrt(3))$. The function $P$ is differentiable on each arc, and at the ends of each arc $M(C) sin theta -> 0$ while $N > 0$, so $P -> +infinity$; hence the single critical point is the minimum.

(b) At a critical point $G(C) = 0$, and since $R sin^2 theta = R - C^2$, the number $y = P^2$ satisfies $4 mu^2 y (R - C^2) M(C)^2 = N(C)^2$. The resultant of these two polynomials with respect to $C$ is $-48 mu^4 (1 + mu)^8 Q(mu, y)$, so $P_plus.minus (mu)^2$ are roots of $Q(mu, dot)$ for $mu < 1$. For $mu = 1$, $P_plus.minus = sqrt(2)$ by Remark 2 below, and $Q(1, y) = 6912 (y - 2)^2 (4y + 1)$, so $P_plus.minus (1)^2 = 2$ is a root of $Q(1, dot)$. For $0 < mu < 1$ both are positive roots, hence each lies in ${y_1 (mu), y_2 (mu)}$. The three roots of $G$ are simple, so $P_+ (mu)$ and $P_- (mu)$ depend continuously on $mu$, and so do $y_1 (mu) < y_2 (mu)$. By connectedness each of $P_+^2$ and $P_-^2$ coincides with the same $y_i$ on all of $(0, 1)$. At $mu = 1\/2$ the proof of Proposition 1, which uses only (a) and the first part of (b), gives certified enclosures $P_-^2 in [0.99, 1.30]$ and $P_+^2 in [4.70, 5.02]$, each containing exactly one root of $Q(1\/2, dot)$; so $P_-^2 = y_1$ and $P_+^2 = y_2$.

(c) For $0 < mu < 1$ the roots $y_i (mu)$ are simple, hence differentiable, and $y'_i = -(partial Q \/ partial mu) \/ (partial Q \/ partial y)$. A zero of $y'_1$ at some $mu$ would be a common root of $Q(mu, dot)$ and $(partial Q \/ partial mu)(mu, dot)$, but their resultant with respect to $y$,

$ 7044820107264 thin mu^7 (mu - 1)^3 (mu + 1)^7 (mu + 2)^3 (2 mu + 1)^3 R^6 Delta_2 Delta_1^3 , $

where $Delta_2 = 4 mu^6 + 12 mu^5 + 21 mu^4 + 22 mu^3 + 21 mu^2 + 12 mu + 4$, has no zero in $(0, 1)$. So $y_1$ is strictly monotone on $(0, 1)$. The leading coefficient of $Q(mu, dot)$ does not vanish at $mu = 1$, so the roots stay bounded as $mu -> 1^-$, and $y_1$ tends to a nonnegative root of $Q(1, dot) = 6912 (y - 2)^2 (4y + 1)$, which is $2$. Since $y_1 (1\/2) = 1.1335 dots < 2$, $y_1$ is increasing, and therefore $y_1 (mu) < 2 = P_- (1)^2$ for $mu < 1$. As $mu -> 0^+$ it therefore decreases to a limit $L >= 0$, which is a root of $Q(0, y) = -16 (4 y - 3)$, so $L = 3\/4$. Finally, $y_2 = sigma - y_1 - y_0 > sigma - 2$, where $y_0 < 0$ is the negative root and $sigma = (8u^3 - 9u - 9)\/(12(u + 1))$ the sum of the roots; since $sigma -> infinity$ as $mu -> 0^+$, $P_+ (mu)$ grows without bound. #h(0.6em) #h(1fr) $square$

#v(0.3em)
*Corollary 1.* _Every self-similar collapse of three point vortices has $|omega_0| t_c > sqrt(3)\/2$, and for every $delta > 0$ there is one with $|omega_0| t_c < sqrt(3)\/2 + delta$. Equivalently, each vortex travels more than twice its initial distance from the collision point, and the factor $2$ is sharp._

_Proof._ By Lemma 2, the normalization @eq:norm and Theorem 1, $P >= P_- (mu) > sqrt(3)\/2$, and $P_- (mu) -> sqrt(3)\/2$ as $mu -> 0^+$. The path length is $r_0 sqrt(1 + 4 P^2) > 2 r_0$, and the angle $arctan 2P$ between each path and the direction to the collision point exceeds $arctan sqrt(3) = pi\/3$; and no vortex starts at the collision point, since $z_1$, $z_2$ and $z_3$ in @eq:pos never vanish. #h(0.6em) #h(1fr) $square$

_A direct proof of Corollary 1._ The bound needs only Lemmas 1 and 3, not Theorem 1. By Lemma 2 and @eq:norm it suffices to take $0 < mu <= 1$ and $theta in cal(A)_+ union cal(A)_-$, where $M(C) sin theta > 0$. Put $k = (1 - mu)(2 + mu)(1 + 2 mu)$, $T = 2 R + (1 - mu) C$ and $V = 3 (1 + mu)^2 (R - C^2)$ $= 3 (1 + mu)^2 R sin^2 theta > 0$. Comparing coefficients of $mu$ in the first identity and of $C$ in the other two shows

$ k^2 + 27 mu^2 (1 + mu)^2 = 4 R^3 , quad T^2 = R M(C)^2 + V , quad 9 (1 + mu)^2 N(C) = 2 R (T^2 + V) + k M(C) T ; $

in the third, the coefficients of $C^2$, $C$ and $1$ on each side are $-18 mu (1 + mu)^2$, $9 (1 - mu)(1 + mu)^2 (2 + mu + 2 mu^2)$ and $18 (1 + mu)^2 (1 + mu^2) R$. By the first identity there is $psi in (0, pi)$ with $cos psi = k \/ (2 R^(3\/2))$ and $sin psi = 3 sqrt(3) thin mu (1 + mu) \/ (2 R^(3\/2))$. By the second, $T != 0$, and $x = sqrt(R) thin M(C) \/ T$ and $y = sqrt(V) \/ |T|$ satisfy $x^2 + y^2 = 1$ and $0 < |x| < 1$. The third, divided by $2 R T^2$, reads $9 (1 + mu)^2 N(C) \/ (2 R T^2) = 2 - x^2 + x cos psi$, and $2 |x| y sin psi = 9 mu (1 + mu)^2 M(C) sin theta \/ (sqrt(R) thin T^2)$, so @eq:Ptheta becomes

$ P = (2 - x^2 + x cos psi) / (2 |x| thin y sin psi) . $

Lemma 1 with $a = 2 - x^2$ and $b = -x$, where $a - |b| = (1 - |x|)(2 + |x|) > 0$, gives $2 |x| y P >= sqrt((2 - x^2)^2 - x^2)$, and $(2 - x^2)^2 - x^2 = 3 x^2 y^2 + 4 y^4$ because $x^2 + y^2 = 1$. Hence

$ P^2 >= 3/4 + y^2/x^2 = 3/4 + (3 (1 + mu)^2 sin^2 theta) / M(C)^2 > 3/4 . $

Equivalently, with $N = N(C)$ and $M = M(C)$, the three identities combine into

$ 4 R^3 (N^2 - 3 mu^2 (R - C^2) M^2) = (k N + 3 mu^2 M T)^2 + 48 mu^2 (1 + mu)^2 R^2 (R - C^2)^2 . $

For sharpness, take $theta$ with $sin theta = -sqrt(3) thin mu \/ 2$ and $C = -sqrt(R) sqrt(1 - 3 mu^2 \/ 4)$, which lies in $cal(A)_-$ because $C < -1\/2 <= (mu - 1)\/2 = sqrt(R) cos theta_0$. As $mu -> 0$, $C + sqrt(R) = 3 mu^2 \/ 8 + O(mu^3)$; by the proof of Lemma 3, $N(-sqrt(R)) = 3 mu^2 (1 + mu)^2 R \/ N(sqrt(R)) = 3 mu^2 \/ 4 + O(mu^3)$; and $N'(C) = 2 + O(mu)$ near $C = -1$. So $N(C) = 3 mu^2 \/ 2 + O(mu^3)$, $M(C) = -1 + O(mu)$, and @eq:Ptheta gives $P = sqrt(3)\/2 + O(mu)$. The remaining statements follow as in the first proof. #h(0.6em) #h(1fr) $square$

Every motion of three point vortices in the plane that ends in a total collision is self-similar [13, Theorem 1], [14, Prop. 2.8], [15, Sect. 3], [19, Sect. 3.1], [9, Prop. 5.2], [8, Theorem 1.1], so the bound of Corollary 1 holds for every collapse of three point vortices. The bound fails for more vortices: the collapsing configuration of seven vortices in [7, Table 1, Fig. 1a], with circulation $6383\/2250$ at the origin, $14\/15$ at $plus.minus 2$, $-62\/45$ at $plus.minus 2 e^(i phi)$ where $cos 2 phi = 13\/18$, and $1$ at $plus.minus 4\/3$, has the constant $Omega = 12433\/9000 - (31 sqrt(155)\/450) i$, where $Omega = 2 pi i overline(kappa)$ [7, Eq. (11)], so $P = |op("Re") Omega| \/ (2 |op("Im") Omega|) = 12433\/(1240 sqrt(155)) = 0.8053 dots < sqrt(3)\/2$.

#figure(
  image("figures/minimal-winding.svg", width: 78%),
  caption: [The minima $P_- (mu)$ and $P_+ (mu)$ of $P = |omega_0| t_c$ on the two collapsing arcs, as functions of the circulation ratio $mu$. The dots mark $mu = 1\/2$ (Proposition 1). As $mu -> 0$, $P_-$ tends to $sqrt(3)\/2$ and $P_+$ grows without bound.],
  placement: top,
) <fig:minima>

The two minima are shown in @fig:minima.

== The ratio $mu = 1\/2$

For $Gamma = (1, 1\/2, -1\/3)$ we have $R = 7\/4$ and $cos theta_0 = -sqrt(7)\/14$, and @eq:Ptheta becomes

$ P(theta) = (14 sin^2 theta + 6 sqrt(7) cos theta + 21) / (2 (14 cos theta + sqrt(7)) sin theta) . $

#v(0.3em)
*Proposition 1.* _Let $X = 245351 \/ 5201^(3\/2)$ and $sigma = 7 sqrt(5201) \/ 162$. For $mu = 1\/2$,_

$ P_- = sqrt(605/324 + sigma cos(1/3 arccos X - (2 pi)/3)) = 1.0647059762712043 dots , $

$ P_+ = sqrt(605/324 + sigma cos(1/3 arccos X)) = 2.2038550160361327 dots , $

_attained at $cos theta = -0.9243893679 dots$ and $cos theta = 0.6739838839 dots$ respectively. Both are roots of the polynomial $8748 xi^6 - 49005 xi^4 + 27794 xi^2 + 18723$, which is irreducible over $QQ$ and whose real roots are exactly these two numbers and their negatives._

#v(0.3em)
_Proof._ Here $16 Q(1\/2, xi^2) = 8748 xi^6 - 49005 xi^4 + 27794 xi^2 + 18723$, and by Theorem 1(b) the squares of both minima are roots of this polynomial. As a cubic in $q = xi^2$ it is irreducible over $QQ$ and has positive discriminant, so its roots are real and are given by the trigonometric solution of the cubic, $q_m = 605\/324 + sigma cos(1\/3 arccos X - 2 pi m \/ 3)$, $m = 0, 1, 2$, with $q_0 approx 4.856977$, $q_1 approx 1.133599$ and $q_2 approx -0.388724$. The critical points are the roots of $G$ in the two intervals of the proof of Theorem 1(a); with $C = (sqrt(7)\/2) cos theta$ they are at the stated values of $cos theta$. Exact sign changes of $G$ place them in $0.67 < cos theta < 0.68$ on $cal(A)_+$ and $-0.93 < cos theta < -0.92$ on $cal(A)_-$, and interval arithmetic applied to $P^2 = N^2 \/ (4 mu^2 (R - C^2) M^2)$ on these intervals gives $P_+^2 in [4.70, 5.02]$ and $P_-^2 in [0.99, 1.30]$. Each enclosure contains exactly one of $q_0, q_1, q_2$, so $P_+^2 = q_0$ and $P_-^2 = q_1$. #h(0.6em) #h(1fr) $square$

#v(0.3em)
*Remark 1.* The two minima are conjugate algebraic numbers of degree six. Since the cubic in $q$ is irreducible over $QQ$ and has three real roots, none of its roots is expressible by real radicals (casus irreducibilis), and therefore neither minimum is. The same holds for every $mu = a\/b in (0, 1)$ in lowest terms with $2 <= b <= 30$: for each of these 277 values, $Q(mu, xi^2)$ is irreducible over $QQ$, so the minima have degree six and the cubic $Q(mu, dot)$ is irreducible, and its discriminant is positive on $(0, 1)$, so it has three real roots.

*Remark 2.* For $mu = 1$, that is $Gamma = (1, 1, -1\/2)$, the zero-impulse circle is $|w - 1\/2| = sqrt(3)\/2$. With $w = 1\/2 + (sqrt(3)\/2) e^(i beta)$, $z_1 = 0$ and $z_2 = 1$, the same computation gives $P = (3 - cos 2 beta) \/ (2 sin 2 beta)$ on the collapsing arcs $0 < beta < pi\/2$ and $pi < beta < 3 pi\/2$, which are exchanged by interchanging the two equal vortices ($w -> 1 - w$). Since $P$ has period $pi$ in $beta$, Lemma 1 applies on both arcs and gives $P >= sqrt(2)$, with equality if and only if $cos 2 beta = 1\/3$, in agreement with Theorem 1. This parametrization is Kimura's [16, Sect. 4], who gives the two rates for $Gamma = (2, 2, -1)$ in his Eq. (4.4); their ratio $B\/(-2A)$ is this expression for $P$, which is also a specialization and reparametrization of Gröbli's spiral coefficient [11, Sect. 10].

*Remark 3.* Interchanging the first two vortices and multiplying the circulations by $1\/mu$ maps the family with ratio $mu$ onto the family with ratio $1\/mu$ and exchanges the two orientations, so the arc minima satisfy $P_+ (mu) = P_- (1\/mu)$. For $mu > 1$ the smaller minimum is therefore attained on $cal(A)_+$.

= Two concentric regular polygons

In this section $theta$ denotes the relative rotation of two rings. Let $n >= 2$ and $epsilon = e^(2 pi i \/ n)$, and place vortices of circulation $x > 0$ at $z epsilon^k$ and vortices of circulation $-1$ at $zeta epsilon^k$, $k = 0, dots, n - 1$. The motion preserves this symmetry, and the center of vorticity is the origin. Using

$ sum_(k = 1)^(n - 1) 1 / (1 - epsilon^k) = (n - 1) / 2 , quad sum_(k = 0)^(n - 1) 1 / (z - zeta epsilon^k) = (n z^(n - 1)) / (z^n - zeta^n) , $

one finds that @eq:bs reduces to [2, Eq. (3)]

$ overline(dot(z)) = 1/(2 pi i) ( (x (n - 1))/(2 z) - (n z^(n - 1))/(z^n - zeta^n) ) , quad overline(dot(zeta)) = 1/(2 pi i) ( -(n - 1)/(2 zeta) + (x n zeta^(n - 1))/(zeta^n - z^n) ) . $ <eq:rings>

A collapse requires the angular impulse $n (x |z|^2 - |zeta|^2)$ to vanish, and after a rotation and a dilation we take $z = 1$ and $zeta = sqrt(x) e^(i theta)$. The motion is self-similar exactly when $dot(z) \/ z = dot(zeta) \/ zeta$. Writing $v = zeta^n$, @eq:rings gives

$ overline(dot(z)\/z) = 1/(2 pi i) ( (x (n - 1))/2 - n/(1 - v) ) , quad overline(dot(zeta)\/zeta) = 1/(2 pi i) ( -(n - 1)/(2 x) - (n v)/(1 - v) ) , $

and these are equal if and only if

$ (n - 1) x^2 - 2 n x + (n - 1) = 0 . $ <eq:circ>

This is the circulation condition of Koiller et al. [17, Sect. 11]. Demina and Kudryashov [7, Sect. 3] place circulations $Gamma_1$ and $Gamma_2 = -Gamma_1 \/ r^2$ on two such rings, where $r$ is the ratio of the radii, and a vortex of circulation $Gamma_0$ at the center; for $Gamma_0 = 0$ their equation for $r$ [7, Eq. (37)] is @eq:circ with $x = r^2$. The condition @eq:circ coincides with the classical condition $sum_(i < j) Gamma_i Gamma_j = 0$ for the $2n$ vortices, whose left side here equals $(n\/2)((n - 1) x^2 - 2 n x + (n - 1))$. Its roots are $x_n$ and $1\/x_n$, where

$ x_n = (n + sqrt(2n - 1)) / (n - 1) = e^eta , quad cosh eta = n / (n - 1) . $

The root $1\/x_n$ gives the same family with the two rings interchanged, as one sees by multiplying the circulations by $-x_n$ and reflecting the configuration, so we take $x = x_n$. Then every $theta$ gives a self-similar motion. Let $rho = x_n^(n\/2) = e^(n eta \/ 2) > 1$ and $alpha = n theta$, so that $v = rho e^(i alpha)$. The common value of $overline(kappa)$ is $S \/ (2 pi i)$ with $S = x_n (n - 1)\/2 - n\/(1 - v)$, so $kappa = (op("Im") S + i op("Re") S)\/(2 pi)$, and since $op("Im")(1 - v)^(-1) = rho sin alpha \/ |1 - v|^2$,

$ op("Re") kappa = - (n rho sin alpha) / (2 pi |1 - v|^2) . $

The configuration therefore collapses exactly when $sin n theta > 0$, that is, for $0 < theta < pi\/n$ modulo $2 pi \/ n$. Using $|1 - v|^2 = 1 - 2 rho cos alpha + rho^2$ one finds

$ (|1 - v|^2 op("Re") S) / rho = K_n - ((n - 1) x_n - n) cos alpha , quad K_n = ((n - 1) x_n (rho + rho^(-1))) / 2 - n / rho . $

Here $(n - 1) x_n - n = sqrt(2n - 1)$, and writing $n = (n - 1) cosh eta$ in the last term of $K_n$ gives

$ K_n = (n - 1) sinh((n + 2) eta / 2) . $

 Moreover

$ K_n - sqrt(2n - 1) = ((n - 1) x_n (rho^(1\/2) - rho^(-1\/2))^2) / 2 + n (1 - rho^(-1)) > 0 , $

so $op("Re") S > 0$, and @eq:P gives

$ P = (K_n - sqrt(2n - 1) cos n theta) / (2 n sin n theta) , quad 0 < n theta < pi . $ <eq:Pring>

The collapse rate and the rotation rate as functions of the relative angle are given by Koiller et al. [17, Sect. 11]. The constant $S$ is the constant $Omega$ of [7, Eq. (11)], and Demina and Kudryashov write it for these rings, with the central vortex, as an explicit function of $e^(i n theta)$ [7, Eq. (36)]; for $Gamma_0 = 0$, $Gamma_1 = x_n$ and radii $1$ and $sqrt(x_n)$ their expression reduces to $S$ by @eq:circ. Equation @eq:Pring writes the ratio of the two rates in closed form.

#v(0.3em)
*Proposition 2.* _For $n >= 2$ the collapsing configurations of two concentric regular $n$-gons with circulations $x_n$ and $-1$ satisfy_

$ P >= F_n = sqrt(K_n^2 - (2n - 1)) / (2n) , $

_with equality if and only if $cos n theta = sqrt(2n - 1) \/ K_n$._

_Proof._ Apply Lemma 1 to @eq:Pring with $a = K_n$ and $b = sqrt(2n - 1)$. #h(0.6em) #h(1fr) $square$

#v(0.3em)
For small $n$ the constants are as follows.

#align(center)[
  #table(
    columns: 5,
    stroke: 0.4pt,
    inset: 5pt,
    align: center + horizon,
    [$n$], [$x_n$], [$K_n$], [$F_n$], [$cos n theta$ at the minimum],
    [$2$], [$2 + sqrt(3)$], [$4 sqrt(3)$], [$3 sqrt(5)\/4$], [$1\/4$],
    [$3$], [$(3 + sqrt(5))\/2$], [$11$], [$sqrt(29)\/3$], [$sqrt(5)\/11$],
    [$4$], [$(4 + sqrt(7))\/3$], [$55 sqrt(7)\/9$], [$sqrt(322)\/9$], [$9\/55$],
    [$5$], [$2$], [$127 sqrt(2)\/8$], [$sqrt(31682)\/80$], [$12 sqrt(2)\/127$],
  )
]

For $n = 2$ the configuration is a parallelogram of four vortices; Novikov and Sedov [22, Sect. 4] found this collapse and its rates, so its minimum $F_2$ follows from their formulas, and Gotoda [10] gives its rates in closed form. The ratio $x_n$ is rational exactly when $2n - 1$ is a perfect square, and $n = 5$ is the smallest such $n$. There $x_5 = 2$ and

$ P = (127 sqrt(2) - 24 cos 5 theta) / (80 sin 5 theta) >= sqrt(31682) / 80 = 2.2249297741726591 dots . $

= Numerical verification

The results were checked numerically as summarized in @tab:checks. Except where the table says otherwise, the checks evaluate the Biot–Savart velocities @eq:bs directly for configurations built independently of @eq:pos (two vortices fixed and the third moved around the zero-impulse circle), test self-similarity by comparing $dot(z)_j \/ (z_j - z_c)$ across all vortices, and obtain $P$ from @eq:P. The algebraic steps in the proofs were verified in exact arithmetic (SymPy): Lemma 3 for all three vortices, @eq:K, the resultant in the proof of Theorem 1(b), the discriminant and the resultant in the proof of Theorem 1(c), the irreducibility of $Q$ and of each of the 277 sextics in Remark 1, the constants in Proposition 1, and, for general $n$, the identities of Section 4 from @eq:circ to @eq:Pring, together with the table of constants. The program `verify_general_mu.py` carries out these exact computations with SymPy 1.14.0 and the high-precision checks with mpmath 1.3.0; `verify_floors_independent.py` repeats the minimizations independently and contains the exact sign changes of $G$ and the interval enclosures in the proof of Proposition 1, computed with the interval arithmetic of mpmath at 30 digits. The program `verify_direct_proof.py` checks every identity in the direct proof of Corollary 1 exactly, with SymPy. Each program runs in under a minute under Python 3.11 and prints every check with its result; their output is in `data/`.

#figure(
  text(size: 9pt, table(
    columns: (2.3fr, 1.7fr),
    stroke: 0.4pt,
    inset: 5pt,
    align: left,
    [*Check*], [*Result*],
    [Lemma 3 against the Biot–Savart velocities of all three vortices, at the positions @eq:pos for 36 pairs $(mu, theta)$ on a grid with $0.1 <= mu <= 7$, and for 30 triangles built independently of @eq:pos, 50 digits], [relative difference $<= 2 times 10^(-49)$],
    [Arc minima by direct minimization of $P$, computed from the quotient of the first vortex, for 26 values of $mu in (0, 1]$ at 30 digits and 13 rational values at 50 digits], [agree with the roots of $Q(mu, dot)$ to $5 times 10^(-21)$ and $5 times 10^(-45)$],
    [$mu = 1\/2$: the three quotients over 4000 shapes on the zero-impulse circle, 60 digits], [equal to 60-digit working precision; the collapsing shapes fill half of the circle, the arcs $cal(A)_plus.minus$],
    [$mu = 1\/2$: local minima of $P$ over the collapsing shapes, located numerically], [two, equal to the values of Proposition 1 to 60-digit working precision],
    [$mu = 1\/2$: formula for $P(theta)$ against direct evaluation at the positions @eq:pos, 399 interior points of each arc], [relative difference $<= 10^(-59)$],
    [$mu = 1\/2$: integration of @eq:bs from the minimizing configuration on $cal(A)_-$ (Taylor method, 30 digits)], [every $|z_j - z_c|^2$ follows $1 - t\/t_c$, and every rotation angle follows $-omega_0 t_c ln(1 - t\/t_c)$, to 30-digit working precision up to $t = 0.9 thin t_c$],
    [Five configurations at the positions @eq:pos with $mu in {0.3, 0.5, 2}$, on both arcs: integration of @eq:bs to $t = 0.9 thin t_c$ (fourth-order Runge–Kutta, 30 digits)], [distances to the collision point, rotation angles, the angle $arctan 2P$ between each velocity and the direction to the collision point, and path lengths $r_0 sqrt(1 + 4P^2) (1 - sqrt(1 - t\/t_c))$ agree to $2 times 10^(-10)$],
    [$mu = 1$ (Remark 2): $P$ from @eq:bs against $(3 - cos 2 beta)\/(2 sin 2 beta)$ on both collapsing arcs, and its minimum, 50 digits], [difference $<= 2 times 10^(-47)$; minimum $sqrt(2)$ at $cos 2 beta = 1\/3$ on both arcs],
    [$mu = 1$: the configuration with the fastest collapse at $|z_1 - z_2| = 1$, 50 digits], [$cos 2 beta = 3\/5$, $t_c = 4 pi\/3$ and $P = 3\/2$ to $10^(-40)$],
    [$mu = 1$: Kimura's rates $A$, $B$ [16, Eq. (4.4)] at ten angles in $0 < beta < pi\/2$, 50 digits], [$kappa = (A + i B)\/(4 pi)$ for $Gamma = (1, 1, -1\/2)$, to $10^(-45)$],
    [Two rings, $n = 2, dots, 10$: the reduced equations @eq:rings and the two sums over roots of unity against the full Biot–Savart sum, 50 digits], [difference $<= 10^(-49)$],
    [Two rings, $n = 2, dots, 8$: $P$ from @eq:bs against @eq:Pring over the collapsing range, and its numerical minimum against $F_n$, 60 digits], [relative difference $<= 3 times 10^(-58)$; minima agree to $2 times 10^(-60)$],
    [Two rings: the equations of Demina and Kudryashov [7, Eqs. (36)–(37)] at $Gamma_0 = 0$ (exact, SymPy), and their constant against the Biot–Savart sum, $n = 2, dots, 8$, 50 digits], [(37) is @eq:circ with $x = r^2$; (36) minus $S$ is a multiple of @eq:circ; difference $<= 10^(-45)$],
    [The collapsing configuration of seven vortices in [7, Table 1, Fig. 1a], Biot–Savart at 50 digits], [self-similar, the printed $Omega$ to $10^(-45)$, and $P = 12433\/(1240 sqrt(155)) < sqrt(3)\/2$],
  )),
  caption: [Numerical checks of the results.],
  kind: table,
  placement: top,
) <tab:checks>

= Discussion

Lemma 3 gives, in a form suited to minimization, the collapse and rotation rates that Aref [3, Eqs. (25a), (25d)] expresses through the side lengths of the triangle (see also [10], [9, Eq. (E.1)], and, for equal circulations, [16, Eq. (4.4)]); Aref also notes that the rotation rate times the collapse time, that is, the ratio of the two rates, fixes the logarithmic spiral [3, Eq. (29c)]. Theorem 1 concerns the minimization of that ratio, which neither [3], [6] nor [16] considers. When the two circulations of the same sign differ, $mu < 1$, the two orientations of the triangle are not equivalent and the minima on the two arcs differ, so a minimization restricted to one orientation finds only one of them. The infimum $sqrt(3)\/2$ of Corollary 1 is approached only as $mu -> 0$ and is not attained.

Leoncini, Kuznetsov and Zaslavsky [20] analyze the motion near collapse when two of the vortices are identical; the configuration that collapses fastest at a fixed distance between the identical vortices, found by Kimura [16, Eq. (4.6)] and shown in [20, Fig. 18], has $P = 3\/2$, and the value $sqrt(3)\/2$ in that caption is a value of their energy parameter $Lambda = e^(4 pi H)$, not of $P$. For $sum_(j < k) Gamma_j Gamma_k = 0$, Tavantzis and Ting [26, Sect. II], who work with the side lengths of the triangle, show that the contracting family of similar configurations is unstable and the expanding family asymptotically stable, stability referring to the ratios of the sides. Reinaud, Dritschel and Scott [24] extend the collapse conditions to generalized Euler and quasi-geostrophic models and map the collapse time over the collapsing configurations, with the distance between the like-signed vortices fixed, finding a minimum of that time along a curve in one of their parameter maps [24, Fig. 3]; $P$, unlike the collapse time, does not depend on the choice of length and time scales. Krishnamurthy and Stremler [19, Sects. 3.3–3.5] relate the interior angles of the triangle, the circulation ratios, the energy, the collapse time and the distance traveled before collapse by the circumcenter of the triangle. When the angular impulse about the center of vorticity vanishes, the circumcircle passes through the center of vorticity at all times [18, Eq. (40)], so in a collapse the circumcenter stays one circumradius from the collision point; since it is carried by the self-similar motion, it travels $sqrt(1 + 4P^2)$ times the initial circumradius before the collapse. In their notation $P = tilde(tau) |K_1|$ [19, Eq. (3.28a)], and they observe numerically that this normalized distance, their $tilde(s)(1)$, exceeds $2$ [19, Sect. 3.5]; Corollary 1 proves this observation and shows that the constant $2$ cannot be improved.

Hiraoka [14] blows up the triple collision to McGehee's collision manifold and shows that it is topologically regularizable in Easton's sense when the two vortices of the same sign have equal circulations, $mu = 1$ in our normalization, once those two vortices are identified [14, Theorem 1], and not when their circulations differ by a small nonzero amount [14, Theorem 2]; his variables are the side lengths and the signed area of the triangle, so the rotation does not enter. Gallay and Šverák [9] ask when a collision of three point vortices is regularizable, that is, a limit of nearby motions without collision. Whether it is depends on the perturbation [9, Theorems 5.8, 5.10, 5.15], and when it is, the limit is determined only up to a rotation [9, Sect. 1], because the triangle turns through the angle $s ln(1 - t\/T)$ and so makes infinitely many turns before the collision [9, Sect. 5.2]. Grotto, Romito and Viviani [12] select a continuation after collapse by adding a vanishing stochastic diffusion, which yields a probability distribution over continuations rather than a single one. Gallay and Šverák note that $s != 0$ [9, Remark E.2]; since $|s| = P$, Corollary 1 sharpens this to $|s| > sqrt(3)\/2$ for every collision, and no larger constant holds for all of them.

For two rings, Aref [2] derived the reduced equations @eq:rings for arbitrary circulations and analyzed equal and opposite circulations, $x = 1$, which do not satisfy @eq:circ. Koiller et al. [17] found the collapsing configurations and their rates. Demina and Kudryashov [7] study relative equilibria, collapse and scattering of point vortices with arbitrary circulations by a polynomial method. For two regular polygons with a vortex of circulation $Gamma_0$, possibly zero, at the center, they give the equation for the ratio of the radii, which for $Gamma_0 = 0$ is @eq:circ, and the constant $Omega$, which for $Gamma_0 = 0$ is $S$, as an explicit function of the relative rotation [7, Eqs. (36)–(37)], and they state that every relative rotation with $e^(i n theta) != plus.minus 1$ gives a collapse or a scattering. For this family they do not say which of the two occurs, and they do not write out the ratio of the two rates, although their general solution contains it [7, Eq. (10)]. Equation @eq:Pring writes this ratio in closed form, and Proposition 2 gives its minimum over the relative rotation. O'Neil [23] proves that for generic circulations three concentric rings have finitely many relative equilibria and, for each fixed complex rate, finitely many collapse configurations. We have not found the minimal values of Theorem 1 and Propositions 1 and 2 stated in the literature, nor a proof of the bound of Corollary 1 or of its sharpness.

#v(0.5em)
#par(justify: false)[*Data availability.* The programs `verify_general_mu.py`, `verify_floors_independent.py`, `verify_direct_proof.py` and `plot_minimal_winding.py`, used for Section 5 and @fig:minima, and their output are in the repository https://github.com/ChaseHendrick/minimal-winding: the programs in `code/`, the output of the three verification programs in `data/`, and the figure in `paper/figures/`.]

#par(justify: false)[*Funding.* This research received no external funding.]

#v(0.3em)
#text(size: 9pt)[This work was prepared with AI assistance. The author takes full responsibility for its content.]

#v(0.6em)
#heading(numbering: none)[References]
#set text(size: 10pt)
#set enum(numbering: "[1]")
+ H. Aref, Motion of three vortices, _Phys. Fluids_ *22* (1979) 393–400.
+ H. Aref, Point vortex motions with a center of symmetry, _Phys. Fluids_ *25* (1982) 2183–2187.
+ H. Aref, Self-similar motion of three point vortices, _Phys. Fluids_ *22* (2010) 057104.
+ H. Aref, N. Rott and H. Thomann, Gröbli's solution of the three-vortex problem, _Annu. Rev. Fluid Mech._ *24* (1992) 1–21.
+ A. V. Borisov and V. G. Lebedev, Dynamics of three vortices on a plane and a sphere — III. Noncompact case. Problems of collapse and scattering, _Regul. Chaotic Dyn._ *3* (1998), no. 4, 74–86; arXiv:nlin/0503057.
+ R. Conte and L. de Seze, Exact solution of the planar motion of three arbitrary point vortices, report DPhG/PSRM/1697/80, CEN Saclay (1980); also _Mod. Phys. Lett. B_ *29* (2015) 1530017; arXiv:1511.00069v1, whose page numbers are cited.
+ M. V. Demina and N. A. Kudryashov, Rotation, collapse, and scattering of point vortices, _Theor. Comput. Fluid Dyn._ *28* (2014) 357–368; doi:10.1007/s00162-014-0319-4.
+ T. D. Drivas, B. A. Khanikati and V. A. Khanikati, On the collapse of three point vortices on surfaces, preprint, arXiv:2607.16490 (2026).
+ T. Gallay and V. Šverák, The three-vortex system: Hopf fibration, symplectic reduction, and near-collisions, preprint, arXiv:2609.10847 (2026).
+ T. Gotoda, Self-similar motions and related relative equilibria in the $N$-point vortex system, _J. Dyn. Differ. Equ._ *33* (2021) 1759–1777; arXiv:2002.09624.
+ W. Gröbli, _Specielle Probleme über die Bewegung geradliniger paralleler Wirbelfäden_, Inaugural-Dissertation, Göttingen; Zürcher und Furrer, Zürich, 1877. English translation: arXiv:2404.01305.
+ F. Grotto, M. Romito and M. Viviani, Zero-noise dynamics after collapse for three point vortices, _Physica D_ *457* (2024) 133947; arXiv:2307.05133.
+ A. Hernández-Garduño and E. A. Lacomba, Collisions and regularization for the 3-vortex problem, _J. Math. Fluid Mech._ *9* (2007) 75–86; arXiv:math-ph/0412024, whose theorem numbering is cited.
+ Y. Hiraoka, Topological regularizations of the triple collision singularity in the 3-vortex problem, _Nonlinearity_ *21* (2008) 361–379.
+ Y. Hiraoka, Remarks on collision manifolds and nonexistence of non self-similar collision solutions in the 3-vortex problem, _RIMS Kôkyûroku Bessatsu_ *B13* (2009) 35–43.
+ Y. Kimura, Similarity solution of two-dimensional point vortices, _J. Phys. Soc. Jpn._ *56* (1987) 2024–2030.
+ J. Koiller, S. Pinto de Carvalho, R. Rodrigues da Silva and L. C. Gonçalves de Oliveira, On Aref's vortex motions with a symmetry center, _Physica D_ *16* (1985) 27–61.
+ V. S. Krishnamurthy, H. Aref and M. A. Stremler, Evolving geometry of a vortex triangle, _Phys. Rev. Fluids_ *3* (2018) 024702; arXiv:1706.00731v2, whose equation numbers are cited.
+ V. S. Krishnamurthy and M. A. Stremler, Finite-time collapse of three point vortices in the plane, _Regul. Chaotic Dyn._ *23* (2018) 530–550.
+ X. Leoncini, L. Kuznetsov and G. M. Zaslavsky, Motion of three vortices near collapse, _Phys. Fluids_ *12* (2000) 1911–1927.
+ P. K. Newton, _The $N$-Vortex Problem: Analytical Techniques_, Applied Mathematical Sciences 145, Springer, 2001.
+ E. A. Novikov and Yu. B. Sedov, Vortex collapse, _Sov. Phys. JETP_ *50* (1979) 297–301 [_Zh. Eksp. Teor. Fiz._ *77* (1979) 588–597].
+ K. A. O'Neil, Relative equilibrium and collapse configurations of heterogeneous vortex triple rings, _Physica D_ *236* (2007) 123–130.
+ J. N. Reinaud, D. G. Dritschel and R. K. Scott, Self-similar collapse of three vortices in the generalised Euler and quasi-geostrophic equations, _Physica D_ *434* (2022) 133226.
+ J. L. Synge, On the motion of three vortices, _Canad. J. Math._ *1* (1949) 257–270.
+ J. Tavantzis and L. Ting, The dynamics of three vortices revisited, _Phys. Fluids_ *31* (1988) 1392–1409.
