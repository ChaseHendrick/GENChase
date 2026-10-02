"""Initial guess for the travelling-wave collocation (tw_bvp.py init) from a cable simulation. NUMERICAL, not a proof.

Runs the first-order Rush-Larsen ring simulator (../ring_rl.c; same equations as tp06_19d.py) on a ring of length L
with spacing h (coupling D/h^2, D = 0.154 mm^2/ms), from the rotating-wave initial state of a recorded waveform
(../waveform.py), and turns the final spatial snapshot into a time profile: for a wave u(x, t) = phi(t - x/c),
phi(t_end - x_j/c) = u_j. W = phi_V' = V_t is taken from the discrete cable right-hand side. The profile is rotated to
start at the upstroke crossing V = -40 and saved as s, y (20 x n) for tw_bvp.py.

Usage: python3 pde_guess.py WAVEFORM.npz L_mm h_mm dt t_end OUT.npz [RING_RL_BINARY]
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AP = os.path.dirname(HERE)
sys.path.insert(0, AP)
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402
from waveform import initial_state  # noqa: E402


def main():
    wfp, Lmm, h, dt, t_end, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
    binary = sys.argv[7] if len(sys.argv) > 7 else os.path.join(os.path.dirname(out), "ring_rl")
    if not os.path.exists(binary):
        subprocess.run(["gcc", "-O2", "-o", binary, os.path.join(AP, "ring_rl.c"), "-lm"], check=True)
    wf = np.load(wfp)
    N = int(round(Lmm / h))
    ccoup = TM.D_MM2_PER_MS / h ** 2
    y0 = initial_state(wf["wt"], wf["wy"], float(wf["T"]), N)
    base = out[:-4]
    fi, fo, fa = base + "_in.bin", base + "_out.bin", base + "_acts.txt"
    np.asarray(y0, float).tofile(fi)
    r = subprocess.run([binary, str(N), repr(ccoup), repr(dt), repr(t_end), "0.185", fi, fo, fa], capture_output=True, text=True, check=True)
    acts = np.loadtxt(fa, ndmin=2)
    Y = np.fromfile(fo).reshape(19, N)
    a0 = acts[acts[:, 1] == 0, 0]
    per = np.diff(a0)
    T = float(per[-1])
    c = Lmm / T
    V = Y[0]
    lap = np.roll(V, -1) - 2 * V + np.roll(V, 1)
    fV = TM.M.field(Y, TM.P, lo=V < -40)[0]
    W = ccoup * lap + fV
    y = np.vstack([Y, W[None]])                       # (20, N), cell j at x_j = j h
    s = -np.arange(N) * h / c                         # s_j = t_end - x_j / c (t_end -> 0)
    o = np.argsort(s)
    s, y = s[o], y[:, o]
    Tp = Lmm / c
    s2 = np.concatenate([s, s + Tp]); y2 = np.concatenate([y, y], axis=1)
    Vv = y2[0]
    up = np.nonzero((Vv[:-1] < -40) & (Vv[1:] >= -40))[0]
    k = up[0]
    t = (-40 - Vv[k]) / (Vv[k + 1] - Vv[k])
    s_up = s2[k] + t * (s2[k + 1] - s2[k])
    y_up = y2[:, k] + t * (y2[:, k + 1] - y2[:, k])
    sel = (s2 > s_up) & (s2 < s_up + Tp)
    S = np.concatenate([[s_up], s2[sel], [s_up + Tp]]) - s_up
    Yp = np.concatenate([y_up[:, None], y2[:, sel], y_up[:, None]], axis=1)
    info = dict(L_mm=Lmm, h_mm=h, N=N, coupling_per_ms=ccoup, dt=dt, t_end=t_end, rotations=int(len(per)),
                periods_tail=[round(float(v), 3) for v in per[-6:]], c_mm_per_ms=c, kappa_per_ms=c * c / TM.D_MM2_PER_MS,
                died="died 1" in r.stdout, H_mean=float(np.mean(TM.H(y, c * c / TM.D_MM2_PER_MS))),
                Na_i_mean=float(Y[17].mean()), K_i_mean=float(Y[18].mean()), Vmax=float(V.max()))
    np.savez(out, s=S, y=Yp, info=json.dumps(info))
    for f in (fi, fo):
        os.remove(f)
    print(json.dumps(info))


if __name__ == "__main__":
    main()
