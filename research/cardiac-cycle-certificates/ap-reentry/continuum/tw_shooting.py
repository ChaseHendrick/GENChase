"""Multiple-shooting form (PLAN.md section 4, system (4)) of a numerical travelling wave: nodes, floating-point
residual, Jacobian on the leaf and its conditioning. NUMERICAL, not a proof.

From a collocation solution (tw_bvp.py) it places nodes on the orbit: u_0 on Sigma_up (s = 0), u_{m_A} on Sigma_down
(s = T_A), and interior nodes every DELTA ms (time maps). Each segment is integrated in floating point (scipy Radau,
rtol RTOL) with its variational equation; the last segment of each piece ends on its section (event V = -40), and its
derivative is the Poincare-map derivative (I - F e_V^T / F_V) DPhi. On the leaf {H = H0} the K_i coordinate is
dropped (and V on the sections). Reports
  * the shooting residual |u_{i+1} - G_i(u_i)| (how well collocation and the integrator agree),
  * the expansion of each segment (|DG_i|, and the growth of the dominant direction),
  * the leading growth over the period: sum of log |DG_i v| along the dominant direction (the log of the expanding
    Floquet multiplier, approximately),
  * the condition of DF: smallest singular value, |DF^-1| (2-norm), which bound what a Krawczyk test must absorb.
Usage: python3 tw_shooting.py SOL.npz DELTA_MS OUT.json [--rtol 1e-10]
"""
import argparse, json, os, sys, time
import numpy as np
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402
import tw_bvp as B  # noqa: E402


def var_rhs(kappa, lo):
    def f(s, Y):
        y = Y[:20]
        Phi = Y[20:].reshape(20, 20)
        J = TM.jac(y, kappa, lo)
        return np.concatenate([TM.field(y, kappa, lo), (J @ Phi).ravel()])
    return f


def var_jac(kappa, lo):
    """Jacobian of (y, Phi) -> (f(y), J(y) Phi) for Radau's Newton iteration. Phi is row-major (entry (a, b) at
    20 a + b), so d(J Phi)_{ab} / d Phi_{cb} = J_{ac}. The term with the second derivative of f (d(J Phi)/dy) is
    omitted: an approximate iteration matrix changes the convergence of the Newton iteration, not the solution."""
    ar = np.arange(20)

    def jf(s, Y):
        J = TM.jac(Y[:20], kappa, lo)
        Jb = np.zeros((420, 420))
        Jb[:20, :20] = J
        for b in range(20):
            idx = 20 + 20 * ar + b
            Jb[np.ix_(idx, idx)] = J
        return Jb
    return jf


def segment(y0, kappa, lo, dur=None, section_dir=None, rtol=1e-10):
    """integrate y and Phi from y0; dur: fixed duration; or section_dir: stop at V = -40 crossing in that direction"""
    Y0 = np.concatenate([y0, np.eye(20).ravel()])
    atol = np.concatenate([1e-12 * TM.SIGMA, np.full(400, 1e-12)])
    kw = dict(method="Radau", rtol=rtol, atol=atol, jac=var_jac(kappa, lo))
    if dur is not None:
        sol = solve_ivp(var_rhs(kappa, lo), (0, dur), Y0, **kw)
        y, Phi, t = sol.y[:20, -1], sol.y[20:, -1].reshape(20, 20), dur
    else:
        ev = lambda s, Y: Y[0] + 40.0  # noqa: E731
        ev.terminal, ev.direction = True, section_dir
        sol = solve_ivp(var_rhs(kappa, lo), (0, 1000.0), Y0, events=ev, **kw)
        if not sol.t_events[0].size:
            raise RuntimeError("no section crossing")
        t = float(sol.t_events[0][0])
        Ye = sol.y_events[0][0]
        y, Phi = Ye[:20], Ye[20:].reshape(20, 20)
        F = TM.field(y, kappa, lo)
        Phi = (np.eye(20) - np.outer(F, np.eye(20)[0]) / F[0]) @ Phi  # Poincare-map derivative
    return y, Phi, t, sol.success


def leaf_coords(on_section):
    """kept coordinates of a node (physical indices): all but K_i (18), and on a section also all but V"""
    keep = [i for i in range(20) if i != TM.IK]
    if on_section:
        keep = [i for i in keep if i != TM.IV]
    return keep


def insert_matrix(y, kappa, on_section):
    """d(full y)/d(kept coords) on the leaf at y: K_i = H0 - (H - K_i) => dK/du_j = -dH/dy_j (dH/dK = 1)"""
    keep = leaf_coords(on_section)
    g = TM.H_grad(y, kappa)
    E = np.zeros((20, len(keep)))
    for j, i in enumerate(keep):
        E[i, j] = 1.0
        E[TM.IK, j] = -g[i] / g[TM.IK]
    return E


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sol"); ap.add_argument("delta", type=float); ap.add_argument("out")
    ap.add_argument("--rtol", type=float, default=1e-10)
    a = ap.parse_args()
    x, L, mesh, kappa, H0, beta = B.load(a.sol)
    S, Y = B.profile(x, L, mesh)
    TA, TB = x[L.iTA], x[L.iTB]
    T = TA + TB
    # node times: piece A at 0, delta, ..., last before T_A - delta/2; piece B from T_A likewise
    tA = list(np.arange(0.0, TA - 0.5 * a.delta, a.delta))
    tB = list(TA + np.arange(0.0, TB - 0.5 * a.delta, a.delta))
    times = tA + tB
    m = len(times)
    mA = len(tA)
    nodes = []
    for t in times:
        k = int(np.argmin(np.abs(S - t)))
        nodes.append(np.array([np.interp(t, S, Y[i]) for i in range(20)]))
    nodes[0][TM.IV] = -40.0
    nodes[mA][TM.IV] = -40.0
    for i in range(m):  # put every node on the leaf exactly (K_i from H0)
        nodes[i][TM.IK] += H0 - TM.H(nodes[i], kappa)
    blocks, res, growth, durs = [], [], [], []
    t0 = time.time()
    v = None
    for i in range(m):
        lo = i >= mA
        last = (i == mA - 1) or (i == m - 1)
        if last:
            y, Phi, t, ok = segment(nodes[i], kappa, lo, section_dir=(-1 if i == mA - 1 else 1), rtol=a.rtol)
        else:
            y, Phi, t, ok = segment(nodes[i], kappa, lo, dur=times[i + 1] - times[i], rtol=a.rtol)
        j = (i + 1) % m
        on_i = i in (0, mA)
        on_j = j in (0, mA)
        E = insert_matrix(nodes[i], kappa, on_i)
        Pk = leaf_coords(on_j)
        DG = Phi[Pk, :] @ E
        blocks.append(DG)
        r = (nodes[j] - y) / TM.SIGMA
        res.append(float(np.max(np.abs(r[Pk]))))
        nrm = np.linalg.norm(DG, 2)
        durs.append(t)
        # dominant direction growth (power iteration along the chain, physical scaled by SIGMA)
        Ds = (DG / TM.SIGMA[Pk][:, None]) * TM.SIGMA[leaf_coords(on_i)][None, :]
        if v is None:
            v = np.ones(Ds.shape[1]) / np.sqrt(Ds.shape[1])
        if len(v) != Ds.shape[1]:
            v = np.resize(v, Ds.shape[1]); v /= np.linalg.norm(v)
        w = Ds @ v
        gw = float(np.linalg.norm(w))
        v = w / gw
        growth.append(dict(segment=i, duration_ms=round(float(t), 6), piece="B" if lo else "A", norm2_scaled=float(np.linalg.norm(Ds, 2)),
                           dominant_growth=gw, residual_scaled=res[-1], ok=bool(ok)))
    # assemble DF (scaled coordinates)
    dims = [len(leaf_coords(i in (0, mA))) for i in range(m)]
    offs = np.concatenate([[0], np.cumsum(dims)])
    n = int(offs[-1])
    DF = np.zeros((n, n))
    for i in range(m):
        j = (i + 1) % m
        si = TM.SIGMA[leaf_coords(i in (0, mA))]
        sj = TM.SIGMA[leaf_coords(j in (0, mA))]
        DF[offs[j]:offs[j + 1], offs[j]:offs[j + 1]] += np.eye(dims[j])
        DF[offs[j]:offs[j + 1], offs[i]:offs[i + 1]] -= (blocks[i] / sj[:, None]) * si[None, :]
    sv = np.linalg.svd(DF, compute_uv=False)
    out = dict(note="multiple-shooting system (4) at the numerical wave; floating point, not a proof", solution=os.path.basename(a.sol),
               kappa=kappa, T_ms=T, delta_ms=a.delta, segments=m, segments_A=mA, unknowns=n, rtol=a.rtol,
               shooting_residual_max_scaled=max(res), section_times_ms=[durs[mA - 1], durs[m - 1]],
               log_dominant_growth_per_period=float(np.sum(np.log([g["dominant_growth"] for g in growth]))),
               max_segment_norm2_scaled=max(g["norm2_scaled"] for g in growth),
               DF_sigma_max=float(sv[0]), DF_sigma_min=float(sv[-1]), DF_cond2=float(sv[0] / sv[-1]),
               DF_inverse_norm2=float(1 / sv[-1]), smallest_singular_values=[float(v) for v in sv[-6:]],
               secs=round(time.time() - t0, 1), segments_detail=growth)
    json.dump(out, open(a.out, "w"), indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "segments_detail"}, indent=1))


if __name__ == "__main__":
    main()
