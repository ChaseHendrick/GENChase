"""Task 3 (NUMERICAL, NOT RIGOROUS): high-precision shooting for the pulse speed c* with mpmath.

Stage 0: double-precision RK4 classification + bisection on [1.0, 1.2] (no use of the claimed digits).
Stage 1: mpmath (mp.dps = DPS) high-order Taylor integrator (own recursion, orders ~60), started from a
         parametrization-method point K(theta) of the unstable manifold (K_1 = eigenvector with U = 1,
         (A - n lambda) K_n = -e_P [G(K_U)]_n), theta = 1e-3, order 45.
         Shooting function F(c; T) = l_u . (x(T) - rest), l_u the left unstable eigenvector (l_u . v_u = 1).
         Its root c(T) converges to c* as T grows (error ~ exp(-(lambda + 2|mu_3|) T)); secant in c for
         T = 30, 40, ..., 140.
Stage 2: bracket: classify c(T_final) -+ 1e-62 by the sign of l_u . (x - rest) when it first exceeds 5e-3 after
         the excursion.
"""
import json
import math
import sys
import time
import mpmath
from mpmath import mp, mpf

DPS = int(sys.argv[1]) if len(sys.argv) > 1 else 85
mp.dps = DPS
BETA, THETA, EPS = mpf(20), mpf(1) / 4, mpf(1) / 10


def S(u):
    return 1 / (1 + mpmath.exp(-BETA * (u - THETA)))


S0 = S(mpf(0))
s1 = BETA * S0 * (1 - S0)


# ---------------- stage 0: double precision ----------------
def f_float(x, k):
    U, V, Q, P = x
    return (k * (Q - U - V), 0.1 * k * U, P, Q - 1 / (1 + math.exp(-20 * (U - 0.25))))


def classify_float(c, h=0.005, T=200):
    import cmath  # noqa
    k = 1 / c
    s0 = 1 / (1 + math.exp(5)); s = 20 * s0 * (1 - s0)
    # unstable eigenvalue by Newton on the quartic
    p = lambda l: l**4 + k * l**3 + (0.1 * k * k - 1) * l * l + k * (s - 1) * l - 0.1 * k * k
    l = 1.0
    for _ in range(50):
        l -= p(l) / ((p(l + 1e-7) - p(l - 1e-7)) / 2e-7)
    v = (1, 0.1 * k / l, -s / (l * l - 1), -s * l / (l * l - 1))
    d = 1e-7
    x = (d * v[0], s0 + d * v[1], s0 + d * v[2], d * v[3])
    t = 0; exc = False
    while t < T:
        k1 = f_float(x, k)
        k2 = f_float(tuple(x[i] + h / 2 * k1[i] for i in range(4)), k)
        k3 = f_float(tuple(x[i] + h / 2 * k2[i] for i in range(4)), k)
        k4 = f_float(tuple(x[i] + h * k3[i] for i in range(4)), k)
        x = tuple(x[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) for i in range(4))
        t += h
        if x[0] > 0.5:
            exc = True
        if exc and x[0] > 0.3 and t > 25:
            return +1
        if exc and x[0] < -0.8:
            return -1
        if exc and abs(x[0]) < 0.05 and x[3] > 0 and x[0] > 0 and x[2] > s0 + 0.05:
            return +1
    return 0


# ---------------- mp Taylor ----------------
def taylor(x, k, N):
    U = [x[0]]; V = [x[1]]; Q = [x[2]]; P = [x[3]]
    Y = [S(x[0])]; W = [Y[0] - Y[0] ** 2]
    ek = EPS * k
    for n in range(N):
        if n >= 1:
            acc = mpf(0)
            for j in range(n):
                acc += W[j] * (n - j) * U[n - j]
            Y.append(BETA * acc / n)
            w = Y[n]
            for i in range(n + 1):
                w -= Y[i] * Y[n - i]
            W.append(w)
        U.append(k * (Q[n] - U[n] - V[n]) / (n + 1))
        V.append(ek * U[n] / (n + 1))
        Q.append(P[n] / (n + 1))
        P.append((Q[n] - Y[n]) / (n + 1))
    return [U, V, Q, P]


NT = 60
TOL = mpf(10) ** (-(DPS + 3))


def tstep(x, k):
    co = taylor(x, k, NT)
    m = max(max(abs(co[i][NT]), abs(co[i][NT - 1])) for i in range(4))
    h = min(0.5 * float((TOL / m) ** (mpf(1) / NT)), 0.5) if m > 0 else 0.5
    h = mpf(h)
    return [horner(co[i], h) for i in range(4)], h


def horner(c, h):
    r = mpf(0)
    for a in reversed(c):
        r = r * h + a
    return r


def rest_linear(c):
    k = 1 / c
    A = mpmath.matrix([[-k, -k, k, 0], [EPS * k, 0, 0, 0], [0, 0, 0, 1], [-s1, 0, 1, 0]])
    co = [1, k, EPS * k * k - 1, k * (s1 - 1), -EPS * k * k]
    roots = mpmath.polyroots(co, maxsteps=200, extraprec=2 * DPS)
    lam = max(r.real for r in roots)
    lam = mpmath.findroot(lambda l: mpmath.polyval(co, l), lam)
    v = mpmath.matrix([1, EPS * k / lam, -s1 / (lam ** 2 - 1), -s1 * lam / (lam ** 2 - 1)])
    # left eigenvector: solve (A^T - lam) w = 0 with w . v = 1
    M = (A.T - lam * mpmath.eye(4))
    M2 = M.copy(); M2[3, :] = v.T
    w = mpmath.lu_solve(M2, mpmath.matrix([0, 0, 0, 1]))
    return A, lam, v, w, sorted(r.real for r in roots)


def manifold_point(c, theta=mpf('1e-3'), order=45):
    A, lam, v, w, _ = rest_linear(c)
    K = [mpmath.matrix([0, 0, 0, 0]), v]
    KU = [mpf(0), mpf(1)]
    for n in range(2, order + 1):
        # [G(KU)]_n with G = -(S(U) - S0 - s U), from Y' = beta Y (1-Y) U' (U_n not needed: it cancels)
        Y = [S0]; W = [S0 - S0 ** 2]
        for m in range(1, n + 1):
            acc = mpf(0)
            for j in range(m):
                Um = KU[m - j] if m - j < n else mpf(0)
                acc += W[j] * (m - j) * Um
            Y.append(BETA * acc / m)
            ww = Y[m]
            for i in range(m + 1):
                ww -= Y[i] * Y[m - i]
            W.append(ww)
        Gn = -(Y[n] - 0)  # s * U_n term absent because U_n was set to 0 above
        rhs = mpmath.matrix([0, 0, 0, -Gn])
        Kn = mpmath.lu_solve(A - n * lam * mpmath.eye(4), rhs)
        K.append(Kn); KU.append(Kn[0])
    x = [sum(K[n][i] * theta ** n for n in range(order + 1)) for i in range(4)]
    x[1] += S0; x[2] += S0
    return x, lam, w, K


def orbit(c, T=None, classify=False, amax=mpf('5e-3')):
    c = mpf(c)
    k = 1 / c
    x, lam, w, _ = manifold_point(c)
    rest = [mpf(0), S0, S0, mpf(0)]
    t = mpf(0)
    exc = False
    back = False
    while True:
        xn, h = tstep(x, k)
        if T is not None and t + h > T:
            h = T - t
            co = taylor(x, k, NT)
            x = [horner(co[i], h) for i in range(4)]
            t = T
            a = sum(w[i] * (x[i] - rest[i]) for i in range(4))
            return a, x
        x = xn; t += h
        if x[0] > mpf('0.5'):
            exc = True
        if exc and not back and max(abs(x[i] - rest[i]) for i in range(4)) < mpf('0.05'):
            back = True   # returned near rest after the excursion
        if classify and back:
            a = sum(w[i] * (x[i] - rest[i]) for i in range(4))
            if abs(a) > amax:
                return (1 if a > 0 else -1), float(t)
            if t > 400:
                return 0, float(t)


def secant(Fun, c0, c1, tol, maxit=12):
    f0, f1 = Fun(c0), Fun(c1)
    for _ in range(maxit):
        c2 = c1 - f1 * (c1 - c0) / (f1 - f0)
        if abs(c2 - c1) < tol:
            return c2
        c0, f0, c1, f1 = c1, f1, c2, Fun(c2)
    return c1


if __name__ == "__main__":
    t0 = time.time()
    log = {"dps": DPS, "taylor_order": NT}
    # stage 0
    lo, hi = 1.0, 1.2
    slo, shi = classify_float(lo), classify_float(hi)
    print("float classify", lo, slo, hi, shi); sys.stdout.flush()
    assert slo != shi and slo != 0 and shi != 0
    for _ in range(46):
        mid = (lo + hi) / 2
        sm = classify_float(mid)
        if sm == slo:
            lo = mid
        else:
            hi = mid
    log["stage0_float_bracket"] = [repr(lo), repr(hi)]
    print("stage 0 bracket", lo, hi, time.time() - t0); sys.stdout.flush()
    # stage 1
    ca, cb = mpf(lo), mpf(hi)
    stages = []
    for T in (30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140):
        F = lambda c, T=T: orbit(c, T=mpf(T))[0]
        cs = secant(F, ca, cb, tol=mpf(10) ** (-(DPS - 5)))
        stages.append((T, mpmath.nstr(cs, DPS - 5)))
        print("T =", T, "c(T) =", mpmath.nstr(cs, DPS - 5), round(time.time() - t0)); sys.stdout.flush()
        width = max(abs(cs - ca), abs(cs - cb), mpf(10) ** -(DPS - 10))
        ca, cb = cs - width / 1000, cs
    log["secant_stages"] = stages
    cstar = mpf(stages[-1][1])
    # stage 2: bracket
    d = mpf(10) ** -62
    r_lo = orbit(cstar - d, classify=True)
    r_hi = orbit(cstar + d, classify=True)
    log["bracket"] = {"c_lo": mpmath.nstr(cstar - d, 70), "class_lo": r_lo, "c_hi": mpmath.nstr(cstar + d, 70), "class_hi": r_hi}
    print(json.dumps(log, indent=1))
    log["seconds"] = round(time.time() - t0)
    with open(f"shoot_mp_dps{DPS}.json", "w") as f:
        json.dump(log, f, indent=1)
