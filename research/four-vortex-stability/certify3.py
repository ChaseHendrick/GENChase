"""Second-order version of certify2.py: identical enclosure of the equilibrium (parametric
Krawczyk, first-order centred forms) plus an enclosure Q of v*''(t) over the box, then the
Taylor coefficients and the normal form in second-order centred forms (cf.CF2), whose range
enclosures are c0 + c1 t + d2 t^2/2 with c0, c1 thin (computed at t = 0) and d2 over the box.

v*'(0): thin solve of DF v1 = -F_m at (v0, m0).
R-enclosure argument: F is evaluated in CF2 with input value box X (range), first-derivative
box P and second derivative 0.  The d2 field of the output is then, by the second-order chain
rule applied to enclosures, an enclosure of D2F(v, t)[p, p] + 2 dF_v/dm(v, t) p + F_mm(v, t) for
all v in X, p in P, t in T (the straight line s -> (v + p s, t + s) has zero second derivative,
so the chain rule for it gives exactly this expression); in particular it contains the value at
(v*(t), v*'(t), t).
v*''(t): differentiate F(v*(t), m0 + t) = 0 twice:
    DF v'' = -R,  R = D2F[v', v'] + 2 dF_v/dm v' + F_mm   at (v*(t), t),
R is enclosed by evaluating F in CF2 with inputs (value box X, derivative box P, second
derivative 0) and taking the d2 field; then v'' is in Q whenever -Y R + C Q is inside int Q.

usage: python3 certify3.py FAMILY m_lo m_hi n_boxes [min_width] [out.json]
"""
import sys, json, time, math
import numpy as np
from flint import arb, acb, ctx
from tps import Space, Ring, TPS
from vortex import F_and_DF, Hred_tps
from bnf import normal_form, Refused, float_diagonaliser, symplectic_gram_schmidt
from cf import CF, CF2
import families
from certify2 import float_newton, thin_krawczyk, matvec_cf, summarize

ctx.prec = 160
RA = Ring('arb')
RC = Ring('cf')
RC2 = Ring('cf2')
RF = Ring('float')
SP4 = Space(4, 4)
SP5 = Space(5, 2)


def solve_thin(A, b):
    """Gaussian elimination in arb (thin data); raises if a pivot is not certified nonzero."""
    n = len(b)
    A = [list(r) for r in A]
    b = list(b)
    for k in range(n):
        p = max(range(k, n), key=lambda r: float(abs(A[r][k].mid())))
        A[k], A[p] = A[p], A[k]
        b[k], b[p] = b[p], b[k]
        if A[k][k].contains(0):
            raise Refused('thin solve: singular pivot', {})
        for r in range(k + 1, n):
            f = A[r][k] / A[k][k]
            A[r] = [A[r][c] - f * A[k][c] for c in range(n)]
            b[r] = b[r] - f * b[k]
    x = [arb(0)] * n
    for k in reversed(range(n)):
        x[k] = (b[k] - sum((A[k][c] * x[c] for c in range(k + 1, n)), arb(0))) / A[k][k]
    return x


def linear_inclusion(base, Cb, guess, n):
    P = [g + arb(0, 1e-12 + 1e-6 * float(abs(g).upper())) for g in guess]
    for _ in range(40):
        K = [base[a] + sum((Cb[a][b] * P[b] for b in range(n)), arb(0)) for a in range(n)]
        if all(K[a].lower() > P[a].lower() and K[a].upper() < P[a].upper() for a in range(n)):
            for _ in range(6):
                P = [K[a].intersection(P[a]) for a in range(n)]
                K = [base[a] + sum((Cb[a][b] * P[b] for b in range(n)), arb(0)) for a in range(n)]
            return [K[a].intersection(P[a]) for a in range(n)]
        P = [arb(P[a].mid(), 2 * max(float(P[a].rad()), float((K[a] - P[a].mid()).abs_upper()))) for a in range(n)]
    raise Refused('linear inclusion failed', {})


def certify_box(fam, m0, h, enclosure_only=False):
    t0 = time.time()
    rec = dict(m=[m0 - h, m0 + h])
    free = getattr(fam, 'free', (0, 1, 2, 3))
    n = len(free)
    try:
        CF.set_T(h)
        T = arb(0, h)
        vm = float_newton(fam.G(m0), fam.guess(m0))
        # predictor slope and preconditioner (floating point, heuristic)
        eps = 1e-7
        vp = float_newton(fam.G(m0 + eps), vm)
        vn = float_newton(fam.G(m0 - eps), vm)
        v1 = (vp - vn) / (2 * eps)
        def Yat(m, v):
            _, DF, _ = F_and_DF(fam.G(m), list(v), RF, SP5)
            A = np.array([[DF[i][j] for j in free] for i in free])
            return np.linalg.inv(A)
        Y0 = Yat(m0, vm)
        Y1 = (Yat(m0 + eps, vp) - Yat(m0 - eps, vn)) / (2 * eps)
        Ycf = [[CF(arb(Y0[a, b]), arb(Y0[a, b]) + arb(Y1[a, b]) * T, arb(Y1[a, b])) for b in range(n)] for a in range(n)]
        # 1. thin solve
        v0 = thin_krawczyk(fam.G(arb(m0)), vm, free)
        mcf = CF(arb(m0), arb(m0) + T, arb(1))
        Gcf = fam.G(mcf)
        # 2. parametric Krawczyk
        pc = [CF(arb(float(vm[i])), arb(float(vm[i])) + arb(float(v1[i])) * T, arb(float(v1[i])))
              if i in free else CF.const(arb(0)) for i in range(4)]
        Fp, _, _ = F_and_DF(Gcf, pc, RC, SP5)
        N = [-x for x in matvec_cf(Ycf, [Fp[j] for j in free])]
        Nb = [x.best() for x in N]
        rho = max(float(abs(x).upper()) for x in Nb) * 2 + 1e-30
        ok = False
        for _ in range(12):
            W = arb(0, rho)
            X = [CF(pc[i].c + W, pc[i].v + W, pc[i].d) if i in free else pc[i] for i in range(4)]
            _, DFX, _ = F_and_DF(Gcf, X, RC, SP5)
            C = [[(CF.const(arb(1)) if a == b else CF.const(arb(0)))
                  - sum((Ycf[a][c] * DFX[k][free[b]] for c, k in enumerate(free)), CF.const(arb(0)))
                  for b in range(n)] for a in range(n)]
            Cb = [[x.best() for x in row] for row in C]
            K = [Nb[a] + sum((Cb[a][b] * W for b in range(n)), arb(0)) for a in range(n)]
            if all(K[a].lower() > W.lower() and K[a].upper() < W.upper() for a in range(n)):
                ok = True
                break
            rho = 2 * max(max(float(abs(k).upper()) for k in K), rho)
            if rho > 1e-2:
                break
        if not ok:
            raise Refused('parametric Krawczyk failed', {})
        rec['W'] = rho
        # consistency: the thin zero v0 at m0 must lie in p(0) + W, the box in which the
        # parametric Krawczyk step proved uniqueness at t = 0; then v0 and the branch v*(t)
        # describe the same equilibrium, so the centred forms below (c0 from v0, ranges from
        # p(t) + W) refer to one function of t.
        for i in free:
            if not (v0[i].lower() >= (pc[i].c + W).lower() and v0[i].upper() <= (pc[i].c + W).upper()):
                raise Refused('thin zero not inside the parametric Krawczyk box', {})
        if enclosure_only:
            rec['status'] = 'CONSISTENT'
            return rec
        # 3. derivative of the equilibrium: F_m over the box (m derivative only)
        Xm = [CF(pc[i].best() + W, pc[i].best() + W, arb(0)) if i in free else CF.const(arb(0)) for i in range(4)]
        Fm_cf, _, _ = F_and_DF(Gcf, Xm, RC, SP5)
        Fm = [Fm_cf[j].d for j in free]            # encloses dF/dm over the box
        Yb = [[Ycf[a][b].best() for b in range(n)] for a in range(n)]
        base = [-sum((Yb[a][b] * Fm[b] for b in range(n)), arb(0)) for a in range(n)]
        P = [arb(float(v1[i])) + arb(0, 1e-8 + 1e-3 * abs(float(v1[i]))) for i in free]
        okP = False
        for _ in range(20):
            K = [base[a] + sum((Cb[a][b] * P[b] for b in range(n)), arb(0)) for a in range(n)]
            if all(K[a].lower() > P[a].lower() and K[a].upper() < P[a].upper() for a in range(n)):
                okP = True
                break
            P = [arb(P[a].mid(), 2 * max(float(P[a].rad()), float((K[a] - P[a].mid()).abs_upper()))) for a in range(n)]
        if not okP:
            raise Refused('derivative enclosure failed', {})
        # tighten: once v*' is in P, it is also in K(P) = base + C P (and in K(P) cap P)
        for _ in range(6):
            P = [K[a].intersection(P[a]) for a in range(n)]
            K = [base[a] + sum((Cb[a][b] * P[b] for b in range(n)), arb(0)) for a in range(n)]
        # 4. second-order data: thin v*'(0) and enclosure Q of v*'' over the box
        CF2.set_T(h)
        T2 = arb(0, h)
        Xr = [(pc[i].best() + W) if i in free else arb(0) for i in range(4)]
        m2 = CF2(arb(m0), arb(1), arb(0), arb(m0) + T2)
        G2 = fam.G(m2)
        vin = [CF2(v0[i], arb(0), arb(0), v0[i]) if i in free else CF2.const(arb(0)) for i in range(4)]
        Fth, _, _ = F_and_DF(G2, vin, RC2, SP5)
        _, DF0, _ = F_and_DF(fam.G(arb(m0)), v0, RA, SP5)
        v1s = solve_thin([[DF0[i][j] for j in free] for i in free], [-Fth[i].c1 for i in free])
        vin = [CF2(v0[i], P[free.index(i)], arb(0), Xr[i]) if i in free else CF2.const(arb(0)) for i in range(4)]
        Fr, _, _ = F_and_DF(G2, vin, RC2, SP5)
        R = [Fr[i].d2 for i in free]
        base2 = [-sum((Yb[a][b] * R[b] for b in range(n)), arb(0)) for a in range(n)]
        Q = linear_inclusion(base2, Cb, [x.mid() for x in base2], n)
        rec['Q'] = [str(q) for q in Q]
        vstar = []
        for i in range(4):
            if i in free:
                a = free.index(i)
                vstar.append(CF2(v0[i], v1s[a], Q[a], Xr[i]))
            else:
                vstar.append(CF2.const(arb(0)))
        Gcf = G2
        # angular impulse 2 J0 = mu1 r^2 + mu2 |v2|^2 + mu3 |v3|^2 at r = 1 must be != 0 (scaling step)
        from vortex import jacobi
        muc, _ = jacobi(G2, RC2)
        J2 = muc[0] + muc[1] * (vstar[0] * vstar[0] + vstar[1] * vstar[1]) + muc[2] * (vstar[2] * vstar[2] + vstar[3] * vstar[3])
        if not (J2 > 0 or J2 < 0):
            raise Refused('angular impulse J0 != 0 not certified', {})
        _y = (J2 / 2).best()
        rec['J0'] = '[%r, %r]' % (math.nextafter(float(_y.lower()), -math.inf), math.nextafter(float(_y.upper()), math.inf))
        # exact symplectic preconditioner L (floats + symplectic Gram-Schmidt in arb)
        Hf, _ = Hred_tps(fam.G(m0), [float(x) for x in vm], Space(4, 2), RF)
        from bnf import float_diagonaliser, symplectic_gram_schmidt
        pre = float_diagonaliser(Hf.part(2))
        cols = symplectic_gram_schmidt([[arb(float(x)) for x in col] for col in pre], arb(1))
        L = [[cols[j][i] for j in range(4)] for i in range(4)]
        H, mu = Hred_tps(Gcf, vstar, SP4, RC2, L=L)
        for d in H.part(1).values():
            if not d.contains(0):
                raise Refused('gradient does not enclose 0: inconsistency', {})
        info = normal_form(H.part(2), H.part(3), H.part(4), kind='cf2')
        def b(x):
            # explicit outward-rounded bounds (arb's str() drops the sign when rad > |mid|)
            y = x.best()
            return '[%r, %r]' % (math.nextafter(float(y.lower()), -math.inf), math.nextafter(float(y.upper()), math.inf))
        rec.update(w1=str(b(info['w'][0])), w2=str(b(info['w'][1])), signs=info['signs'],
                   A=str(b(info['A'].real)), B=str(b(info['B'].real)), C=str(b(info['C'].real)),
                   D=str(b(info['D'])), ratio=str(b(info['w'][0] / info['w'][1])),
                   Dnorm=str(b(info['D'] / (info['w'][0] * info['w'][0] * info['w'][0]))))
        if info['signs'][0] == info['signs'][1]:
            rec['status'] = 'DEFINITE'
        elif info['D'] > 0 or info['D'] < 0:
            rec['status'] = 'CERTIFIED'
        else:
            rec['status'] = 'REFUSED'
            rec['reason'] = 'Arnold determinant D != 0 not certified'
    except Refused as e:
        rec['status'] = 'REFUSED'
        rec['reason'] = e.args[0]
    except (ZeroDivisionError, ValueError, np.linalg.LinAlgError) as e:
        rec['status'] = 'REFUSED'
        rec['reason'] = 'arithmetic: %s' % e
    rec['sec'] = round(time.time() - t0, 3)
    return rec


def certify_interval(fam, lo, hi, enclosure_only=False):
    """Certify the closed interval [lo, hi] (floats, exact): m0 = rounded midpoint, h rounded
    up so that [m0 - h, m0 + h] (exact) contains [lo, hi]."""
    import math
    from fractions import Fraction as Fr
    m0 = (lo + hi) / 2
    he = max(Fr(m0) - Fr(lo), Fr(hi) - Fr(m0))
    h = float(he)
    while Fr(h) < he:
        h = math.nextafter(h, math.inf)
    r = certify_box(fam, m0, h, enclosure_only)
    r['lo'], r['hi'], r['m0'], r['h'] = lo, hi, m0, h
    return r


def _job(args):
    famname, lo, hi = args
    return certify_interval(families.get(famname), lo, hi)


def run(famname, mlo, mhi, n, min_width=1e-9, procs=4, out=None, log=True):
    import multiprocessing as mp
    edges = [float(x) for x in np.linspace(mlo, mhi, n + 1)]
    edges[0], edges[-1] = mlo, mhi
    todo = [(edges[i], edges[i + 1]) for i in range(n)]
    done = []
    with mp.Pool(procs) as pool:
        while todo:
            res = pool.map(_job, [(famname, a, b) for a, b in todo], chunksize=4)
            todo = []
            for r in res:
                a, b = r['lo'], r['hi']
                if r['status'] == 'REFUSED' and (b - a) / 2 >= min_width:
                    c = (a + b) / 2
                    todo += [(a, c), (c, b)]
                else:
                    done.append(r)
            if log:
                print('  pass: %d boxes done, %d to split' % (len(done), len(todo)), flush=True)
    done.sort(key=lambda r: r['lo'])
    if out:
        json.dump(dict(family=famname, m=[mlo, mhi], prec=ctx.prec, boxes=done), open(out, 'w'), indent=0)
    return done


if __name__ == '__main__':
    fam, a, b, n = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4])
    mw = float(sys.argv[5]) if len(sys.argv) > 5 else 1e-9
    out = sys.argv[6] if len(sys.argv) > 6 else None
    t0 = time.time()
    done = run(fam, a, b, n, mw, out=out)
    st = {}
    for r in done:
        st[r['status']] = st.get(r['status'], 0) + 1
    print(st, 'time %.0f s' % (time.time() - t0))
    for lo, hi, why in summarize(done):
        print('  refused [%.12f, %.12f] width %.2e: %s' % (lo, hi, hi - lo, '; '.join(sorted(why))))
