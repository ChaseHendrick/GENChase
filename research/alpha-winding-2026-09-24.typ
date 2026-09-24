#set document(title: "A sharp winding bound for the self-similar collapse of three point vortices in the alpha-models", author: "Chase Hendrick")
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
    A sharp winding bound for the self-similar collapse \
    of three point vortices in the $alpha$-models
  ]
  #v(0.7em)
  #text(size: 11pt)[Chase Hendrick]
  #v(0.2em)
  #text(size: 9.5pt)[GENChase]
]

#v(1em)

#pad(x: 2.2em)[
  #text(size: 10pt)[
    *Abstract.* In the $alpha$-models of two-dimensional flow a point vortex of circulation $Gamma$ induces the velocity $Gamma r^(-alpha-1) \/ (2 pi)$ at distance $r$; $alpha = 0$ is the Euler equation and $alpha = 1$ the surface quasi-geostrophic equation. In a self-similar collapse of three point vortices every vortex moves on a logarithmic spiral about the collision point, and the rotation per unit decrease of the logarithm of the squared size, $P = |op("Im") kappa| \/ (2 |op("Re") kappa|)$, measures how tightly the spiral winds. We prove that $P > sqrt(3 + alpha) \/ (2 + alpha)$ for every self-similar collapse of three point vortices when $alpha > -0.896$, and that the constant is sharp: it is approached, but not attained, as two weak vortices of opposite sign merge next to a strong one. Equivalently, every vortex travels more than $(4 + alpha)\/(2 + alpha)$ times its initial distance from the collision point, and its path makes an angle larger than $arccos((2 + alpha)\/(4 + alpha))$ with the direction to that point. The bound decreases from $sqrt(3)\/2$ in the Euler case to $2\/3$ in the surface quasi-geostrophic case and tends to $0$ as $alpha -> infinity$. The proof rests on two elementary identities: the circulations of a collapsing triangle are fixed, up to a factor, by its side lengths, and $P$ is a symmetric function of the side lengths alone. For $alpha = 0$ it gives a short proof of the Euler bound $sqrt(3)\/2$. For four or more vortices in the Euler case the bound fails: numerically, four vortices reach $P = 0.7978967838 dots$ and sixty-one vortices $P = 0.4981844392 dots$.

    #v(0.4em)
    *Keywords:* point vortices; vortex collapse; self-similar motion; surface quasi-geostrophic equation; generalized Euler equation. \
    *MSC 2020:* 76B47, 76U60, 37N10.
  ]
]

= Introduction

Three point vortices whose angular impulse and harmonic combination of circulations vanish can shrink to a point in finite time while the triangle they form keeps its shape and rotates. Each vortex then moves on a logarithmic spiral about the collision point. In the Euler case this self-similar collapse goes back to Gröbli; Conte and de Seze [3] and Kimura [8] wrote the motion in closed form, and the companion preprint [7] shows that the winding of the spiral, measured by the dimensionless number $P$ of @eq:P below, satisfies $P > sqrt(3)\/2$ for every self-similar collapse of three vortices, with a sharp constant.

Self-similar collapse of three vortices also occurs in the family of active-scalar models in which the streamfunction is obtained from the vorticity by a fractional inverse Laplacian, the generalized Euler or $alpha$-models, which include the surface quasi-geostrophic (SQG) equation [1, 6, 10, 11]. Their point vortices move by
$ (d z_j) / (d t) = i / (2 pi) sum_(k != j) Gamma_k (z_j - z_k) / (|z_j - z_k|^(2 beta)), quad beta = 1 + alpha / 2 , $ <eq:bs>
with positions $z_j in CC$ and real circulations $Gamma_j$. The case $alpha = 0$ ($beta = 1$) is the Euler system, and $alpha = 1$ ($beta = 3\/2$) is SQG. A constant factor in front of the sum, which differs between papers, only rescales time and does not change $P$. In the conventions of Badin and Barry [1] and of Grotto and Pappalettera [6] the same system has the parameter $2 - alpha$.

This note extends the winding bound to these models. With $B(alpha) = sqrt(3 + alpha) \/ (2 + alpha)$ we prove:

*Theorem 1.* _Let $alpha > alpha_0$, where $alpha_0 = -0.8960874362 dots$ is given by @eq:alpha0. Every self-similar collapse of three point vortices under @eq:bs has $P > B(alpha)$, and for every $delta > 0$ there is one with $P < B(alpha) + delta$._

The proof (Section 4) needs two facts proved in Section 3: a collapsing triangle is scalene and carries circulations fixed up to a factor by its side lengths (Lemma 2), and $P$ is a symmetric function of the side lengths alone (Lemma 3). For $alpha = 0$ it gives a short proof of the Euler bound of [7], though not the minimum for each ratio of circulations obtained there. Section 5 records that the bound does not extend to more than three vortices in the Euler case, and Section 6 lists the numerical checks.

= Self-similar motion

Call a motion of @eq:bs _self-similar_ if the triangle keeps its shape and orientation, that is, $z_j (t) = a(t) + b(t) z_j (0)$ with complex $a(t)$ and $b(t) != 0$, and _collapsing_ if moreover $b(t) -> 0$ in finite time.

*Lemma 1.* _Let a self-similar motion of @eq:bs change size. Then $Gamma_1 + Gamma_2 + Gamma_3 != 0$, and with $z_c = sum_j Gamma_j z_j \/ sum_j Gamma_j$ the center of vorticity, there is $kappa_0 in CC$ with $op("Re") kappa_0 != 0$ such that $dot(z)_j = kappa (t) (z_j - z_c)$ with $kappa(t) = kappa_0 lambda^(-2 beta)$, and_
$ z_j (t) - z_c = lambda(t) e^(i phi(t)) (z_j (0) - z_c), quad lambda^(2 beta) = 1 + 2 beta op("Re") kappa_0 thin t, quad phi = (op("Im") kappa_0) / (2 op("Re") kappa_0) ln lambda^2 . $ <eq:spiral>
_The motion collapses if and only if $op("Re") kappa_0 < 0$, at $t_c = -1\/(2 beta op("Re") kappa_0)$. Every vortex moves on a logarithmic spiral about $z_c$; the number_
$ P = (|op("Im") kappa|) / (2 |op("Re") kappa|) $ <eq:P>
_does not depend on $t$, and it is the angle through which the triangle turns while its squared size decreases by the factor $e$. The path of each vortex makes the angle $arctan 2P$ with the direction to $z_c$, a vortex at distance $r_0$ from $z_c$ travels the distance $r_0 sqrt(1 + 4P^2)$ before the collapse, and the initial angular velocity $omega_0 = op("Im") kappa_0$ satisfies $|omega_0| t_c = P \/ beta$._

_Proof._ The linear impulse $Q = sum_j Gamma_j z_j$ is conserved. If $sum_j Gamma_j = 0$, then $Q(t) = b(t) Q(0)$, and since $|b|$ changes, $Q(0) = 0$; then $Gamma_1 (z_1 - z_3) + Gamma_2 (z_2 - z_3) = 0$ with real coefficients not both zero, so the vortices are collinear, and a collinear triangle does not change size under @eq:bs (Lemma 2 below). Hence $sum_j Gamma_j != 0$, $z_c$ is conserved, and $z_c = a + b z_c$, so $z_j (t) - z_c = b(t) w_j$ with $w_j = z_j (0) - z_c$. The right side of @eq:bs is homogeneous: replacing $z_j - z_c$ by $b w_j$ multiplies it by $b |b|^(-2 beta)$. Writing $dot(z)_j (0) = kappa_0 w_j$, which holds for the same $kappa_0$ for all $j$ because $dot(b)(0) w_j = dot(z)_j (0)$, we get $dot(b) = kappa_0 b |b|^(-2 beta)$. With $b = lambda e^(i phi)$ this reads $lambda^(2 beta - 1) dot(lambda) = op("Re") kappa_0$ and $dot(phi) = op("Im") kappa_0 thin lambda^(-2 beta)$, which integrate to @eq:spiral. The size changes, so $op("Re") kappa_0 != 0$. Along the spiral $r = r_0 lambda$ and $d phi \/ d ln lambda = 2 P$ in absolute value, so $tan$ of the angle between the path and the radius is $2P$ and the arc length from $r_0$ to $0$ is $r_0 sqrt(1 + 4P^2)$. Finally $|omega_0| t_c = |op("Im") kappa_0| \/ (2 beta |op("Re") kappa_0|) = P \/ beta$. #h(1fr) $square$

For $beta = 1$, $P = |omega_0| t_c$ is the product studied in [7]. For $beta != 1$ the product $|omega_0| t_c$ is the rotation per unit decrease of $ln (t_c - t)$, and it differs from $P$ by the factor $1\/beta$; we state the bound for $P$, which measures the geometry of the spiral, and for $|omega_0| t_c$ in Corollary 1.

= Circulations and rates of a collapsing triangle

Label the sides by the opposite vertices: $r_1 = |z_2 - z_3|$, $r_2 = |z_3 - z_1|$, $r_3 = |z_1 - z_2|$, and put $f_i = r_i^(-2 beta)$. Let $A_s = op("Im")(overline((z_2 - z_1)) (z_3 - z_1)) \/ 2$ be the signed area, positive when $z_1, z_2, z_3$ are counterclockwise, and $A = |A_s|$. Indices $(i, j, k)$ run over the cyclic permutations of $(1, 2, 3)$.

*Lemma 2.* _Under @eq:bs, $d(r_i^2) \/ d t = (2 A_s \/ pi) thin Gamma_i (f_j - f_k)$. A motion is self-similar and changes size if and only if the triangle is not collinear, its sides are pairwise different, and_
$ Gamma_i = c thin r_i^2 / (f_j - f_k) quad (i = 1, 2, 3) $ <eq:circ>
_for some real $c != 0$. In that case $op("Re") kappa = c A_s \/ pi$, and exactly one of a triangle and its mirror image collapses._

_Proof._ For $i = 3$, the terms of $dot(z)_1 - dot(z)_2$ proportional to $z_1 - z_2$ do not change $|z_1 - z_2|$, and the rest is $(i Gamma_3 \/ 2 pi)((z_1 - z_3) f_2 - (z_2 - z_3) f_1)$. Since $op("Im")(overline((z_1 - z_2)) (z_1 - z_3)) = op("Im")(overline((z_1 - z_2)) (z_2 - z_3)) = 2 A_s$, $d(r_3^2)\/d t = 2 op("Re")(overline((z_1 - z_2)) (dot(z)_1 - dot(z)_2)) = (2 A_s \/ pi) Gamma_3 (f_1 - f_2)$, and the other sides follow by cyclic relabeling. In a self-similar motion $d ln r_i^2 \/ d t = 2 op("Re") kappa$ for every $i$, so $(2 A_s \/ pi) Gamma_i (f_j - f_k) \/ r_i^2$ is the same for all $i$; if the size changes, this common value is not $0$, so $A_s != 0$, $f_j != f_k$ for all pairs, and @eq:circ holds with $c = pi op("Re") kappa \/ A_s$. Conversely, if @eq:circ holds with $c != 0$ on a scalene triangle that is not collinear, the three logarithmic rates coincide, so the ratios of the squared sides are stationary at this shape; the rates of these ratios are functions of the shape alone, multiplied by a power of the size, so the shape is an equilibrium of the reduced motion and is kept for all time, with the orientation, since the area cannot pass through zero. The motion is therefore self-similar, and its size changes because $op("Re") kappa = c A_s \/ pi != 0$. Reflecting the triangle changes the sign of $A_s$ and keeps @eq:circ, so it changes the sign of $op("Re") kappa$. #h(1fr) $square$

In particular, isosceles, equilateral and collinear triangles never collapse, and every scalene triangle collapses in exactly one orientation, with the circulations @eq:circ fixed up to a real factor. On a scalene triangle, @eq:circ says that the vector $(1\/Gamma_i)$ is proportional to the cross product of $(r_i^2)$ and $(r_i^(2 - 2 beta))$, that is, orthogonal to both; so it is equivalent to the vanishing of the angular impulse, $sum_i r_i^2 \/ Gamma_i = 0$, together with $sum_i r_i^(-alpha) \/ Gamma_i = 0$, which is the vanishing of $sum_(j<k) Gamma_j Gamma_k r_(i)^(-alpha)$ for $alpha != 0$ and the classical condition $sum_(j<k) Gamma_j Gamma_k = 0$ for $alpha = 0$. Conditions of this kind are given in [1, 2, 6, 10, 11]; Lemma 2 is a short self-contained form of them, with the circulations explicit.

*Lemma 3.* _For a self-similar motion that changes size, with @eq:circ,_
$ 2 pi op("Im") kappa = 1/2 sum_(i=1)^3 Gamma_i (f_j + f_k) = c / 2 S, quad S = sum_(i=1)^3 r_i^2 coth(beta ln (r_k) / (r_j)) , quad P = (|S|) / (8 A) . $ <eq:S>

_Proof._ Since $dot(z)_1 - dot(z)_2 = kappa (z_1 - z_2)$, $op("Im") kappa = op("Im")((dot(z)_1 - dot(z)_2) \/ (z_1 - z_2))$. By @eq:bs,
$ 2 pi (dot(z)_1 - dot(z)_2) / (z_1 - z_2) = i (Gamma_1 + Gamma_2) f_3 + i Gamma_3 (f_2 (z_1 - z_3) - f_1 (z_2 - z_3)) / (z_1 - z_2) , $
and by the law of cosines $op("Re")((z_1 - z_3)\/(z_1 - z_2)) = (r_2^2 + r_3^2 - r_1^2)\/(2 r_3^2)$ and $op("Re")((z_2 - z_3)\/(z_1 - z_2)) = (r_2^2 - r_1^2 - r_3^2)\/(2 r_3^2)$. Hence
$ 2 pi op("Im") kappa = (Gamma_1 + Gamma_2) f_3 + Gamma_3 (f_1 + f_2)/2 + Gamma_3 ((f_2 - f_1)(r_2^2 - r_1^2)) / (2 r_3^2) . $
By @eq:circ the last term is $c (r_1^2 - r_2^2) \/ 2$, and also $c(r_1^2 - r_2^2) = Gamma_1 (f_2 - f_3) + Gamma_2 (f_1 - f_3)$. Substituting gives $2 pi op("Im") kappa = (1\/2) sum_i Gamma_i (f_j + f_k)$, and by @eq:circ, $Gamma_i (f_j + f_k) = c r_i^2 (f_j + f_k)\/(f_j - f_k) = c r_i^2 coth(beta ln(r_k \/ r_j))$. With $op("Re") kappa = c A_s \/ pi$ from Lemma 2, @eq:P gives $P = |S| \/ (8 A)$. #h(1fr) $square$

The circulations drop out: $P$ depends only on the shape of the triangle. Interchanging two labels reverses the cyclic order, which changes the sign of every term of $S$, so $|S|$ is a symmetric function of the side lengths. The first identity says that the rotation rate is half the sum of the rates at which the three pairs would rotate in isolation.

= The bound

Put
$ beta_0 = (3 + sqrt(105)) / 24 = 0.5519562819 dots , quad alpha_0 = 2 beta_0 - 2 = -0.8960874362 dots , $ <eq:alpha0>
so that $beta_0$ is the positive root of $12 beta^2 - 3 beta - 2$. We use the elementary inequality
$ 1 / (ln(1 + x)) >= 1 / x + 1 / 2 - x / 12 quad (x > 0) . $ <eq:log>
It is trivial where the right side is negative, that is, for $x >= 3 + sqrt(21)$. For $0 < x < 3 + sqrt(21)$, the function $g(x) = 12 x \/ (12 + 6x - x^2) - ln(1 + x)$ has $g(0) = 0$ and $g'(x) = x^3 (24 - x) \/ ((12 + 6x - x^2)^2 (1 + x)) > 0$, so $ln(1 + x) <= 12 x \/ (12 + 6 x - x^2)$, which is @eq:log.

_Proof of Theorem 1._ By Lemma 2 a collapsing triangle is scalene, and by Lemma 3, $P = |S| \/ (8 A)$ is symmetric in the sides and invariant under scaling. Order and scale the sides as $r_2 = rho < r_3 = 1 < r_1$, and write $r_1^2 = 1 + rho m$. With $psi$ the angle at $z_1$, between the sides of lengths $rho$ and $1$, the law of cosines gives $2 cos psi = rho - m$, so $0 < m < 2 + rho$, $0 < rho < 1$, $A = (rho \/ 2) sin psi$ and $4 sin^2 psi = 4 - (m - rho)^2$. Put $X = rho^(2 beta)$, $Y = (1 + rho m)^beta$ and $b = (beta\/2) ln(1 + rho m)$. Then $0 < X < 1 < Y$ and, from @eq:S with $(i, j, k) = (1, 2, 3)$ and its cyclic shifts,
$ S = (1 + rho m) (1 + X) / (1 - X) + rho^2 coth b - (Y + X) / (Y - X) . $
(i) The function $t |-> (t + X)\/(t - X)$ decreases for $t > X$, so $(Y + X)\/(Y - X) <= (1 + X)\/(1 - X)$ and $S >= rho m + rho^2 coth b$. (ii) $coth b > 1 \/ b$, and @eq:log with $x = rho m$ gives $rho^2 \/ b >= (rho \/ beta)(2\/m + rho - rho^2 m \/ 6)$. Hence
$ S > (rho) / (beta) Lambda, quad Lambda = beta m + 2 / m + rho - (rho^2 m) / 6 > 0 , $
the last because $rho^2 m \/ 6 < rho\/2$. In particular $S > 0$, and
$ P = S / (4 rho sin psi) > Lambda / (2 beta sqrt(4 - (m - rho)^2)) . $
(iii) The identity
$ Lambda^2 - (1 + 2 beta)(4 - (m - rho)^2) = ((1 + beta) m - 2 / m - rho)^2 + (rho^2) / 3 (1 + 6 beta - beta m^2 - rho m + (rho^2 m^2) / 12) $ <eq:id>
holds for all $rho$, $m$, $beta$, and its right side is positive. If $m < 2$, the second bracket exceeds $1 + 6 beta - 4 beta - 2 = 2 beta - 1 > 0$. If $m >= 2$, then $(1 + beta) m - 2\/m - rho >= 1 + 2 beta - rho > 2 beta$, so the square exceeds $4 beta^2$; and since $m < 2 + rho$, the second term is at least $h(rho)\/3$ with $h(rho) = rho^2 (1 + 6 beta - beta (2 + rho)^2 - rho (2 + rho))$, where $h(rho) - h(1) = (1 - rho)(beta rho^3 + 5 beta rho^2 + 3 beta rho + 3 beta + rho^3 + 3 rho^2 + 2 rho + 2) > 0$ and $h(1) = -3 beta - 2$; so the right side exceeds $4 beta^2 - beta - 2\/3 = (12 beta^2 - 3 beta - 2)\/3 > 0$ for $beta > beta_0$. Hence $Lambda > sqrt(1 + 2 beta) sqrt(4 - (m - rho)^2)$ and $P > sqrt(1 + 2 beta)\/(2 beta) = B(alpha)$.

Sharpness. Let $rho -> 0$ with $m$ fixed in $(0, 2)$. Since $2 beta > 1$, $X = o(rho)$, so the first and last terms of $S$ are $1 + rho m + o(rho)$ and $1 + o(rho)$, while $rho^2 coth b = 2 rho \/ (beta m) + O(rho^2)$. Hence $S \/ rho -> m + 2\/(beta m)$ and
$ P -> P_0 (m) = (beta m^2 + 2) / (2 beta m sqrt(4 - m^2)) , $
whose only critical point on $(0, 2)$ is $m_* = sqrt(2 \/ (1 + beta))$, with $P_0 (m_*) = sqrt(1 + 2 beta)\/(2 beta)$. By Lemma 2 each of these triangles, or its mirror image, collapses with the circulations @eq:circ, so $P$ comes arbitrarily close to $B(alpha)$. #h(1fr) $square$

In the extremal limit $rho -> 0$ the circulations @eq:circ are, up to a factor, $Gamma_2 approx 1$ at the vertex opposite the shortest side and $Gamma_1 approx -Gamma_3$ of order $rho^(2 beta - 1)$ at its ends: two weak vortices of opposite sign, at distance $rho$, spiral into a strong vortex, and the line through them makes the angle $arccos(1\/sqrt(2(1 + beta)))$ with the line to the strong vortex. For $alpha = 0$ this is the limit $mu -> 0$ of [7, Corollary 1].

*Corollary 1.* _Let $alpha > alpha_0$. In every self-similar collapse of three point vortices under @eq:bs, each vortex travels more than $(4 + alpha)\/(2 + alpha)$ times its initial distance from the collision point, the angle between its path and the direction to that point exceeds $arccos((2 + alpha)\/(4 + alpha))$, and $|omega_0| t_c > 2 sqrt(3 + alpha)\/(2 + alpha)^2$. None of these constants can be improved._

_Proof._ By Lemma 1 the three quantities are $sqrt(1 + 4P^2)$, $arctan 2P$ and $P\/beta$, which increase with $P$, and $sqrt(1 + 4 B^2) = (4 + alpha)\/(2 + alpha)$. #h(1fr) $square$

#figure(
  table(
    columns: 6,
    align: (left, center, center, center, center, center),
    stroke: none,
    table.hline(),
    [], [$alpha = 0$ (Euler)], [$alpha = 1\/2$], [$alpha = 1$ (SQG)], [$alpha = 3\/2$], [$alpha = 2$],
    table.hline(stroke: 0.5pt),
    [$B(alpha)$], [$sqrt(3)\/2 = 0.8660$], [$sqrt(14)\/5 = 0.7483$], [$2\/3$], [$0.6061$], [$sqrt(5)\/4 = 0.5590$],
    [path ratio], [$2$], [$9\/5$], [$5\/3$], [$11\/7$], [$3\/2$],
    [angle], [$60 degree$], [$56.25 degree$], [$53.13 degree$], [$50.48 degree$], [$48.19 degree$],
    table.hline(),
  ),
  caption: [The bound of Theorem 1 and the two constants of Corollary 1 for some values of $alpha$.],
) <tab:values>

#figure(
  image("figures/alpha-winding.svg", width: 100%),
  caption: [(a) The bound $B(alpha)$ of Theorem 1 (curve) and $P = |S|\/(8A)$ for 24395 random collapsing triangles at 61 values of $alpha$ (dots, spread slightly in $alpha$ for visibility); none lies below the curve, which is approached as the shortest side tends to $0$. (b) The paths of the three vortices of an SQG collapse ($alpha = 1$) with sides $0.45$, $1$ and $(1 + 0.45 m_*)^(1\/2)$ and the circulations of Lemma 2, integrated from @eq:bs to $10^(-6) t_c$ before the collapse; dots mark the initial positions and the cross the collision point. The program is `plot_alpha_winding.py`.],
) <fig:alpha>

Since $d ln B \/ d alpha = -(4 + alpha)\/(2 (3 + alpha)(2 + alpha)) < 0$, the bound decreases strictly in $alpha$, from $sqrt(3)\/2$ in the Euler case through $2\/3$ for SQG to $0$ as $alpha -> infinity$: more local interactions allow tighter spirals, but never a collapse without rotation (@fig:alpha). The restriction $alpha > alpha_0$ comes only from the case $m >= 2$ in step (iii); numerical minimization of @eq:S for $alpha$ between $-1.8$ and $alpha_0$, in arithmetic whose precision grows with $|ln rho|$, finds no value below $B(alpha)$ either, the infimum again being approached only as $rho -> 0$, but we do not claim the bound there.

= More than three vortices

Self-similar motion of any number of vortices has the same form [4, 5, 9], $dot(z)_j = kappa (z_j - z_c)$ and $P$ defined by @eq:P. In the Euler case the bound of [7] does not extend to more vortices: the seven-vortex collapse of Demina and Kudryashov [4, Table 1] has $P = 12433\/(1240 sqrt(155)) = 0.805 dots$ [7]. A numerical minimization of $op("Im") kappa \/ (-2 op("Re") kappa)$ over the circulations and positions of four vortices, from more than two hundred random starts, ends at a single configuration up to relabeling, with
$ P_4 = 0.79789678387986348076760587182 dots , $
a strict local minimum (the Hessian of the Lagrangian on the three-dimensional tangent space of the constraints has eigenvalues $2.21$, $12.58$ and $18.75$). In the normalization $Gamma_1 = 1$, $z_c = 0$, $kappa = -1 + i b$ it has $b = 1.5957935677597269615 dots$ and
$ Gamma &= (1, 0.1673914318538, 0.1041331880362, -0.2272513003829), \
z &= (0.0166495669172, -0.2191226402232 - 0.3290676220068 i, \
  & quad -0.1579874300122 - 0.2864759934272 i, -0.1605333843048 - 0.3736601672808 i) . $
Families of larger numerical minimizers go lower still: $P = 0.5172291322 dots$ for 33 vortices and $P = 0.4981844392 dots$ for 61 vortices, so a self-similar collapse can turn by less than half a radian per unit decrease of $ln lambda^2$. Whether $P$ can be arbitrarily small for large numbers of vortices is open; the families computed so far extrapolate to about $0.477$. These are numerical results, not proofs, and we do not know whether the three-vortex bound extends in some modified form to $alpha != 0$ for more vortices.

= Numerical verification

The program `verify_alpha_winding.py` checks each step in high-precision arithmetic, and its output is `artifacts/verify_alpha_winding.txt`. On 700 random scalene triangles with $alpha in {0, 0.3, 1, 1.7, 3}$, the circulations @eq:circ make the Biot–Savart velocities @eq:bs self-similar to $10^(-38)$, and $P$ computed from the velocities agrees with @eq:S to $3 dot 10^(-38)$. The derivative of $g$, the identity @eq:id and the factorization of $h(rho) - h(1)$ are verified symbolically, and the critical point and value of $P_0$ as well. The chain of inequalities in the proof holds at $20000$ random points with $beta$ from $0.56$ to $20$ and $rho$ down to $10^(-8)$, computed with precision adapted to $rho^(2 beta)$; in double precision the first step appears to fail at small $rho$ and large $beta$, where its margin, of order $rho^(2 beta)$, is below the rounding error. For $alpha$ from $-1.8$ to $-0.85$ the minimum of $P - B(alpha)$ over the ordered triangles is positive in every run, again only with precision adapted to $rho$. For $alpha = 1$, the scalene triangles on which @eq:circ gives two equal circulations carry the ratios $-Gamma_2\/Gamma_1$ from $0.3876$ to $0.49999$ on a grid, in agreement with the interval of [1, Lemma 1], and at $Gamma = 0.49$ the ratio of sides is $0.7515$, against $0.751484$ in [1]. Near-extremal triangles at $rho = 10^(-6)$ and $m = m_*$ collapse, and $P - B(alpha)$ is $1.3 dot 10^(-12)$, $1.8 dot 10^(-13)$, $1.6 dot 10^(-13)$ and $1.6 dot 10^(-13)$ for $alpha = 0, 1\/2, 1, 2$. The four-, thirty-three- and sixty-one-vortex configurations of Section 5 satisfy the self-similarity equations to $10^(-29)$, $10^(-39)$ and $10^(-28)$ relative in independent Biot–Savart checks.

= Discussion

Self-similar collapse of three vortices in the $alpha$-models has been studied from several directions: Badin and Barry [1] derive the necessary conditions for collapse in Nambu form and show that in the SQG case collapse is self-similar when the energy vanishes and not self-similar otherwise; for circulations $(1, -Gamma, 1)$ they find self-similar SQG collapse exactly for $0.387464 dots < Gamma < 1\/2$ [1, Lemma 1], an interval that Lemma 2 reproduces; Reinaud, Dritschel and Scott [11] give the conditions for self-similar collapse of three vortices and map the collapse time over the collapsing configurations; Reinaud [10] treats the SQG case (see [6, Prop. 2.1]); Chen and Liu [2] give necessary and sufficient conditions for self-similar motion; and Grotto and Pappalettera [6, Prop. 2.1] characterize the self-similar motions and write the collapsing spiral, as a step toward bursts out of arbitrary configurations. We have not found a bound on the winding, the spiral angle or the distance traveled in these works, nor the explicit form @eq:circ of the circulations or the formula @eq:S for $P$, but we have not been able to consult [2] and [10] in full. In the Euler case the closed forms of the rates go back to [3] and [8], and the bound $P > sqrt(3)\/2$ with its minimum for each ratio of circulations is in [7]; Theorem 1 gives, for $alpha = 0$, a shorter proof of that bound through the side lengths.

The bound concerns self-similar collapse only; it says nothing about other singular motions of the $alpha$-models, such as the SQG collapses at nonzero energy found in [1]. Its value lies in the geometry: however the circulations are chosen, a collapsing triangle turns by more than $B(alpha)$ radians per unit decrease of the logarithm of its squared size, and the infimum is realized only by a degenerate dipole beside a strong vortex.

#v(0.5em)
#par(justify: false)[*Data availability.* The programs `verify_alpha_winding.py` and `plot_alpha_winding.py` and their output are in the directory `research/` of the repository https://github.com/SharpMeow/GENChase; the many-vortex configurations and their checks are in `research/generalizations-2026-09-24/`.]

#v(0.3em)
#text(size: 9pt)[This work was prepared with AI assistance. The author takes full responsibility for its content.]

#v(0.6em)
#heading(numbering: none)[References]
#set text(size: 10pt)
#set enum(numbering: "[1]")
+ G. Badin and A. M. Barry, Collapse of generalized Euler and surface quasigeostrophic point vortices, _Phys. Rev. E_ *98* (2018) 023110; arXiv:1805.10127.
+ J. Chen and Q. Liu, Sufficient and necessary conditions for self-similar motions of three point vortices in generalized fluid systems, _Physica D_ *470* (2024) 134392.
+ R. Conte and L. de Seze, Exact solution of the planar motion of three arbitrary point vortices, report DPhG/PSRM/1697/80, CEN Saclay (1980); arXiv:1511.00069.
+ M. V. Demina and N. A. Kudryashov, Rotation, collapse, and scattering of point vortices, _Theor. Comput. Fluid Dyn._ *28* (2014) 357–368; doi:10.1007/s00162-014-0319-4.
+ T. Gotoda, Self-similar motions and related relative equilibria in the $N$-point vortex system, _J. Dyn. Differ. Equ._ *33* (2021) 1759–1777; arXiv:2002.09624.
+ F. Grotto and U. Pappalettera, Collapse and burst of generalized surface quasi-geostrophic point vortices, preprint, arXiv:2505.19782 (2025).
+ C. Hendrick, Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons, preprint (2026), https://github.com/SharpMeow/GENChase.
+ Y. Kimura, Similarity solution of two-dimensional point vortices, _J. Phys. Soc. Jpn._ *56* (1987) 2024–2030.
+ K. A. O'Neil, Relative equilibrium and collapse configurations of four point vortices, _Regul. Chaotic Dyn._ *12* (2007) 117–126.
+ J. N. Reinaud, Self-similar collapse of three geophysical vortices, _Geophys. Astrophys. Fluid Dyn._ *115* (2021) 369–392.
+ J. N. Reinaud, D. G. Dritschel and R. K. Scott, Self-similar collapse of three vortices in the generalised Euler and quasi-geostrophic equations, _Physica D_ *434* (2022) 133226.
