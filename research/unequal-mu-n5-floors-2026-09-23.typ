#set document(title: "Minimal winding in self-similar point-vortex collapse", author: "Chase Hendrick")
#set page(paper: "us-letter", margin: (x: 1in, y: 1in), numbering: "1")
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.")
#set math.equation(numbering: "(1)")
#show ref: it => {
  let el = it.element
  if el != none and el.func() == math.equation {
    link(el.location(), numbering(el.numbering, ..counter(math.equation).at(el.location())))
  } else {
    it
  }
}
#show table: set par(justify: false)
#show table: set align(left)

#align(center)[
  #text(size: 14pt, weight: "bold")[
    Minimal winding in the self-similar collapse of three \
    unequal point vortices and of two concentric vortex polygons
  ]
  #v(0.7em)
  #text(size: 11pt)[Chase Hendrick]
  #v(0.2em)
  #text(size: 9.5pt)[GENChase]
]

#v(1em)

#pad(x: 2.2em)[
  #text(size: 10pt)[
    *Abstract.* In a self-similar collapse of point vortices every vortex moves on a logarithmic spiral, and the dimensionless product $P = omega_0 t_c$ of the initial angular velocity and the collapse time measures how tightly the spiral winds. We minimize $P$ in closed form over two classical collapsing families. For three vortices with circulations $(1, 1\/2, -1\/3)$ and zero angular impulse, the collapsing configurations form two arcs, one for each orientation of the vortex triangle, and $P$ has a unique critical point, a minimum, on each. The two minima, $1.0647059762 dots$ and $2.2038550160 dots$, are the positive roots of the irreducible polynomial $8748 x^6 - 49005 x^4 + 27794 x^2 + 18723$; they are given by the trigonometric form of Cardano's formula and are not expressible by real radicals. The smaller one is the minimum over the whole family. For equal circulations $Gamma_1 = Gamma_2$ the two arcs are equivalent and the minimum is $sqrt(2)$. For two concentric regular $n$-gons carrying circulations $x_n$ and $-1$, $P = (K_n - sqrt(2n - 1) cos n theta) \/ (2n sin n theta)$ in terms of the relative rotation $theta$, with an explicit constant $K_n$, and its minimum is $sqrt(K_n^2 - 2n + 1) \/ (2n)$; for pentagons this is $sqrt(31682)\/80$. The results are checked against the Biot–Savart velocities in 60-digit arithmetic and by direct integration of the equations of motion.

    #v(0.4em)
    *Keywords:* point vortices; vortex collapse; self-similar motion; logarithmic spiral. \
    *MSC 2020:* 76B47, 37N10.
  ]
]

= Introduction

Three point vortices can collapse to a point in finite time only if $1\/Gamma_1 + 1\/Gamma_2 + 1\/Gamma_3 = 0$ and their angular impulse vanishes, and under these conditions the motion is self-similar: the vortex triangle keeps its shape while it shrinks and rotates [1, 8]. Such collapse was found by Gröbli [6] and rediscovered by Novikov and Sedov [10], who also constructed collapsing configurations of four and five vortices. Aref [3] gave the collapse rate and the rotation frequency for general circulations, and Gotoda [5] gave an explicit parametrization of the collapsing configurations. Collapse also occurs in configurations of higher symmetry. Aref [2] reduced the motion of two concentric regular $n$-gons of vortices to an integrable Hamiltonian system with two degrees of freedom, and Koiller et al. [7] found collapsing two-ring configurations, whose vortices move on logarithmic spirals.

In a self-similar collapse at time $t_c$ the configuration rotates through the angle $omega_0 t_c thin ln(1 - t\/t_c)^(-1)$ by time $t$, where $omega_0$ is the initial angular velocity. Each vortex therefore moves on a logarithmic spiral about the collision point, and the dimensionless number $P = |omega_0| t_c$, which is invariant under rescaling of lengths, times and circulations, is the angle through which the configuration turns while the square of its size decreases by the factor $e$. Equivalently, the path of each vortex makes the constant angle $arctan 2P$ with the direction to the collision point, and a vortex that starts at distance $r_0$ from that point travels the distance $r_0 sqrt(1 + 4P^2)$ before the collapse. Within a collapsing family it is natural to ask which configuration winds least.

We answer this question for two families. In Section 3 we treat three vortices with circulations $(1, 1\/2, -1\/3)$. The collapsing configurations form two arcs, one for each orientation of the triangle, and $P$ has a unique minimum on each; the two minima are distinct conjugate algebraic numbers of degree six, and the smaller is the minimum over the whole family. For $Gamma_1 = Gamma_2$ the two orientations are exchanged by interchanging the equal vortices and the minimum is $sqrt(2)$ (Remark 3). In Section 4 we treat two concentric regular $n$-gons, for which the minimization reduces to an elementary inequality once $P$ is written in a suitable form. Section 5 describes an independent numerical check.

= Self-similar collapse

The positions $z_j in CC$ of point vortices with circulations $Gamma_j$ evolve according to

$ overline(dot(z)_j) = 1/(2 pi i) sum_(k != j) Gamma_k / (z_j - z_k) . $ <eq:bs>

Suppose $sum_j Gamma_j != 0$, let $z_c = sum_j Gamma_j z_j \/ sum_j Gamma_j$ be the center of vorticity, which is conserved, and suppose that at $t = 0$ there is $kappa in CC$ with $dot(z)_j = kappa (z_j - z_c)$ for all $j$. The right-hand side of @eq:bs is homogeneous of degree $-1$ in the relative positions and commutes with rotations, so the solution is $z_j (t) = z_c + lambda(t) e^(i phi(t)) (z_j (0) - z_c)$ with $lambda dot(lambda) = op("Re") kappa$ and $lambda^2 dot(phi) = op("Im") kappa$. Hence $lambda^2 = 1 + 2 op("Re") kappa thin t$. If $op("Re") kappa < 0$ the vortices collide at $z_c$ at the time $t_c = -1\/(2 op("Re") kappa)$, and $omega_0 = op("Im") kappa$, so that

$ P = |omega_0| t_c = (|op("Im") kappa|) / (-2 op("Re") kappa) . $ <eq:P>

Integrating $dot(phi) = omega_0 \/ lambda^2$ gives $phi = -P ln lambda^2$ when $omega_0 > 0$, which is the description of the spiral given in the introduction. The angular impulse about the center of vorticity satisfies

$ sum_j Gamma_j |z_j - z_c|^2 = 1/(sum_j Gamma_j) sum_(j < k) Gamma_j Gamma_k |z_j - z_k|^2 . $ <eq:L>

It is conserved and, in a self-similar motion, proportional to $lambda^2$, so it must vanish for a collapse. The minimizations below reduce to the following elementary inequality.

*Lemma 1.* _Let $a > |b|$. For $0 < alpha < pi$, $(a - b cos alpha) \/ sin alpha >= sqrt(a^2 - b^2)$, with equality if and only if $cos alpha = b\/a$._

_Proof._ The numerator is positive, and $(a - b cos alpha)^2 - (a^2 - b^2) sin^2 alpha = (a cos alpha - b)^2$. #h(1fr) $square$

= Three vortices with circulations $(1, 1\/2, -1\/3)$

Let $Gamma = (1, 1\/2, -1\/3)$, so that $1\/Gamma_1 + 1\/Gamma_2 + 1\/Gamma_3 = 0$ and $sum_j Gamma_j = 7\/6$. For $w = (z_3 - z_1)\/(z_2 - z_1)$ the sum $sum_(j < k) Gamma_j Gamma_k |z_j - z_k|^2$ in @eq:L equals $|z_2 - z_1|^2 (1\/2 - |w|^2 \/ 3 - |w - 1|^2 \/ 6)$, which vanishes exactly on the circle $|w - 1\/3| = sqrt(7)\/3$. We use the parametrization of the zero-impulse configurations given by Gotoda [5, Sect. 3], which for these circulations reads

$ z_1 = 2/9 (1 + sqrt(7)/2 e^(-i theta)) , quad z_2 = 2/9 (1 - sqrt(7) e^(-i theta)) , quad z_3 = 1 , quad theta in [0, 2 pi) . $ <eq:pos>

Here $sum_j Gamma_j z_j = 0$, so $z_c = 0$, and

$ z_1 - z_2 = sqrt(7)/3 e^(-i theta) , quad z_3 - z_1 = sqrt(7)/9 (sqrt(7) - e^(-i theta)) , quad z_3 - z_2 = sqrt(7)/9 (sqrt(7) + 2 e^(-i theta)) . $

The shape ratio is $w = 1\/3 - (sqrt(7)\/3) e^(i theta)$, which traverses the zero-impulse circle exactly once. Every zero-impulse configuration is therefore obtained, up to translation, rotation and dilation, for exactly one $theta$. Since $op("Im") w = -(sqrt(7)\/3) sin theta$, the triangle $z_1 z_2 z_3$ is positively oriented for $sin theta < 0$ and negatively oriented for $sin theta > 0$.

*Lemma 2.* _For every $theta$ the three quotients $dot(z)_j \/ (z_j - z_c)$ are equal to_

$ kappa = (27 i) / (4 sqrt(7) pi) dot (sqrt(7) + e^(i theta)) / ((sqrt(7) - e^(i theta)) (sqrt(7) + 2 e^(i theta))) . $

_Consequently, with $D(theta) = (4 - sqrt(7) cos theta)(11 + 4 sqrt(7) cos theta) > 0$,_

$ op("Re") kappa = - (27 (14 cos theta + sqrt(7)) sin theta) / (28 pi D(theta)) , quad op("Im") kappa = (27 (14 sin^2 theta + 6 sqrt(7) cos theta + 21)) / (28 pi D(theta)) . $

_Proof._ Since $z_c = 0$ and $z_3 = 1$, $kappa = dot(z)_3$, and by @eq:bs, $overline(dot(z)_3) = (2 pi i)^(-1) ((z_3 - z_1)^(-1) + (1\/2)(z_3 - z_2)^(-1))$. Inserting the differences above gives the stated $kappa$, and the same computation for $j = 1, 2$ gives the same value. Multiplying numerator and denominator by $(sqrt(7) - e^(-i theta))(sqrt(7) + 2 e^(-i theta))$ and using $|sqrt(7) - e^(i theta)|^2 = 2(4 - sqrt(7) cos theta)$ and $|sqrt(7) + 2 e^(i theta)|^2 = 11 + 4 sqrt(7) cos theta$ gives the real and imaginary parts. Both factors of $D$ are positive because $sqrt(7) < 4$ and $4 sqrt(7) < 11$. #h(1fr) $square$

The numerator of $op("Im") kappa$ is at least $21 - 6 sqrt(7) > 0$, so every zero-impulse configuration rotates in the positive sense, and by Lemma 2 it collapses exactly when $(14 cos theta + sqrt(7)) sin theta > 0$. Let $theta_0 in (pi\/2, pi)$ be defined by $cos theta_0 = -sqrt(7)\/14$. The collapsing configurations are those with $theta$ in one of the two arcs

$ cal(B) = (0, theta_0) , quad cal(A) = (pi, 2 pi - theta_0) , $

the triangle being negatively oriented on $cal(B)$ and positively oriented on $cal(A)$. By @eq:P,

$ P(theta) = (14 sin^2 theta + 6 sqrt(7) cos theta + 21) / (2 (14 cos theta + sqrt(7)) sin theta) , quad theta in cal(A) union cal(B) . $ <eq:Ptheta>

Complex conjugation maps solutions of @eq:bs to solutions with time reversed, and $z_j (-theta) = overline(z_j (theta))$, so $theta -> -theta$ maps $cal(A)$ onto the expanding arc $(theta_0, pi)$ and $cal(B)$ onto the expanding arc $(2 pi - theta_0, 2 pi)$. No such symmetry relates $cal(A)$ to $cal(B)$.

#v(0.3em)
*Proposition 1.* _The function $P$ has exactly one critical point on each of $cal(A)$ and $cal(B)$, and it is the minimum of $P$ on that arc. Let_

$ X = (245351 sqrt(5201)) / 5201^2 , quad R = (7 sqrt(5201)) / 162 . $

_Then_

$ min_(cal(A)) P = sqrt(605/324 + R cos(1/3 arccos X - (2 pi)/3)) = 1.0647059762712043 dots , $

$ min_(cal(B)) P = sqrt(605/324 + R cos(1/3 arccos X)) = 2.2038550160361327 dots , $

_attained at $cos theta = -0.9243893679 dots$ and $cos theta = 0.6739838839 dots$ respectively. Both minima are roots of the polynomial $8748 x^6 - 49005 x^4 + 27794 x^2 + 18723$, which is irreducible over $QQ$ and over $QQ(sqrt(7))$ and whose real roots are exactly these two numbers and their negatives. In particular, the least value of $P$ over all collapsing configurations is $1.0647059762712043 dots$._

#v(0.3em)
_Proof._ Write $c = cos theta$, so that $P = N(c) \/ (2 (14 c + sqrt(7)) sin theta)$ with $N(c) = 35 + 6 sqrt(7) c - 14 c^2$, which is positive on both arcs. Since $P > 0$ there and $d c \/ d theta = -sin theta != 0$, the critical points of $P$ on each arc correspond to the zeros of $d(P^2)\/d c$ in the range of $c$ on that arc. Now $P^2 = N^2 \/ (4 (14 c + sqrt(7))^2 (1 - c^2))$, and a direct computation gives

$ (d (P^2)) / (d c) = (sqrt(7) N(c) C(c)) / (4 (1 - c^2)^2 (14 c + sqrt(7))^3) , quad C(c) = 196 c^3 + 224 sqrt(7) c^2 + 14 c - 128 sqrt(7) . $

With $c = sqrt(7) u$ we have $C = sqrt(7) f(u)$, $f(u) = 1372 u^3 + 1568 u^2 + 14 u - 128$. Now $f(-2) < 0 < f(-1)$, $f(-1\/sqrt(7)) = 96 - 30 sqrt(7) > 0$, $f(-1\/14) = -243\/2 < 0$ and $f(1\/sqrt(7)) = 96 + 30 sqrt(7) > 0$, so the cubic $f$ has one root in each of $(-2, -1)$, $(-1\/sqrt(7), -1\/14)$ and $(-1\/14, 1\/sqrt(7))$. The first gives $|c| > 1$. The second and third lie in the ranges of $u$ on $cal(A)$ and on $cal(B)$, which are $(-1\/sqrt(7), -1\/14)$ and $(-1\/14, 1\/sqrt(7))$. Hence each arc contains exactly one critical point. At the endpoints of both arcs the numerator of @eq:Ptheta takes the values $21 + 6 sqrt(7)$, $63\/2$ and $21 - 6 sqrt(7)$, all positive, while the denominator vanishes; since $P > 0$ on the arcs, $P -> +infinity$ at every endpoint. A continuous function on an open interval that tends to $+infinity$ at both ends and has a single critical point attains its minimum there.

To find the minimal values we eliminate $c$ between $C(c) = 0$ and $4 P^2 (14 c + sqrt(7))^2 (1 - c^2) = N(c)^2$, and then eliminate $sqrt(7)$. The resultant is a constant multiple of $(8748 P^6 - 49005 P^4 + 27794 P^2 + 18723)^2$. As a cubic in $q = P^2$ this polynomial is irreducible over $QQ$ and has positive discriminant, so it has three real roots, $q approx 4.856977$, $1.133599$ and $-0.388724$, given by $q_k = 605\/324 + R cos(1\/3 arccos X - 2 pi k\/3)$, $k = 0, 1, 2$. The minima are positive roots of the sextic, so their squares are $q_0$ and $q_1$, and evaluating $P$ at the two critical points identifies $q_0$ with $cal(B)$ and $q_1$ with $cal(A)$. #h(1fr) $square$

#v(0.3em)
*Remark 1.* The two minima are conjugate algebraic numbers of degree six. Since the cubic in $q$ is irreducible over $QQ$ with three real roots, none of its roots is expressible by real radicals (casus irreducibilis), and hence neither is the square root of one.

*Remark 2.* The same construction applies to $Gamma = (1, mu, -mu\/(1 + mu))$. Multiplying the circulations by $1\/mu$ and interchanging the first two vortices shows that the pair of branch minima is invariant under $mu -> 1\/mu$. Numerically the two branch minima are $(1.3399, 1.4983)$ at $mu = 0.9$, $(1.4067, 1.4218)$ at $mu = 0.99$ and $(1.41346, 1.41496)$ at $mu = 0.999$, and they tend to $sqrt(2)$ as $mu -> 1$.

*Remark 3.* For $Gamma = (1, 1, -1\/2)$ the zero-impulse circle is $|w - 1\/2| = sqrt(3)\/2$. With $w = 1\/2 + (sqrt(3)\/2) e^(i phi)$, $z_1 = 0$ and $z_2 = 1$, the same computation gives

$ op("Re") kappa = (3 sin 2 phi) / (2 pi (3 cos 2 phi - 5)) , quad op("Im") kappa = (3 (cos 2 phi - 3)) / (2 pi (3 cos 2 phi - 5)) , quad P = (3 - cos 2 phi) / (2 sin 2 phi) , $

on the collapsing arcs $0 < phi < pi\/2$ and $pi < phi < 3 pi\/2$, which are exchanged by interchanging the two equal vortices ($w -> 1 - w$). By Lemma 1, $P >= sqrt(2)$, with equality if and only if $cos 2 phi = 1\/3$. This formula is a specialization and reparametrization of Gröbli's spiral coefficient [6, Sect. 10].

= Two concentric regular polygons

Let $n >= 2$ and $epsilon = e^(2 pi i \/ n)$, and place vortices of circulation $x > 0$ at $z epsilon^k$ and vortices of circulation $-1$ at $zeta epsilon^k$, $k = 0, dots, n - 1$. The motion preserves this symmetry, the center of vorticity is the origin, and, since $sum_(k = 1)^(n - 1) (1 - epsilon^k)^(-1) = (n - 1)\/2$ and $sum_(k = 0)^(n - 1) (z - zeta epsilon^k)^(-1) = n z^(n - 1) \/ (z^n - zeta^n)$, @eq:bs reduces to [2, Eq. (3)]

$ overline(dot(z)) = 1/(2 pi i) ( (x (n - 1))/(2 z) - (n z^(n - 1))/(z^n - zeta^n) ) , quad overline(dot(zeta)) = 1/(2 pi i) ( -(n - 1)/(2 zeta) + (x n zeta^(n - 1))/(zeta^n - z^n) ) . $ <eq:rings>

A collapse requires the angular impulse $n (x |z|^2 - |zeta|^2)$ to vanish, and after a rotation and a dilation we take $z = 1$ and $zeta = sqrt(x) e^(i theta)$. The motion is self-similar exactly when $dot(z) \/ z = dot(zeta) \/ zeta$. Writing $w = zeta^n$, @eq:rings gives

$ overline(dot(z)\/z) = 1/(2 pi i) ( (x (n - 1))/2 - n/(1 - w) ) , quad overline(dot(zeta)\/zeta) = 1/(2 pi i) ( -(n - 1)/(2 x) - (n w)/(1 - w) ) , $

and these are equal if and only if

$ (n - 1) x^2 - 2 n x + (n - 1) = 0 , $ <eq:circ>

a condition that does not involve $theta$; it is the circulation condition of Koiller et al. [7, Sect. 11]. Its roots are $x_n$ and $1\/x_n$, where

$ x_n = (n + sqrt(2n - 1)) / (n - 1) = e^a , quad cosh a = n / (n - 1) . $

The root $1\/x_n$ gives the same family with the two rings interchanged, as one sees by multiplying the circulations by $-x_n$ and reflecting the configuration, so we take $x = x_n$. Then every $theta$ gives a self-similar motion. Let $rho = x_n^(n\/2) = e^(n a \/ 2) > 1$ and $alpha = n theta$, so that $w = rho e^(i alpha)$. The common value of $overline(kappa)$ is $S \/ (2 pi i)$ with $S = x_n (n - 1)\/2 - n\/(1 - w)$, so $kappa = (op("Im") S + i op("Re") S)\/(2 pi)$, and since $op("Im")(1 - w)^(-1) = rho sin alpha \/ |1 - w|^2$,

$ op("Re") kappa = - (n rho sin alpha) / (2 pi |1 - w|^2) . $

The configuration therefore collapses exactly when $sin n theta > 0$, that is, for $0 < theta < pi\/n$ modulo $2 pi \/ n$. Using $|1 - w|^2 = 1 - 2 rho cos alpha + rho^2$ one finds

$ (|1 - w|^2 op("Re") S) / rho = K_n - ((n - 1) x_n - n) cos alpha , quad K_n = ((n - 1) x_n (rho + rho^(-1))) / 2 - n / rho . $

Here $(n - 1) x_n - n = sqrt(2n - 1)$, and substituting $n = (n - 1) cosh a$ in $n\/rho$ gives $K_n = (n - 1) sinh((n + 2) a \/ 2)$. Moreover

$ K_n - sqrt(2n - 1) = ((n - 1) x_n (rho^(1\/2) - rho^(-1\/2))^2) / 2 + n (1 - rho^(-1)) > 0 , $

so $op("Re") S > 0$, and @eq:P gives

$ P = (K_n - sqrt(2n - 1) cos n theta) / (2 n sin n theta) , quad 0 < n theta < pi . $ <eq:Pring>

The collapse rates as functions of the relative angle are given by Koiller et al. [7, Sect. 11]; @eq:Pring expresses their ratio with the constant $K_n$ explicit.

#v(0.3em)
*Proposition 2.* _For $n >= 2$ the collapsing configurations of two concentric regular $n$-gons with circulations $x_n$ and $-1$ satisfy_

$ P >= F_n = sqrt(K_n^2 - (2n - 1)) / (2n) , $

_with equality if and only if $cos n theta = sqrt(2n - 1) \/ K_n$._

_Proof._ Apply Lemma 1 to @eq:Pring with $a = K_n$ and $b = sqrt(2n - 1)$. #h(1fr) $square$

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

For $n = 2$ the configuration is a parallelogram of four vortices, a case treated by Novikov and Sedov [10, Sect. 4]. For $n = 5$ the circulation ratio is rational, $x_5 = 2$, and

$ P = (127 sqrt(2) - 24 cos 5 theta) / (80 sin 5 theta) >= sqrt(31682) / 80 = 2.2249297741726591 dots . $

= Numerical verification

The results were checked by a computation that does not use the formulas above. It evaluates the Biot–Savart velocities @eq:bs directly, tests self-similarity by comparing $dot(z)_j \/ (z_j - z_c)$ across all vortices, and obtains $P$ from @eq:P. For three vortices the zero-impulse configurations were generated independently of @eq:pos, by fixing two vortices and moving the third around the zero-impulse circle. The computations used 60 significant digits (mpmath) unless stated otherwise, and the algebraic steps in the proofs, including Lemma 2, the factorization of $d(P^2)\/d c$, the resultant and the irreducibility statements, were verified in exact arithmetic (SymPy).

#v(0.3em)
#block(breakable: false)[#table(
  columns: (2.3fr, 1.7fr),
  stroke: 0.4pt,
  inset: 5pt,
  [*Check*], [*Result*],
  [Three vortices: spread of the three quotients $dot(z)_j \/ (z_j - z_c)$ relative to $|kappa|$, 4000 shapes on the zero-impulse circle], [$<= 9 times 10^(-61)$; 2000 of the 4000 shapes collapse],
  [Local minima of $P$ over the collapsing shapes, refined by solving $d P \/ d phi = 0$ numerically], [two; they differ from the values in Proposition 1 by $<= 2 times 10^(-61)$],
  [Formula @eq:Ptheta against direct evaluation at the positions @eq:pos, 399 interior points of each arc], [relative difference $<= 10^(-59)$],
  [Integration of @eq:bs from the minimizing configuration on $cal(A)$ (Taylor method, 30 digits)], [$|z_j - z_c|^2$ follows $1 - t\/t_c$ to relative accuracy $5 times 10^(-31)$ up to $t = 0.9 thin t_c$],
  [Two rings, $n = 2, dots, 8$: $P$ from @eq:bs against @eq:Pring over the collapsing range, and its numerical minimum against $F_n$], [relative difference $<= 3 times 10^(-58)$; minima agree to $2 times 10^(-60)$],
)]

= Discussion

The expression @eq:Ptheta is a special case of the rates of Gröbli [6] and Aref [3], and the content of Proposition 1 is its minimization over the whole collapsing family. What distinguishes unequal circulations is that the two orientations of the triangle are no longer equivalent. For $Gamma_1 = Gamma_2$ the interchange of the equal vortices maps one collapsing arc onto the other and the two branch minima coincide (Remark 3); for $Gamma_1 != Gamma_2$ no symmetry relates the arcs, the minima separate (Remark 2), and a minimization restricted to one orientation of the triangle finds only one of them.

Leoncini, Kuznetsov and Zaslavsky [9] analyze the motion near collapse when two of the vortices are identical. Tavantzis and Ting [12] describe the contracting and the expanding self-similar solutions as one-parameter families and discuss their stability. Krishnamurthy and Stremler [8] relate the angles of the triangle, the circulation ratios, the collapse time and the distance travelled before collapse. Since that distance is $sqrt(1 + 4 P^2)$ times the initial distance from the collision point, Propositions 1 and 2 also give the least value of this ratio.

For two rings, Aref [2] derived the reduced equations @eq:rings for arbitrary circulations and analyzed in detail equal and opposite circulations, $x = 1$, which do not satisfy @eq:circ. Koiller et al. [7] found the collapsing configurations and their rates; Proposition 2 adds the constant $K_n$ and the minimum over the relative rotation. O'Neil [11] proves that for generic circulations three concentric rings have finitely many relative equilibria and collapse configurations, and Demina and Kudryashov [4] give explicit double-ring configurations formed by two regular polygons with arbitrary circulations. We have not found the minimal values of Propositions 1 and 2 stated in the literature.

The elimination in the proof of Proposition 1 applies to any rational circulation ratio $mu$ and yields a polynomial with rational coefficients satisfied by both branch minima.

#v(0.5em)
*Data availability.* The verification program and its output are available at https://github.com/SharpMeow/GENChase in the directory `research/`.

#v(0.3em)
#text(size: 9pt)[This work was prepared with AI assistance. The author takes full responsibility for its content.]

#v(0.6em)
#heading(numbering: none)[References]
#set text(size: 10pt)
#set enum(numbering: "[1]")
+ H. Aref, Motion of three vortices, _Phys. Fluids_ *22* (1979) 393–400.
+ H. Aref, Point vortex motions with a center of symmetry, _Phys. Fluids_ *25* (1982) 2183–2187.
+ H. Aref, Self-similar motion of three point vortices, _Phys. Fluids_ *22* (2010) 057104.
+ M. V. Demina and N. A. Kudryashov, Rotation, collapse, and scattering of point vortices, _Theor. Comput. Fluid Dyn._ *28* (2014) 357–368.
+ T. Gotoda, Self-similar motions and related relative equilibria in the $N$-point vortex system, _J. Dyn. Differ. Equ._ *33* (2021) 1759–1777.
+ W. Gröbli, _Specielle Probleme über die Bewegung geradliniger paralleler Wirbelfäden_, Inaugural-Dissertation, Göttingen; Zürcher und Furrer, Zürich, 1877.
+ J. Koiller, S. Pinto de Carvalho, R. Rodrigues da Silva and L. C. Gonçalves de Oliveira, On Aref's vortex motions with a symmetry center, _Physica D_ *16* (1985) 27–61.
+ V. S. Krishnamurthy and M. A. Stremler, Finite-time collapse of three point vortices in the plane, _Regul. Chaotic Dyn._ *23* (2018) 530–550.
+ X. Leoncini, L. Kuznetsov and G. M. Zaslavsky, Motion of three vortices near collapse, _Phys. Fluids_ *12* (2000) 1911–1927.
+ E. A. Novikov and Yu. B. Sedov, Vortex collapse, _Sov. Phys. JETP_ *50* (1979) 297–301 [_Zh. Eksp. Teor. Fiz._ *77* (1979) 588–597].
+ K. A. O'Neil, Relative equilibrium and collapse configurations of heterogeneous vortex triple rings, _Physica D_ *236* (2007) 123–130.
+ J. Tavantzis and L. Ting, The dynamics of three vortices revisited, _Phys. Fluids_ *31* (1988) 1392–1409.
