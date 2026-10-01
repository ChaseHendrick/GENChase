"""Record one rotation of cell 0 of a circulating ring state (results/ring_N{N}_c{c}.json) as a waveform, and build
rotating-wave initial states for other ring sizes by sampling that waveform at phases j/N' (cell j lags cell 0 by
j T/N', as in a rotating wave travelling 0 -> 1 -> 2 ...).
Usage: python3 waveform.py N c [state.json | state.npy] [out.npz]   (default out results/waveform_N{N}_c{c}.npz)"""
import sys, json
import numpy as np
import tp06_19d as M
from hybrid import Ring, run


def record(N, c, y, rtol=1e-8, conv="author"):
    p = M.params(conv)
    ring = Ring(N, c, p)
    # go to the next activation of cell 0, then record until the one after
    o = run(ring, y, 0.0, 5000.0, rtol=rtol, method="BDF", stop=lambda e: e[1] == 0 and e[2] == 1)
    y0 = o["y"].copy()
    lo0 = o["lo"].copy()
    o2 = run(ring, y0, 0.0, 5000.0, rtol=rtol, method="BDF", record=True, lo0=lo0,
             stop=lambda e: e[1] == 0 and e[2] == 1)
    T = o2["t"]
    wt = o2["rec_t"]
    wy = o2["rec_y"].reshape(19, N, -1)[:, 0, :]  # cell 0 states
    return T, wt, wy, y0


def initial_state(wt, wy, T, Nnew):
    """Cell j at phase (T - j T/Nnew) of the waveform that starts at cell-0 activation (t=0)."""
    X = np.empty((19, Nnew))
    for j in range(Nnew):
        tj = 0.0 if j == 0 else T - j * T / Nnew
        for k in range(19):
            X[k, j] = np.interp(tj, wt, wy[k])
    return X.ravel()


if __name__ == "__main__":
    N, c = int(sys.argv[1]), float(sys.argv[2])
    src = sys.argv[3] if len(sys.argv) > 3 else "results/ring_N%d_c%g.json" % (N, c)
    yin = np.load(src) if src.endswith(".npy") else np.array(json.load(open(src))["y_final"])
    T, wt, wy, y0 = record(N, c, yin)
    print("rotation period T = %.6f ms, %d samples" % (T, len(wt)))
    np.savez(sys.argv[4] if len(sys.argv) > 4 else "results/waveform_N%d_c%g.npz" % (N, c), T=T, wt=wt, wy=wy, y0=y0)
