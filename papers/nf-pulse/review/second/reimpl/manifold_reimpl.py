"""Task 2a (rigorous): a point of the branch W^u_+ of the unstable manifold of rest, enclosed in a ball.

Method (independent of the base code; a tapered isolating tube rather than a parametrization tail bound).

Coordinates. E is a fixed exact (dyadic) 4x4 matrix whose columns approximate the eigenvectors
(unstable first, then stable mu_1 < mu_2 < mu_3 < 0), each with U-component exactly 1, so U = a + b_1 + b_2 + b_3.
y = E^{-1}(x - rest) = (a, b). The field is x' = A (x - rest) + e_P G(U), G(U) = -(S(U) - S(0) - s U), so
    a' = L_aa a + L_ab b + alpha G(U),     b' = L_ba a + L_bb b + beta G(U),     L = E^{-1} A E  (balls).
h(a) = sum_{k=2..N} h_k a^k is an exact polynomial graph (approximate solution of the invariance equation),
b = h(a) + z. Then
    z' = L_bb z - h'(a) (L_ab z) + (beta - h'(a) alpha) (G(U) - G(U0)) + R(a),   U0 = a + sum_j h_j(a),
    R(a) = L_ba a + L_bb h(a) + beta G(U0) - h'(a) (L_aa a + L_ab h(a) + alpha G(U0)).
R is enclosed as a one-variable Taylor model on [0, delta]: R(a) in sum_{k=1..N} R_k a^k + a^{N+1} [-T, T].
The tail of G(U0(a)) beyond order N uses a Cauchy estimate: for complex |U| <= 0.2, w = 5 - 20U has Re w >= 1, so
|1 + e^w| >= e - 1 and |S(U)| <= 1/(e-1); for |a| <= rho_a the polynomial U0 stays in |U| <= 0.2 (checked).

Tube. T = {0 < a <= delta, |z_i| <= r(a)} with r(a) = sum_{k=1..N+1} rho_k a^k. Checked in ball arithmetic:
 (i) a' >= lambda_min a with lambda_min > 0 on T;
 (ii) on each face z_i = +-r(a): (k lambda_min + |mu_i| - E1_i) rho_k >= |R_ik| for k <= N and > T_i for k = N+1,
      which gives d/dxi (r(a) -+ z_i) > 0 there: the lateral faces are strict entrance faces (forward time).
Conclusion (Wazewski / no-retraction on the face disk D = {a = delta, |z|_inf <= r(delta)}, flowing backward):
some point of D has its whole backward orbit in T; along it a -> 0 and |z| <= r(a) -> 0, so it lies on W^u(rest),
on the branch with a > 0, where U = a (1 + O(delta)) > 0 and U increases near rest.  That point is enclosed by
the ball x0 = rest + E (delta, h(delta) + [-r(delta), r(delta)]^3) written to manifold_point_<label>.json.
"""
import json
import sys
from flint import arb, arb_mat, fmpq, ctx
import nfr
from certify_rest_reimpl import isolate, refine

ctx.prec = nfr.PREC
N = 45
DELTA = arb(fmpq(1, 1000))
RHO_A = arb(fmpq(1, 10))      # complex disk radius in a for the Cauchy tail estimate
RHO0 = arb(fmpq(1, 5))        # disk |U| <= 0.2 where |S| <= 1/(e-1)
MS = 1 / (arb(1).exp() - 1)


class TM:
    """f(a) in sum_{k<=N} c[k] a^k + a^{N+1} [-rem, rem] for a in [0, delta]."""

    def __init__(self, c, rem=None):
        self.c = list(c) + [arb(0)] * (N + 1 - len(c))
        self.rem = rem if rem is not None else arb(0)

    def bound(self):
        """upper bound of |sum c_k a^k| on [0, delta]"""
        b = arb(0)
        for k, ck in enumerate(self.c):
            b += abs(ck).upper() * DELTA ** k
        return b.upper()

    def __add__(self, o):
        if not isinstance(o, TM):
            o = TM([o])
        return TM([x + y for x, y in zip(self.c, o.c)], self.rem + o.rem)

    def __neg__(self):
        return TM([-x for x in self.c], self.rem)

    def __sub__(self, o):
        return self + (-o)

    def scale(self, s):
        return TM([s * x for x in self.c], abs(s).upper() * self.rem)

    def __mul__(self, o):
        if not isinstance(o, TM):
            return self.scale(o)
        p = [arb(0)] * (2 * N + 1)
        for i, x in enumerate(self.c):
            if x.is_zero():
                continue
            for j, y in enumerate(o.c):
                p[i + j] += x * y
        rem = arb(0)
        for k in range(N + 1, 2 * N + 1):
            rem += abs(p[k]).upper() * DELTA ** (k - N - 1)
        rem += self.rem * o.bound() + o.rem * self.bound() + self.rem * o.rem * DELTA ** (N + 1)
        return TM(p[:N + 1], rem.upper())


def eig_balls(kap):
    co = nfr.charpoly_coeffs(kap)
    br, _ = isolate(co)
    assert len(br) == 4
    out = []
    for a, b, sa in br:
        a2, b2 = refine(co, a, b, sa)
        out.append(arb(a2).union(arb(b2)))
    return out  # ascending: mu1, mu2, mu3, lambda


def G_series(U0c, k_max):
    """Exact (ball) Taylor coefficients 0..k_max of G(U0(a)) = -(S(U0) - S0 - s U0) via Y' = beta Y (1-Y) U0'."""
    Y = [nfr.S(U0c[0])]
    W = [Y[0] - Y[0] * Y[0]]
    for k in range(1, k_max + 1):
        acc = arb(0)
        for j in range(k):
            acc += W[j] * ((k - j) * U0c[k - j])
        Y.append(nfr.BETA * acc / k)
        w = Y[k]
        for i in range(k + 1):
            w -= Y[i] * Y[k - i]
        W.append(w)
    s = nfr.s1()
    G = [-(Y[k] - (nfr.S0() if k == 0 else 0) - s * U0c[k]) for k in range(k_max + 1)]
    G[0] = arb(0) if G[0].contains(0) else G[0]
    return G


def build(cq, label):
    kap = 1 / arb(cq)
    y0 = nfr.S0()
    rest = [arb(0), y0, y0, arb(0)]
    mu1, mu2, mu3, lam = eig_balls(kap)
    lams = [lam, mu1, mu2, mu3]
    cols = [[x.mid() for x in nfr.eigvec(l.mid(), kap.mid())] for l in lams]
    E = arb_mat([[cols[j][i] for j in range(4)] for i in range(4)])
    assert all(E[0, j] == 1 for j in range(4))
    Ei = E.inv()
    A = nfr.jac_rest(kap)
    L = Ei * A * E
    alpha = Ei[0, 3]
    beta = [Ei[i, 3] for i in (1, 2, 3)]
    Laa = L[0, 0]
    Lab = [L[0, j] for j in (1, 2, 3)]
    Lba = [L[i, 0] for i in (1, 2, 3)]
    Lbb = [[L[i, j] for j in (1, 2, 3)] for i in (1, 2, 3)]
    mus = [Lbb[i][i] for i in range(3)]

    # --- approximate graph h (midpoints), order by order ---
    lm = lam.mid()
    mm = [m.mid() for m in mus]
    am, bm = alpha.mid(), [b.mid() for b in beta]
    h = [[arb(0)] * (N + 1) for _ in range(3)]
    U0 = [arb(0), arb(1)] + [arb(0)] * (N - 1)
    s = nfr.s1()
    for k in range(2, N + 1):
        Gs = G_series([x.mid() for x in U0], k)   # G_k depends on U0 up to order k-1 only
        for j in range(3):
            acc = bm[j] * Gs[k]
            for m in range(2, k):
                acc -= m * h[j][m] * am * Gs[k - m + 1]
            h[j][k] = (-acc / (mm[j] - k * lm)).mid()
        U0[k] = h[0][k] + h[1][k] + h[2][k]

    # --- rigorous residual R(a) as Taylor models ---
    U0b = [arb(0), arb(1)] + [h[0][k] + h[1][k] + h[2][k] for k in range(2, N + 1)]
    # Cauchy tail of G(U0(a)) beyond order N on [0, delta]
    Ubound_disk = RHO_A + sum(abs(U0b[k]) * RHO_A ** k for k in range(2, N + 1))
    assert Ubound_disk < RHO0, Ubound_disk
    # |S(U0(a))| <= MS on |a| <= rho_a, so |coef_k| <= MS / rho_a^k; S0 + s U0 is a polynomial of degree N
    # whose coefficients equal those of S(U0) up to order 1 and are cancelled exactly; beyond order N
    # G = -S(U0) + (terms of s U0 of order > N: none, since deg U0 = N).
    gtail = (MS / RHO_A ** (N + 1) / (1 - DELTA / RHO_A)).upper()
    Gtm = TM(G_series(U0b, N), gtail)
    hT = [TM(h[j]) for j in range(3)]
    hpT = [TM([k * h[j][k] for k in range(1, N + 1)] + [arb(0)]) for j in range(3)]  # h'(a)
    aT = TM([arb(0), arb(1)])
    adot0 = aT.scale(Laa) + hT[0].scale(Lab[0]) + hT[1].scale(Lab[1]) + hT[2].scale(Lab[2]) + Gtm.scale(alpha)
    R = []
    for i in range(3):
        Ri = aT.scale(Lba[i]) + Gtm.scale(beta[i])
        for j in range(3):
            Ri = Ri + hT[j].scale(Lbb[i][j])
        Ri = Ri - hpT[i] * adot0
        R.append(Ri)
    assert all(R[i].c[0].contains(0) for i in range(3))

    # --- tube radii ---
    mu_abs_min = min((-m).lower() for m in mus)
    rho = [arb(0)] * (N + 2)
    for k in range(1, N + 1):
        rk = max(abs(R[i].c[k]).upper() for i in range(3))
        rho[k] = (2 * rk / (k * lam.lower() + mu_abs_min)).upper()
    rho[N + 1] = (2 * max(R[i].rem for i in range(3)) / ((N + 1) * lam.lower() + mu_abs_min)).upper()

    # --- bounds on T ---
    Hc = max(sum(abs(h[j][k]) * DELTA ** (k - 1) for k in range(2, N + 1)) for j in range(3)).upper()
    Rc = sum(rho[k] * DELTA ** (k - 1) for k in range(1, N + 2)).upper()
    Uc = (1 + 3 * Hc + 3 * Rc).upper()
    Umax = (DELTA * Uc).upper()
    assert Umax < RHO0
    S2 = (2 * MS * RHO0 / (RHO0 - Umax) ** 3).upper()        # sup |S''| on |xi| <= Umax (Cauchy)
    Gp = (Umax * S2).upper()                                  # sup |G'| = sup |S' - s|
    Lab1 = sum(abs(x) for x in Lab).upper()
    lam_min = (Laa - Lab1 * (Hc + Rc) - abs(alpha) * S2 * Uc * Uc * DELTA / 2).lower()
    ok = lam_min > 0
    hp_max = [sum(k * abs(h[j][k]) * DELTA ** (k - 1) for k in range(2, N + 1)).upper() for j in range(3)]
    details = []
    for i in range(3):
        off = sum(abs(Lbb[i][j]) for j in range(3) if j != i)
        E1 = (off + hp_max[i] * Lab1 + (abs(beta[i]) + hp_max[i] * abs(alpha)) * Gp * 3).upper()
        worst = None
        for k in range(1, N + 2):
            coef = (k * lam_min + (-mus[i]).lower() - E1).lower()
            need = abs(R[i].c[k]).upper() if k <= N else R[i].rem
            lhs = coef * rho[k]
            good = (lhs >= need) if k <= N else (lhs > need)
            ok = ok and coef > 0 and good
            margin = (lhs - need)
            if worst is None or margin < worst:
                worst = margin
        details.append(dict(E1=E1.str(5), min_margin=worst.str(5)))

    r_delta = sum(rho[k] * DELTA ** k for k in range(1, N + 2)).upper()
    y = [DELTA] + [arb(sum(h[j][k] * DELTA ** k for k in range(2, N + 1)).mid(), 0) + arb(0, r_delta) for j in range(3)]
    x0 = [rest[i] + sum(E[i, j] * y[j] for j in range(4)) for i in range(4)]
    # left eigenvector row for the unstable direction (for later classification): row 0 of E^{-1}
    out = dict(label=label, c=str(cq), N=N, delta="1/1000", ok=bool(ok),
               lambda_min=lam_min.str(10), Hc=Hc.str(5), Rc=Rc.str(5), Umax=Umax.str(5),
               tail_T=[R[i].rem.str(5) for i in range(3)], r_delta=r_delta.str(10), faces=details,
               x0=[[x.mid().str(110, radius=False), x.rad().str(5, radius=False)] for x in x0],
               x0_print=[x.str(30) for x in x0])
    out['_balls'] = dict(x0=x0, E=E, Ei=Ei, rest=rest, kap=kap)
    return out


if __name__ == "__main__":
    for cq, lab in ((nfr.C1_Q, "c1"), (nfr.C2_Q, "c2")):
        o = build(cq, lab)
        o.pop('_balls')
        print(json.dumps({k: v for k, v in o.items() if k != 'x0'}, indent=1))
        with open(f"manifold_point_{lab}.json", "w") as f:
            json.dump(o, f, indent=1)
        if not o["ok"]:
            sys.exit(1)
