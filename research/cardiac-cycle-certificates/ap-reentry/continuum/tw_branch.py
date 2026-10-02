"""Summaries of the numerical travelling-wave branch (tw_bvp.py cont output). NUMERICAL, floating point; not a proof.

  python3 tw_branch.py profile SOL.npz              # crossings of -40 and 15 mV, W there, window time, stiffness
  python3 tw_branch.py table OUT.json DIR [DIR ...]  # merge branch.jsonl rows, sort by kappa, locate the minimum of T
                                                     # and of L = sqrt(D kappa) T by quadratic fits through the
                                                     # three nearest rows; writes OUT.json
The ring condition is L = c T with c = sqrt(D kappa), D = 0.154 mm^2/ms (tw_model.D_MM2_PER_MS).
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402
import tw_bvp as B  # noqa: E402


def crossings(S, v, level):
    out = []
    for k in np.nonzero((v[:-1] - level) * (v[1:] - level) < 0)[0]:
        t = (level - v[k]) / (v[k + 1] - v[k])
        out.append((float(S[k] + t * (S[k + 1] - S[k])), k, t))
    return out


def profile_summary(path):
    x, L, mesh, kappa, H0, beta = B.load(path)
    S, Y = B.profile(x, L, mesh)
    TA, TB = x[L.iTA], x[L.iTB]
    V, W = Y[TM.IV], Y[TM.IW]
    res = dict(file=os.path.basename(path), kappa=kappa, c_mm_per_ms=TM.c_of(kappa), T_ms=TA + TB, L_mm=TM.c_of(kappa) * (TA + TB),
               T_A_ms=TA, T_B_ms=TB, H0=H0, H_spread=float(np.ptp(TM.H(Y, kappa))))
    iA = int(np.argmin(np.abs(S - TA)))
    res["sections_-40"] = dict(up=dict(s_ms=0.0, W=float(W[0])), down=dict(s_ms=float(S[iA]), W=float(W[iA])),
                               note="the two -40 mV crossings are the piece boundaries s = 0 and s = T_A")
    for lev in (-40.0, 15.0):
        cr = crossings(S, V, lev)
        res["interior_crossings_%g" % lev] = [dict(s_ms=round(s, 4), W=float(W[k] + t * (W[k + 1] - W[k]))) for s, k, t in cr]
    dS = np.diff(S)
    mid = 0.5 * (V[1:] + V[:-1])
    for th in (1.0, 8.0):
        res["time_within_%g_mV_of_15_ms" % th] = float(np.sum(dS[np.abs(mid - 15.0) < th]))
    res["Vmax"] = float(V.max()); res["Vmin"] = float(V.min()); res["Wmax"] = float(W.max()); res["Wmin"] = float(W.min())
    # stiffness and the expanding rate along the orbit (eigenvalues of the 20 x 20 Jacobian at 400 samples)
    idx = np.linspace(0, len(S) - 1, 400).astype(int)
    lo = S[idx] > TA
    lam_min, lam_max_re = [], []
    for i, l in zip(idx, lo):
        J = TM.jac(Y[:, i], kappa, bool(l))
        ev = np.linalg.eigvals(J)
        lam_min.append(float(np.min(ev.real)))
        lam_max_re.append(float(np.max(ev.real)))
    res["stiffness_max_abs_negative_eig_per_ms"] = [float(np.min(-np.array(lam_min))), float(np.max(-np.array(lam_min)))]
    res["largest_real_eig_per_ms_range"] = [float(np.min(lam_max_re)), float(np.max(lam_max_re))]
    res["largest_real_eig_mean_per_ms"] = float(np.mean(lam_max_re))
    # approximate log of the expanding Floquet multiplier: integral of the largest real eigenvalue (frozen-coefficient
    # estimate, a rough guide only)
    sl = S[idx]
    res["frozen_estimate_log_expansion_per_period"] = float(np.trapezoid(lam_max_re, sl))
    return res


def table(out, dirs):
    rows = {}
    for d in dirs:
        p = os.path.join(d, "branch.jsonl")
        if not os.path.exists(p):
            continue
        for ln in open(p):
            r = json.loads(ln)
            rows[round(r["kappa"], 9)] = r
    ks = sorted(rows)
    R = [rows[k] for k in ks]
    K = np.array([r["kappa"] for r in R]); T = np.array([r["T_ms"] for r in R]); Lm = np.array([r["L_mm"] for r in R])
    res = dict(note="numerical travelling-wave branch (collocation, floating point); not a proof", D_mm2_per_ms=TM.D_MM2_PER_MS,
               rows=[dict(kappa=r["kappa"], c_mm_per_ms=r["c_mm_per_ms"], T_ms=r["T_ms"], L_mm=r["L_mm"], T_A_ms=r["T_A_ms"],
                          T_B_ms=r["T_B_ms"], Vmax=r["Vmax"], Na_i_mean=r["Na_i_mean"], K_i_mean=r["K_i_mean"], MA=r["MA"], MB=r["MB"],
                          residual_max=r["residual_max"]) for r in R])

    def vertex(y):
        i = int(np.argmin(y))
        if i == 0 or i == len(y) - 1:
            return dict(at_end_of_range=True, kappa=float(K[i]), value=float(y[i]))
        a, b, c = np.polyfit(K[i - 1:i + 2], y[i - 1:i + 2], 2)
        kv = -b / (2 * a)
        return dict(at_end_of_range=False, kappa=float(kv), value=float(np.polyval([a, b, c], kv)), c_mm_per_ms=TM.c_of(kv),
                    nearest_rows=[float(v) for v in K[i - 1:i + 2]])
    res["minimum_T"] = vertex(T)
    res["minimum_L"] = vertex(Lm)
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "rows"}, indent=1))


if __name__ == "__main__":
    if sys.argv[1] == "profile":
        print(json.dumps(profile_summary(sys.argv[2]), indent=1))
    elif sys.argv[1] == "table":
        table(sys.argv[2], sys.argv[3:])
