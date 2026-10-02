"""Eigenvalues of the ring linearization at a numerical travelling wave (PLAN.md section 10). NUMERICAL, not a proof.

Problem (6) of PLAN.md: in the wave time s, v' = J(s) v + lambda B v on [0, T], periodic, with the saltation jumps
S = I + (F_+ - F_-) e_V^T / W at the two -40 mV crossings (s = T_A downward, s = T = 0 upward); B = -I on the 18 gate and
concentration rows, B[W, V] = kappa, B[V, .] = 0. It is discretized with the collocation of tw_bvp.py on the wave's own
mesh (Radau IIA, 3 stages; the jumps sit at the piece boundaries, which are mesh nodes), giving a sparse generalized
eigenproblem A0 x = lambda M x. Eigenvalues near a shift sigma come from shift-and-invert Arnoldi
((A0 - sigma M)^{-1} M). lambda = 0 (translation, phi') is a built-in check. Scaled variables z = y / SIGMA.

Usage: python3 tw_spectrum.py SOL.npz OUT.json [--shifts 0.05,0.05+0.1j,...] [--k 30]
"""
import argparse, json, os, sys, time
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402
import tw_bvp as B  # noqa: E402

SIG = TM.SIGMA


def bmatrix(kappa):
    Bm = np.zeros((20, 20))
    for i in range(1, 19):
        Bm[i, i] = -1.0
    Bm[TM.IW, TM.IV] = kappa
    return Bm / SIG[:, None] * SIG[None, :]          # scaled


def saltation(y, kappa, minus_lo):
    """S = I + (F_+ - F_-) e_V^T / W at a crossing state y (physical); minus_lo: the field before the crossing is the
    V < -40 one (upward crossing). Returned in scaled variables."""
    Fm = TM.field(y, kappa, minus_lo)
    Fp = TM.field(y, kappa, not minus_lo)
    S = np.eye(20) + np.outer(Fp - Fm, np.eye(20)[TM.IV]) / y[TM.IW]
    return S / SIG[:, None] * SIG[None, :]


def assemble(x, L, mesh, kappa):
    TA, TB = x[L.iTA], x[L.iTB]
    Tp = {"A": TA, "B": TB}
    Bz = bmatrix(kappa)
    n = L.iTA                                          # state unknowns only (no T_A, T_B, mu)
    r0, c0, v0, r1, c1, v1 = [], [], [], [], [], []
    for p in ("A", "B"):
        m = L.M[p]
        h = np.diff(mesh[p])
        Y = L.stages(x, p)
        J = B.jz(Y.reshape(20, -1), kappa, B.LO[p]).reshape(20, 20, m, 3)
        jj = np.arange(m)
        rb = L.roff[p]
        for i in range(3):
            rI = rb + 60 * jj[:, None] + 20 * i + np.arange(20)[None, :]
            cI = L.node_idx(p, jj)
            r0.append(rI.ravel()); c0.append(cI.ravel()); v0.append(-np.ones(rI.size))
            for k in range(3):
                cK = L.stage_idx(p, jj, k) if k < 2 else L.node_idx(p, jj + 1)
                blk = -(h * Tp[p])[:, None, None] * B.RA[i, k] * J[:, :, :, k].transpose(2, 0, 1)
                if i == k:
                    blk = blk + np.eye(20)[None]
                rr = np.repeat(rI, 20, axis=1).ravel()
                cc = np.broadcast_to(cK[:, None, :], (m, 20, 20)).ravel()
                r0.append(rr); c0.append(cc); v0.append(blk.ravel())
                # lambda term: E contains - h T a_ik lambda B V_k, so A0 x = lambda M x with M = + h T a_ik B
                bb = np.broadcast_to((h * Tp[p])[:, None, None] * B.RA[i, k] * Bz[None], (m, 20, 20))
                r1.append(rr); c1.append(cc); v1.append(bb.ravel())
    # continuity with saltation: v_B(0) - S_down v_A(end) = 0, v_A(0) - S_up v_B(end) = 0
    nA, nB = L.nodes(x, "A") * SIG[:, None], L.nodes(x, "B") * SIG[:, None]
    Sd = saltation(nA[:, -1], kappa, minus_lo=False)
    Su = saltation(nB[:, -1], kappa, minus_lo=True)
    rc = L.rcont
    a = np.arange(20)
    for (r, pin, jin, pout, jout, S) in ((rc, "B", 0, "A", L.M["A"], Sd), (rc + 20, "A", 0, "B", L.M["B"], Su)):
        r0.append(r + a); c0.append(L.node_idx(pin, jin).ravel()); v0.append(np.ones(20))
        cc = L.node_idx(pout, jout).ravel()
        r0.append(np.repeat(r + a, 20)); c0.append(np.tile(cc, 20)); v0.append(-S.ravel())
    A0 = sp.csc_matrix((np.concatenate(v0), (np.concatenate(r0), np.concatenate(c0))), shape=(n, n))
    M = sp.csc_matrix((np.concatenate(v1), (np.concatenate(r1), np.concatenate(c1))), shape=(n, n))
    return A0, M


def translation_check(x, L, mesh, kappa, A0):
    """A0 applied to phi' (the field along the collocation unknowns, with the jump of phi' at the sections built in)"""
    v = np.zeros(A0.shape[0])
    for p in ("A", "B"):
        nd = L.nodes(x, p)
        st = L.stages(x, p)
        Fn = B.fz(nd, kappa, B.LO[p], 0.0)
        v[L.off[p]:L.off[p] + 20 * (L.M[p] + 1)] = Fn.T.ravel()
        for i in range(2):
            Fs = B.fz(st[:, :, i], kappa, B.LO[p], 0.0)
            v[L.stage_idx(p, np.arange(L.M[p]), i)] = Fs.T
    r = A0 @ v
    return float(np.max(np.abs(r)) / np.max(np.abs(v)))


def eig_near(A0, M, sigma, k):
    K = (A0 - sigma * M).tocsc()
    if np.iscomplexobj(sigma) or isinstance(sigma, complex):
        K = K.astype(complex)
    lu = spla.splu(K)
    dt = complex if K.dtype == complex else float
    op = spla.LinearOperator(A0.shape, matvec=lambda z: lu.solve(np.asarray(M @ z, dtype=dt)), dtype=dt)
    nu = spla.eigs(op, k=k, which="LM", return_eigenvectors=False, maxiter=5000, tol=1e-10)
    lam = sigma + 1.0 / nu
    return lam


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sol"); ap.add_argument("out")
    ap.add_argument("--shifts", default="0.02")
    ap.add_argument("--k", type=int, default=30)
    a = ap.parse_args()
    x, L, mesh, kappa, H0, beta = B.load(a.sol)
    t0 = time.time()
    A0, M = assemble(x, L, mesh, kappa)
    tc = translation_check(x, L, mesh, kappa, A0)
    res = dict(note="eigenvalues of the discretized ring linearization at a numerical wave; floating point, not a proof",
               solution=os.path.basename(a.sol), kappa=kappa, T_ms=float(x[L.iTA] + x[L.iTB]),
               L_mm=float(TM.c_of(kappa) * (x[L.iTA] + x[L.iTB])), MA=L.M["A"], MB=L.M["B"], translation_residual_rel=tc, shifts=[])
    allv = []
    for sstr in a.shifts.split(","):
        sig = complex(sstr.replace("i", "j"))
        sig = sig.real if sig.imag == 0 else sig
        lam = eig_near(A0, M, sig, a.k)
        lam = lam[np.argsort(-lam.real)]
        res["shifts"].append(dict(sigma=str(sig), eigenvalues=[[float(l.real), float(l.imag)] for l in lam]))
        allv.extend(lam)
        print("sigma", sig, "rightmost", [complex(round(l.real, 7), round(l.imag, 5)) for l in lam[:6]], flush=True)
    allv = np.array(allv)
    nz = allv[np.abs(allv) > 1e-6]
    res["max_real_part_found"] = float(np.max(allv.real))
    res["max_real_part_excluding_near_zero"] = float(np.max(nz.real)) if nz.size else None
    res["near_zero"] = [[float(l.real), float(l.imag)] for l in allv[np.abs(allv) <= 1e-6]]
    res["secs"] = round(time.time() - t0, 1)
    json.dump(res, open(a.out, "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "shifts"}, indent=1))


if __name__ == "__main__":
    main()
