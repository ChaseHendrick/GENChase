"""Rigorous (ball arithmetic, python-flint/Arb) certification of Arnold's conditions on a
parameter interval, for one relative equilibrium family of four point vortices.

For a parameter box [m] the program
 1. encloses the reduced equilibrium v*(m) for every m in [m] by the Krawczyk operator
    (existence and uniqueness in the box X),
 2. encloses the Taylor coefficients of the reduced Hamiltonian at v*(m) up to order 4,
 3. runs the fourth-order Birkhoff normal form in ball arithmetic (bnf.py) and certifies:
    linear stability with distinct frequencies, indefinite H2 (s1 != s2), no resonance of
    order <= 4, and Arnold's determinant D != 0.
Any failure raises/records a refusal; a box is only reported CERTIFIED if every inequality
was decided by the balls.

usage: python3 certify.py FAMILY m_lo m_hi n_boxes [min_width]
"""
import sys, json, time
import numpy as np
from flint import arb, ctx
from tps import Space, Ring
from vortex import F_and_DF, Hred_tps
from bnf import normal_form, Refused
import families

ctx.prec = 128
RA = Ring('arb')
RF = Ring('float')
SP4 = Space(4, 4)
SP5 = Space(5, 2)


def float_newton(G, v, it=50):
    v = np.array(v, float)
    for _ in range(it):
        F, DF, _ = F_and_DF(G, list(v), RF, SP5)
        d = np.linalg.solve(np.array(DF), -np.array(F))
        v = v + d
        if np.linalg.norm(d) < 1e-15 * (1 + np.linalg.norm(v)):
            break
    return v


def krawczyk(Gb, vmid, rho, free=(0, 1, 2, 3)):
    """Gb: circulations as arb (may be intervals).  Encloses a zero of F(v) = 0.

    Components not in `free` are fixed at exactly 0.  This is used for collinear families
    (free = (0, 2)): the reflection y -> -y leaves Ht invariant (the Jacobi map has real
    coefficients), so the y-components of F are odd in y and vanish identically at y = 0;
    a zero of the x-components with y = 0 is therefore a zero of F.
    Returns the full box (list of 4 arb) or raises Refused."""
    n = len(free)
    x0 = [arb(float(vmid[i])) if i in free else arb(0) for i in range(4)]
    F0, _, _ = F_and_DF(Gb, x0, RA, SP5)
    Gm = tuple(arb(g.mid()) for g in Gb)
    _, DFm, _ = F_and_DF(Gm, x0, RA, SP5)
    A = np.array([[float(DFm[i][j].mid()) for j in free] for i in free])
    Y = np.linalg.inv(A)
    rho = [max(rho[i] for i in free)] * n
    for _ in range(8):
        X = list(x0)
        for a, i in enumerate(free):
            X[i] = x0[i] + arb(0, rho[a])
        _, DFX, _ = F_and_DF(Gb, X, RA, SP5)
        K = []
        for a, i in enumerate(free):
            s = x0[i]
            for b, j in enumerate(free):
                s = s - arb(Y[a, b]) * F0[j]
            for b, j in enumerate(free):
                cij = (arb(1) if a == b else arb(0)) - sum((arb(Y[a, c]) * DFX[k][j] for c, k in enumerate(free)), arb(0))
                s = s + cij * (X[j] - x0[j])
            K.append(s)
        if all(K[a].lower() > X[i].lower() and K[a].upper() < X[i].upper() for a, i in enumerate(free)):
            out = list(x0)
            for a, i in enumerate(free):
                out[i] = K[a]
            return out
        rho = [2 * max(float(abs(K[a] - x0[i]).upper()), rho[a]) for a, i in enumerate(free)]
    raise Refused('Krawczyk failed', {})


def certify_box(fam, mlo, mhi):
    t0 = time.time()
    mb = arb.union(arb(mlo), arb(mhi))
    Gb = fam.G(mb)
    mmid = (mlo + mhi) / 2
    vmid = float_newton(fam.G(mmid), fam.guess(mmid))
    rec = dict(m=[mlo, mhi])
    try:
        # radius guess: sensitivity times half-width plus slack
        v2 = float_newton(fam.G(mhi), vmid)
        rho = [abs(a - b) * 1.5 + 1e-12 * (1 + abs(a)) for a, b in zip(v2, vmid)]
        X = krawczyk(Gb, vmid, rho, getattr(fam, 'free', (0, 1, 2, 3)))
        H, mu = Hred_tps(Gb, X, SP4, RA)
        # the gradient must enclose 0 (consistency of the two formulations)
        for d in H.part(1).values():
            if not d.contains(0):
                raise Refused('gradient does not enclose 0: inconsistency', {})
        info = normal_form(H.part(2), H.part(3), H.part(4), kind='arb')
        rec.update(w1=str(info['w'][0]), w2=str(info['w'][1]), signs=info['signs'],
                   A=str(info['A'].real), B=str(info['B'].real), C=str(info['C'].real), D=str(info['D']),
                   ratio=str(info['w'][0] / info['w'][1]))
        if info['signs'][0] == info['signs'][1]:
            rec['status'] = 'DEFINITE'   # stable by Dirichlet, Arnold not needed
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


def run(famname, mlo, mhi, n, min_width=1e-10, procs=4, out=None):
    import multiprocessing as mp
    fam = families.get(famname)
    edges = list(np.linspace(mlo, mhi, n + 1))
    todo = [(edges[i], edges[i + 1]) for i in range(n)]
    done = []
    with mp.Pool(procs) as pool:
        while todo:
            res = pool.starmap(certify_box, [(fam, a, b) for a, b in todo])
            todo = []
            for r in res:
                a, b = r['m']
                if r['status'] == 'REFUSED' and (b - a) / 2 >= min_width:
                    c = (a + b) / 2
                    todo += [(a, c), (c, b)]
                else:
                    done.append(r)
            print('  pass: %d done, %d to split' % (len(done), len(todo)), flush=True)
    done.sort(key=lambda r: r['m'][0])
    if out:
        json.dump(dict(family=famname, m=[mlo, mhi], prec=ctx.prec, boxes=done), open(out, 'w'), indent=0)
    return done


def summarize(done):
    bad = [r for r in done if r['status'] == 'REFUSED']
    # merge adjacent refused boxes
    merged = []
    for r in bad:
        if merged and abs(merged[-1][1] - r['m'][0]) < 1e-15:
            merged[-1][1] = r['m'][1]
            merged[-1][2].add(r['reason'][:60])
        else:
            merged.append([r['m'][0], r['m'][1], {r['reason'][:60]}])
    return merged


if __name__ == '__main__':
    fam, a, b, n = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4])
    mw = float(sys.argv[5]) if len(sys.argv) > 5 else 1e-10
    out = sys.argv[6] if len(sys.argv) > 6 else None
    done = run(fam, a, b, n, mw, out=out)
    st = {}
    for r in done:
        st[r['status']] = st.get(r['status'], 0) + 1
    print(st)
    for lo, hi, why in summarize(done):
        print('  refused [%.12f, %.12f] width %.2e: %s' % (lo, hi, hi - lo, '; '.join(sorted(why))))
