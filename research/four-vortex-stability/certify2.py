"""Rigorous certification of Arnold's conditions on parameter boxes [m0 - h, m0 + h], using
first-order centred forms in t = m - m0 (cf.py) and a parametric Krawczyk operator.

For one box:
 1. Thin solve at m0: ordinary Krawczyk at the point m0 gives a tight ball v0 (existence
    only needed for the value at t = 0).
 2. Parametric Krawczyk.  Predictor p(t) = mid(v0) + v1 t, preconditioner Y(t) = Y0 + Y1 t
    (floating-point approximations; any choice is allowed).  With N(t) = -Y(t) F(p(t), t) and
    C(t, w) = I - Y(t) DF(p(t) + w, t), if best(N) + best(C) W is inside int W, then for
    every t in T there is exactly one zero v*(t) of F in p(t) + W (Krawczyk's theorem applied
    for each fixed t).
 3. Derivative enclosure: v*'(t) = -DF^{-1} F_m.  If -best(Y F_m) + best(C) P is inside int P
    then v*'(t) is in P for all t (the same Krawczyk argument for a linear equation).
 4. The reduced Hamiltonian's Taylor coefficients at v*(t) up to order 4 as CF numbers
    (c: at t = 0 from the thin ball; v: over the box; d: derivative over the box), then the
    Birkhoff normal form in CF arithmetic (bnf.py), certifying every sign condition on
    best() enclosures.

usage: python3 certify2.py FAMILY m_lo m_hi n_boxes [min_width] [out.json]
"""
import sys, json, time
import numpy as np
from flint import arb, acb, ctx
from tps import Space, Ring, TPS
from vortex import F_and_DF, Hred_tps
from bnf import normal_form, Refused
from cf import CF
import families

ctx.prec = 160
RA = Ring('arb')
RC = Ring('cf')
RF = Ring('float')
SP4 = Space(4, 4)
SP5 = Space(5, 2)


def float_newton(G, v, it=60):
    v = np.array(v, float)
    for _ in range(it):
        F, DF, _ = F_and_DF(G, list(v), RF, SP5)
        d = np.linalg.solve(np.array(DF), -np.array(F))
        v = v + d
        if np.linalg.norm(d) < 1e-15 * (1 + np.linalg.norm(v)):
            break
    return v


def thin_krawczyk(G, vmid, free):
    """Point parameter: tight enclosure of the zero near vmid (free components only)."""
    x0 = [arb(float(vmid[i])) if i in free else arb(0) for i in range(4)]
    F0, DF0, _ = F_and_DF(G, x0, RA, SP5)
    A = np.array([[float(DF0[i][j].mid()) for j in free] for i in free])
    Y = np.linalg.inv(A)
    # Newton refinement in high precision (non-rigorous step, only improves the centre)
    for _ in range(3):
        F0, DF0, _ = F_and_DF(G, x0, RA, SP5)
        for a, i in enumerate(free):
            x0[i] = arb((x0[i] - sum((arb(Y[a, b]) * F0[j] for b, j in enumerate(free)), arb(0))).mid())
    F0, _, _ = F_and_DF(G, x0, RA, SP5)
    rho = max(float(abs(sum((arb(Y[a, b]) * F0[j] for b, j in enumerate(free)), arb(0))).upper()) for a in range(len(free)))
    rho = max(4 * rho, 1e-40)
    for _ in range(10):
        X = list(x0)
        for i in free:
            X[i] = x0[i] + arb(0, rho)
        _, DFX, _ = F_and_DF(G, X, RA, SP5)
        ok = True
        K = list(x0)
        for a, i in enumerate(free):
            s = x0[i] - sum((arb(Y[a, b]) * F0[j] for b, j in enumerate(free)), arb(0))
            for b, j in enumerate(free):
                cij = (arb(1) if a == b else arb(0)) - sum((arb(Y[a, c]) * DFX[k][j] for c, k in enumerate(free)), arb(0))
                s = s + cij * (X[j] - x0[j])
            K[i] = s
            ok = ok and K[i].lower() > X[i].lower() and K[i].upper() < X[i].upper()
        if ok:
            return K
        rho *= 4
    raise Refused('thin Krawczyk failed', {})


def cfv(c, v, d):
    return CF(c, v, d)


def matvec_cf(Y, vec):
    return [sum((Y[a][b] * vec[b] for b in range(len(vec))), CF.const(arb(0))) for a in range(len(Y))]


def certify_box(fam, m0, h):
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
        # 4. equilibrium as CF numbers, Taylor expansion, normal form
        vstar = []
        for i in range(4):
            if i in free:
                a = free.index(i)
                vstar.append(CF(v0[i], pc[i].v + W, P[a]))
            else:
                vstar.append(CF.const(arb(0)))
        # exact symplectic preconditioner L (floats + symplectic Gram-Schmidt in arb)
        Hf, _ = Hred_tps(fam.G(m0), [float(x) for x in vm], Space(4, 2), RF)
        from bnf import float_diagonaliser, symplectic_gram_schmidt
        pre = float_diagonaliser(Hf.part(2))
        cols = symplectic_gram_schmidt([[arb(float(x)) for x in col] for col in pre], arb(1))
        L = [[cols[j][i] for j in range(4)] for i in range(4)]
        H, mu = Hred_tps(Gcf, vstar, SP4, RC, L=L)
        for d in H.part(1).values():
            if not d.contains(0):
                raise Refused('gradient does not enclose 0: inconsistency', {})
        info = normal_form(H.part(2), H.part(3), H.part(4), kind='cf')
        b = lambda x: x.best()
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


def _job(args):
    famname, m0, h = args
    return certify_box(families.get(famname), m0, h)


def run(famname, mlo, mhi, n, min_width=1e-9, procs=4, out=None, log=True):
    import multiprocessing as mp
    edges = list(np.linspace(mlo, mhi, n + 1))
    todo = [((edges[i] + edges[i + 1]) / 2, (edges[i + 1] - edges[i]) / 2) for i in range(n)]
    done = []
    with mp.Pool(procs) as pool:
        while todo:
            res = pool.map(_job, [(famname, m0, h) for m0, h in todo], chunksize=4)
            todo = []
            for r in res:
                a, b = r['m']
                if r['status'] == 'REFUSED' and (b - a) / 2 >= min_width:
                    h = (b - a) / 4
                    todo += [(a + h, h), (b - h, h)]
                else:
                    done.append(r)
            if log:
                print('  pass: %d boxes done, %d to split' % (len(done), len(todo)), flush=True)
    done.sort(key=lambda r: r['m'][0])
    if out:
        json.dump(dict(family=famname, m=[mlo, mhi], prec=ctx.prec, boxes=done), open(out, 'w'), indent=0)
    return done


def summarize(done):
    bad = [r for r in done if r['status'] == 'REFUSED']
    merged = []
    for r in bad:
        if merged and abs(merged[-1][1] - r['m'][0]) < 1e-12:
            merged[-1][1] = r['m'][1]
            merged[-1][2].add(r['reason'][:70])
        else:
            merged.append([r['m'][0], r['m'][1], {r['reason'][:70]}])
    return merged


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
