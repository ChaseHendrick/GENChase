# The Hopf bridge: the single-cell periodic orbit from the end of the G_Ks branch to the Hopf point (lemmas and proofs)

Status: computed; an in-project adversarial reading is recorded in `reviews/hopf-bridge-review-2026-10-02.md` with
its fixes. This file states and proves what `fourier/hopf.py` relies on. No outside review has taken place.

Model: Erhardt's 18-state TP06 endocardial cell, `f(z; g)` = `arbmodel.f` with `g_Ks = g`, in the scaled variables
`z = x / sigma` (`sigma_i = 2^{e_i}`, `model/scales.txt`). `g_Ks` enters the reference model only through
`i_Ks = g_Ks Xs^2 (V - E_Ks)` in `dV/dt`, so

    f(z; g) = f(z; g0) + (g - g0) f1(z),    f1 = d f / d g  (nonzero only in the V row),            (0.1)

for all complex `g, g0` (both sides are the same expression of `g`). Labels: **proved** (a proof here, no
computation), **computer-assisted** (a proof here in which finitely many inequalities are decided by a program in Arb
ball arithmetic; the program and the record that carry each step are named), **cited** (a published theorem used as
stated in its source), **numerical** (floating point, never used in a proof).

Trust base: python-flint 0.9.0 (Arb), `fourier/arbmodel.py` with the generated `fourier/tp06_18d_arb.py`,
`fourier/fourier_eval.py` (Lemmas 1-3 there: strip cover, Cauchy estimate, aliased DFT), the functions of
`existence.py` and `branch.py` called by `hopf.py` (`_tail_bounds`, `_radii`, `_identity`, `_abs_mat`, `amax`,
`up`, `lo`; `branch.Hess`, the second-order dual numbers; `branch.obj_from_record`, `branch.point_on_branch`,
`branch.validate_logs`, `branch.centre_from_record`, `branch.centre_digest`), and `hopf.py`. Part C and Part S also use
results of `branch.py` and `stability.py` as recorded in their logs (the G_Ks branch pieces and the K = 32 point proofs
with Stage S, `fourier/data/branch/`); those are theorems of that pipeline (`results/fourier-branch-gks.json`,
reviewed in `reviews/rec2-branch-review-2026-10-02.md` for the part covered then), used here as stated there. Every
float input (centres, tangents, eigenvectors, the inverse matrices `C`, `A_fin`, the weights `eta`, radii, piece
boundaries) is an exact number chosen by untrusted code; its quality only decides whether an inequality holds.

---------------------------------------------------------------------------------------------------------------------

## Part A. The Hopf point

### Lemma K (proved; contraction on a polydisc)

Let `F` be holomorphic on an open set containing the closed polydisc `P = {z in C^n : |z_i - x_i| <= r_i}` (`x`
exact, `r_i > 0`), `C` an `n x n` matrix, and let `M` be a ball matrix that contains `I - C DF(z)` for every `z in P`
and `b` a ball vector that contains `-C F(x)`. If

    kappa := max_i (1/r_i) sum_j |M_ij|^+ r_j < 1   and   |b_i|^+ + sum_j |M_ij|^+ r_j <= r_i  for every i

(`|.|^+` an upper bound of the modulus over the ball), then `F` has exactly one zero in `P`. The same holds for a
family `F_p`, `p` in a parameter set, when `M` and `b` contain the respective quantities for every `p`.

*Proof.* Put `T(z) = z - C F(z)` and `||y|| = max_i |y_i| / r_i`. For `z in P`,
`T(z) - x = -C F(x) + int_0^1 (I - C DF(x + s(z - x))) ds (z - x)`; each entry of the averaged matrix is a mean of
the same entry of matrices in the convex ball `M`, hence lies in it, so `|T(z)_i - x_i| <= |b_i|^+ + sum_j |M_ij|^+ r_j
<= r_i`: `T(P) in P`. For `z, z' in P`, `T(z) - T(z') = int_0^1 (I - C DF(z' + s(z - z'))) ds (z - z')`, so
`||T(z) - T(z')|| <= kappa ||z - z'||`. By Banach's theorem `T` has exactly one fixed point in `P`. `C DF(z)` lies
within distance `kappa < 1` of `I` in the induced weighted max norm, so it is invertible, hence so is `C`, and the fixed
points of `T` are exactly the zeros of `F`. QED.

`hopf.contraction_test` checks the two inequalities in Arb. It is used for the equilibria (`equilibrium_on`, `F = f(.;
g)`, `n = 18`, the parameter `g` in a ball) and for eigenpairs (`eigpair_on`, `F(lambda, v) = (A - lambda) v` with
`v_k = 1`, `n = 18` unknowns `(lambda, v_j, j != k)`, for every matrix `A` in a ball matrix). In both cases the zero
of the real problem is real (equilibria) or the eigenpair is the unique one in the polydisc.

### Lemma G (proved; Gershgorin discs; papers/hh-dynamics, Lemma lem:gersh)

Let `M` be a ball matrix, `S` invertible, and `D_i = {z : |z - c_i| <= R_i}` with
`R_i >= |(S^-1 A S)_ii - c_i| + sum_{j != i} |(S^-1 A S)_ij|` for every `A` in `M`. For every `A` in `M`: (a) every
eigenvalue lies in the union of the `D_i`; (b) a union of `k` discs disjoint from the other discs contains exactly `k`
eigenvalues counted with multiplicity.

*Proof.* (a) Gershgorin's theorem for `S^-1 A S` (if `S^-1 A S v = lambda v` and `|v_i|` is maximal,
`|lambda - (S^-1AS)_ii| <= sum_{j != i} |(S^-1AS)_ij|`). (b) With `Delta` the diagonal of `B = S^-1 A S` and
`B_t = Delta + t (B - Delta)`, `t in [0, 1]`, the discs of `B_t` have the same centres and `t` times the radii, so they
lie in the `D_i`; by (a) no eigenvalue of `B_t` crosses the boundary of the union of the `k` discs; the eigenvalues
depend continuously on `t`, and at `t = 0` exactly `k` of them (diagonal entries) lie in that union. QED.

### Lemma A1 (proved; mean value form of the Jacobian along the equilibrium branch)

Let `G = [a, b]`, `g_c = (a + b)/2`, `delta = (b - a)/2`, and suppose Lemma K gives, for every `g in G`, exactly one
equilibrium `x_e(g)` in a polydisc `X_G`, and for `g = g_c` one in a polydisc `X_c` with `X_c` contained in `X_G` (the
program builds both about the same centre and checks the radii, `jacobian_family`; then the zero in `X_c` is a zero of
`f(.; g_c)` in `X_G`, hence it is `x_e(g_c)`). Then `x_e` is real analytic on
`G` (implicit function theorem: `D_z f(x_e(g); g)` is invertible by Lemma K's proof), `x_e'(g) = -A(g)^-1 f1(x_e(g))`
with `A(g) = D_z f(x_e(g); g)`, and for every `g in G`

    A(g) in A_c + [-delta, delta] A'_G,

where `A_c` encloses `D_z f(X_c; g_c)` and `A'_G` encloses `D_z^2 f(z; g)[x', .] + D_z f1(z)` over `z in X_G`,
`g in G`, `x'` in an enclosure of `-D_z f(X_G; G)^-1 f1(X_G)`. *Proof.* `A(g) - A(g_c) = (g - g_c) int_0^1 A'(g_c +
s(g - g_c)) ds` and `A'(g) = D_z^2 f(x_e(g); g)[x_e'(g), .] + D_z f1(x_e(g))` (chain rule, (0.1)); every
`A'(g)`, `g in G`, lies in the convex ball `A'_G`, hence so does the average. QED. (`hopf.jacobian_family`; the
directional second derivative is a `branch.Hess` evaluation with a 19th variable along `(x', 1)`, `_hess_dir`.)

### Lemma A2 (proved; the derivative of a simple eigenvalue)

If `lambda(g)` is a simple eigenvalue of the analytic matrix family `A(g)` with right and left eigenvectors `q`,
`p` (`A q = lambda q`, `p^T A = lambda p^T`), then `p^T q != 0` and `lambda'(g) = p^T A'(g) q / (p^T q)`.
*Proof.* Simplicity gives `p^T q != 0` and an analytic eigenpair (implicit function theorem); differentiate
`A q = lambda q` and multiply by `p^T` on the left: `p^T A' q + p^T A q' = lambda' p^T q + lambda p^T q'`, and
`p^T A q' = lambda p^T q'`. QED. (`hopf.dlambda_dg`; `p` and `q` are enclosed by Lemma K for every `A` in the ball.)

### Lemma A3 (cited formula, tested; the first Lyapunov coefficient)

With `A` having the simple pair `+-i omega`, `A q = i omega q`, `A^T p = -i omega p`, `<p, q> = conj(p)^T q = 1`, and
`f(x0 + y) = A y + B(y, y)/2 + C(y, y, y)/6 + O(|y|^4)`,

    l1 = (1 / (2 omega)) Re( <p, C(q, q, qbar)> - 2 <p, B(q, A^-1 B(q, qbar))> + <p, B(qbar, (2 i omega - A)^-1 B(q, q))> ),

as given by Kuznetsov (Scholarpedia 1(10):1858 (2006), section "First Lyapunov Coefficient", revision 90964), who
cites his book (Elements of Applied Bifurcation Theory, 3rd ed., Springer 2004) for it; this is the formula and the
routine of papers/hh-dynamics (eq. (l1), `code/certify_equilibria_hopf.py`, `lyap1`), whose paper records which of
these sources were read. We have not checked the formula's equation number or the theorem numbers against the book
(the brief names Theorems 3.3, 3.4 and formula (3.20)); no proof here depends on the book. `hopf.lyap1` is that
routine with the series given by `hopf.Jet` (truncated Taylor series in `t` of `f(x0 + t v)` along complex `v`,
exact recurrences for `+ - * /`, integer powers, `exp`, `log`, `sqrt` in Arb): `B(v, v) = 2 [t^2]`,
`C(v, v, v) = 6 [t^3]`, other arguments by polarization. `fourier/test_hopf.py` checks it on the two planar and two
four-dimensional systems of papers/hh-dynamics (Lemma lem:testsys there) with known `l1` of both signs, and the two
mutated routines (`+2` in the middle term; `(-A)^-1` for `(2 i omega - A)^-1`) are refused. The sign of `l1` does
not depend on the normalization of `q`; its value is reported for `<q, q> = 1` in physical units, in which
MATCONT's "first Lyapunov coefficient" (Erhardt's `-2.6838`) is `omega l1`.

### Theorem A (computer-assisted; `hopf.theorem_A`, record `fourier/data/hopf/theoremA.json`)

Let `W = [0.02789, 0.02792]` (it contains Erhardt's value `0.027907858929580`). The program covers `W` by adjacent
closed intervals with exact end points (record: `cover_left`, `G_H`, `cover_right`). For an interval `G` of the cover
write `x_G(g)` for the unique equilibrium of `f(.; g)` in the interval's polydisc `X_G` (Lemma K) and
`A_G(g) = D_z f(x_G(g); g)`. Then:

(a) For every interval `G` and every `g in G`, `x_G(g)` exists, is real, and is real analytic in `g` on `G`; the
spectrum of `A_G(g)` consists of a simple eigenvalue `lambda_G(g)` with `Im lambda_G(g) > 0`, its conjugate, and 16
eigenvalues with real part at most the record's `others_max_re_upper` (about `-4.69e-5`).

(b) `Re lambda_G(g) > 0` on every interval left of `G_H`, `< 0` on every interval right of `G_H`. `G_H` has width
`2e-13`; on it `d Re lambda / dg` lies in the record's ball (about `-5.5769`), in particular `< 0`.

(c) *Consistency near `G_H`.* On the interval `J` of Corollary B(a) (it contains `G_H` and about 3e-7 of `W` around
it), all intervals of the cover that meet `J` have their equilibrium polydiscs (recorded under `polydisc` and
`polydisc_GH`) inside one polydisc `P` in which Lemma K gives exactly one equilibrium `x_e(g)` for every `g in J`. So on
`J` all the `x_G` are one real analytic branch `x_e`, and the `lambda_G` are one simple eigenvalue `lambda(g)` of
`A(g) = D_z f(x_e(g); g)`.

(d) There is exactly one `g_H` in `J` (in fact in `G_H`) at which `A(g)` has an eigenvalue on the imaginary axis; there
`lambda(g_H) = i omega_H` with `omega_H` in the record's ball (about `0.11934140178`), and `Re lambda(g) > 0` for
`g in J`, `g < g_H`, `< 0` for `g > g_H`. More generally, for every interval `G` of the cover other than `G_H` and every
`g in G`, `A_G(g)` has no eigenvalue on the imaginary axis.

(e) `l1 < 0` at `(x_e(g_H), g_H)`: the record's enclosure of `l1` (about `-22.4879` in physical units with
`<q, q> = 1`; `omega_H l1` is about `-2.6837`, Erhardt's `-2.6838`).

*Proof.* (a) On each interval `G`: Lemma K gives the equilibrium for every `g in G` (and at the midpoint, inside `X_G`),
Lemma A1 a ball matrix containing `A_G(g)` for every `g in G`; with `S` the float eigenvector matrix of the midpoint of
`A_c` (unit columns), the Gershgorin discs (Lemma G) of the pair (`D1` with `Im > 0` and `D2`) are disjoint from each
other and from the 16 other discs, and those lie in `Re < 0` (right ends recorded); Lemma K for the eigenpair gives a
ball `L` containing an eigenvalue of `A_G(g)` for every `g in G`, and `L` is disjoint from every disc but `D1`, so the
eigenvalue in `L` is the eigenvalue in `D1`, `lambda_G(g)`, which is simple (Lemma G(b): `D1` holds exactly one), and
its conjugate is the one in `D2`. Realness of `x_G`: the polydisc is invariant under conjugation and `f(conj z; g) =
conj f(z; g)` for real `g`, so the unique zero is real. (b) On the intervals left of `G_H` the program certifies
`Re L > 0`, right of `G_H` `Re L < 0` (`re_lam` in the record); on `G_H`, Lemma A2 with `p`, `q`, `A'` enclosed over
`G_H` gives the ball for `Re lambda'`. (c) is checked by `identification_at_eps0` (box inclusions of the recorded
polydiscs in `P`, and Lemma K on `P` over `J`): for `g in J` and an interval `G` containing `g`, `x_G(g)` lies in `X_G`,
hence in `P`, and is a zero of `f(.; g)`, so it is `x_e(g)`. The eigenvalue in `D1` of an interval and in `D1'` of an
adjacent interval are, at the shared end point, eigenvalues with positive imaginary part of the same matrix that are
not among the 16 eigenvalues with negative real part, so they are equal (if both intervals meet `J`). (d) For `g` in an
interval `G != G_H`, `Re lambda_G(g) != 0` and the other eigenvalues have negative real part, so no eigenvalue is on the
axis. On `G_H`, `lambda` is analytic (simple eigenvalue of an analytic family), `Re lambda' < 0`, and by (c) the end
points of `G_H` are end points of the adjacent intervals with the same `lambda`, where `Re lambda` is `> 0` (left) and
`< 0` (right). So `Re lambda` has exactly one zero `g_H` in `G_H`, it is the only `g in J` with an eigenvalue on the
axis, and `omega_H = Im lambda(g_H)` lies in `Im L` of `G_H`. (e): Lemma A3 evaluated with `x_e(g_H)` in the
equilibrium polydisc of `G_H`, `g_H in G_H`, `A(g_H)` in the ball of `G_H`, `q`, `p` the eigenvector enclosures (right
one normalized `<q, q> = 1` in physical units, left one by `p_l^T q = 1`), `omega` in `Im L`; every quantity of the
formula is evaluated in ball arithmetic on balls containing the true values at `g_H`, so the result contains `l1`. QED.

(Added on 2026-10-02 while finishing the bridge: earlier versions of the program neither recorded the polydiscs nor
checked `X_c` in `X_G`, so (c) was implicit and the statement "exactly one `g_H` in `W`" was not justified across
intervals with different polydiscs. Outside `J` the theorem is now stated per interval.)

### Cited theorem (Andronov-Hopf; Kuznetsov, Scholarpedia 1(10):1858, as stated in papers/hh-dynamics, Theorem thm:kuz)

Let `x' = f(x, alpha)`, `x in R^n`, `alpha in R`, `f` smooth, have a family of equilibria `x^0(alpha)` whose
Jacobian has one pair `mu(alpha) +- i omega(alpha)` with `mu(0) = 0`, `omega(0) = omega_0 > 0`, a simple pair at
`alpha = 0`, and `n_s` eigenvalues with negative and `n_u` with positive real part, `n_s + n_u + 2 = n`. If
`l1(0) != 0` and `mu'(0) != 0`, the system is locally topologically equivalent near the origin to the suspension of
the normal form `y1' = beta y1 - y2 + sigma y1 (y1^2 + y2^2)`, `y2' = y1 + beta y2 + sigma y2 (y1^2 + y2^2)`,
`ys' = -ys`, `yu' = yu`, `sigma = sign l1(0)`; for `sigma = -1` the origin is asymptotically stable for `beta <= 0`
and unstable for `beta > 0`, and a unique limit cycle, stable, exists for `beta > 0`.

### Corollary A (computer-assisted and cited)

With `alpha = g - g_H` and the branch `x_e` on `J` (Theorem A(c)), Theorem A gives the hypotheses of the cited theorem
with `n_s = 16`, `n_u = 0`, `mu' < 0`, `l1 < 0` (`sigma = -1`). The equilibrium is asymptotically stable for
`g > g_H` near `g_H` and unstable for `g < g_H` (Theorem A(d)); in the normal form these are `beta < 0` and
`beta > 0`. Hence there are a neighbourhood `U` of `x_e(g_H)` and `eta_H > 0` such that for
`g in (g_H - eta_H, g_H)` the cell has exactly one periodic orbit in `U`, and it is orbitally asymptotically stable (the
suspension by `ys' = -ys` keeps it attracting), and for `g in [g_H, g_H + eta_H)` it has none in `U`. The topological
equivalence maps periodic orbits to periodic orbits and preserves (orbital) asymptotic stability, as in
papers/hh-dynamics, Corollary cor:hopf. `U` and `eta_H` are not quantified: this is the only place where the cited
theorem enters, and nothing quantitative is taken from it. This is the supercritical Hopf bifurcation reported
numerically by Erhardt: Erhardt's value lies in `W` (`|g_H - 0.027907858929580|` is about `1.5e-8`;
`numerics/hopf_and_orbit.py` reports the same offset).

---------------------------------------------------------------------------------------------------------------------

## Part B. The blown-up branch

### B0. Setting

`nu = e^{rho0}` (`rho0 = 1/8`). `l^1_nu` = sequences `(b_m)` with `||b||_nu = sum |b_m| nu^|m| < inf`, a Banach algebra
under convolution; `l^1_{nu,0}` its subspace with `b_0 = 0`. Unknowns `x = (omega, g, c, w)` in
`X = C x C x C^18 x (l^1_{nu,0})^18` with the weighted norm `||x|| = max(|omega|/eta_om, |g|/eta_g, max_k |c_k|/eta_ck,
max_k ||w_k||_nu/eta_wk)` (`eta > 0` exact dyadics). `w(theta) = sum_{m != 0} w_m e^{i m theta}`. For a real parameter
`eps` and `(c, u)` with the segment `c + [0, 1] eps u` in the domain,

    Q(c, u, eps; g) := int_0^1 D_z f(c + s eps u; g) u ds,     so  eps Q = f(c + eps u; g) - f(c; g),

and `F(x; eps) = (N+, N-, E_0, (E_m)_{m != 0})` with

    N+ = w_{V,1} - 1/2,   N- = w_{V,-1} - 1/2,
    E_0 = f(c; g) + eps [Q(c, w(.), eps; g)]_0,         E_m = i m omega w_m - [Q(c, w(.), eps; g)]_m.

(`[h]_m` is the m-th Fourier coefficient of the function `theta -> h(theta)`.)

### Lemma B1 (proved; what a zero means)

Let `x = (omega, g, c, w)` be a zero of `F(.; eps)` with `omega > 0`, `g`, `c` real, `w_{-m} = conj(w_m)`, and
`f(.; g)` holomorphic near `{c + s eps w(theta): s in [0, 1], theta real}`. (a) If `eps > 0`, then
`phi = c + eps w` satisfies `omega phi' = f(phi; g)`, so `z(t) = phi(omega t)` is a periodic orbit of the cell at
`G_Ks = g`, of minimal period `2 pi / omega`, whose first V harmonic is `a_{1,V} = eps / 2 > 0` (so `Im a_{1,V} = 0`).
(b) If `eps = 0`, then `f(c; g) = 0` and `D_z f(c; g) w_1 = i omega w_1` with `w_{1,V} = 1/2`: `c` is an equilibrium
and `i omega` an eigenvalue of its Jacobian.

*Proof.* (a) `eps Q(c, w(theta), eps) = f(phi(theta)) - f(c)`, so `[f(phi)]_0 = f(c) + eps [Q]_0 = E_0 = 0` and,
for `m != 0`, `[f(phi)]_m = eps [Q]_m = eps i m omega w_m = i m omega [phi]_m`. `phi` is real analytic and its
Fourier series converges absolutely; the continuous functions `omega phi'` and `f(phi)` have the same Fourier
coefficients, hence are equal. `a_{1,V} = eps w_{1,V} = eps/2 != 0`: the first harmonic is nonzero, so `phi` is not
`2 pi / k` periodic for `k >= 2` and the minimal period of `z` is `2 pi / omega`. (b) At `eps = 0`,
`Q = D_z f(c) w(theta)`, `E_0 = f(c) = 0`, and `E_1 = i omega w_1 - D_z f(c) w_1 = 0`. QED.

### Lemma B2 (proved; the radii polynomial along a centre line)

*The theorem used* (as `existence.py` E.3). Let `A` be an injective bounded linear operator such that
`T_eps(x) = x - A F(x; eps)` maps `B_{r*}(xbar(eps))` into `X` and is `C^1` there. If, for one `eps`,
`||A F(xbar(eps); eps)|| <= Y0`, `||I - A DF(xbar(eps); eps)|| <= Z1` and
`||A (DF(x; eps) - DF(xbar(eps); eps))|| <= Z2 ||x - xbar(eps)||` on `B_{r*}`, and
`p(r) = Y0 + (Z1 - 1) r + Z2 r^2 / 2 < 0` and `Z1 + Z2 r < 1` at `r = r_lo` and at `r = r_hi <= r*`, then `F(.; eps)`
has exactly one zero in `B_{r_hi}(xbar(eps))`, and it lies in `B_{r_lo}(xbar(eps))`. (Proof: existence.py E.3; the
inequalities are certified by `existence._radii`.)

*The piece.* `[e_lo, e_hi]`, `e_c` its midpoint, `delta = (e_hi - e_lo)/2`, and the exact centre line
`xbar(xi) = xbar_c + (xi - e_c) tbar` (`xbar_c`, `tbar` exact; `w`-parts conjugation symmetric with `tbar_{w,V,+-1} = 0`,
so `N+-(xbar(xi)) = 0`; modes `|m| <= K` only). `A` is the same for all `xi` of the piece: `A_fin` the double inverse
of the midpoint of the Galerkin matrix `DF_fin(xbar_c; e_c)` (rows `N+-`, `E_0`, `E_m` and columns `omega`, `g`, `c`,
`w_m` for `1 <= |m| <= K`), and `A_m = (i m omega_c - J0hat)^-1` on the tail rows `|m| > K`, `J0hat` the exact real
midpoint of the enclosure of `[J]_0` (`existence._tail_bounds`: explicit inverses for `K < m <= m_max`, a Neumann
bound beyond; `sup |A_m| <= Abar0`, `sup |m A_m| <= Abar1` entrywise).

(a) *Y0.* For every `xi` of the piece, by Taylor's formula with integral remainder applied to
`xi -> A F(xbar(xi); xi)`,

    ||A F(xbar(xi); xi)||_c <= Y0p_c + delta Y1_c + (delta^2/2) Y2_c,

with `Y0p = ||A F(xbar_c; e_c)||`, `Y1 = ||A (d/dxi) F(xbar(xi); xi)|_{e_c}||` and `Y2_c >= sup_xi ||A (d/dxi)^2 F||_c`,
per output component `c` (`||(A r)_c||` is the component's norm). Every term is computed by Fourier enclosures
(fourier_eval Lemmas 2, 3: node values at `M` nodes, aliasing bound and Cauchy tail from a strip sup `S` at
`rho2 > rho0`), then `A_fin` times the finite part (an Arb product), `A_m` (or `Abar0`) times the coefficients
`K < |m| <= K'`, and `Abar0 S` times the weighted tail `sum_{|m| > K'} (nu e^{-rho2})^|m|`. The node functions:
`Y0p` from `f(cbar)`, `Q` at the nodes, `Q = (f(cbar + e_c u) - f(cbar)) / e_c` (`u = w(theta_j)`);
`Y1` from first-order Taylor series in `t` of `f(phi(t))` and of `Q(t) = (f(phi(t)) - f(cbar(t))) / (e_c + t)` at the
point `e_c` (`phi(t) = cbar + t tc + (e_c + t)(u + t v)`, `v = tw(theta_j)`); `Y2` from the second-order series of
`f(b(1, t))` and of `D f(b(s, t)) w(t)` (a dual number in a direction `tau`) with
`b(s, t) = c(xi + t) + s (xi + t) w(xi + t)`, over balls `xi in Xi_i` (sub-intervals of the piece) and `s in S_l`
(sub-intervals of `[0, 1]`). For each `xi`, `Q''(xi) = int_0^1 (d/dxi)^2 [D f(b(s, xi)) w(xi)] ds` lies in the
closed convex hull of the integrand's values, hence in the union (hull) of the enclosures over the `S_l`; the node
value for the true `xi` lies in the enclosure of the `Xi_i` that contains it, hence in the hull over `i`. The strip
sups `S` for these functions are full-strip covers (fourier_eval Lemma 1) of the same black boxes over the whole piece
and `s in [0, 1]`, which also certify holomorphy on the strip.

(b) *Z1.* For every `xi` of the piece, `I - A DF(xbar(xi); xi) = [I - A DF(xbar_c; e_c)] - (xi - e_c) int_0^1 A
(d/dxi)DF(xbar(xi'); xi') ds`, so `||I - A DF(xbar(xi); xi)|| <= Z1c + delta Zc` with `Z1c` the bound at the point and
`Zc >= sup ||A (d/dxi) DF||`. Both are block bounds `max_c (1/eta_c) sum_c' eta_c' B_cc'` with:
  * finite rows x finite columns: the Arb product `I - A_fin DF_fin` (resp. `A_fin DF'_fin`), weighted column sums;
  * finite rows x tail columns `w_{j,m'}`, `|m'| > K`: explicit columns for `K < |m'| <= K + L`, and for
    `|m'| >= K + L + 1` majorant columns built from `|[G]_n| <= S_G e^{-rho2 |n|}`, whose weighted column sums divided by
    `nu^|m'|` are proportional to `(e^{-rho2}/nu)^|m'|` and so decrease in `|m'|` (as existence.py E.5);
  * tail rows `|m| > K`: `A_m [ (J_0 - J0hat) y_m + sum_{n != 0} J_n y_{m-n} + Kc_m y_c + kg_m y_g ]` at the point
    (`y_{w,0} := 0`; the `omega` column vanishes there since `w_m = 0`), bounded by
    `T = sum_n C_n nu^|n| + Abar0 S_J tail` (w columns; `C_n` from `_tail_bounds`), `Tc = sum_{K < |m| <= K'} |A_m Kc_m|
    nu^|m| + Abar0 S_Kc tail` (c columns) and the same for the g column; for `Zc` the same with the derivatives
    `J'`, `Kc'`, `kg'` and the diagonal `i m tbar_om` (bounded by `Abar1 |tbar_om|`).
The derivatives along the line are, with `phi(xi) = c(xi) + xi w(xi)`, `J(xi) = D f(phi(xi); g(xi))`,
`Kc(xi) = int_0^1 D^2 f(b(s, xi))[w(xi), .] ds`, `kg(xi) = int_0^1 D f1(b(s, xi)) w(xi) ds`:
E_0 row: `[J']_0` (c), `[J]_{-m'} + xi [J']_{-m'}` (w), `[f1(phi)']_0` (g); E_m rows: `i m tw_m` (omega),
`-[J']_{m - m'}` and `i m tbar_om` on the diagonal (w), `-[Kc']_m` (c), `-[kg']_m` (g). They are enclosed from Taylor
series in `t` whose coefficients are second-order dual numbers (`branch.Hess`) in `(z, g, tau)`:
`J = [t^0] d_z f`, `J' = [t^1] d_z f`, `f1' = [t^1] d_g f` at `b(1, t)`; `Kc' = [t^1] d_z d_tau f`,
`kg' = [t^1] d_g d_tau f` at `b(s, t) + tau w(t)`, hulls over `Xi_i`, `S_l` as in (a). For the majorant columns,
`|J_n| = xi |Kc(xi)_n| <= e_hi HW e^{-rho2 |n|}` (`n != 0`) is not used; the strip sup of `J` itself is.

(c) *A is injective and T maps into X*: as existence.py E.2, E.3 (`A_m` invertible; `A_fin` invertible because the
compression of `I - A DF` to the finite modes is `I - A_fin DF_fin`, of norm `<= Z1 < 1`; `A(i m omega w_m)` is bounded
because `sup_{|m| > K} |m A_m| < inf`).

### Lemma B3 (proved; the second-derivative bound Z2 by a polydisc family)

*Lemma P.* Let `rho2 > rho0`, `q2 = nu e^{-rho2} < 1`, `Q2 = (1 + q2)/(1 - q2)`, `p_sigma(theta)` a trigonometric
polynomial depending affinely on `sigma` in a closed disc `D` of radius `T`, `R_i > 0`, and `F` holomorphic on an open
set containing `K = {p_sigma(theta) + zeta : |Im theta| <= rho2, sigma in D, |zeta_i| <= R_i}` with `|F| <= M` on `K`.
For `h in (l^1_nu)^18` with `t_i = ||h_i||_nu < R_i`: `theta -> F(p_sigma(theta) + h(theta))` is in `l^1_nu` with
`||F(p_sigma + h)||_nu <= M Q2 P(t)`, `P(t) = prod_i R_i / (R_i - t_i)`; `sigma -> F(p_sigma + h)` is holomorphic from
the interior of `D` into `l^1_nu`, and `||d_sigma F(p_sigma + h)||_nu <= M Q2 P(t) / (T - |sigma|)`.

*Proof.* For `theta` in the strip and `sigma in D`, `zeta -> F(p_sigma(theta) + zeta)` is holomorphic on a
neighbourhood of the closed polydisc of radii `R` (compactness of `K` in the open set), so its Taylor coefficients
`c_alpha(theta, sigma) = d^alpha F(p_sigma(theta)) / alpha!` satisfy `|c_alpha| <= M R^{-alpha}` (Cauchy's inequality
on the polydisc); they are holomorphic in `(theta, sigma)` and `2 pi`-periodic in `theta`. By fourier_eval Lemma 2,
`|[c_alpha(., sigma)]_m| <= M R^{-alpha} e^{-rho2 |m|}`, so `||c_alpha(., sigma)||_nu <= M R^{-alpha} Q2`, uniformly in
`sigma`; each `[c_alpha(., sigma)]_m` is holomorphic in `sigma` (an integral of a holomorphic function), so
`sigma -> c_alpha(., sigma)` is holomorphic into `l^1_nu` (a uniformly convergent series of holomorphic coordinates).
The series `sum_alpha c_alpha(., sigma) * h^{*alpha}` converges absolutely in the Banach algebra, uniformly in `sigma`,
with sum of norms `<= M Q2 prod_i (1 - t_i/R_i)^{-1}`; for real `theta`, `|h_i(theta)| <= t_i < R_i`, so the sum is
`F(p_sigma(theta) + h(theta))` (Taylor series on the polydisc), and convergence in `l^1_nu` is uniform convergence, so
the coefficients agree. The uniform limit of holomorphic `l^1_nu`-valued maps is holomorphic, and Cauchy's estimate for
Banach-space-valued holomorphic functions on the disc of radius `T - |sigma|` about `sigma` gives the last bound. QED.

*The cover* (`hopf.EpsCover`, one per group of pieces). One trigonometric polynomial with ball coefficients contains
`p_sigma(theta) + zeta` for every centre line of the group (`c(xi) + sigma w(xi)`, `xi` in the piece), `|sigma| <= T`,
`|zeta_i| <= R_i`: mode 0 is the hull of `c(xi)` plus the complex box of half-width `R_i`, mode `m != 0` the complex
box of half-width `T max(|w_m| + delta |tw_m|)` about `0`; the parameter `g` runs over a complex box of half-width
`G_R` about the hull of `g(xi)`. A full strip cover at `rho2` of the black box `hess19` (`branch.Hess` in the 19
variables `z`, `g`) gives `MJ >= |D_z f|`, `MH >= |D_z^2 f|`, `MF1 >= |f1|`, `MG >= |D_z f1|` on the family (entrywise)
and certifies holomorphy (fourier_eval Lemma 1). `piece_blocks` checks that each piece's line lies in the family
(`EpsCover.contains`, with the `R`-margin in mode 0 and the `G_R`-margin in `g`) and that `e_hi < T`.

*The bound.* For `x = xbar(xi) + Delta` with `||Delta|| <= r <= r*`, `||y|| <= 1`, every `xi` of the piece, write
`h_s = Delta c + s xi Delta w`, so `||h_s,l||_nu <= tau_l r`, `tau_l = eta_cl + e_hi eta_wl` (the program checks
`tau_l r* < R_l` and `eta_g r* <= G_R`), `P = P(tau r*)`, and `p = c(xi) + s xi w(xi)` (in the family with
`sigma = s xi`). Then:
  * `J_x - J_xbar = [D f(p + h_1; gbar) - D f(p; gbar)] + Delta g D f1(p + h_1)`, so by the mean value inequality and
    Lemma P (applied to `D_z^2 f` and `D_z f1`): `||(J_x - J_xbar)_kj||_nu <= r aJ_kj`,
    `aJ_kj = Q2 P (sum_l MH_kjl tau_l + MG_kj eta_g)`.
  * `Kc_x - Kc_xbar = int_0^1 D^2 f(p + h_s)[Delta w, .] ds + int_0^1 (D^2 f(p + h_s; g) - D^2 f(p; gbar))[w(xi), .] ds`.
    The first is `<= r Q2 P sum_l MH_kjl eta_wl`. In the second, `D^3 f(.)[h, w(xi), e_j] = d_sigma (D^2 f(. + sigma
    w(xi))[h, e_j])` at `sigma = 0`, and the base point `p + tau h_s + sigma w(xi) = c(xi) + (s xi + sigma) w(xi) + ...`
    stays in the family for `|sigma| <= T - e_hi`; Lemma P's derivative bound gives `<= r aJ_kj / (T - e_hi)` (the
    `Delta g` part through `D_z f1` likewise). This is where third derivatives enter, through Cauchy's estimate only.
  * `kg_x - kg_xbar`: `<= r Q2 P (sum_l MG_kl eta_wl + sum_l MG_kl tau_l / (T - e_hi))` (f1 does not depend on g).
  * `f1(phi_x) - f1(phi_xbar)`: `<= r Q2 P sum_l MG_kl tau_l`.
  * the `i m` terms: `i m (y_om Delta w_m + Delta om y_{w,m})`, with `||.||_k <= 2 eta_om eta_wk r`.
With these residual-component bounds `W0_k` (E_0 rows: `|[.]_0| <= ||.||_nu`) and `WE_k` (E_m rows) and the block
norms of `A` from residual blocks to unknown components (`NA`: weighted column sums of `|A_fin|`; `Abar0` for the tail
rows, `NA1` and `Abar1` for the `i m` terms),

    Z2 = max_c (1/eta_c) sum_k [ NA_{c,E0_k} W0_k + (NA_{c,E_k} + Abar0_ck) WE_k + (NA1_{c,E_k} + Abar1_ck) 2 eta_om eta_wk ].

(`assemble`; `Abar` terms only for the `w` output components.) Since `W0`, `WE` increase with `r`, the bound holds on
`B_{r*}`.

### Lemma B4 (proved; gluing)

Let pieces `a = [e0, e1]` and `b = [e1, e2]` share the end point `e1`, with zeros `x*_a(e1)` in
`B_{r_lo(a)}(xbar_a(e1))` (norm `eta(a)`) and uniqueness of the zero of `F(.; e1)` in `B_{r_hi(b)}(xbar_b(e1))`
(norm `eta(b)`). If `||xbar_a(e1) - xbar_b(e1)||_{eta(b)} + r_lo(a) max_c eta_c(a)/eta_c(b) <= r_hi(b)` (certified in
Arb, `hopf.glue`), then `x*_a(e1) = x*_b(e1)`. *Proof.* `||y||_{eta(b)} <= max_c (eta_c(a)/eta_c(b)) ||y||_{eta(a)}`;
the triangle inequality puts `x*_a(e1)` in `b`'s uniqueness ball, and it is a zero of `F(.; e1)`. QED.

### Proposition B-piece (computer-assisted; what one logged piece proves)

A line of `fourier/data/hopf/pieces.jsonl` carries an interval `[e_lo, e_hi]` (`0 <= e_lo < e_hi`, exact rationals),
an exact centre line `xbar(xi) = xbar_c + (xi - e_c) tbar` (`centre`, digest `result.centre_sha256`), exact dyadic
weights `eta` (38: `omega`, `g`, `c_0..c_17`, `w_0..w_17`), the cover it was proved with (`cover`, logged in
`covers.jsonl` with its family `T`, `R`, `G_R`, `rho2` and centres), and the exact numbers `Y0`, `Z1`, `Z2`, `r_*`,
`r_lo = r_existence < r_hi = r_uniqueness <= r_*` with `p(r_lo) < 0`, `p(r_hi) < 0`, `Z1 + Z2 r_hi < 1`. By Lemmas B2,
B3 and the radii-polynomial theorem (B2), for **every** `eps in [e_lo, e_hi]` (not only sampled values):

1. `F(.; eps)` has exactly one zero `x*(eps) = (omega*, g*, c*, w*)` in the closed ball `B_{r_hi}(xbar(eps))` of
   `X = C x C x C^18 x (l^1_{nu,0})^18`, `nu = e^{1/8}`, weighted norm with `eta`; it lies in `B_{r_lo}(xbar(eps))`.
   This is local uniqueness in the blown-up unknowns: among cycles whose first V harmonic (scaled variables, phase
   `Im a_{1,V} = 0`) is `eps/2`, written as `c + eps w`, with `(omega, g, c, w)` in that ball.
2. `x*(eps)` is real (proof of Theorem B), and for `eps > 0` Lemma B1(a) turns it into a periodic orbit of the cell at
   `G_Ks = g*(eps)`, `z(t) = c*(eps) + eps w*(eps)(omega*(eps) t)`, of minimal period `2 pi / omega*(eps)`.
3. *How `eps` relates to `G_Ks`.* `eps` is the parameter; `G_Ks` is an unknown. `eps = 2 a_{1,V}` where `a_{1,V}` is
   the first Fourier coefficient of the scaled `V` component of the orbit in the phase with `Im a_{1,V} = 0`: `eps`
   is the amplitude of the first harmonic of `z_V = V / sigma_V`, `sigma_V = 2^-2` mV (`model/scales.txt`), so the
   first harmonic of `V` itself has amplitude `eps / 4` mV (the whole `V` range of the orbit is about `0.116` mV at
   `G_Ks = 0.0275`, branch.py section 8b). The value of `G_Ks` at which this orbit exists
   is enclosed: `|g*(eps) - gbar(eps)| <= eta_g r_lo`, and over the piece `g*(eps) in [g_lo, g_hi]` (the record's
   `g` enclosure, `gbar_c +- (delta |tbar_g| + eta_g r_lo)`). Likewise `omega*` and the period `T = 2 pi / omega*`
   (`omega`, `T_ms`). Numerically (midpoints of the enclosures, not a bound) `g_H - g*(eps)` is about `7.7e-3 eps^2`
   on the pieces so far, the square-root law of the Hopf bifurcation.
4. Nothing is claimed about orbits outside the ball, about stability (Part S), or about a G_Ks value directly: a given
   `G_Ks` is reached through `eps` (Corollary B(c)), and whether `g*` is monotone in `eps` is not certified.

Every piece is re-glued to its predecessor in Arb by `collect` (Lemma B4). Pieces 0 to 30 were made before the program
logged its own SHA-256 (`code_sha256`, logged per piece from piece 31 on); the program used for them differs from the
current one only in the driver `run` (which pieces to try and in what order) and in bookkeeping, and
`fourier/test_hopf.py` re-proves pieces 0, 13, 30 and the last piece bit for bit (Y0, Z1, Z2, r_existence,
r_uniqueness as exact dyadics) with the current program and covers rebuilt from the logged centres.

### Theorem B (computer-assisted; `hopf.run`, records `fourier/data/hopf/pieces.jsonl`, `covers.jsonl`)

For every `eps in [0, eps0]` (`eps0` and the pieces in `results/fourier-hopf.json`) there is a zero
`x*(eps) = (omega*(eps), g*(eps), c*(eps), w*(eps))` of `F(.; eps)`, unique in the piece's `B_{r_hi}(xbar(eps))`,
with `omega*`, `g*`, `c*` real, `w*_{-m} = conj(w*_m)`, and `eps -> x*(eps)` is continuous on `[0, eps0]`. For
`eps > 0`, `z(t) = c*(eps) + eps w*(eps)(omega*(eps) t)` is a periodic orbit of the cell at `G_Ks = g*(eps)` of minimal
period `2 pi / omega*(eps)` (in the record's enclosures), and distinct `eps` give distinct orbits (`a_{1,V} = eps/2`).

*Proof.* On each piece Lemma B2 and Lemma B3 give the radii-polynomial inequalities for every `xi` of the piece,
hence a unique zero `x*(xi)` in `B_{r_hi}(xbar(xi))`, inside `B_{r_lo}`. Realness: `kappa(omega, g, c, w) =
(conj omega, conj g, conj c, (conj w_{-m})_m)` is an isometry of `X` with `kappa xbar(xi) = xbar(xi)`, and
`F(kappa x; xi) = kappa'(F(x; xi))` with `kappa'(N+, N-, E_0, E_m) = (conj N-, conj N+, conj E_0, conj E_{-m})`,
because `f(conj z; conj g) = conj f(z; g)` at every point of the certified domain (existence.py E.7: the generated
model is a composition of `+ - * /`, integer powers, `exp` and the principal `log`, `sqrt` on `Re > 0`, each commuting
with conjugation; the evaluation points `c + s xi w(theta)`, `theta` real, form a conjugation-invariant set in the
cover's family). So `kappa x*(xi)` is a zero in the same ball and equals `x*(xi)`. Continuity on a piece: let
`kappa = Z1 + Z2 r_hi < 1` (every `T_xi` is a `kappa`-contraction of `B_{r_hi}(xbar(xi))`). For `xi'` near `xi`,
`||xbar(xi) - xbar(xi')|| <= |xi - xi'| ||tbar|| <= r_hi - r_lo`, so `x*(xi) in B_{r_lo}(xbar(xi))` lies in
`B_{r_hi}(xbar(xi'))`, and `||x*(xi) - x*(xi')|| = ||T_xi(x*(xi)) - T_xi'(x*(xi'))|| <= ||A (F(x*(xi); xi) -
F(x*(xi); xi'))|| + kappa ||x*(xi) - x*(xi')||`; the first term tends to 0 as `xi' -> xi` (for fixed `x`,
`xi -> A F(x; xi)` is continuous: `F` is analytic in `(x, xi)` on the ball by Lemma P, and `A` is bounded on the
residuals that occur, as in E.3), so `x*` is continuous at `xi`. Gluing at the shared end points (Lemma B4) makes the
piecewise definition single valued, hence continuous on `[0, eps0]`. Lemma B1(a) gives the orbits
(`omega* >= omega_bar - delta |tbar_om| - eta_om r_lo > 0` certified). Distinct `eps` give distinct orbits:
`|a_{1,V}| = eps/2` does not change under a time shift. QED.

### Corollary B (computer-assisted and cited; the branch is born at the Hopf point)

(a) `x*(0) = (omega_H, g_H, x_e(g_H), w_H)`: the zero at `eps = 0` is the Hopf point of Theorem A. *Proof.* By Lemma
B1(b), `c*(0)` is an equilibrium at `g*(0)` and `i omega*(0)` (`omega*(0) > 0` certified) an eigenvalue of its
Jacobian. `identification_at_eps0` checks, in Arb: the enclosure of `g*(0)`, rounded outward to an interval `J` of
25-digit decimals, lies in `W` and is covered by adjacent intervals of Theorem A's cover whose polydiscs are recorded;
Lemma K holds on one polydisc `P` over `J` (centre a float equilibrium at the midpoint of `J`, radii enlarged to
contain the sets below); the enclosure of `c*(0)` lies in `P`; the real segment of every recorded polydisc of an
interval meeting `J` lies in `P`. Then `c*(0)` is the unique equilibrium in `P` at `g*(0)`, which is `x_e(g*(0))`
(Theorem A(c)), and Theorem A(d) (in `J` only `g_H` has an eigenvalue on the axis, and there the eigenvalue with
positive imaginary part is `i omega_H`) gives `g*(0) = g_H`, `omega*(0) = omega_H`.

(b) For small `eps > 0` the orbits of Theorem B are the Hopf cycles: as `eps -> 0`, `g*(eps) -> g_H` and the orbit
`c*(eps) + eps w*(eps)(.)` tends to `x_e(g_H)` uniformly (continuity), so for `eps` small it lies in the neighbourhood
`U` of Corollary A with `|g*(eps) - g_H| < eta_H`; by Corollary A it is the unique periodic orbit in `U`, it is
orbitally asymptotically stable, and `g*(eps) < g_H` (no periodic orbit in `U` for `g >= g_H`). "Small" is not
quantified. The quantitative enclosures of Theorem B give `g*(eps) < g_H` directly on every piece whose `g` enclosure
lies below `G_H` (record: `first_eps_with_g_certified_below_gH`, and that every later piece is below too); for
`eps` between the unquantified small range and that value, `g*(eps) < g_H` is not certified.

(c) *Every G_Ks value of the bridge.* Let `eps_end` be the right end of the last piece and `g_end+` the upper end of
the enclosure of `g*(eps_end)` (record: `g_star_at_eps_end`, `bridge_g_covered`). `g*` is continuous on
`[0, eps_end]` with `g*(0) = g_H` (a), so by the intermediate value theorem every `g in [g_end+, g_H)` equals
`g*(eps)` for some `eps in (0, eps_end]` (`eps != 0` since `g != g_H`), and the cell has at that `G_Ks` the periodic
orbit of Theorem B at that `eps`.

## Part C. Gluing to the certified G_Ks branch (`hopf.bridge_checks`, record `fourier/data/hopf/gluing_gks.json`)

The G_Ks branch (`branch.py`) consists of pieces `P = [g_lo, g_hi]` with exact centres `(omega_P, a_P)` (`K = 12`,
`fourier/data/branch/centres_K12.jsonl`, SHA-256 checked), weights `eta_P` (19 values), and for every `g in P` a unique
zero of `F_P(.; g)` (`F_ph = a_{1,V} - a_{-1,V}`, `F_m = i omega m a_m - [f(phi_a; g)]_m`) in the ball of radius
`r_hi(P)` about the centre, in the norm `max(|omega|/eta_om, max_k ||a_k||_{nu_P} / eta_k)`, `nu_P = e^{1/4}`
(branch.py Theorem B1). Consecutive pieces overlap and are glued by ball inclusion (branch.py Theorem B3). A *point
proof* of `branch.py` is the same theorem with `g_lo = g_hi = g_s` (`K = 32`, weights 1, a 256-bit centre, so
`r_lo` is about `1e-37`), logged in `points_K12.jsonl` with its centre in `points_centres_K32.jsonl`; most were
followed by Stage S (pointwise stability). `branch.point_on_branch` checks, in Arb, that a point's existence ball lies
in the uniqueness ball of a G_Ks piece containing `g_s`, so that the point's orbit is that piece's orbit at `g_s`.

### Lemma D (proved; a G_Ks point proof on the eps-branch; `hopf.point_in_eps_branch`)

Let a point proof at `g_s` give the zero `(omega_s, a_s)` of `F_P(.; g_s)` with `||(omega_s, a_s) - (ombar_s, abar_s)||
<= r_s` (weights `eta_s`, `nu_P`), where `abar_s` is real-symmetric with `Im abar_{s,1,V} = 0` exactly. Put
`eps_s := 2 a_{s,1,V}`. Suppose, with `nu = e^{1/8} <= nu_P` the eps-branch's norm:

(i) the ball `E = 2 (abar_{s,1,V} +- eta_{s,V} r_s / nu_P)` lies in `(0, inf)`;

(ii) every eps-piece `Q = [e_lo, e_hi]` meeting `E` satisfies, with `X = E n Q` and every bound taken over `eps in X`,

    max( (|omega_bar_s - omega_Q(X)| + eta_{s,om} r_s) / eta_om(Q),   |g_s - g_Q(X)| / eta_g(Q),
         max_k (|abar_{s,k,0} - c_{Q,k}(X)| + eta_{s,k} r_s) / eta_ck(Q),
         max_k ( sum_{m != 0} |abar_{s,k,m} / X - w_{Q,k,m}(X)| nu^|m| + eta_{s,k} r_s / min X ) / eta_wk(Q) )  <=  r_hi(Q)

(`omega_Q(X)`, ... the piece's centre line evaluated on the ball `X`);

(iii) these pieces cover `E`.

Then `eps_s` lies in `E`, and `y_s := (omega_s, g_s, a_{s,0}, (a_{s,m} / eps_s)_{m != 0})` is the eps-branch zero
`x*(eps_s)`: the orbit of the point proof is the bridge orbit at `eps = eps_s`, and `g*(eps_s) = g_s`.

*Proof.* `a_s` is real-symmetric (branch.py section 7) and `F_ph = 0`, so `a_{s,1,V} = a_{s,-1,V}` is real, and
`|a_{s,1,V} - abar_{s,1,V}| nu_P <= ||a_{s,V} - abar_{s,V}||_{nu_P} <= eta_{s,V} r_s`, so `eps_s in E` and `eps_s > 0`
by (i). By (iii) `eps_s` lies in a piece `Q` checked in (ii), and `eps_s in X`. `y_s` is a zero of `F(.; eps_s)`:
`w_{V,+-1} = a_{s,+-1,V} / eps_s = 1/2`; `phi = a_{s,0} + eps_s w` is the profile of the point, so
`omega_s phi' = f(phi; g_s)`, whose mean is `E_0 = [f(phi)]_0 = 0` and whose `m`-th coefficient (`m != 0`) is
`eps_s [Q]_m = [f(phi)]_m - [f(c)]_m = [f(phi)]_m = i m omega_s a_{s,m} = eps_s i m omega_s w_m`, so `E_m = 0`
(`Q` is defined since `y_s` lies in the ball where Lemma B3's cover certifies holomorphy, see below). The bound in (ii)
is an upper bound of `||y_s - xbar_Q(eps_s)||` in `Q`'s norm: componentwise by the triangle inequality, with
`|a_{s,k,0} - abar_{s,k,0}| <= ||a_{s,k} - abar_{s,k}||_{nu_P} <= eta_{s,k} r_s` and
`sum_{m != 0} |a_{s,k,m} - abar_{s,k,m}| nu^|m| <= ||a_{s,k} - abar_{s,k}||_{nu_P} <= eta_{s,k} r_s` (as `nu <= nu_P`;
the modes beyond both centres' `K` are included, the centres being zero there), divided by `eps_s >= min X`. So `y_s`
lies in `B_{r_hi(Q)}(xbar_Q(eps_s))` (inside `B_{r_*}`, where Lemma B3's family contains every point `c + s eps w`
used by `F`), and by uniqueness there `y_s = x*(eps_s)`. QED.

### Theorem C (computer-assisted; the Hopf bridge glued to the G_Ks branch)

Suppose a point proof at `g_s` satisfies Lemma D, and `branch.point_on_branch` holds for it and a piece `P` of the G_Ks
branch (`P` in the chain validated by `branch.validate_logs`, every consecutive gluing re-derived in Arb, on a copy of
the complete lines of the append-only logs whose line counts and SHA-256 the record gives). Then the G_Ks branch
`g -> x*_P(g)` on `[0.027499735464, g_s]` and the eps-branch `eps -> x*(eps)` on `[0, eps_s]` share the orbit at
`(g_s, eps_s)`, so their union is one continuous curve of real periodic orbits that starts at the orbit of Stage E at
`G_Ks = 0.0275` (branch.py), passes through the Hopf cycles of Corollary A, and ends at the Hopf point
`(x_e(g_H), g_H)` of Theorem A. With Corollary B(c): if the G_Ks branch reaches `g_end+` (it does whenever
`g_s >= g_end+`, as `g_s = g*(eps_s)` with `eps_s <= eps_end`, or directly from the snapshot's `g_hi`), then for every
`G_Ks in [0.027499735464, g_H)` the single cell has a periodic orbit on this curve.

*Proof.* Lemma D gives `x*(eps_s) = y_s` (the point's orbit in blown-up coordinates); `point_on_branch` gives
`x*_P(g_s) = (omega_s, a_s)` (the point's existence ball lies in `P`'s uniqueness ball). These are the same periodic
orbit. Both families are continuous in their parameters (branch.py Theorem B3, Theorem B here), and the union of two
curves with a common point is connected; the end points are named by branch.py (Stage E at 0.0275) and Corollary B(a).
The coverage statement is Corollary B(c) together with branch.py's coverage of `[0.027499735464, g_hi]`. QED.

If no point proof satisfies both checks, the record states the gap: the lowest `G_Ks` reached by the bridge (`g_end+`)
and the highest reached by the G_Ks branch.

---------------------------------------------------------------------------------------------------------------------

## Part S. Stability on the bridge: what is and is not proved

1. **Small amplitude (cited, not quantified).** By Corollary A and Corollary B(b), there is an `eps_1 > 0` such that
   for `eps in (0, eps_1)` the bridge orbit is orbitally asymptotically stable. `eps_1` is not computed. The mechanism
   (numerical heuristic, not used): in the normal form the nontrivial exponent of the cycle is `-2 beta` with
   `beta = mu(g) ~ Re lambda(g)`, i.e. the multiplier near 1 is about `exp(-2 Re lambda(g) T)`; with
   `d Re lambda / dg ~ -5.58` this exponent is about `-11.2 (g_H - g)` per ms, smaller in modulus than the slow
   equilibrium mode `-4.7e-5` per ms while `g_H - g < 4.2e-6` (`eps` below about `0.023`).
2. **At isolated G_Ks values (computer-assisted).** At every point proof of `branch.py` that passed Stage S and whose
   orbit is identified with the bridge by Lemma D (record: `stability_points`), every nontrivial Floquet multiplier of
   the bridge orbit has modulus at most the recorded `multiplier_bound_full_period` (about `0.99789`, `delta` about
   `4.0e-5` per ms) and the multiplier 1 is algebraically simple (Stage S, LEMMAS-stability.md), so that orbit is
   locally exponentially orbitally stable with asymptotic phase. This is stability at those `G_Ks` values only.
3. **Not proved.** Stability for every `eps` of the bridge, i.e. between the unquantified `eps_1` and the isolated
   points, and between the isolated points. A proof would need a uniform Floquet bound along the blown-up branch that
   resolves the multiplier near 1 at the scale `eps^2` (a second blow-up of the Hill operator at `eps = 0`, where the
   multiplier 1 is double), or a quantified Hopf theorem; neither is attempted. Stage S fed with a piece's existence
   radius fails for the same reason it fails on the G_Ks pieces (branch.py section 6).

---------------------------------------------------------------------------------------------------------------------

## What a reviewer must check hardest

1. Lemma B2(a)-(b): that every `xi`-dependence of `F` and `DF` along the centre line is covered (the hulls over `Xi_i`,
   `S_l`; the strip sups over the full piece; `Y1` at the point with the exact division by `e_c + t`).
2. Lemma B3: the third-derivative terms via Cauchy's estimate in `sigma` (the family must contain
   `c(xi) + sigma' w(xi)` for `|sigma'| <= T`; `EpsCover.contains`), the `P` factor and `tau`.
3. Theorem A(c) and Corollary B(a): that one polydisc `P` with Lemma K contains `c*(0)` and every recorded Theorem A
   polydisc of an interval meeting `J`, so that all equilibria named there are one branch.
4. Lemma D: the conversion between the two problems (`eps_s = 2 a_{1,V}`, `w = a / eps_s`), the norm comparison
   (`nu = e^{1/8} <= nu_P = e^{1/4}`), the evaluation of the eps-centre line on the ball `X`, and the coverage of `E`.
5. Theorem C: that the G_Ks pieces used are those validated (complete lines of the append-only logs, copied, validated
   and hashed together), and that `branch.point_on_branch` is applied to a piece containing `g_s`.
6. That the Hopf theorem is used only qualitatively (Corollary A, Corollary B(b), Part S.1); every quantitative
   statement comes from Theorems A, B, C and Lemma D.
