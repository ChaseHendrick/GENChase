"""Rigorous mean-value (first-order Lohner-type, no QR) integrator in Arb for the double pendulum, for sets.
State: box X containing x(t) for every initial x0 in the initial set, interval matrix V containing D phi_t(x0).
Step:  X+ = phi_h(xhat) + D phi_h(X) (X - xhat),  V+ = D phi_h(X) V,
with phi_h(xhat) and D phi_h(X) from Taylor series with Lagrange remainders over validated rough enclosures
(dparb.rough / dparb.taylor_coeffs).  Crossings of t1 = 0: every step's rough enclosure is checked; if it meets
t1 = 0 the t1 velocity must have constant sign on it.  The crossing time set T is found by interval Newton over the
whole box, and P, DP are enclosed at tau in T."""
from dparb import *
import dparb

I4 = [arb(1) if i == j else arb(0) for i in range(4) for j in range(4)]


def matvec(M, v):
    return [sum((M[i][k] * v[k] for k in range(len(v))), arb(0)) for i in range(len(M))]


def matmul(A, B):
    return [[sum((A[i][k] * B[k][j] for k in range(len(B))), arb(0)) for j in range(len(B[0]))] for i in range(len(A))]


def aug_series(X, h, N):
    """Taylor data of the augmented flow (x, D phi) from the box X with V0 = I: coefficients over X and
    remainder coefficient over the validated rough enclosure."""
    x0 = list(X) + I4
    Y = rough(x0, h)
    cs = taylor_coeffs(x0, N)
    rem = taylor_coeffs(Y, N + 1)
    remN = [r[N + 1] for r in rem]
    return cs, remN, Y


def Dphi_at(cs, remN, T, N):
    v = enclose_at(cs, remN, T, N)
    return [[v[4 + 4 * i + j] for j in range(4)] for i in range(4)]


def point_series(xh, h, N):
    Y = rough(xh, h)
    cs = taylor_coeffs(xh, N)
    rem = taylor_coeffs(Y, N + 1)
    return cs, [r[N + 1] for r in rem]


def return_map_set(X0, nret=1, h=0.006, N=30, verbose=False):
    X = list(X0); V = [[arb(1) if i == j else arb(0) for j in range(4)] for i in range(4)]
    F0 = field(X)[0]
    assert X[0].contains(0) and F0 > 0
    first = True; sign = 0; count = 0; t = arb(0); nsteps = 0
    while True:
        hs = h
        while True:
            cs, remN, Y = aug_series(X, hs, N)
            Xe_naive = enclose_at(cs, remN, arb(hs), N)
            y0 = Y[0]; FY0 = field(Y[:4])[0]
            ok = True
            if y0.contains(0) and not (FY0 > 0 or FY0 < 0):
                ok = False
            if Xe_naive[0].contains(0):
                ok = False
            if ok:
                break
            hs *= 0.6
            if hs < 1e-6:
                raise RuntimeError('step underflow t=%s' % t.str(8))
        end_sign = 1 if Xe_naive[0] > 0 else -1
        xh = [arb(v.mid()) for v in X]
        pc, prem = point_series(xh, hs, N)
        dX = [X[i] - xh[i] for i in range(4)]
        crossing = False
        if first:
            if end_sign < 0 or not (FY0 > 0 or not y0.contains(0)):
                raise RuntimeError('first step problem')
            first = False
        elif y0.contains(0) and end_sign != sign and sign < 0:
            count += 1
            crossing = count == nret
        if crossing:
            T = ivl(0, hs)
            for it in range(300):
                m = arb(T.mid())
                Dm = Dphi_at(cs, remN, m, N)
                g = enclose_at([pc[0]], [prem[0]], m, N)[0] + sum((Dm[0][k] * dX[k] for k in range(4)), arb(0))  # t1(m) over X, mean-value form
                XT = enclose_at(cs[:4], remN[:4], T, N)
                dg = field(XT)[0]
                Nt = m - g / dg
                lo = max(Nt.lower(), T.lower()); hi = min(Nt.upper(), T.upper())
                if lo > hi:
                    raise RuntimeError('empty Newton')
                Tn = ivl(lo, hi)
                done = Tn.rad() >= T.rad() * 0.99 and it > 5
                T = Tn
                if done:
                    break
            D = Dphi_at(cs, remN, T, N)
            xp = enclose_at(pc, prem, T, N)
            XP = [xp[i] + matvec(D, dX)[i] for i in range(4)]
            # also intersect with the naive enclosure
            XN = enclose_at(cs[:4], remN[:4], T, N)
            XP = [ivl(max(XP[i].lower(), XN[i].lower()), min(XP[i].upper(), XN[i].upper())) for i in range(4)]
            VP = matmul(D, V)
            return XP, VP, t + T
        D = Dphi_at(cs, remN, arb(hs), N)
        xe = enclose_at(pc, prem, arb(hs), N)
        Xn = [xe[i] + matvec(D, dX)[i] for i in range(4)]
        X = [ivl(max(Xn[i].lower(), Xe_naive[i].lower()), min(Xn[i].upper(), Xe_naive[i].upper())) for i in range(4)]
        V = matmul(D, V)
        sign = end_sign; t = t + arb(hs); nsteps += 1
        if verbose and nsteps % 100 == 0:
            print('  t', t.str(6), 'rad X', max(float(v.rad()) for v in X), 'rad V', max(float(v.rad()) for r in V for v in r), flush=True)
