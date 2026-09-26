# Unit test of the degree-preserving swap sampler (cx.null_swap) against exact enumeration on small tables with
# structural zeros: the exact conditional distribution given row and column totals (and row x bin totals for N3) is
# P(N) ~ prod w_ij^N_ij / N_ij!. Also tests the multinomial pool null (cx.null_pool) against its exact expectation.
import itertools, numpy as np, sys
import cx

def enum_tables(pools, rowtot, coltot, J):
    """All nonnegative integer tables with the given margins and support."""
    G = len(pools); out = []
    def rec(g, cols_left, cur):
        if g == G:
            if all(c == 0 for c in cols_left): out.append([r[:] for r in cur])
            return
        P = pools[g]
        def rec2(i, left, row):
            if i == len(P) - 1:
                if left <= cols_left[P[i]]:
                    row2 = row + [left]; nr = [0] * J
                    for p, v in zip(P, row2): nr[p] = v
                    cl = cols_left[:]
                    for p, v in zip(P, row2): cl[p] -= v
                    cur.append(nr); rec(g + 1, cl, cur); cur.pop()
                return
            for v in range(0, min(left, cols_left[P[i]]) + 1):
                rec2(i + 1, left - v, row + [v])
        rec2(0, rowtot[g], [])
    rec(0, list(coltot), [])
    return out

def rho_of(row, S):
    c = np.array(row, float); nz = c > 0
    den = c.sum() ** 2 - (c ** 2).sum()
    if den <= 0: return np.nan
    return (c @ S @ c - (c ** 2 * np.diag(S)).sum()) / den

def make_ds(pools, Y, J, wlog, jbin):
    g, j, y, eta = [], [], [], []
    for gi, P in enumerate(pools):
        for p in P:
            g.append(gi); j.append(p); y.append(Y[gi][p]); eta.append(wlog[gi][p])
    G = len(pools)
    ds = dict(G=G, J=J, g=np.array(g), j=np.array(j), y=np.array(y), gpre=np.arange(G), gproj=np.zeros(G, int),
              jnode=np.arange(J), jbin=np.array(jbin))
    return ds, np.array(eta, float)

def check(pools, Y, J, wlog, jbin, S, bins, seed=1):
    G = len(pools)
    ds, eta = make_ds(pools, Y, J, wlog, jbin)
    rowtot = [sum(r) for r in Y]; coltot = [sum(Y[g][p] for g in range(G)) for p in range(J)]
    tabs = enum_tables(pools, rowtot, coltot, J)
    if bins:   # keep tables with the observed row x bin totals
        nb_ = max(jbin) + 1
        rb = lambda T: [[sum(T[g][p] for p in range(J) if jbin[p] == b) for b in range(nb_)] for g in range(G)]
        tabs = [T for T in tabs if rb(T) == rb(Y)]
    from math import lgamma
    lw = np.array([sum(T[g][p] * wlog[g][p] - lgamma(T[g][p] + 1) for g in range(G) for p in pools[g]) for T in tabs])
    pr = np.exp(lw - lw.max()); pr /= pr.sum()
    cp = cx.Copies(ds, np.ones(G, np.int64), np.ones(J, np.int64), kmin=2)
    exact = []
    for g in cp.elig:   # the sampler averages over draws where rho is defined (>= 2 distinct cells): condition on that
        r = np.array([rho_of(T[g], S) for T in tabs]); ok = np.isfinite(r)
        exact.append(np.sum(pr[ok] * r[ok]) / np.sum(pr[ok]))
    exact = np.array(exact)
    G3 = S[None].astype(np.float32)
    nbin = int(max(jbin) + 1) if bins else 1
    ptr, pc, go = cp.pool(True, nbin)
    cum = np.cumsum(cp.O_pc[pc].astype(float))
    Lw = cx.logw_dense(ds, eta)
    nd = int(sys.argv[1]) if len(sys.argv) > 1 else 40000
    nul, tr, st = cx.null_swap(seed, 200, nd, 2, cp.syn_g, cp.syn_p, cp.gc_orig, cp.pc_orig, cp.pc_bin, nbin, cp.O_pc,
                               ptr, pc, cum, Lw, cp.elig, cp.gsyn_ptr, cp.gsyn, cp.pc_node, G3, True)
    # Monte Carlo SE of each chain mean by batch means (50 batches)
    x = tr[:, :, 0]; se = np.array([np.nanstd(np.array([np.nanmean(b) for b in np.array_split(x[:, e], 50)]), ddof=1) / np.sqrt(50) for e in range(x.shape[1])])
    return len(tabs), exact.ravel(), nul.ravel(), st, se

rng = np.random.default_rng(5)
J = 6
pools = [[0, 1, 2, 3], [1, 2, 3, 4, 5], [0, 2, 4, 5], [0, 1, 3, 5]]
Y = [[1, 2, 0, 1, 0, 0], [0, 1, 1, 0, 2, 1], [1, 0, 1, 0, 1, 1], [1, 0, 0, 2, 0, 0]]
wlog = rng.normal(0, 1, (4, J)).tolist()
A = rng.normal(size=(J, 3)); A /= np.linalg.norm(A, axis=1, keepdims=True); S = A @ A.T
jbin = [0, 1, 0, 1, 0, 1]
ok = True
for bins in [False, True]:
    n, ex, mc, st, se = check(pools, Y, J, wlog, jbin, S, bins)
    z = (mc - ex) / se
    print(f'bins={bins}: {n} tables; exact E[rho] {np.round(ex, 4)}; swap chain {np.round(mc, 4)}; MC SE {np.round(se, 5)}; z {np.round(z, 2)}; proposals/valid/accepted {st}')
    ok &= bool(np.all(np.abs(z) < 4))   # the check's S6: tolerance from the chain's own Monte Carlo error, not a fixed 0.01
# multinomial pool null: exact E[rho] for multinomial(n, pi) by enumeration of compositions
ds, eta = make_ds(pools, Y, J, wlog, jbin)
cp = cx.Copies(ds, np.ones(4, np.int64), np.ones(J, np.int64), kmin=2)
ptr, pc, go = cp.pool(False, 1)
wv = np.exp(eta[cx._row_index(ds, go, cp.pc_orig[pc])]); cw = np.cumsum(wv)
mc = cx.null_pool(3, 200000, cp.elig, cp.gc_orig, cp.gsyn_ptr, ptr, pc, cw, cp.pc_node, S[None].astype(np.float32)).ravel()
from math import factorial
ex = []
for g in cp.elig:
    P = pools[g]; n = sum(Y[g]); w = np.exp(np.array([wlog[g][p] for p in P])); pi = w / w.sum(); tot = 0
    for comp in itertools.product(range(n + 1), repeat=len(P)):
        if sum(comp) != n: continue
        pm = factorial(n) * np.prod([pi[i] ** comp[i] / factorial(comp[i]) for i in range(len(P))])
        row = [0] * J
        for p, v in zip(P, comp): row[p] = v
        r = rho_of(row, S)
        if np.isfinite(r): tot += pm * r
    # rho undefined (one cell only) has positive probability; the sampler averages over defined draws
    ex.append(tot)
den = []
for g in cp.elig:
    P = pools[g]; n = sum(Y[g]); w = np.exp(np.array([wlog[g][p] for p in P])); pi = w / w.sum()
    den.append(1 - np.sum(pi ** n))
ex = np.array(ex) / np.array(den)
print('pool null: exact', np.round(ex, 4), 'sampler', np.round(mc, 4), 'max |diff|', np.max(np.abs(ex - mc)))
ok &= np.max(np.abs(ex - mc)) < 0.005
print('ALL OK' if ok else 'FAIL'); sys.exit(0 if ok else 1)
